import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
    Area, AreaChart, Bar, BarChart, CartesianGrid, Line, LineChart,
    ResponsiveContainer, Tooltip, XAxis, YAxis
} from 'recharts';
import { Eye, HeartHandshake, MessageSquare, Users } from 'lucide-react';
import { format } from 'date-fns';
import { api } from '../api/client';
import type { AnalyticsRange } from '../api/types';
import { StatCard } from '../components/social';
import {
    Badge, Card, EmptyState, ErrorState, PageHeader, Skeleton
} from '../components/ui';
import { formatNumber } from '../lib/format';

const ranges: AnalyticsRange[] = [7, 30, 90];

export default function Analytics() {
    const [range, setRange] = useState<AnalyticsRange>(30);
    const query = useQuery({
        queryKey: ['analytics', range],
        queryFn: () => api.getAnalytics(range),
        placeholderData: (previous) => previous
    });

    if (query.isLoading && !query.data) {
        return (
            <div className="space-y-6">
                <Skeleton className="h-12 w-64" />
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                    {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-32" />)}
                </div>
                <Skeleton className="h-80" />
            </div>
        );
    }

    if (query.isError || !query.data) {
        return <ErrorState message="Analytics could not be loaded." onRetry={() => query.refetch()} />;
    }

    const { kpis, series, platformBreakdown, topPosts, followerGrowth } = query.data;
    const tooltipStyle = {
        borderRadius: 12,
        border: '1px solid #D8EADF',
        fontSize: 12
    };

    return (
        <div className="space-y-6">
            <PageHeader
                title="Analytics & Reports"
                description="Performance across Facebook and Instagram, refreshed by the Analytics & Reporting Agent."
                actions={
                    <div className="flex gap-1 rounded-xl border border-forest-900/10 bg-white p-1">
                        {ranges.map((value) => (
                            <button
                                key={value}
                                type="button"
                                onClick={() => setRange(value)}
                                aria-pressed={range === value}
                                className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${range === value ? 'bg-forest-600 text-cream-50' : 'text-forest-900/55'
                                    }`}
                            >
                                {value}d
                            </button>
                        ))}
                    </div>
                }
            />

            <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <StatCard label="Total followers" value={formatNumber(kpis.totalFollowers)} change={kpis.followerChange} icon={<Users className="h-5 w-5" />} />
                <StatCard label={`Reach (${range}d)`} value={formatNumber(kpis.reach)} change={kpis.reachChange} icon={<Eye className="h-5 w-5" />} />
                <StatCard label="Engagement rate" value={`${kpis.engagementRate.toFixed(1)}%`} change={kpis.engagementRateChange} icon={<HeartHandshake className="h-5 w-5" />} tone="cream" />
                <StatCard label="Pending comments" value={formatNumber(kpis.pendingComments)} icon={<MessageSquare className="h-5 w-5" />} tone="red" hint={`${kpis.scheduledPosts} scheduled posts`} />
            </section>

            <div className="grid gap-6 xl:grid-cols-2">
                <Card className="p-5">
                    <h2 className="font-display text-lg font-semibold text-forest-900">Impressions over time</h2>
                    <p className="text-xs text-forest-900/55">Facebook and Instagram impressions.</p>
                    <div className="mt-4 h-72">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={series} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#E8D9B8" />
                                <XAxis dataKey="date" tickFormatter={(v) => format(new Date(v), 'MMM d')} tick={{ fontSize: 11 }} />
                                <YAxis tickFormatter={(v) => formatNumber(Number(v))} tick={{ fontSize: 11 }} />
                                <Tooltip contentStyle={tooltipStyle} labelFormatter={(v) => format(new Date(v), 'MMM d, yyyy')} formatter={(value) => formatNumber(Number(value))} />
                                <Area type="monotone" dataKey="facebook" stackId="1" stroke="#1B4332" fill="#B3D4C1" name="Facebook" />
                                <Area type="monotone" dataKey="instagram" stackId="1" stroke="#C1121F" fill="#FDE8E8" name="Instagram" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </Card>

                <Card className="p-5">
                    <h2 className="font-display text-lg font-semibold text-forest-900">Reach and engagement</h2>
                    <p className="text-xs text-forest-900/55">Platform contribution for the selected period.</p>
                    <div className="mt-4 h-72">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={platformBreakdown} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#E8D9B8" />
                                <XAxis dataKey="platform" tick={{ fontSize: 11 }} />
                                <YAxis tickFormatter={(v) => formatNumber(Number(v))} tick={{ fontSize: 11 }} />
                                <Tooltip contentStyle={tooltipStyle} formatter={(value) => formatNumber(Number(value))} />
                                <Bar dataKey="reach" fill="#2D6A4F" radius={[6, 6, 0, 0]} name="Reach" />
                                <Bar dataKey="engagement" fill="#C1121F" radius={[6, 6, 0, 0]} name="Engagement" />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </Card>
            </div>

            <Card className="p-5">
                <h2 className="font-display text-lg font-semibold text-forest-900">Follower growth</h2>
                <p className="text-xs text-forest-900/55">Combined audience across connected accounts.</p>
                <div className="mt-4 h-64">
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={followerGrowth} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#E8D9B8" />
                            <XAxis dataKey="date" tickFormatter={(v) => format(new Date(v), 'MMM d')} tick={{ fontSize: 11 }} />
                            <YAxis tickFormatter={(v) => formatNumber(Number(v))} tick={{ fontSize: 11 }} domain={['auto', 'auto']} />
                            <Tooltip contentStyle={tooltipStyle} labelFormatter={(v) => format(new Date(v), 'MMM d, yyyy')} formatter={(value) => formatNumber(Number(value))} />
                            <Line type="monotone" dataKey="followers" stroke="#1B4332" strokeWidth={2.5} dot={false} name="Followers" />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            </Card>

            <Card className="overflow-hidden">
                <div className="border-b border-forest-900/10 px-5 py-4">
                    <h2 className="font-display text-lg font-semibold text-forest-900">Top posts</h2>
                    <p className="text-xs text-forest-900/55">Best performing published content by impressions.</p>
                </div>
                {topPosts.length ? (
                    <div className="overflow-x-auto">
                        <table className="w-full min-w-[640px] text-left text-sm">
                            <thead className="bg-cream-50 text-[11px] uppercase tracking-wide text-forest-900/45">
                                <tr>
                                    <th className="px-5 py-3 font-semibold">Post</th>
                                    <th className="px-3 py-3 font-semibold">Platforms</th>
                                    <th className="px-3 py-3 text-right font-semibold">Impressions</th>
                                    <th className="px-3 py-3 text-right font-semibold">Reach</th>
                                    <th className="px-5 py-3 text-right font-semibold">Engagement</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-forest-900/5">
                                {topPosts.map((post) => (
                                    <tr key={post.id}>
                                        <td className="max-w-sm px-5 py-3">
                                            <p className="line-clamp-2 text-forest-900">{post.content}</p>
                                        </td>
                                        <td className="px-3 py-3">
                                            <div className="flex gap-1">
                                                {post.platforms.map((platform) => (
                                                    <Badge key={platform} tone={platform === 'facebook' ? 'blue' : 'red'}>{platform}</Badge>
                                                ))}
                                            </div>
                                        </td>
                                        <td className="px-3 py-3 text-right text-forest-900/70">{formatNumber(post.metrics?.impressions ?? 0)}</td>
                                        <td className="px-3 py-3 text-right text-forest-900/70">{formatNumber(post.metrics?.reach ?? 0)}</td>
                                        <td className="px-5 py-3 text-right text-forest-900/70">
                                            {formatNumber((post.metrics?.likes ?? 0) + (post.metrics?.comments ?? 0) + (post.metrics?.shares ?? 0))}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <div className="p-5"><EmptyState title="No published posts yet" description="Publish content to populate performance reporting." /></div>
                )}
            </Card>
        </div>
    );
}