import { Router } from 'express';
import { pool } from '../db.js';
import { requireRole, currentActor, logActivity } from '../auth.js';

export const adminRouter = Router();

async function readSettings() {
    const { rows } = await pool.query('SELECT * FROM settings WHERE id = 1');
    const row = rows[0];
    return {
        orgName: row.org_name,
        timezone: row.timezone,
        autoPublish: row.auto_publish,
        autoReply: row.auto_reply,
        quietHoursStart: row.quiet_hours_start,
        quietHoursEnd: row.quiet_hours_end,
        escalationEmail: row.escalation_email,
        credentials: {
            metaAppId: row.credentials?.metaAppId ?? '••••',
            metaAppSecretMasked: row.credentials?.metaAppSecretMasked ?? '••••',
            pageTokenMasked: row.credentials?.pageTokenMasked ?? '••••',
        },
        emergencyStop: row.emergency_stop,
    };
}

adminRouter.get('/settings', async (_req, res) => {
    res.json(await readSettings());
});

adminRouter.patch('/settings', requireRole('admin'), async (req, res) => {
    const b = req.body as Partial<{
        orgName: string;
        timezone: string;
        autoPublish: boolean;
        autoReply: boolean;
        quietHoursStart: string;
        quietHoursEnd: string;
        escalationEmail: string;
        emergencyStop: boolean;
    }>;

    const updates: string[] = [];
    const values: any[] = [];
    const push = (col: string, val: any) => {
        values.push(val);
        updates.push(`${col} = $${values.length}`);
    };

    if (b.orgName !== undefined) push('org_name', b.orgName);
    if (b.timezone !== undefined) push('timezone', b.timezone);
    if (typeof b.autoPublish === 'boolean') push('auto_publish', b.autoPublish);
    if (typeof b.autoReply === 'boolean') push('auto_reply', b.autoReply);
    if (b.quietHoursStart !== undefined) push('quiet_hours_start', b.quietHoursStart);
    if (b.quietHoursEnd !== undefined) push('quiet_hours_end', b.quietHoursEnd);
    if (b.escalationEmail !== undefined) push('escalation_email', b.escalationEmail);
    if (typeof b.emergencyStop === 'boolean') push('emergency_stop', b.emergencyStop);

    if (updates.length) {
        await pool.query(`UPDATE settings SET ${updates.join(', ')} WHERE id = 1`, values);
        const { actor, role } = currentActor(req);
        await logActivity(actor, role, 'Updated settings', 'settings');
    }
    res.json(await readSettings());
});

adminRouter.post('/settings/credentials', requireRole('admin'), async (req, res) => {
    const { metaAppId, metaAppSecret, pageToken } = req.body as {
        metaAppId?: string;
        metaAppSecret?: string;
        pageToken?: string;
    };

    const current = await pool.query('SELECT credentials FROM settings WHERE id = 1');
    const creds: Record<string, string> = { ...(current.rows[0]?.credentials ?? {}) };
    if (metaAppId) creds.metaAppId = metaAppId;
    if (metaAppSecret) creds.metaAppSecretMasked = `••••${metaAppSecret.slice(-4)}`;
    if (pageToken) creds.pageTokenMasked = `••••${pageToken.slice(-4)}`;

    await pool.query('UPDATE settings SET credentials = $1 WHERE id = 1', [creds]);
    const { actor, role } = currentActor(req);
    await logActivity(actor, role, 'Rotated credentials', 'integrations');
    res.json(await readSettings());
});

adminRouter.get('/activity', async (req, res) => {
    const limit = Math.min(Number(req.query.limit ?? 50) || 50, 200);
    const { rows } = await pool.query(
        'SELECT * FROM activity_log ORDER BY at DESC LIMIT $1',
        [limit]
    );
    res.json(
        rows.map((row) => ({
            id: row.id,
            actor: row.actor,
            role: row.role,
            action: row.action,
            target: row.target,
            at: row.at.toISOString(),
        }))
    );
});

adminRouter.get('/system/status', async (_req, res) => {
    const { rows } = await pool.query('SELECT emergency_stop FROM settings WHERE id = 1');
    res.json({ emergencyStop: rows[0]?.emergency_stop ?? false });
});