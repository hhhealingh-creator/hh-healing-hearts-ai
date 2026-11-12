import fs from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { addDays, format, setHours, setMinutes, subDays } from 'date-fns';
import type {
    ActivityEntry, Agent, Post, Role, Settings, SocialAccount, SocialComment
} from '../src/api/types';

export interface DailyMetric {
    date: string;
    platform: 'facebook' | 'instagram';
    impressions: number;
    reach: number;
    engagement: number;
    followers: number;
}

export interface DB {
    accounts: SocialAccount[];
    posts: Post[];
    comments: SocialComment[];
    agents: Agent[];
    activity: ActivityEntry[];
    settings: Settings;
    system: { emergencyStop: boolean };
    metrics: DailyMetric[];
}

const DB_PATH = path.join(process.cwd(), 'server', 'data', 'db.json');

function seed(): DB {
    const now = new Date();
    const at = (days: number, hour = 10, minute = 0) =>
        setMinutes(setHours(addDays(now, days), hour), minute).toISOString();
    const day = (offset: number) => format(addDays(now, offset), 'yyyy-MM-dd');

    const accounts: SocialAccount[] = [
        {
            id: 'acct_fb', platform: 'facebook', name: 'HH Healing Hearts Inc.',
            handle: '@hhhealinghearts', status: 'connected', followers: 12790,
            lastSyncedAt: at(-1, 6), publishingEnabled: true
        },
        {
            id: 'acct_ig', platform: 'instagram', name: 'HH Healing Hearts Inc.',
            handle: '@hhhealinghearts', status: 'connected', followers: 6530,
            lastSyncedAt: at(-1, 6), publishingEnabled: true
        }
    ];

    const posts: Post[] = [
        {
            id: 'post_1',
            content: 'Healing is not linear — and neither is hope. Today, take one gentle step toward the support you deserve. 💚\n\n#HealingHearts #RestoringHope',
            platforms: ['facebook', 'instagram'], status: 'published',
            publishedAt: at(-2, 9), createdAt: at(-3, 14), createdBy: 'Content Creator Agent',
            metrics: { impressions: 4820, reach: 3710, likes: 286, comments: 34, shares: 41 }
        },
        {
            id: 'post_2',
            content: 'Join us this Saturday for our Community Hope Circle — a safe space for conversation, connection and care. Light refreshments provided. Register at the link in our bio. 🕊️',
            platforms: ['facebook', 'instagram'], status: 'scheduled',
            scheduledFor: at(2, 10), createdAt: at(-1, 11), createdBy: 'Jordan (Admin)'
        },
        {
            id: 'post_3',
            content: 'Every donation helps a neighbor find counseling, community and a pathway forward. This month, your gift goes twice as far thanks to our matching partners. ❤️',
            platforms: ['facebook'], status: 'scheduled',
            scheduledFor: at(5, 15), createdAt: at(-1, 9), createdBy: 'Jordan (Admin)'
        },
        {
            id: 'post_4',
            content: 'Meet our new counseling partner: a team of licensed clinicians offering trauma-informed care to families across our community. Full story coming soon.',
            platforms: ['facebook', 'instagram'], status: 'draft',
            createdAt: at(0, 8), createdBy: 'Content Creator Agent'
        },
        {
            id: 'post_5',
            content: 'A reminder: you are not alone. If today feels heavy, reach out. Our team is here to listen without judgment. 💚',
            platforms: ['instagram'], status: 'published',
            publishedAt: at(-5, 19), createdAt: at(-6, 10), createdBy: 'Casey (Editor)',
            metrics: { impressions: 3110, reach: 2480, likes: 198, comments: 22, shares: 17 }
        },
        {
            id: 'post_6',
            content: 'Annual beneficiary story series — consent checklist and photo releases need review before this can be scheduled.',
            platforms: ['facebook', 'instagram'], status: 'needs_review',
            scheduledFor: at(1, 12), createdAt: at(-1, 16), createdBy: 'Content Creator Agent'
        }
    ];

    const comments: SocialComment[] = [
        {
            id: 'c1', postId: 'post_1', platform: 'instagram', author: 'Maria G.',
            message: 'This is beautiful. Thank you for all you do for our community! 💚',
            createdAt: at(-1, 12), status: 'new'
        },
        {
            id: 'c2', postId: 'post_1', platform: 'facebook', author: 'Darnell W.',
            message: 'Does your program help with medication-assisted treatment? My brother needs advice.',
            createdAt: at(-1, 13), status: 'new'
        },
        {
            id: 'c3', postId: 'post_5', platform: 'instagram', author: 'Priya S.',
            message: 'How can I donate by check? I would like to support the counseling fund.',
            createdAt: at(-1, 15), status: 'new'
        },
        {
            id: 'c4', postId: 'post_1', platform: 'facebook', author: 'Angela R.',
            message: 'I called three times and no one responded. Very disappointed with the follow-up.',
            createdAt: at(-2, 10), status: 'escalated', category: 'complaint',
            assignedTo: 'Human administrator'
        },
        {
            id: 'c5', postId: 'post_5', platform: 'instagram', author: 'Tyler B.',
            message: 'Can you share the name of the family in your last post? I think I know them.',
            createdAt: at(-2, 16), status: 'escalated', category: 'beneficiary',
            assignedTo: 'Human administrator'
        },
        {
            id: 'c6', postId: 'post_1', platform: 'instagram', author: 'Nia K.',
            message: 'Thank you for creating spaces where people feel seen. Sending love.',
            createdAt: at(-3, 8), status: 'auto_replied', category: 'routine',
            reply: 'Thank you for your kind words! 💚 If you would like to learn more about our programs, send us a DM and our team will be happy to help.'
        },
        {
            id: 'c7', postId: 'post_1', platform: 'facebook', author: 'Chris M.',
            message: "I've been having dark thoughts and don't know who to call.",
            createdAt: at(-1, 21), status: 'escalated', category: 'sensitive',
            assignedTo: 'Human administrator'
        }
    ];

    const agents: Agent[] = [
        {
            id: 'content', name: 'Content Creator Agent',
            description: 'Drafts on-brand posts, captions and campaign ideas for human review.',
            enabled: true, mode: 'human_review', lastRunAt: at(0, 8), tasksToday: 4, successRate: 98
        },
        {
            id: 'publishing', name: 'Automatic Publishing Agent',
            description: 'Publishes approved scheduled posts to connected Facebook and Instagram accounts.',
            enabled: true, mode: 'auto', lastRunAt: at(-1, 10), tasksToday: 2, successRate: 100
        },
        {
            id: 'engagement', name: 'Engagement & Comment Agent',
            description: 'Replies to routine comments and escalates sensitive conversations to a human.',
            enabled: true, mode: 'auto', lastRunAt: at(-1, 18), tasksToday: 12, successRate: 96
        },
        {
            id: 'analytics', name: 'Analytics & Reporting Agent',
            description: 'Refreshes performance metrics, follower growth and campaign reporting.',
            enabled: true, mode: 'auto', lastRunAt: at(0, 7), tasksToday: 1, successRate: 100
        }
    ];

    const settings: Settings = {
        orgName: 'HH Healing Hearts Inc.',
        timezone: 'America/New_York',
        autoPublish: true,
        autoReply: true,
        quietHoursStart: '21:00',
        quietHoursEnd: '07:00',
        escalationEmail: 'admin@hhhealinghearts.org',
        credentials: {
            metaAppId: '109384756201',
            metaAppSecretMasked: '••••••••3f7a',
            pageTokenMasked: '••••••••b92c'
        }
    };

    const activity: ActivityEntry[] = [
        {
            id: 'act_1', at: at(-1, 18), actor: 'Engagement & Comment Agent', role: 'admin',
            action: 'Escalated comment', target: 'Chris M. — sensitive language detected'
        },
        {
            id: 'act_2', at: at(-1, 10), actor: 'Automatic Publishing Agent', role: 'admin',
            action: 'Published post', target: 'Healing is not linear — and neither is hope.'
        },
        {
            id: 'act_3', at: at(-2, 16), actor: 'Jordan (Admin)', role: 'admin',
            action: 'Updated agent', target: 'Publishing agent set to automatic'
        },
        {
            id: 'act_4', at: at(-3, 14), actor: 'Content Creator Agent', role: 'admin',
            action: 'Created draft', target: 'Healing is not linear — and neither is hope.'
        }
    ];

    const metrics: DailyMetric[] = [];
    for (let offset = -89; offset <= 0; offset++) {
        const date = day(offset);
        const progress = offset + 90;
        const base = 1800 + progress * 14;
        const wave = Math.sin(progress / 4) * 180 + Math.cos(progress / 9) * 90;

        metrics.push({
            date, platform: 'facebook',
            impressions: Math.round(base + wave),
            reach: Math.round((base + wave) * 0.72),
            engagement: Math.round((base + wave) * 0.052),
            followers: 11800 + progress * 11
        });

        metrics.push({
            date, platform: 'instagram',
            impressions: Math.round(base * 0.8 - wave * 0.5),
            reach: Math.round((base * 0.8 - wave * 0.5) * 0.68),
            engagement: Math.round((base * 0.8 - wave * 0.5) * 0.064),
            followers: 5900 + progress * 7
        });
    }

    return {
        accounts, posts, comments, agents, activity, settings,
        system: { emergencyStop: false }, metrics
    };
}

export function writeDb(db: DB): void {
    fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
    fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2));
}

export function readDb(): DB {
    if (!fs.existsSync(DB_PATH)) {
        const db = seed();
        writeDb(db);
        return db;
    }
    return JSON.parse(fs.readFileSync(DB_PATH, 'utf8')) as DB;
}

export function mutate<T>(fn: (db: DB) => T): T {
    const db = readDb();
    const result = fn(db);
    writeDb(db);
    return result;
}

export function addActivity(
    db: DB,
    actor: { name: string; role: Role },
    action: string,
    target: string,
    detail?: string
): void {
    db.activity.unshift({
        id: `act_${randomUUID()}`,
        at: new Date().toISOString(),
        actor: actor.name,
        role: actor.role,
        action,
        target,
        detail
    });
    db.activity = db.activity.slice(0, 250);
}