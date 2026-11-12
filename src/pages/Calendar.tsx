import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
    ChevronLeft, ChevronRight, Send
} from 'lucide-react';
import {
    eachDayOfInterval, endOfMonth, endOfWeek, format, isSameDay,
    isSameMonth, isToday, startOfMonth, startOfWeek
} from 'date-fns';
import { api, errorMessage } from '../api/client';
import type { Post, PostStatus } from '../api/types';
import { usePermissions } from '../context/RoleContext';
import { useToast } from '../context/ToastContext';
import { PlatformBadge, PostPreview } from '../components/social';
import {
    Badge, Button, Card, EmptyState, ErrorState, Modal, PageHeader,
    Skeleton, cn
} from '../components/ui';
import { formatDateTime } from '../lib/format';

const statusTone: Record<PostStatus, 'green' | 'red' | 'amber' | 'slate' | 'cream' | 'blue'> = {
    draft: 'slate',
    scheduled: 'blue',
    publishing: 'amber',
    published: 'green',
    failed: 'red',
    needs_review: 'amber'
};

const statusChip: Record<PostStatus, string> = {
    draft: 'bg-slate-100 text-slate-700',
    scheduled: 'bg-blue-50 text-blue-700',
    publishing: 'bg-amber-50 text-amber-700',
    published: 'bg-forest-50 text-forest-700',
    failed: 'bg-hhred-50 text-hhred-700',
    needs_review: 'bg-amber-50 text-amber-700'
};

