import { eachDayOfInterval, format, subDays } from 'date-fns';
import type {
    AnalyticsResponse, Kpis, Platform, Post
} from '../src/api/types';
import type { DB } from './db';

const sum = <T>(rows: T[], key: keyof T): number =>
    rows.reduce((total, row) => total + Number(row[key] ?? 0), 0);

function change(current: number, previous: number): number {
    if (!previous) return 0;
    return ((current - previous) / previous) * 100;
}

export function buildKpis(db: DB, days = 30): Kpis {
    const today = new Date();
    const start = format(subDays(today, days - 1), 'yyyy-MM-dd');
    const prevStart = format(subDays(today, days * 2 - 1), 'yyyy-MM-dd');
    const prevEnd = format(subDays(today, days), 'yyyy-MM-dd');

    const current = db.metrics.filter((m) => m.date >= start);
    const previous = db.metrics.filter((m) => m.date >= prevStart && m.date <= prevEnd);

    const totalFollowers = db.accounts
        .filter((a) => a.status === 'connected')
        .reduce((total, a) => total + a.followers, 0);

    const dates = [...new Set(current.map((m) => m.date))].sort();
    const followerAt = (date: string) =>
        db.metrics.filter((m) => m.date === date).reduce((total, m) => total + m.followers, 0);

    const followerChange =
        dates.length > 1 ? change(followerAt(dates[dates.length - 1]), followerAt(dates[0])) : 0;

    const reach = sum(current, 'reach');
    const engagement = sum(current, 'engagement');
    const previousReach = sum(previous, 'reach');
    const previousEngagement = sum(previous, 'engagement');
    const engagementRate = reach ? (engagement / reach) * 100 : 0;
    const previousRate = previousReach ? (previousEngagement / previousReach) * 100 : 0;

    return {
        totalFollowers,
        followerChange,
        reach,
        reachChange: change(reach, previousReach),
        engagement,
        engagementChange: change(engagement, previousEngagement),
        engagementRate,
        engagementRateChange: change(engagementRate, previousRate),
        pendingComments: db.comments.filter(
            (c) => c.status === 'new' || c.status === 'escalated'
        ).length,
        scheduledPosts: db.posts.filter((p) => p.status === 'scheduled').length
    };
}

export function buildAnalytics(db: DB, days: number): AnalyticsResponse {
    const today = new Date();
    const start = subDays(today, days - 1);
    const startKey = format(start, 'yyyy-MM-dd');
    const dates = eachDayOfInterval({ start, end: today }).map((d) => format(d, 'yyyy-MM-dd'));

    const series = dates.map((date) => ({
        date, facebook: 0, instagram: 0, impressions: 0, reach: 0, engagement: 0
    }));
    const points = new Map(series.map((point) => [point.date, point]));

    for (const metric of db.metrics.filter((m) => m.date >= startKey)) {
        const point = points.get(metric.date);
        if (!point) continue;
        point.impressions += metric.impressions;
        point.reach += metric.reach;
        point.engagement += metric.engagement;
        point[metric.platform] += metric.impressions;
    }

    const followerGrowth = dates.map((date) => ({
        date,
        followers: db.metrics
            .filter((m) => m.date === date)
            .reduce((total, m) => total + m.followers, 0)
    }));

    const platformBreakdown = (['facebook', 'instagram'] as Platform[]).map((platform) => {
        const rows = db.metrics.filter((m) => m.platform === platform && m.date >= startKey);
        return {
            platform,
            impressions: sum(rows, 'impressions'),
            reach: sum(rows, 'reach'),
            engagement: sum(rows, 'engagement')
        };
    });

    const topPosts = db.posts
        .filter((p) => p.status === 'published' && p.metrics)
        .sort((a, b) => (b.metrics?.impressions ?? 0) - (a.metrics?.impressions ?? 0))
        .slice(0, 5);

    return {
        range: days,
        kpis: buildKpis(db, days),
        series,
        platformBreakdown,
        topPosts,
        followerGrowth
    };
}