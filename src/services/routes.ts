import { Router } from 'express';
import { randomUUID } from 'node:crypto';
import { format, subDays } from 'date-fns';
import type {
    Agent, AgentId, Platform, Post, PostInput, Role, SocialComment
} from '../api/types';
import { addActivity, mutate, readDb, type DB } from '../../server/db';
import { asyncHandler, httpError, requireRole } from '../../server/middleware';
import { runAutomation } from '../../server/automation';
import { buildAnalytics, buildKpis } from '../../server/analytics';
import { publishToMeta } from './meta';

export const router = Router();

const AGENT_IDS: AgentId[] = ['content', 'publishing', 'engagement', 'analytics'];

function systemStatus(db: DB) {
    const runs = db.agents
        .map((a) => a.lastRunAt)
        .filter((v): v is string => Boolean(v))
        .sort();

    return {
        emergencyStop: db.system.emergencyStop,
        lastAutomationRun: runs.length ? runs[runs.length - 1] : null,
        activeAgents: db.agents.filter((a) => a.enabled).length
    };
}

function actor(req: { user: { role: Role; name: string } }) {
    return req.user;
}

function validatePlatforms(platforms: unknown): Platform[] {
    if (!Array.isArray(platforms) || !platforms.length) {
        throw httpError(400, 'Select at least one platform.');
    }
    const valid = platforms.filter(
        (p): p is Platform => p === 'facebook' || p === 'instagram'
    );
    if (!valid.length) throw httpError(400, 'Select Facebook, Instagram or both.');
    return [...new Set(valid)];
}

async function publishPostById(id: string, user: { role: Role; name: string }): Promise<Post> {
    const snapshot = readDb();
    const post = snapshot.posts.find((p) => p.id === id);
    if (!post) throw httpError(404, 'Post not found.');
    if (post.status === 'published') return post;
    if (snapshot.system.emergencyStop) {
        throw httpError(423, 'Emergency stop is active. Clear it before publishing.');
    }
    if (!['admin', 'editor'].includes(user.role)) {
        throw httpError(403, 'Your role cannot publish posts.');
    }

    for (const platform of post.platforms) {
        const account = snapshot.accounts.find((a) => a.platform === platform);
        if (!account || account.status !== 'connected') {
            throw httpError(409, `${platform} is not connected.`);
        }
        if (!account.publishingEnabled) {
            throw httpError(409, `Publishing is paused for ${platform}.`);
        }
    }

    const results = await Promise.all(
        post.platforms.map((platform) => publishToMeta(post, platform))
    );
    const failure = results.find((result) => !result.ok);

    mutate((db) => {
        const current = db.posts.find((p) => p.id === id);
        if (!current) return;
        if (failure) {
            current.status = 'failed';
        } else {
            current.status = 'published';
            current.publishedAt = new Date().toISOString();
            current.metrics = {
                impressions: Math.round(1600 + Math.random() * 3200),
                reach: 0,
                likes: 0,
                comments: 0,
                shares: 0
            };
            current.metrics.reach = Math.round(current.metrics.impressions * 0.73);
            current.metrics.likes = Math.round(current.metrics.impressions * 0.046);
            current.metrics.comments = Math.round(current.metrics.impressions * 0.007);
            current.metrics.shares = Math.round(current.metrics.impressions * 0.01);
        }

        addActivity(
            db,
            user,
            failure ? 'Post publish failed' : 'Published post',
            current.content.slice(0, 70)
        );
    });

    if (failure) throw httpError(502, failure.error ?? 'Publishing failed.');
    return readDb().posts.find((p) => p.id === id)!;
}

router.get('/health', (_req, res) => {
    res.json({ ok: true, service: 'hh-ai-manager', time: new Date().toISOString() });
});

router.get('/overview', (_req, res) => {
    const db = readDb();
    const start = format(subDays(new Date(), 29), 'yyyy-MM-dd');

    const platformStats = (['facebook', 'instagram'] as Platform[]).map((platform) => {
        const rows = db.metrics.filter((m) => m.platform === platform && m.date >= start);
        const account = db.accounts.find((a) => a.platform === platform);
        return {
            platform,
            followers: account?.followers ?? 0,
            reach: rows.reduce((total, m) => total + m.reach, 0),
            engagement: rows.reduce((total, m) => total + m.engagement, 0)
        };
    });

    res.json({
        kpis: buildKpis(db, 30),
        accounts: db.accounts,
        upcomingPosts: db.posts
            .filter((p) => p.status === 'scheduled' && p.scheduledFor)
            .sort((a, b) => new Date(a.scheduledFor!).getTime() - new Date(b.scheduledFor!).getTime())
            .slice(0, 5),
        recentActivity: db.activity.slice(0, 8),
        agents: db.agents,
        system: systemStatus(db),
        platformStats
    });
});