export default function CalendarPage() {
    const [cursor, setCursor] = useState(() => new Date());
    const [selected, setSelected] = useState<Post | null>(null);
    const queryClient = useQueryClient();
    const toast = useToast();
    const { canWrite } = usePermissions();

    const postsQuery = useQuery({ queryKey: ['posts'], queryFn: () => api.getPosts() });

    const monthStart = startOfMonth(cursor);
    const monthEnd = endOfMonth(cursor);
    const days = eachDayOfInterval({
        start: startOfWeek(monthStart),
        end: endOfWeek(monthEnd)
    });

    const postsByDay = useMemo(() => {
        const map = new Map<string, Post[]>();
        for (const post of postsQuery.data ?? []) {
            const stamp = post.scheduledFor ?? post.publishedAt ?? post.createdAt;
            const key = format(new Date(stamp), 'yyyy-MM-dd');
            map.set(key, [...(map.get(key) ?? []), post]);
        }
        return map;
    }, [postsQuery.data]);

    const publishMutation = useMutation({
        mutationFn: (id: string) => api.publishPost(id),
        onSuccess: () => {
            toast.push({ tone: 'success', title: 'Post published' });
            queryClient.invalidateQueries({ queryKey: ['posts'] });
            queryClient.invalidateQueries({ queryKey: ['overview'] });
            setSelected(null);
        },
        onError: (error) =>
            toast.push({ tone: 'error', title: 'Publishing failed', description: errorMessage(error) })
    });

    const upcoming = (postsQuery.data ?? [])
        .filter((p) => p.status === 'scheduled' && p.scheduledFor)
        .sort((a, b) => new Date(a.scheduledFor!).getTime() - new Date(b.scheduledFor!).getTime())
        .slice(0, 6);

    return (
        <div className="space-y-6">
            <PageHeader
                title="Social Media Calendar"
                description="See scheduled, published and review-ready content across Facebook and Instagram in one calendar."
                actions={
                    <div className="flex items-center gap-1 rounded-xl border border-forest-900/10 bg-white p-1">
                        <Button size="sm" variant="ghost" onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))} aria-label="Previous month">
                            <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => setCursor(new Date())}>Today</Button>
                        <Button size="sm" variant="ghost" onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))} aria-label="Next month">
                            <ChevronRight className="h-4 w-4" />
                        </Button>
                    </div>
                }
            />

            <Card className="overflow-hidden">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-forest-900/10 px-5 py-4">
                    <h2 className="font-display text-lg font-semibold text-forest-900">{format(cursor, 'MMMM yyyy')}</h2>
                    <div className="flex flex-wrap gap-2">
                        {(['scheduled', 'published', 'needs_review'] as PostStatus[]).map((status) => (
                            <Badge key={status} tone={statusTone[status]}>{status.replace('_', ' ')}</Badge>
                        ))}
                    </div>
                </div>

                {postsQuery.isLoading ? (
                    <div className="space-y-2 p-5">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-20" />)}</div>
                ) : postsQuery.isError ? (
                    <div className="p-5"><ErrorState message="Calendar data could not be loaded." onRetry={() => postsQuery.refetch()} /></div>
                ) : (
                    <div className="overflow-x-auto">
                        <div className="min-w-[680px]">
                            <div className="grid grid-cols-7 border-b border-forest-900/10 bg-cream-50">
                                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((label) => (
                                    <div key={label} className="px-2 py-2 text-center text-[10px] font-semibold uppercase tracking-wide text-forest-900/50">
                                        {label}
                                    </div>
                                ))}
                            </div>
                            <div className="grid grid-cols-7">
                                {days.map((day) => {
                                    const key = format(day, 'yyyy-MM-dd');
                                    const dayPosts = postsByDay.get(key) ?? [];
                                    return (
                                        <div
                                            key={key}
                                            className={cn(
                                                'min-h-28 border-b border-r border-forest-900/5 p-1.5',
                                                !isSameMonth(day, cursor) && 'bg-cream-50/60',
                                                isToday(day) && 'bg-forest-50/50'
                                            )}
                                        >
                                            <div className="flex items-center justify-between px-0.5">
                                                <span className={cn(
                                                    'grid h-6 w-6 place-items-center rounded-full text-[11px] font-semibold',
                                                    isToday(day) ? 'bg-forest-600 text-cream-50' : 'text-forest-900/60'
                                                )}>
                                                    {format(day, 'd')}
                                                </span>
                                                {dayPosts.length ? <span className="text-[9px] text-forest-900/40">{dayPosts.length}</span> : null}
                                            </div>
                                            <div className="mt-1 space-y-1">
                                                {dayPosts.slice(0, 3).map((post) => (
                                                    <button
                                                        key={post.id}
                                                        type="button"
                                                        onClick={() => setSelected(post)}
                                                        className={cn(
                                                            'block w-full truncate rounded-md px-1.5 py-1 text-left text-[10px] font-medium leading-tight',
                                                            statusChip[post.status]
                                                        )}
                                                        title={post.content}
                                                    >
                                                        {post.content}
                                                    </button>
                                                ))}
                                                {dayPosts.length > 3 ? (
                                                    <p className="px-1 text-[9px] text-forest-900/40">+{dayPosts.length - 3} more</p>
                                                ) : null}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                )}
            </Card>

            <Card className="p-5">
                <h2 className="font-display text-lg font-semibold text-forest-900">Coming up</h2>
                <p className="text-xs text-forest-900/55">The next posts queued for automatic publishing.</p>
                <div className="mt-4 space-y-2">
                    {upcoming.length ? upcoming.map((post) => (
                        <button
                            key={post.id}
                            type="button"
                            onClick={() => setSelected(post)}
                            className="flex w-full flex-col gap-2 rounded-xl border border-forest-900/10 p-3 text-left hover:bg-cream-50 sm:flex-row sm:items-center sm:justify-between"
                        >
                            <div className="min-w-0">
                                <p className="line-clamp-1 text-sm text-forest-900">{post.content}</p>
                                <div className="mt-1 flex items-center gap-2">
                                    {post.platforms.map((p) => <PlatformBadge key={p} platform={p} compact />)}
                                    <span className="text-[11px] text-forest-900/45">{formatDateTime(post.scheduledFor)}</span>
                                </div>
                            </div>
                            <Badge tone="blue">scheduled</Badge>
                        </button>
                    )) : (
                        <EmptyState title="No upcoming posts" description="Schedule a post from Content Studio." />
                    )}
                </div>
            </Card>

            <Modal
                open={Boolean(selected)}
                onClose={() => setSelected(null)}
                title={selected ? selected.status.replace('_', ' ') : 'Post'}
                footer={
                    <>
                        <Button variant="ghost" onClick={() => setSelected(null)}>Close</Button>
                        {selected && canWrite && selected.status !== 'published' && selected.status !== 'publishing' ? (
                            <Button
                                onClick={() => publishMutation.mutate(selected.id)}
                                loading={publishMutation.isPending}
                            >
                                <Send className="h-4 w-4" aria-hidden />
                                Publish now
                            </Button>
                        ) : null}
                    </>
                }
            >
                {selected ? (
                    <div className="space-y-4">
                        <div className="flex flex-wrap items-center gap-2">
                            <Badge tone={statusTone[selected.status]}>{selected.status.replace('_', ' ')}</Badge>
                            {selected.platforms.map((p) => <PlatformBadge key={p} platform={p} />)}
                        </div>
                        <PostPreview
                            content={selected.content}
                            mediaUrl={selected.mediaUrl}
                            platform={selected.platforms[0] ?? 'facebook'}
                            scheduledFor={selected.scheduledFor}
                        />
                        <p className="text-xs text-forest-900/55">
                            {selected.scheduledFor ? `Scheduled for ${formatDateTime(selected.scheduledFor)}` : selected.publishedAt ? `Published ${formatDateTime(selected.publishedAt)}` : `Created ${formatDateTime(selected.createdAt)}`}
                        </p>
                    </div>
                ) : null}
            </Modal>
        </div>
    );
}