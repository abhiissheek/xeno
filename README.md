# Xeno Mini CRM Platform - SDE Internship Assignment

This project is a submission for the Xeno SDE Internship Assignment 2025. It is a full-stack mini CRM platform designed for customer segmentation, personalized campaign delivery, and intelligent insights.

**Deployed Application:** `[Link to Your Deployed Project on Render/Vercel]`
**Demo Video:** `[Link to Your 7-Minute Demo Video]`

---

## Features

- [cite_start]**Asynchronous Data Ingestion:** Secure REST APIs for ingesting customer and order data using a scalable Pub/Sub architecture with RabbitMQ. 
- [cite_start]**Dynamic Campaign Creation UI:** A web interface for creating audience segments with a flexible, dynamic rule builder supporting AND/OR logic. 
- [cite_start]**Real-time Audience Preview:** The UI provides an immediate estimate of the audience size as the rules are being defined. 
- **Full Campaign Delivery Loop:**
    - [cite_start]Campaigns are saved and logged in a `communication_log` table. 
    - Messages are dispatched asynchronously via a consumer service.
    - [cite_start]A mock third-party vendor simulates message delivery with a 90% success rate. 
    - [cite_start]A webhook endpoint receives delivery receipts (`SENT`/`FAILED`) and updates the communication log. 
- [cite_start]**Google OAuth 2.0 Authentication:** Secure user authentication ensures that only logged-in users can create or view campaigns. 
- [cite_start]**AI-Powered Rule Generation:** A "Natural Language to Segment Rules" feature allows users to type queries in plain English (e.g., "users who spent more than 1000"), which are then converted into logical rules by the Google Gemini AI. 

---

## Tech Stack & Tools

- **Frontend:** Next.js (React)
- **Backend:** Node.js with Express.js
- **Database:** MySQL
- **Message Broker:** RabbitMQ (via Docker)
- **Authentication:** Google OAuth 2.0 with Express Sessions
- [cite_start]**AI Integration:** Google Gemini API via Google AI Studio 
- **Deployment:** Render (for web services and workers), Vercel (for frontend)
- **API Testing:** Thunder Client (VS Code Extension)

---

## Architecture Diagram

*(To create this diagram, you can use a free tool like [Eraser.io](https://eraser.io) or [Excalidraw](https://excalidraw.com). Export the diagram as a PNG, add it to your repository, and update the image link below.)*

![Architecture Diagram](path/to/your/architecture-diagram.png)

---

## Local Setup Instructions

### Prerequisites

- Node.js (v18 or later)
- Git
- Docker and Docker Compose
- A running MySQL instance

### Setup Steps

1.  **Clone the repository:**
    ```bash
    git clone [https://github.com/](https://github.com/)[Your-GitHub-Username]/[Your-Repo-Name].git
    cd [Your-Repo-Name]
    ```

2.  **Set up Environment Variables:**
    Create a `.env` file inside **both** `packages/api-service` and `packages/consumer-service`. Populate it with your credentials:
    ```env
    PORT=3001
    RABBITMQ_URL='amqp://user:password@localhost:5672'
    DB_HOST='127.0.0.1'
    DB_USER='your_mysql_user'
    DB_PASSWORD='your_mysql_password'
    DB_NAME='xeno_crm_db'
    GOOGLE_CLIENT_ID=your_google_client_id
    GOOGLE_CLIENT_SECRET=your_google_client_secret
    SESSION_SECRET=a_long_random_string_for_security
    GOOGLE_GEMINI_API_KEY=your_google_gemini_api_key
    ```
    Create a `.env.local` file inside `packages/frontend` with your public Google Client ID:
    ```env
    NEXT_PUBLIC_GOOGLE_CLIENT_ID=your_google_client_id
    ```

3.  **Install Dependencies:**
    From the root directory, install all dependencies for the monorepo:
    ```bash
    npm install
    ```

4.  **Start Background Services:**
    This command will start the RabbitMQ message broker in a Docker container.
    ```bash
    docker-compose up -d
    ```

5.  **Create the Database Schema:**
    Connect to your MySQL instance using a client like MySQL Workbench and run the complete SQL script provided (`schema.sql` or from our chat history) to create the database and all necessary tables.

6.  **Run the Application:**
    You will need to open **four separate terminals** for the different services.
    - **Terminal 1 (API Service):**
      ```bash
      cd packages/api-service
      NODE_ENV=development node index.js
      ```
    - **Terminal 2 (Consumer Service):**
      ```bash
      cd packages/consumer-service
      node index.js
      ```
    - **Terminal 3 (Mock Vendor):**
      ```bash
      cd packages/mock-vendor-api
      node index.js
      ```
    - **Terminal 4 (Frontend):**
      ```bash
      cd packages/frontend
      npm run dev
      ```

7.  **Access the Application:**
    - **Frontend:** http://localhost:3000
    - **Login Page:** http://localhost:3000/login

---

## Known Limitations or Assumptions

- **Authentication:** The real Google OAuth flow has been buggy during development. A "pseudo-login" backdoor (`/auth/pseudo-login`) has been implemented for easier testing of protected features.
- **Error Handling:** While functional, the error handling on both the frontend and backend could be more robust and provide more user-friendly feedback.
- **Testing:** The project does not include an automated test suite (e.g., using Jest or Cypress). All testing was performed manually.
- **Scalability Note:** The delivery receipt webhook updates the database one row at a time. [cite_start]A more scalable solution (as mentioned for "Brownie Points") would be for the webhook to publish events to a queue and have a consumer process them in batches.