router.get('/accounts', (_req, res) => {
    res.json(readDb().accounts);
});

router.patch(
    '/accounts/:id',
    requireRole('admin', 'editor'),
    (req, res, next) => {
        try {
            const { publishingEnabled } = req.body;
            if (typeof publishingEnabled !== 'boolean') {
                throw httpError(400, 'publishingEnabled must be a boolean.');
            }

            const account = mutate((db) => {
                const found = db.accounts.find((a) => a.id === req.params.id);
                if (!found) throw httpError(404, 'Account not found.');
                found.publishingEnabled = publishingEnabled;
                addActivity(
                    db,
                    actor(req),
                    publishingEnabled ? 'Enabled publishing' : 'Paused publishing',
                    found.platform
                );
                return found;
            });

            res.json(account);
        } catch (error) {
            next(error);
        }
    }
);

router.get('/posts', (req, res) => {
    const db = readDb();
    const status = req.query.status as string | undefined;
    const rows = status ? db.posts.filter((p) => p.status === status) : db.posts;
    res.json(rows);
});

router.post(
    '/posts',
    requireRole('admin', 'editor'),
    asyncHandler(async (req, res) => {
        const body = req.body as PostInput;
        if (!body.content?.trim()) throw httpError(400, 'Post content is required.');

        const platforms = validatePlatforms(body.platforms);
        if (platforms.includes('instagram') && body.content.length > 2200) {
            throw httpError(400, 'Instagram captions are limited to 2,200 characters.');
        }

        const scheduledFor =
            body.scheduledFor && !Number.isNaN(new Date(body.scheduledFor).getTime())
                ? new Date(body.scheduledFor).toISOString()
                : undefined;

        const created = mutate((db) => {
            const post: Post = {
                id: `post_${randomUUID()}`,
                content: body.content.trim(),
                platforms,
                mediaUrl: body.mediaUrl?.trim() || undefined,
                status: scheduledFor ? 'scheduled' : 'draft',
                scheduledFor,
                createdAt: new Date().toISOString(),
                createdBy: actor(req).name
            };
            db.posts.unshift(post);
            addActivity(db, actor(req), 'Created post', post.content.slice(0, 70));
            return post;
        });

        if (body.publishNow) {
            const published = await publishPostById(created.id, actor(req));
            res.status(201).json(published);
            return;
        }

        res.status(201).json(created);
    })
);

router.patch(
    '/posts/:id',
    requireRole('admin', 'editor'),
    (req, res, next) => {
        try {
            const updated = mutate((db) => {
                const post = db.posts.find((p) => p.id === req.params.id);
                if (!post) throw httpError(404, 'Post not found.');
                if (post.status === 'published') throw httpError(409, 'Published posts cannot be edited.');

                if (typeof req.body.content === 'string') post.content = req.body.content.trim();
                if (Array.isArray(req.body.platforms)) post.platforms = validatePlatforms(req.body.platforms);
                if (typeof req.body.mediaUrl === 'string') post.mediaUrl = req.body.mediaUrl.trim() || undefined;
                if (typeof req.body.scheduledFor === 'string') {
                    post.scheduledFor = new Date(req.body.scheduledFor).toISOString();
                    post.status = 'scheduled';
                }

                addActivity(db, actor(req), 'Updated post', post.content.slice(0, 70));
                return post;
            });

            res.json(updated);
        } catch (error) {
            next(error);
        }
    }
);

router.delete(
    '/posts/:id',
    requireRole('admin', 'editor'),
    (req, res, next) => {
        try {
            mutate((db) => {
                const post = db.posts.find((p) => p.id === req.params.id);
                if (!post) throw httpError(404, 'Post not found.');
                if (post.status === 'published') {
                    throw httpError(409, 'Published posts cannot be deleted from this interface.');
                }
                db.posts = db.posts.filter((p) => p.id !== req.params.id);
                addActivity(db, actor(req), 'Deleted post', post.content.slice(0, 70));
            });
            res.status(204).end();
        } catch (error) {
            next(error);
        }
    }
);

router.post(
    '/posts/:id/publish',
    requireRole('admin', 'editor'),
    asyncHandler(async (req, res) => {
        res.json(await publishPostById(req.params.id, actor(req)));
    })
);

router.get('/comments', (req, res) => {
    const db = readDb();
    const status = req.query.status as string | undefined;
    const rows = status ? db.comments.filter((c) => c.status === status) : db.comments;
    res.json(rows);
});

