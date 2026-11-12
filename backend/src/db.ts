
import { Pool } from 'pg';
import 'dotenv/config';

export const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false,
    },
});

pool.on('connect', () => {
    console.log('Connected to Supabase PostgreSQL');
});

pool.on('error', (error) => {
    console.error('Database error:', error);
});
