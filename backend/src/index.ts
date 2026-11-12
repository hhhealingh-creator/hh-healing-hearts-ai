
import 'dotenv/config';
import express from 'express';
import cors from 'cors';

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

const PORT = Number(process.env.PORT) || 4000;

app.listen(PORT, () => {
    console.log(`Healing Hearts AI server running on http://localhost:${PORT}`);
});
