import { Pool } from 'pg';
import 'dotenv/config';

export const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false,
    },
    connectionTimeoutMillis: 10000,
});

pool.on('error', (error) => {
    console.error('PostgreSQL error:', error.message);
});