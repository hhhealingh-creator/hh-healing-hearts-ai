import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
    ArrowRight, Bot, CalendarDays, Eye, HeartHandshake, MessageSquare, Plus, Users
} from 'lucide-react';
import { api } from '../api/client';
import { useSystemStatus } from '../hooks/useSystemStatus';
import { ActivityFeed, PlatformBadge, StatCard } from '../components/social';
import {
    Button, Card, EmptyState, ErrorState, PageHeader, Skeleton, cn
} from '../components/ui';
import { formatDateTime, formatNumber, formatPercent } from '../lib/format';

function OverviewSkeleton() {
    return (
        <div className="space-y-6">
            <Skeleton className="h-12 w-64" />
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-32" />)}
            </div>
            <div className="grid gap-6 xl:grid-cols-3">
                <Skeleton className="h-80 xl:col-span-2" />
                <Skeleton className="h-80" />
            </div>
        </div>
    );
}

export default function Overview() {
    const query = useQuery({
        queryKey: ['overview'],
        queryFn: api.getOverview,
        refetchInterval: 60_000
    });
    const systemQuery = useSystemStatus();

    if (query.isLoading) return <OverviewSkeleton />;
    if (query.isError || !query.data) {
        return <ErrorState message="The overview could not be loaded." onRetry={() => query.refetch()} />;
    }

    const { kpis, accounts, upcomingPosts, recentActivity, agents, platformStats } = query.data;
    const system = systemQuery.data ?? query.data.system;

    return (
        <div className="space-y-6">
            <PageHeader
                title="Overview Dashboard"
                description="A live view of HH Healing Hearts Inc. social operations, automation health and the conversations that need a human touch."
                actions={
                    <Link to="/studio">
                        <Button>
                            <Plus className="h-4 w-4" aria-hidden />
                            Create post
                        </Button>
                    </Link>
                }
            />

            <section className="overflow-hidden rounded-2xl bg-forest-800 p-6 text-cream-50 sm:p-8">
                <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                    <div className="max-w-2xl">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-cream-200/60">
                            HH Healing Hearts Inc.
                        </p>
                        <h2 className="mt-2 font-display text-2xl font-semibold leading-tight sm:text-3xl">
                            Touching Hearts. Transforming Lives. Restoring Hope.
                        </h2>
                        <p className="mt-2 max-w-xl text-sm text-cream-100/70">
                            Four specialist agents work alongside your team. Sensitive, medical, donation and beneficiary-related conversations are always routed to a human administrator.
                        </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        <Link to="/inbox">
                            <Button variant="secondary">
                                <MessageSquare className="h-4 w-4" aria-hidden />
                                Open inbox
                            </Button>
                        </Link>
                        <Link to="/agents">
                            <Button variant="outline" className="border-cream-100/30 text-cream-50 hover:bg-white/10">
                                <Bot className="h-4 w-4" aria-hidden />
                                Agent controls
                            </Button>
                        </Link>
                    </div>
                </div>
            </section>

            <section aria-label="Key performance indicators" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <StatCard
                    label="Total followers"
                    value={formatNumber(kpis.totalFollowers)}
                    change={kpis.followerChange}
                    icon={<Users className="h-5 w-5" aria-hidden />}
                    hint="Facebook + Instagram"
                />
                <StatCard
                    label="Reach (30 days)"
                    value={formatNumber(kpis.reach)}
                    change={kpis.reachChange}
                    icon={<Eye className="h-5 w-5" aria-hidden />}
                    hint="Connected accounts"
                />
                <StatCard
                    label="Engagement rate"
                    value={`${kpis.engagementRate.toFixed(1)}%`}
                    change={kpis.engagementRateChange}
                    icon={<HeartHandshake className="h-5 w-5" aria-hidden />}
                    hint={`${formatNumber(kpis.engagement)} interactions`}
                    tone="cream"
                />
                <StatCard
                    label="Needs attention"
                    value={formatNumber(kpis.pendingComments)}
                    icon={<MessageSquare className="h-5 w-5" aria-hidden />}
                    hint={`${kpis.scheduledPosts} posts scheduled`}
                    tone="red"
                />
            </section>

            <div className="grid gap-6 xl:grid-cols-3">
                <div className="space-y-6 xl:col-span-2">
                    <Card className="p-5">
                        <div className="flex items-center justify-between gap-3">
                            <div>
                                <h2 className="font-display text-lg font-semibold text-forest-900">Platform health</h2>
                                <p className="text-xs text-forest-900/55">Connected account performance, last 30 days.</p>
                            </div>
                            <Link to="/integrations" className="text-xs font-semibold text-forest-600 hover:underline">
                                Manage connections
                            </Link>
                        </div>

                        <div className="mt-4 grid gap-4 sm:grid-cols-2">
                            {platformStats.map((stat) => {
                                const account = accounts.find((item) => item.platform === stat.platform);
                                return (
                                    <div key={stat.platform} className="rounded-xl border border-forest-900/10 bg-cream-50 p-4">
                                        <div className="flex items-center justify-between">
                                            <PlatformBadge platform={stat.platform} />
                                            <span className={cn(
                                                'text-[10px] font-semibold uppercase tracking-wide',
                                                account?.status === 'connected' ? 'text-forest-600' : 'text-hhred-600'
                                            )}>
                                                {account?.status ?? 'unknown'}
                                            </span>
                                        </div>
                                        <p className="mt-3 font-display text-xl font-semibold text-forest-900">
                                            {formatNumber(stat.followers)} followers
                                        </p>
                                        <div className="mt-2 flex gap-4 text-[11px] text-forest-900/55">
                                            <span>{formatNumber(stat.reach)} reach</span>
                                            <span>{formatNumber(stat.engagement)} interactions</span>
                                        </div>
                                        <p className="mt-2 text-[10px] text-forest-900/40">
                                            Publishing {account?.publishingEnabled ? 'enabled' : 'paused'} · Synced {account?.lastSyncedAt ? formatDateTime(account.lastSyncedAt) : 'never'}
                                        </p>
                                    </div>
                                );
                            })}
                        </div>
                    </Card>

                    <Card className="p-5">
                        <div className="flex items-center justify-between gap-3">
                            <div>
                                <h2 className="font-display text-lg font-semibold text-forest-900">Upcoming posts</h2>
                                <p className="text-xs text-forest-900/55">Scheduled content queued for publishing.</p>
                            </div>
                            <Link to="/calendar" className="inline-flex items-center gap-1 text-xs font-semibold text-forest-600 hover:underline">
                                Calendar <ArrowRight className="h-3.5 w-3.5" />
                            </Link>
                        </div>

                        <div className="mt-4 space-y-3">
                            {upcomingPosts.length ? (
                                upcomingPosts.map((post) => (
                                    <div key={post.id} className="flex flex-col gap-2 rounded-xl border border-forest-900/10 p-3 sm:flex-row sm:items-center sm:justify-between">
                                        <div className="min-w-0">
                                            <p className="line-clamp-2 text-sm font-medium text-forest-900">{post.content}</p>
                                            <div className="mt-1 flex flex-wrap items-center gap-2">
                                                {post.platforms.map((platform) => <PlatformBadge key={platform} platform={platform} compact />)}
                                                <span className="inline-flex items-center gap-1 text-[11px] text-forest-900/50">
                                                    <CalendarDays className="h-3.5 w-3.5" aria-hidden />
                                                    {formatDateTime(post.scheduledFor)}
                                                </span>
                                            </div>
                                        </div>
                                        <span className="shrink-0 rounded-full border border-cream-300 bg-cream-100 px-2.5 py-0.5 text-[10px] font-semibold text-forest-700">
                                            {post.status.replace('_', ' ')}
                                        </span>
                                    </div>
                                ))
                            ) : (
                                <EmptyState
                                    title="Nothing scheduled"
                                    description="Create a post in Content Studio or let the Content Creator Agent draft one for review."
                                    action={<Link to="/studio"><Button size="sm">Open Content Studio</Button></Link>}
                                />
                            )}
                        </div>
                    </Card>
                </div>

                <div className="space-y-6">
                    <Card className="p-5">
                        <div className="flex items-center justify-between">
                            <h2 className="font-display text-lg font-semibold text-forest-900">Agent status</h2>
                            <Link to="/agents" className="text-xs font-semibold text-forest-600 hover:underline">Manage</Link>
                        </div>
                        <ul className="mt-4 space-y-3">
                            {agents.map((agent) => (
                                <li key={agent.id} className="flex items-start gap-3">
                                    <span className={cn('mt-1.5 h-2 w-2 shrink-0 rounded-full', agent.enabled ? 'bg-forest-500' : 'bg-forest-900/20')} />
                                    <div className="min-w-0 flex-1">
                                        <p className="text-sm font-medium text-forest-900">{agent.name}</p>
                                        <p className="text-[11px] text-forest-900/50">
                                            {agent.enabled ? `${agent.mode === 'auto' ? 'Automatic' : 'Human review'} · ${agent.tasksToday} tasks today` : 'Paused'}
                                        </p>
                                    </div>
                                </li>
                            ))}
                        </ul>
                        {system.emergencyStop ? (
                            <p role="status" className="mt-4 rounded-xl border border-hhred-100 bg-hhred-50 p-3 text-xs font-medium text-hhred-700">
                                Emergency stop is active. Agent work is paused until a human clears it.
                            </p>
                        ) : null}
                    </Card>

                    <Card className="p-5">
                        <h2 className="font-display text-lg font-semibold text-forest-900">Recent activity</h2>
                        <p className="mb-4 text-xs text-forest-900/55">Audited actions across the workspace.</p>
                        <ActivityFeed items={recentActivity} />
                        <Link to="/settings" className="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-forest-600 hover:underline">
                            View full activity log <ArrowRight className="h-3.5 w-3.5" />
                        </Link>
                    </Card>
                </div>
            </div>
        </div>
    );
}