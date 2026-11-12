import { Router } from 'express';
import { pool } from '../db.js';
import { requireRole, currentActor, logActivity } from '../auth.js';
import type { CommentCategory, Platform } from '../types.js';

export const engagementRouter = Router();

function rowToComment(row: any) {
    return {
        id: row.id,
        author: row.author,
        message: row.message,
        platform: row.platform as Platform,
        status: row.status,
        category: (row.category as CommentCategory | null) ?? null,
        reply: row.reply,
        assignedTo: row.assigned_to,
        createdAt: row.created_at.toISOString(),
    };
}

engagementRouter.get('/comments', async (_req, res) => {
    const { rows } = await pool.query('SELECT * FROM comments ORDER BY created_at DESC');
    res.json(rows.map(rowToComment));
});

engagementRouter.post('/comments/:id/reply', requireRole('editor'), async (req, res) => {
    const { text } = req.body as { text: string };
    if (!text?.trim()) return res.status(400).json({ error: 'Reply text is required' });
    const { rows } = await pool.query(
        `UPDATE comments SET reply = $1, status = 'resolved'
     WHERE id = $2 RETURNING *`,
        [text.trim(), req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Comment not found' });
    const { actor, role } = currentActor(req);
    await logActivity(actor, role, 'Sent human reply', req.params.id);
    res.json(rowToComment(rows[0]));
});

engagementRouter.post('/comments/:id/escalate', requireRole('editor'), async (req, res) => {
    const { rows } = await pool.query(
        `UPDATE comments SET status = 'escalated', assigned_to = 'Alex Admin'
     WHERE id = $1 RETURNING *`,
        [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Comment not found' });
    const { actor, role } = currentActor(req);
    await logActivity(actor, role, 'Escalated comment to human', req.params.id);
    res.json(rowToComment(rows[0]));
});

engagementRouter.post('/comments/:id/resolve', requireRole('editor'), async (req, res) => {
    const { rows } = await pool.query(
        `UPDATE comments SET status = 'resolved' WHERE id = $1 RETURNING *`,
        [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Comment not found' });
    const { actor, role } = currentActor(req);
    await logActivity(actor, role, 'Resolved comment', req.params.id);
    res.json(rowToComment(rows[0]));
});