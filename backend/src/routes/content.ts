import { Router } from 'express';
import { pool } from '../db.js';
import { requireRole, currentActor, logActivity } from '../auth.js';
import type { AgentId, AgentMode, Platform, PostInput } from '../types.js';

export const contentRouter = Router();

const validAgentIds: AgentId[] = ['content', 'publishing', 'engagement', 'analytics'];

const runResults: Record<AgentId, string> = {
    content: 'Drafted 2 new post ideas for human review.',
    publishing: 'Published 1 scheduled post to Facebook and Instagram.',
    engagement: 'Auto-replied to 3 routine comments; 1 escalated.',
    analytics: 'Refreshed performance metrics for connected accounts.',
};

function rowToAgent(row: any) {
    return {
        id: row.id as AgentId,
        name: row.name,
        description: row.description,
        enabled: row.enabled,
        mode: row.mode as AgentMode,
        tasksToday: row.tasks_today,
        successRate: Number(row.success_rate),
        lastRunAt: row.last_run_at?.toISOString() ?? null,
    };
}

function rowToPost(row: any) {
    return {
        id: row.id,
        content: row.content,
        platforms: row.platforms as Platform[],
        mediaUrl: row.media_url,
        status: row.status,
        scheduledFor: row.scheduled_for?.toISOString() ?? null,
        publishedAt: row.published_at?.toISOString() ?? null,
        createdAt: row.created_at.toISOString(),
        metrics: row.metrics ?? { impressions: 0, reach: 0, likes: 0, comments: 0, shares: 0 },
    };
}

/* ---------- Agents ---------- */
contentRouter.get('/agents', async (_req, res) => {
    const { rows } = await pool.query('SELECT * FROM agents ORDER BY id');
    res.json(rows.map(rowToAgent));
});

contentRouter.patch('/agents/:id', requireRole('admin'), async (req, res) => {
    const { id } = req.params;
    if (!validAgentIds.includes(id as AgentId)) {
        return res.status(404).json({ error: 'Agent not found' });
    }
    const patch = req.body as { enabled?: boolean; mode?: AgentMode };
    const updates: string[] = [];
    const values: any[] = [];

    if (typeof patch.enabled === 'boolean') {
        values.push(patch.enabled);
        updates.push(`enabled = $${values.length}`);
    }
    if (patch.mode === 'auto' || patch.mode === 'human_review') {
        values.push(patch.mode);
        updates.push(`mode = $${values.length}`);
    }
    if (!updates.length) return res.status(400).json({ error: 'No valid fields to update' });

    values.push(id);
    const { rows } = await pool.query(
        `UPDATE agents SET ${updates.join(', ')} WHERE id = $${values.length} RETURNING *`,
        values
    );

    const { actor, role } = currentActor(req);
    await logActivity(actor, role, `Updated agent ${id}`, id);
    res.json(rowToAgent(rows[0]));
});

contentRouter.post('/agents/:id/run', requireRole('editor'), async (req, res) => {
    const { id } = req.params as { id: AgentId };
    if (!validAgentIds.includes(id)) {
        return res.status(404).json({ error: 'Agent not found' });
    }

    const settings = await pool.query('SELECT emergency_stop FROM settings WHERE id = 1');
    if (settings.rows[0]?.emergency_stop) {
        return res.status(409).json({ error: 'Emergency stop is active' });
    }

    const { rows } = await pool.query(
        `UPDATE agents
       SET tasks_today = tasks_today + 1, last_run_at = NOW()
     WHERE id = $1 RETURNING *`,
        [id]
    );

    const { actor, role } = currentActor(req);
    await logActivity(actor, role, `Ran agent ${id}`, id);
    res.json({ agent: rowToAgent(rows[0]), actions: [runResults[id]] });
});

/* ---------- Posts ---------- */
contentRouter.get('/posts', async (_req, res) => {
    const { rows } = await pool.query('SELECT * FROM posts ORDER BY created_at DESC');
    res.json(rows.map(rowToPost));
});

contentRouter.post('/posts', requireRole('editor'), async (req, res) => {
    const body = req.body as PostInput;
    if (!body?.content?.trim()) return res.status(400).json({ error: 'Content is required' });
    if (!body.platforms?.length) return res.status(400).json({ error: 'At least one platform required' });

    const settings = await pool.query('SELECT emergency_stop FROM settings WHERE id = 1');
    const emergency = settings.rows[0]?.emergency_stop ?? false;

    let status: string;
    let publishedAt: Date | null = null;
    if (body.publishNow) {
        if (emergency) return res.status(409).json({ error: 'Emergency stop is active' });
        status = 'published';
        publishedAt = new Date();
    } else if (body.scheduledFor) {
        status = 'scheduled';
    } else {
        status = 'draft';
    }

    const emptyMetrics = JSON.stringify({
        impressions: 0, reach: 0, likes: 0, comments: 0, shares: 0,
    });

    const { rows } = await pool.query(
        `INSERT INTO posts (content, platforms, media_url, status, scheduled_for, published_at, metrics)
     VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
        [
            body.content.trim(),
            body.platforms,
            body.mediaUrl ?? null,
            status,
            body.scheduledFor ? new Date(body.scheduledFor) : null,
            publishedAt,
            emptyMetrics,
        ]
    );

    const { actor, role } = currentActor(req);
    await logActivity(actor, role, `Created post (${status})`, rows[0].id);
    res.status(201).json(rowToPost(rows[0]));
});

contentRouter.post('/posts/:id/publish', requireRole('editor'), async (req, res) => {
    const settings = await pool.query('SELECT emergency_stop FROM settings WHERE id = 1');
    if (settings.rows[0]?.emergency_stop) {
        return res.status(409).json({ error: 'Emergency stop is active' });
    }

    const { rows } = await pool.query(
        `UPDATE posts
       SET status = 'published', published_at = NOW()
     WHERE id = $1 AND status NOT IN ('published','publishing')
     RETURNING *`,
        [req.params.id]
    );

    if (!rows.length) return res.status(404).json({ error: 'Post not found or already published' });

    const { actor, role } = currentActor(req);
    await logActivity(actor, role, 'Published post', rows[0].id);
    res.json(rowToPost(rows[0]));
});

contentRouter.delete('/posts/:id', requireRole('editor'), async (req, res) => {
    const { rows } = await pool.query(
        `DELETE FROM posts WHERE id = $1 AND status NOT IN ('published','publishing') RETURNING id`,
        [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Post not found or protected' });

    const { actor, role } = currentActor(req);
    await logActivity(actor, role, 'Deleted post', req.params.id);
    res.status(204).send();
});