router.post(
    '/comments/:id/reply',
    requireRole('admin', 'editor'),
    (req, res, next) => {
        try {
            const reply = typeof req.body.reply === 'string' ? req.body.reply.trim() : '';
            if (!reply) throw httpError(400, 'Reply text is required.');

            const comment = mutate((db) => {
                const found = db.comments.find((c) => c.id === req.params.id);
                if (!found) throw httpError(404, 'Comment not found.');
                found.reply = reply;
                found.status = 'resolved';
                found.assignedTo = actor(req).name;
                addActivity(db, actor(req), 'Replied to comment', `${found.author} on ${found.platform}`);
                return found;
            });

            res.json(comment);
        } catch (error) {
            next(error);
        }
    }
);

router.post(
    '/comments/:id/escalate',
    requireRole('admin', 'editor'),
    (req, res, next) => {
        try {
            const comment = mutate((db) => {
                const found = db.comments.find((c) => c.id === req.params.id);
                if (!found) throw httpError(404, 'Comment not found.');
                found.status = 'escalated';
                found.assignedTo = 'Human administrator';
                addActivity(db, actor(req), 'Escalated comment', `${found.author} on ${found.platform}`);
                return found;
            });
            res.json(comment);
        } catch (error) {
            next(error);
        }
    }
);

router.post(
    '/comments/:id/resolve',
    requireRole('admin', 'editor'),
    (req, res, next) => {
        try {
            const comment = mutate((db) => {
                const found = db.comments.find((c) => c.id === req.params.id);
                if (!found) throw httpError(404, 'Comment not found.');
                found.status = 'resolved';
                addActivity(db, actor(req), 'Resolved comment', `${found.author} on ${found.platform}`);
                return found;
            });
            res.json(comment);
        } catch (error) {
            next(error);
        }
    }
);

router.get('/agents', (_req, res) => {
    res.json(readDb().agents);
});

router.patch(
    '/agents/:id',
    requireRole('admin'),
    (req, res, next) => {
        try {
            const id = req.params.id as AgentId;
            if (!AGENT_IDS.includes(id)) throw httpError(404, 'Agent not found.');

            const agent = mutate((db) => {
                const found = db.agents.find((a) => a.id === id);
                if (!found) throw httpError(404, 'Agent not found.');
                if (typeof req.body.enabled === 'boolean') found.enabled = req.body.enabled;
                if (req.body.mode === 'auto' || req.body.mode === 'human_review') {
                    found.mode = req.body.mode;
                }
                addActivity(
                    db,
                    actor(req),
                    'Updated agent',
                    `${found.name} — ${found.enabled ? 'enabled' : 'disabled'}, ${found.mode}`
                );
                return found;
            });

            res.json(agent);
        } catch (error) {
            next(error);
        }
    }
);

router.post(
    '/agents/:id/run',
    requireRole('admin', 'editor'),
    (req, res, next) => {
        try {
            const id = req.params.id as AgentId;
            if (!AGENT_IDS.includes(id)) throw httpError(404, 'Agent not found.');

            const actions = mutate((db) => {
                if (db.system.emergencyStop) {
                    throw httpError(423, 'Emergency stop is active. Clear it before running agents.');
                }

                const agent = db.agents.find((a) => a.id === id)!;
                let result: string[] = [];

                if (id === 'content') {
                    const draft: Post = {
                        id: `post_${randomUUID()}`,
                        content:
                            'A gentle reminder from HH Healing Hearts: hope grows in community. Join us this week for a conversation about healing, support and new beginnings. 💚',
                        platforms: ['facebook', 'instagram'],
                        status: 'draft',
                        createdAt: new Date().toISOString(),
                        createdBy: 'Content Creator Agent'
                    };
                    db.posts.unshift(draft);
                    result = ['Created a new draft for human review.'];
                } else if (id === 'analytics') {
                    result = ['Refreshed performance reporting and follower growth data.'];
                } else {
                    result = runAutomation(db, id);
                    if (!result.length) result = ['No due work found. The agent is standing by.'];
                }

                agent.lastRunAt = new Date().toISOString();
                agent.tasksToday += Math.max(result.length, 1);
                result.forEach((message) =>
                    addActivity(db, { name: agent.name, role: 'admin' }, 'Agent run', message)
                );
                return result;
            });

            res.json({ ok: true, actions });
        } catch (error) {
            next(error);
        }
    }
);

router.get('/analytics', (req, res) => {
    const days = Math.min(Math.max(Number(req.query.days) || 30, 1), 365);
    res.json(buildAnalytics(readDb(), days));
});

router.get('/integrations', (_req, res) => {
    const db = readDb();
    res.json({
        accounts: db.accounts,
        webhookUrl: 'https://api.hhhealinghearts.org/webhooks/meta',
        graphVersion: 'v21.0'
    });
});

