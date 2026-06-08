import express from 'express';
import cors from 'cors';
import mysql from 'mysql2/promise';

const app = express();
const port = 3001;

app.use(cors());
app.use(express.json());

// XAMPP Default MySQL credentials
const dbConfig = {
    host: '127.0.0.1',
    port: 3307,
    user: 'root',
    password: ''
};

let pool;

async function initDB() {
    try {
        // First connect without DB to create it if missing
        const connection = await mysql.createConnection(dbConfig);
        await connection.query("CREATE DATABASE IF NOT EXISTS escrow_db;");
        await connection.end();

        // Create connection pool for the newly created DB
        pool = mysql.createPool({
            ...dbConfig,
            database: 'escrow_db',
            waitForConnections: true,
            connectionLimit: 10,
            queueLimit: 0
        });

        // Create table
        await pool.query(`
            CREATE TABLE IF NOT EXISTS contracts (
                id INT AUTO_INCREMENT PRIMARY KEY,
                contract_id VARCHAR(255) NOT NULL UNIQUE,
                tenant_key VARCHAR(255) NOT NULL,
                landlord_key VARCHAR(255) NOT NULL,
                status VARCHAR(50) DEFAULT 'ACTIVE',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);
        console.log("MySQL Database 'escrow_db' initialized successfully.");
    } catch (err) {
        console.error("Failed to initialize database. Is XAMPP MySQL running?", err);
        process.exit(1);
    }
}

// API Routes
app.post('/api/escrows', async (req, res) => {
    const { contractId, tenantKey, landlordKey } = req.body;
    try {
        await pool.query(
            "INSERT INTO contracts (contract_id, tenant_key, landlord_key) VALUES (?, ?, ?)",
            [contractId, tenantKey, landlordKey]
        );
        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to save contract" });
    }
});

app.get('/api/escrows/:publicKey', async (req, res) => {
    const { publicKey } = req.params;
    try {
        const [rows] = await pool.query(
            "SELECT * FROM contracts WHERE tenant_key = ? OR landlord_key = ? ORDER BY created_at DESC",
            [publicKey, publicKey]
        );
        res.json(rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to fetch contracts" });
    }
});

initDB().then(() => {
    app.listen(port, () => {
        console.log(`Backend API running at http://localhost:${port}`);
    });
});
