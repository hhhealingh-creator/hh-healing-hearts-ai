import { Router } from 'express';
import { pool } from '../db.js';

export const apiRouter = Router();

// Test API
apiRouter.get('/test', (req, res) => {
    res.json({
        success: true,
        message: 'Healing Hearts AI API is working!',
    });
});

// Test database connection
apiRouter.get('/database', async (req, res) => {
    try {
        const result = await pool.query(
            'SELECT NOW() AS current_time'
        );

        res.json({
            success: true,
            message: 'Supabase database connected successfully',
            data: result.rows[0],
        });
    } catch (error) {
        console.error('Database error:', error);

        res.status(500).json({
            success: false,
            message: 'Database connection failed',
        });
    }
});