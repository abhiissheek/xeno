require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const { z } = require('zod');
const amqp = require('amqplib');
const mysql = require('mysql2/promise');
const { OAuth2Client } = require('google-auth-library');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const session = require('express-session');
const cookieParser = require('cookie-parser');

// --- CONFIGURATIONS ---
const dbConfig = {
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
};

const oAuth2Client = new OAuth2Client(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    'postmessage'
);

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GEMINI_API_KEY);
const app = express();
const RABBITMQ_URL = process.env.RABBITMQ_URL;

// --- MIDDLEWARE SETUP ---
app.use(cors({
    origin: 'http://localhost:3000',
    credentials: true
}));
app.use(cookieParser());
app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: { 
        secure: false, // Set to true in production with HTTPS
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000 // 24 hours
    }
}));
app.use(express.json());
app.use(helmet());

// --- HELPER FUNCTIONS ---
async function publishMessage(routingKey, message) {
    try {
        const conn = await amqp.connect(RABBITMQ_URL);
        const channel = await conn.createChannel();
        const exchange = 'xeno_exchange';
        await channel.assertExchange(exchange, 'topic', { durable: true });
        channel.publish(exchange, routingKey, Buffer.from(JSON.stringify(message)));
        console.log(`[x] Sent ${routingKey}: '${JSON.stringify(message)}'`);
        setTimeout(() => { conn.close(); }, 500);
    } catch (error) {
        console.error('Failed to publish message:', error);
        throw error;
    }
}

function buildAudienceQuery(rules) {
    const whereClauses = [];
    const values = [];
    rules.forEach(rule => {
        if (!rule.field || !rule.condition || rule.value === undefined || rule.value === '') return;
        const fieldMap = { 
            total_spends: 'total_spends', 
            visit_count: 'visit_count', 
            last_visit_date: 'last_visit_date' 
        };
        const column = fieldMap[rule.field];
        if (column === 'last_visit_date') {
            whereClauses.push(`DATEDIFF(NOW(), ${column}) ${rule.condition} ?`);
        } else if (column) {
            whereClauses.push(`${column} ${rule.condition} ?`);
        }
        values.push(rule.value);
    });
    if (whereClauses.length === 0) {
        return { sql: 'SELECT COUNT(*) as count FROM customers', values: [] };
    }
    const sql = `SELECT COUNT(*) as count FROM customers WHERE ${whereClauses.join(' AND ')}`;
    return { sql, values };
}

// --- AUTHENTICATION MIDDLEWARE ---
const isAuthenticated = (req, res, next) => {
    if (req.session.user) {
        return next();
    }
    res.status(401).json({ message: 'Unauthorized: You must be logged in.' });
};

// --- ROUTES ---

// AUTHENTICATION ROUTES
app.post('/auth/google', async (req, res) => {
    try {
        const { tokens } = await oAuth2Client.getToken(req.body.code);
        const loginTicket = await oAuth2Client.verifyIdToken({
            idToken: tokens.id_token,
            audience: process.env.GOOGLE_CLIENT_ID,
        });
        const { sub, email, name } = loginTicket.getPayload();
        
        let connection = await mysql.createConnection(dbConfig);
        await connection.execute(
            'INSERT INTO users (id, name, email) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE name = ?',
            [sub, name, email, name]
        );
        await connection.end();

        req.session.user = { id: sub, name, email };
        res.status(200).json({ message: "Login successful", user: req.session.user });
    } catch (error) {
        console.error("Authentication error:", error);
        res.status(400).json({ message: "Authentication failed" });
    }
});

app.post('/auth/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            console.error('Session destruction error:', err);
            return res.status(500).json({ message: 'Logout failed' });
        }
        res.clearCookie('connect.sid');
        res.status(200).json({ message: 'Logout successful' });
    });
});

app.get('/auth/status', (req, res) => {
    if (req.session.user) {
        res.json({ authenticated: true, user: req.session.user });
    } else {
        res.json({ authenticated: false });
    }
});

// AI ROUTE
app.post('/segments/parse-natural-language', isAuthenticated, async (req, res) => {
    const { query } = req.body;
    if (!query) {
        return res.status(400).json({ error: 'Query is required.' });
    }
    
    const model = genAI.getGenerativeModel({ model: "gemini-pro" });
    const prompt = `Convert the following user query into a JSON object for audience segmentation. The JSON MUST be an object with a single key "rules" which is an array of rule objects. Do not wrap the JSON in markdown backticks. Each rule object must have three keys: "field", "condition", and "value". Valid "field" values are: "total_spends", "visit_count", "last_visit_date". Valid "condition" values are: ">", "<", "=". The "value" must be a number. Example Query: "Users with more than 3 visits and total spend over 5000". Example JSON Output: {"rules": [{"field": "visit_count", "condition": ">", "value": 3},{"field": "total_spends", "condition": ">", "value": 5000}]}. User query: "${query}". JSON Output:`;
    
    try {
        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();
        const resultJson = JSON.parse(text);
        res.json(resultJson);
    } catch (error) {
        console.error("AI parsing error:", error);
        res.status(500).json({ error: "Failed to parse query with AI." });
    }
});

