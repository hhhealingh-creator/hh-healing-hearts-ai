import { Router } from 'express';
import { pool } from '../db.js';
import { requireRole, currentActor, logActivity } from '../auth.js';
import type { Platform } from '../types.ts';

export const accountsRouter = Router();

function rowToAccount(row: any) {
    return {
        id: row.id,
        platform: row.platform as Platform,
        name: row.name,
        handle: row.handle,
        status: row.status,
        followers: row.followers,
        publishingEnabled: row.publishing_enabled,
        lastSyncedAt: row.last_synced_at?.toISOString() ?? null,
    };
}

accountsRouter.get('/accounts', async (_req, res) => {
    const { rows } = await pool.query('SELECT * FROM accounts ORDER BY platform');
    res.json(rows.map(rowToAccount));
});

accountsRouter.get('/integrations', async (_req, res) => {
    const accounts = await pool.query('SELECT * FROM accounts ORDER BY platform');
    res.json({
        accounts: accounts.rows.map(rowToAccount),
        webhookUrl: `${process.env.PUBLIC_URL ?? 'http://localhost:4000'}/api/webhooks/meta`,
        graphVersion: 'v20.0',
    });
});

accountsRouter.patch('/accounts/:id', requireRole('editor'), async (req, res) => {
    const { publishingEnabled } = req.body as { publishingEnabled: boolean };
    if (typeof publishingEnabled !== 'boolean') {
        return res.status(400).json({ error: 'publishingEnabled is required' });
    }
    const { rows } = await pool.query(
        `UPDATE accounts SET publishing_enabled = $1 WHERE id = $2 RETURNING *`,
        [publishingEnabled, req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Account not found' });
    const { actor, role } = currentActor(req);
    await logActivity(actor, role, `Set publishing=${publishingEnabled}`, rows[0].id);
    res.json(rowToAccount(rows[0]));
});

accountsRouter.post('/integrations/:platform/connect', requireRole('admin'), async (req, res) => {
    const platform = req.params.platform as Platform;
    const { rows } = await pool.query(
        `UPDATE accounts
       SET status = 'connected',
           followers = GREATEST(followers, 1000 + (random()*5000)::int),
           last_synced_at = NOW()
     WHERE platform = $1 RETURNING *`,
        [platform]
    );
    if (!rows.length) return res.status(404).json({ error: 'Account not found' });
    const { actor, role } = currentActor(req);
    await logActivity(actor, role, `Connected ${platform}`, rows[0].id);
    res.json(rowToAccount(rows[0]));
});

accountsRouter.post('/integrations/:platform/disconnect', requireRole('admin'), async (req, res) => {
    const platform = req.params.platform as Platform;
    const { rows } = await pool.query(
        `UPDATE accounts SET status = 'disconnected' WHERE platform = $1 RETURNING *`,
        [platform]
    );
    if (!rows.length) return res.status(404).json({ error: 'Account not found' });
    const { actor, role } = currentActor(req);
    await logActivity(actor, role, `Disconnected ${platform}`, rows[0].id);
    res.json(rowToAccount(rows[0]));
});

accountsRouter.post('/integrations/:platform/sync', requireRole('editor'), async (req, res) => {
    const platform = req.params.platform as Platform;
    const { rows } = await pool.query(
        `UPDATE accounts
       SET last_synced_at = NOW(),
           followers = followers + (random()*50)::int
     WHERE platform = $1 RETURNING *`,
        [platform]
    );
    if (!rows.length) return res.status(404).json({ error: 'Account not found' });
    const { actor, role } = currentActor(req);
    await logActivity(actor, role, `Synced ${platform}`, rows[0].id);
    res.json(rowToAccount(rows[0]));
});