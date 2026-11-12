
import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { pool } from './db';

const app = express();

app.use(cors({
    origin: process.env.CORS_ORIGIN || 'http://localhost:5173'
}));

app.use(express.json());

app.get('/', (req, res) => {
    res.json({
        success: true,
        message: 'Healing Hearts AI Backend API',
        status: 'Running'
    });
});

app.get('/api/health', (req, res) => {
    res.json({
        success: true,
        message: 'Backend is working!'
    });
});


app.get('/api/database', async (req, res) => {
    try {
        const result = await pool.query(
            'SELECT NOW() AS current_time'
        );

        console.log('Supabase database connected!');

        res.json({
            success: true,
            message: 'Supabase database connected successfully!',
            data: result.rows[0],
        });

    } catch (error: any) {
        console.error('DATABASE CONNECTION ERROR:', error);

        res.status(500).json({
            success: false,
            message: 'Database connection failed',
            error: error.message,
            code: error.code,
        });
    }
});

const PORT = Number(process.env.PORT) || 5000;

app.listen(PORT, () => {
    console.log(`Healing Hearts AI server running on http://localhost:${PORT}`);
});