router.post(
    '/integrations/:platform/connect',
    requireRole('admin'),
    (req, res, next) => {
        try {
            const platform = req.params.platform as Platform;
            if (!['facebook', 'instagram'].includes(platform)) {
                throw httpError(400, 'Unsupported platform.');
            }

            const account = mutate((db) => {
                const found = db.accounts.find((a) => a.platform === platform);
                if (!found) throw httpError(404, 'Account not found.');
                found.status = 'connected';
                found.lastSyncedAt = new Date().toISOString();
                addActivity(db, actor(req), 'Connected account', platform);
                return found;
            });

            res.json(account);
        } catch (error) {
            next(error);
        }
    }
);

router.delete(
    '/integrations/:platform',
    requireRole('admin'),
    (req, res, next) => {
        try {
            const platform = req.params.platform as Platform;
            if (!['facebook', 'instagram'].includes(platform)) {
                throw httpError(400, 'Unsupported platform.');
            }

            const account = mutate((db) => {
                const found = db.accounts.find((a) => a.platform === platform);
                if (!found) throw httpError(404, 'Account not found.');
                found.status = 'disconnected';
                found.lastSyncedAt = null;
                found.publishingEnabled = false;
                addActivity(db, actor(req), 'Disconnected account', platform);
                return found;
            });

            res.json(account);
        } catch (error) {
            next(error);
        }
    }
);

router.post(
    '/integrations/:platform/sync',
    requireRole('admin', 'editor'),
    (req, res, next) => {
        try {
            const platform = req.params.platform as Platform;
            if (!['facebook', 'instagram'].includes(platform)) {
                throw httpError(400, 'Unsupported platform.');
            }

            const account = mutate((db) => {
                const found = db.accounts.find((a) => a.platform === platform);
                if (!found) throw httpError(404, 'Account not found.');
                if (found.status !== 'connected') throw httpError(409, 'Account is not connected.');
                found.lastSyncedAt = new Date().toISOString();
                found.followers += Math.floor(Math.random() * 18);
                addActivity(db, actor(req), 'Synced account', platform);
                return found;
            });

            res.json(account);
        } catch (error) {
            next(error);
        }
    }
);

router.get('/settings', (_req, res) => {
    res.json(readDb().settings);
});

router.patch(
    '/settings',
    requireRole('admin'),
    (req, res, next) => {
        try {
            const allowed = [
                'orgName', 'timezone', 'autoPublish', 'autoReply',
                'quietHoursStart', 'quietHoursEnd', 'escalationEmail'
            ] as const;

            const settings = mutate((db) => {
                for (const key of allowed) {
                    if (Object.prototype.hasOwnProperty.call(req.body, key)) {
                        (db.settings as unknown as Record<string, unknown>)[key] = req.body[key];
                    }
                }
                addActivity(db, actor(req), 'Updated settings', 'Organization settings');
                return db.settings;
            });

            res.json(settings);
        } catch (error) {
            next(error);
        }
    }
);

router.post(
    '/settings/credentials',
    requireRole('admin'),
    (req, res, next) => {
        try {
            const { metaAppId, metaAppSecret, pageToken } = req.body as Record<string, string>;

            const settings = mutate((db) => {
                if (metaAppId?.trim()) db.settings.credentials.metaAppId = metaAppId.trim();
                if (metaAppSecret?.trim()) {
                    db.settings.credentials.metaAppSecretMasked = `••••••••${metaAppSecret.slice(-4)}`;
                }
                if (pageToken?.trim()) {
                    db.settings.credentials.pageTokenMasked = `••••••••${pageToken.slice(-4)}`;
                }
                addActivity(db, actor(req), 'Rotated credentials', 'Meta API credentials');
                return db.settings;
            });

            res.json(settings);
        } catch (error) {
            next(error);
        }
    }
);

router.get('/activity', (req, res) => {
    const limit = Math.min(Number(req.query.limit) || 50, 200);
    res.json(readDb().activity.slice(0, limit));
});

router.get('/system/status', (_req, res) => {
    res.json(systemStatus(readDb()));
});

router.post(
    '/system/emergency-stop',
    requireRole('admin'),
    (req, res, next) => {
        try {
            if (typeof req.body.stopped !== 'boolean') {
                throw httpError(400, 'stopped must be a boolean.');
            }

            const status = mutate((db) => {
                db.system.emergencyStop = req.body.stopped;
                addActivity(
                    db,
                    actor(req),
                    req.body.stopped ? 'Emergency stop activated' : 'Emergency stop cleared',
                    'Automation and publishing'
                );
                return systemStatus(db);
            });

            res.json(status);
        } catch (error) {
            next(error);
        }
    }
);