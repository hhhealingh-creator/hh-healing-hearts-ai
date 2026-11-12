import path from 'node:path';
import fs from 'node:fs';
import express from 'express';
import cors from 'cors';
import { auth, HttpError } from './middleware';
import { router } from '../src/services/routes';
import { addActivity, mutate } from './db';
import { runAutomation } from './automation';

const app = express();
app.use(cors({ origin: true }));
app.use(express.json({ limit: '1mb' }));
app.use(auth);
app.use('/api', router);

const dist = path.join(process.cwd(), 'dist');
if (fs.existsSync(dist)) {
    app.use(express.static(dist));
    app.get('*', (req, res, next) => {
        if (req.path.startsWith('/api')) {
            next();
            return;
        }
        res.sendFile(path.join(dist, 'index.html'));
    });
}

app.use(
    (
        error: unknown,
        _req: express.Request,
        res: express.Response,
        _next: express.NextFunction
    ) => {
        console.error(error);
        const status = error instanceof HttpError ? error.status : 500;
        const message =
            error instanceof Error ? error.message : 'Internal server error';
        res.status(status).json({ error: message });
    }
);

const port = Number(process.env.PORT) || 4000;
app.listen(port, () => {
    console.log(`HH AI Manager API listening on http://localhost:${port}`);
});

setInterval(() => {
    try {
        const actions = mutate((db) => {
            if (db.system.emergencyStop) return [] as string[];
            const result = runAutomation(db);
            result.forEach((message) =>
                addActivity(db, { name: 'Automation', role: 'admin' }, 'Automated action', message)
            );
            return result;
        });

        if (actions.length) {
            console.log(`[automation] ${actions.length} action(s) completed.`);
        }
    } catch (error) {
        console.error('[automation] tick failed', error);
    }
}, 30_000);