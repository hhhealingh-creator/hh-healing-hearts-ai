import type { Agent, CommentCategory, Post, SocialComment } from '../src/api/types';
import type { DB } from './db';

export function classifyComment(message: string): CommentCategory {
    const text = message.toLowerCase();

    if (/(suicide|self[- ]?harm|harm myself|dark thoughts|overdose|crisis|emergency)/.test(text)) {
        return 'sensitive';
    }
    if (/(medication|diagnosis|doctor|treatment|symptom|medical|clinical)/.test(text)) {
        return 'medical';
    }
    if (/(donat|fundrais|sponsor|money|check|give|gift)/.test(text)) {
        return 'donation';
    }
    if (/(beneficiary|client|family in your|recipient|case|their name)/.test(text)) {
        return 'beneficiary';
    }
    if (/(complaint|terrible|worst|angry|refund|scam|no one responded|disappointed)/.test(text)) {
        return 'complaint';
    }
    return 'routine';
}

function autoReplyFor(category: CommentCategory): string {
    if (category === 'routine') {
        return 'Thank you for your kind words! 💚 If you would like to learn more about our programs, send us a DM and our team will be happy to help.';
    }
    return '';
}

function parseTime(value: string): number {
    const [hour, minute] = value.split(':').map(Number);
    return hour * 60 + minute;
}

function isQuietHours(db: DB): boolean {
    try {
        const parts = new Intl.DateTimeFormat('en-US', {
            timeZone: db.settings.timezone,
            hour: '2-digit',
            minute: '2-digit',
            hour12: false
        }).formatToParts(new Date());

        const hour = Number(parts.find((p) => p.type === 'hour')?.value ?? 0);
        const minute = Number(parts.find((p) => p.type === 'minute')?.value ?? 0);
        const now = hour * 60 + minute;
        const start = parseTime(db.settings.quietHoursStart);
        const end = parseTime(db.settings.quietHoursEnd);

        return start < end ? now >= start && now < end : now >= start || now < end;
    } catch {
        return false;
    }
}

function touchAgent(agent: Agent, count: number): void {
    agent.lastRunAt = new Date().toISOString();
    agent.tasksToday += Math.max(count, 1);
}

function publishMetrics(): Post['metrics'] {
    const impressions = Math.round(1400 + Math.random() * 3200);
    const reach = Math.round(impressions * 0.74);
    return {
        impressions,
        reach,
        likes: Math.round(impressions * 0.048),
        comments: Math.round(impressions * 0.008),
        shares: Math.round(impressions * 0.011)
    };
}

export function runAutomation(db: DB, only?: Agent['id']): string[] {
    const actions: string[] = [];
    const now = new Date();

    if (!only || only === 'publishing') {
        const agent = db.agents.find((a) => a.id === 'publishing');
        if (agent?.enabled) {
            const due = db.posts.filter(
                (p) => p.status === 'scheduled' && p.scheduledFor && new Date(p.scheduledFor) <= now
            );

            for (const post of due) {
                if (agent.mode === 'human_review') {
                    post.status = 'needs_review';
                    actions.push(`Publishing agent flagged “${post.content.slice(0, 48)}…” for human review.`);
                } else {
                    post.status = 'published';
                    post.publishedAt = new Date().toISOString();
                    post.metrics = publishMetrics();
                    actions.push(`Published “${post.content.slice(0, 48)}…” to ${post.platforms.join(' and ')}.`);
                }
            }

            if (due.length) touchAgent(agent, due.length);
        }
    }

    if (!only || only === 'engagement') {
        const agent = db.agents.find((a) => a.id === 'engagement');
        if (agent?.enabled) {
            const fresh = db.comments.filter((c) => c.status === 'new' && !c.category);
            let handled = 0;

            for (const comment of fresh) {
                const category = classifyComment(comment.message);

                if (category === 'routine' && isQuietHours(db)) {
                    continue;
                }

                comment.category = category;
                handled += 1;

                if (category === 'routine' && agent.mode === 'auto') {
                    comment.status = 'auto_replied';
                    comment.reply = autoReplyFor(category);
                    actions.push(`Auto-replied to ${comment.author} on ${comment.platform}.`);
                } else {
                    comment.status = 'escalated';
                    comment.assignedTo = 'Human administrator';
                    actions.push(`Escalated ${comment.author} (${category}) to a human administrator.`);
                }
            }

            if (handled) touchAgent(agent, handled);
        }
    }

    return actions;
}