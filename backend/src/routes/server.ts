import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { apiRouter } from '../routes/api.js';
import { pool } from '../db.js';

const app = express();

app.use(
    cors({
        origin: process.env.CORS_ORIGIN?.split(',') || [
            'http://localhost:5173',
        ],
    })
);

app.use(express.json());

// Home route
app.get('/', (req, res) => {
    res.json({
        message: 'Welcome to Healing Hearts AI API',
        status: 'Running',
    });
});

// Health check
app.get('/health', async (req, res) => {
    try {
        await pool.query('SELECT 1');

        res.json({
            server: 'Online',
            database: 'Connected',
        });
    } catch {
        res.status(500).json({
            server: 'Online',
            database: 'Disconnected',
        });
    }
});

// API routes
app.use('/api', apiRouter);

const PORT = Number(process.env.PORT) || 4000;

app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});