// DATA INGESTION ROUTE
const customerSchema = z.object({
    name: z.string().min(1),
    email: z.string().email()
});

app.post('/customers', async (req, res) => {
    const validation = customerSchema.safeParse(req.body);
    if (!validation.success) {
        return res.status(400).json({ errors: validation.error.issues });
    }
    try {
        await publishMessage('customer.create', validation.data);
        res.status(202).json({ message: 'Request accepted for processing.' });
    } catch (error) {
        res.status(500).json({ message: 'Internal server error.' });
    }
});

// PROTECTED CAMPAIGN ROUTES
app.post('/segments/preview', isAuthenticated, async (req, res) => {
    const { rules } = req.body;
    if (!rules || !Array.isArray(rules)) {
        return res.status(400).json({ error: 'Invalid rules format' });
    }
    
    const { sql, values } = buildAudienceQuery(rules);
    let connection;
    try {
        connection = await mysql.createConnection(dbConfig);
        const [rows] = await connection.execute(sql, values);
        res.json({ audienceSize: rows[0].count });
    } catch (error) {
        console.error('Error fetching audience size:', error);
        res.status(500).json({ error: 'Failed to fetch audience size' });
    } finally {
        if (connection) await connection.end();
    }
});

app.post('/campaigns', isAuthenticated, async (req, res) => {
    const { rules, campaignName } = req.body;
    if (!rules || !Array.isArray(rules) || !campaignName) {
        return res.status(400).json({ error: 'Invalid request body' });
    }
    
    let connection;
    try {
        connection = await mysql.createConnection(dbConfig);
        await connection.beginTransaction();
        
        const audienceQuery = buildAudienceQuery(rules);
        const audienceSql = audienceQuery.sql.replace('SELECT COUNT(*) as count', 'SELECT id, name, email');
        const [audienceRows] = await connection.execute(audienceSql, audienceQuery.values);
        
        if (audienceRows.length === 0) {
            return res.status(400).json({ message: "Campaign not created: audience is empty." });
        }
        
        const [campaignResult] = await connection.execute(
            'INSERT INTO campaigns (name, audience_rules, audience_size) VALUES (?, ?, ?)',
            [campaignName, JSON.stringify(rules), audienceRows.length]
        );
        const campaignId = campaignResult.insertId;
        
        for (const customer of audienceRows) {
            const message = `Hi ${customer.name}, here's 10% off on your next order!`;
            const [logResult] = await connection.execute(
                'INSERT INTO communication_log (campaign_id, customer_id, message, status) VALUES (?, ?, ?, ?)',
                [campaignId, customer.id, message, 'PENDING']
            );
            await publishMessage('campaign.send', {
                logId: logResult.insertId,
                customer,
                message
            });
        }
        
        await connection.commit();
        res.status(201).json({
            message: 'Campaign created successfully',
            campaignId,
            audienceSize: audienceRows.length
        });
    } catch (error) {
        if (connection) await connection.rollback();
        console.error('Error creating campaign:', error);
        res.status(500).json({ error: 'Failed to create campaign' });
    } finally {
        if (connection) await connection.end();
    }
});

app.get('/campaigns', isAuthenticated, async (req, res) => {
    let connection;
    try {
        connection = await mysql.createConnection(dbConfig);
        const [campaigns] = await connection.execute(`
            SELECT c.id, c.name, c.audience_size, c.created_at,
                   SUM(CASE WHEN cl.status = 'SENT' THEN 1 ELSE 0 END) as sent_count,
                   SUM(CASE WHEN cl.status = 'FAILED' THEN 1 ELSE 0 END) as failed_count
            FROM campaigns c
            LEFT JOIN communication_log cl ON c.id = cl.campaign_id
            GROUP BY c.id
            ORDER BY c.created_at DESC
        `);
        res.json(campaigns);
    } catch (error) {
        console.error('Error fetching campaigns:', error);
        res.status(500).json({ error: 'Failed to fetch campaigns' });
    } finally {
        if (connection) await connection.end();
    }
});

// WEBHOOK ROUTE
app.post('/webhooks/delivery-receipts', async (req, res) => {
    const { logId, status } = req.body;
    if (!logId || !status) {
        return res.status(400).send('Invalid request');
    }
    
    let connection;
    try {
        connection = await mysql.createConnection(dbConfig);
        await connection.execute(
            'UPDATE communication_log SET status = ?, sent_at = NOW() WHERE id = ?',
            [status, logId]
        );
        res.status(200).send('Receipt acknowledged.');
    } catch (error) {
        console.error('[Webhook] Error updating log:', error);
        res.status(500).send('Error processing receipt.');
    } finally {
        if (connection) await connection.end();
    }
});

// --- START SERVER ---
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`API Service running on http://localhost:${PORT}`));