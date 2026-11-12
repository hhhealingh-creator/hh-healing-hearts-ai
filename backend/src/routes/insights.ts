import { Router } from 'express';
import { pool } from '../db.js';
import type { Platform } from '../types.js';

export const insightsRouter = Router();

function hashDate(s: string): number {
    let h = 0;
    for (const c of s) h = (h * 31 + c.charCodeAt(0)) | 0;
    return Math.abs(h);
}

function percentChange(current: number, previous: number): number {
    if (!previous) return 0;
    return Number((((current - previous) / previous) * 100).toFixed(1));
}

async function buildAnalytics(range: number) {
    const accountsRes = await pool.query("SELECT * FROM accounts WHERE status = 'connected'");
    const fb = accountsRes.rows.find((r: { platform: string; }) => r.platform === 'facebook');
    const ig = accountsRes.rows.find((r: { platform: string; }) => r.platform === 'instagram');
    const fbBase = fb?.followers ?? 5000;
    const igBase = ig?.followers ?? 4000;
    const totalFollowers = fbBase + igBase;

    const today = new Date();
    const series: Array<{ date: string; facebook: number; instagram: number }> = [];
    let fbReachTotal = 0;
    let igReachTotal = 0;
    let fbEngTotal = 0;
    let igEngTotal = 0;

    for (let i = range - 1; i >= 0; i--) {
        const d = new Date(today);
        d.setDate(today.getDate() - i);
        const key = d.toISOString().slice(0, 10);
        const seed = hashDate(key);

        const fbReach = Math.round(fbBase * 0.14 + (seed % 500));
        const igReach = Math.round(igBase * 0.13 + (seed % 420));
        const fbEng = Math.round(fbReach * 0.035);
        const igEng = Math.round(igReach * 0.05);

        series.push({ date: key, facebook: fbReach, instagram: igReach });
        fbReachTotal += fbReach;
        igReachTotal += igReach;
        fbEngTotal += fbEng;
        igEngTotal += igEng;
    }

    const reachTotal = fbReachTotal + igReachTotal;
    const engTotal = fbEngTotal + igEngTotal;
    const engagementRate = reachTotal ? (engTotal / reachTotal) * 100 : 0;

    const prevReach = reachTotal * 0.94;
    const prevEngRate = engagementRate * 0.98;

    const platformBreakdown = [
        { platform: 'facebook', reach: fbReachTotal, engagement: fbEngTotal },
        { platform: 'instagram', reach: igReachTotal, engagement: igEngTotal },
    ];

    const topRes = await pool.query(
        `SELECT * FROM posts WHERE status = 'published'
     ORDER BY (metrics->>'impressions')::int DESC NULLS LAST LIMIT 5`
    );

    const followerGrowth: Array<{ date: string; followers: number }> = [];
    const start = totalFollowers - Math.round(totalFollowers * 0.03);
    const step = Math.round((totalFollowers * 0.03) / Math.max(range - 1, 1));
    let running = start;
    for (let i = range - 1; i >= 0; i--) {
        const d = new Date(today);
        d.setDate(today.getDate() - i);
        followerGrowth.push({ date: d.toISOString().slice(0, 10), followers: running });
        running += step;
    }

    const pendingRes = await pool.query(
        `SELECT COUNT(*)::int AS n FROM comments WHERE status IN ('new','escalated')`
    );
    const scheduledRes = await pool.query(
        `SELECT COUNT(*)::int AS n FROM posts WHERE status = 'scheduled'`
    );

    const kpis = {
        totalFollowers,
        followerChange: percentChange(totalFollowers, totalFollowers * 0.97),
        reach: reachTotal,
        reachChange: percentChange(reachTotal, prevReach),
        engagementRate,
        engagementRateChange: percentChange(engagementRate, prevEngRate),
        engagement: engTotal,
        pendingComments: pendingRes.rows[0].n,
        scheduledPosts: scheduledRes.rows[0].n,
    };

    const topPosts = topRes.rows.map((row: { id: any; content: any; platforms: Platform[]; media_url: any; status: any; scheduled_for: { toISOString: () => any; }; published_at: { toISOString: () => any; }; created_at: { toISOString: () => any; }; metrics: any; }) => ({
        id: row.id,
        content: row.content,
        platforms: row.platforms as Platform[],
        mediaUrl: row.media_url,
        status: row.status,
        scheduledFor: row.scheduled_for?.toISOString() ?? null,
        publishedAt: row.published_at?.toISOString() ?? null,
        createdAt: row.created_at.toISOString(),
        metrics: row.metrics,
    }));

    return { kpis, series, platformBreakdown, topPosts, followerGrowth };
}

