
import { Pool } from 'pg';
import 'dotenv/config';

if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is missing from .env');
}

export const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false,
    },
    connectionTimeoutMillis: 10000,
    max: 10,
});

pool.on('connect', () => {
    console.log('Supabase PostgreSQL connection established');
});

pool.on('error', (error) => {
    console.error('PostgreSQL error:', error.message);
});
