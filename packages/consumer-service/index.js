
require('dotenv').config();
const amqp = require('amqplib');
const mysql = require('mysql2/promise');

const RABBITMQ_URL = process.env.RABBITMQ_URL;
const dbConfig = {
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
};

async function processCustomerMessage(msg) {
    let connection;
    try {
        connection = await mysql.createConnection(dbConfig);
        const customer = JSON.parse(msg.content.toString());
        console.log(`[.] Received customer: ${customer.email}`);

        const query = `
            INSERT INTO customers (name, email, visit_count, last_visit_date)
            VALUES (?, ?, 1, NOW())
            ON DUPLICATE KEY UPDATE
            name = VALUES(name), visit_count = visit_count + 1, last_visit_date = NOW();
        `;
        await connection.execute(query, [customer.name, customer.email]);
        console.log(`[x] Processed and saved/updated customer: ${customer.email}`);
    } catch (err) {
        console.error("[-] Failed to process message:", err);
    } finally {
        if (connection) await connection.end();
    }
}

async function startConsumer() {
    try {
        const conn = await amqp.connect(RABBITMQ_URL);
        const channel = await conn.createChannel();
        const exchange = 'xeno_exchange';
        await channel.assertExchange(exchange, 'topic', { durable: true });

        const q = await channel.assertQueue('data_ingestion_queue', { durable: true });
        console.log(`[*] Waiting for messages in queue: ${q.queue}. To exit press CTRL+C`);

        channel.bindQueue(q.queue, exchange, 'customer.create');

        channel.consume(q.queue, (msg) => {
            if (msg.content) {
                processCustomerMessage(msg);
            }
        }, { noAck: true });
    } catch (error) {
        console.error("Error starting consumer:", error);
    }
}

startConsumer();