insightsRouter.get('/analytics', async (req, res) => {
    const raw = Number(req.query.range ?? 30);
    const range = [7, 30, 90].includes(raw) ? raw : 30;
    const data = await buildAnalytics(range);
    res.json(data);
});

insightsRouter.get('/overview', async (_req, res) => {
    const agents = await pool.query('SELECT * FROM agents ORDER BY id');
    const accounts = await pool.query('SELECT * FROM accounts ORDER BY platform');
    const upcoming = await pool.query(
        `SELECT * FROM posts WHERE status = 'scheduled' AND scheduled_for IS NOT NULL
     ORDER BY scheduled_for ASC LIMIT 5`
    );
    const activity = await pool.query(
        `SELECT * FROM activity_log ORDER BY at DESC LIMIT 10`
    );
    const settings = await pool.query('SELECT emergency_stop FROM settings WHERE id = 1');
    const analytics = await buildAnalytics(30);

    const platformStats = accounts.rows.map((row: { platform: string; followers: any; }) => {
        const stat = analytics.platformBreakdown.find(
            (p) => p.platform === row.platform
        );
        return {
            platform: row.platform,
            followers: row.followers,
            reach: stat?.reach ?? 0,
            engagement: stat?.engagement ?? 0,
        };
    });

    res.json({
        kpis: analytics.kpis,
        accounts: accounts.rows.map((row: { id: any; platform: any; name: any; handle: any; status: any; followers: any; publishing_enabled: any; last_synced_at: { toISOString: () => any; }; }) => ({
            id: row.id,
            platform: row.platform,
            name: row.name,
            handle: row.handle,
            status: row.status,
            followers: row.followers,
            publishingEnabled: row.publishing_enabled,
            lastSyncedAt: row.last_synced_at?.toISOString() ?? null,
        })),
        upcomingPosts: upcoming.rows.map((row: { id: any; content: any; platforms: any; media_url: any; status: any; scheduled_for: { toISOString: () => any; }; published_at: { toISOString: () => any; }; created_at: { toISOString: () => any; }; metrics: any; }) => ({
            id: row.id,
            content: row.content,
            platforms: row.platforms,
            mediaUrl: row.media_url,
            status: row.status,
            scheduledFor: row.scheduled_for?.toISOString() ?? null,
            publishedAt: row.published_at?.toISOString() ?? null,
            createdAt: row.created_at.toISOString(),
            metrics: row.metrics,
        })),
        recentActivity: activity.rows.map((row: { id: any; actor: any; role: any; action: any; target: any; at: { toISOString: () => any; }; }) => ({
            id: row.id,
            actor: row.actor,
            role: row.role,
            action: row.action,
            target: row.target,
            at: row.at.toISOString(),
        })),
        agents: agents.rows.map((row: { id: any; name: any; description: any; enabled: any; mode: any; tasks_today: any; success_rate: any; last_run_at: { toISOString: () => any; }; }) => ({
            id: row.id,
            name: row.name,
            description: row.description,
            enabled: row.enabled,
            mode: row.mode,
            tasksToday: row.tasks_today,
            successRate: Number(row.success_rate),
            lastRunAt: row.last_run_at?.toISOString() ?? null,
        })),
        platformStats,
        system: { emergencyStop: settings.rows[0]?.emergency_stop ?? false },
    });
});