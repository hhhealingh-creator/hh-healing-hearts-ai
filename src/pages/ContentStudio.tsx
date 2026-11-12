import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
    CalendarClock, PenLine, Send, Trash2, Upload
} from 'lucide-react';
import { api, errorMessage } from '../api/client';
import type { Platform, Post, PostInput, PostStatus } from '../api/types';
import { usePermissions } from '../context/RoleContext';
import { useToast } from '../context/ToastContext';
import { PlatformBadge, PostPreview } from '../components/social';
import {
    Badge, Button, Card, EmptyState, ErrorState, Field, PageHeader,
    Skeleton, Textarea, cn, inputClass
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

export default function ContentStudio() {
    const queryClient = useQueryClient();
    const toast = useToast();
    const { canWrite } = usePermissions();

    const postsQuery = useQuery({ queryKey: ['posts'], queryFn: () => api.getPosts() });
    const accountsQuery = useQuery({ queryKey: ['accounts'], queryFn: api.getAccounts });

    const [content, setContent] = useState('');
    const [platforms, setPlatforms] = useState<Platform[]>(['facebook', 'instagram']);
    const [mediaUrl, setMediaUrl] = useState('');
    const [scheduledFor, setScheduledFor] = useState('');
    const [previewPlatform, setPreviewPlatform] = useState<Platform>('facebook');
    const [formError, setFormError] = useState<string | null>(null);

    useEffect(() => {
        if (!platforms.includes(previewPlatform)) {
            setPreviewPlatform(platforms[0] ?? 'facebook');
        }
    }, [platforms, previewPlatform]);

    const createMutation = useMutation({
        mutationFn: (input: PostInput) => api.createPost(input),
        onSuccess: (post) => {
            toast.push({
                tone: 'success',
                title: post.status === 'published' ? 'Post published' : post.status === 'scheduled' ? 'Post scheduled' : 'Draft saved',
                description: post.status === 'published'
                    ? 'The post is live on the selected accounts.'
                    : 'You can continue editing it from the recent posts list.'
            });
            setContent('');
            setMediaUrl('');
            setScheduledFor('');
            setFormError(null);
            queryClient.invalidateQueries({ queryKey: ['posts'] });
            queryClient.invalidateQueries({ queryKey: ['overview'] });
            queryClient.invalidateQueries({ queryKey: ['analytics'] });
        },
        onError: (error) => {
            setFormError(errorMessage(error));
            toast.push({ tone: 'error', title: 'Could not save post', description: errorMessage(error) });
        }
    });

    const publishMutation = useMutation({
        mutationFn: (id: string) => api.publishPost(id),
        onSuccess: () => {
            toast.push({ tone: 'success', title: 'Post published' });
            queryClient.invalidateQueries({ queryKey: ['posts'] });
            queryClient.invalidateQueries({ queryKey: ['overview'] });
        },
        onError: (error) => toast.push({ tone: 'error', title: 'Publishing failed', description: errorMessage(error) })
    });

    const deleteMutation = useMutation({
        mutationFn: (id: string) => api.deletePost(id),
        onSuccess: () => {
            toast.push({ tone: 'success', title: 'Draft removed' });
            queryClient.invalidateQueries({ queryKey: ['posts'] });
        },
        onError: (error) => toast.push({ tone: 'error', title: 'Could not delete post', description: errorMessage(error) })
    });

    const togglePlatform = (platform: Platform) => {
        setPlatforms((current) =>
            current.includes(platform)
                ? current.filter((p) => p !== platform)
                : [...current, platform]
        );
    };

    const handleCreate = (kind: 'draft' | 'schedule' | 'publish') => {
        setFormError(null);
        if (!content.trim()) {
            setFormError('Write a caption before saving or publishing.');
            return;
        }
        if (!platforms.length) {
            setFormError('Select at least one platform.');
            return;
        }
        if (kind === 'schedule' && !scheduledFor) {
            setFormError('Choose a date and time for the scheduled post.');
            return;
        }

        const scheduledIso = kind === 'schedule' ? new Date(scheduledFor).toISOString() : undefined;
        if (scheduledIso && new Date(scheduledIso).getTime() <= Date.now()) {
            setFormError('Choose a future time for scheduling.');
            return;
        }

        createMutation.mutate({
            content: content.trim(),
            platforms,
            mediaUrl: mediaUrl.trim() || undefined,
            scheduledFor: scheduledIso,
            publishNow: kind === 'publish'
        });
    };

    const limit = platforms.includes('instagram') ? 2200 : 63206;
    const connected = accountsQuery.data?.filter((a) => a.status === 'connected') ?? [];
    const disabledPublishing = accountsQuery.data?.filter(
        (a) => a.status === 'connected' && !a.publishingEnabled
    ) ?? [];

    return (
        <div className="space-y-6">
            <PageHeader
                title="Content Studio"
                description="Draft, preview and publish on-brand content across Facebook and Instagram. The Content Creator Agent can prepare drafts for human review."
                actions={
                    <Button variant="outline" disabled={!canWrite}>
                        <PenLine className="h-4 w-4" aria-hidden />
                        Agent draft
                    </Button>
                }
            />

            {!canWrite ? (
                <p role="status" className="rounded-xl border border-cream-300 bg-cream-50 p-3 text-xs text-forest-900/70">
                    You are viewing as a Viewer. Switch to Admin or Editor to compose and publish.
                </p>
            ) : null}

            {connected.length === 0 && !accountsQuery.isLoading ? (
                <p role="alert" className="rounded-xl border border-hhred-100 bg-hhred-50 p-3 text-xs font-medium text-hhred-700">
                    No connected accounts. Connect Facebook or Instagram in Integrations before publishing.
                </p>
            ) : null}

            <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
                <Card className="p-5 sm:p-6">
                    <div className="flex items-center justify-between gap-3">
                        <h2 className="font-display text-lg font-semibold text-forest-900">New post</h2>
                        <Badge tone="cream">{platforms.length} platform{platforms.length === 1 ? '' : 's'}</Badge>
                    </div>

                    <div className="mt-5 space-y-5">
                        <div>
                            <label htmlFor="post-content" className="mb-1.5 block text-xs font-semibold text-forest-900">
                                Caption
                            </label>
                            <Textarea
                                id="post-content"
                                value={content}
                                onChange={(event) => setContent(event.target.value)}
                                placeholder="Share a message of hope, an event update or a campaign story…"
                                className="min-h-40"
                                maxLength={limit}
                                disabled={!canWrite}
                                aria-describedby="caption-count"
                            />
                            <div id="caption-count" className={cn('mt-1 text-right text-[11px]', content.length > limit * 0.95 ? 'text-hhred-600' : 'text-forest-900/45')}>
                                {content.length.toLocaleString()} / {limit.toLocaleString()}
                            </div>
                        </div>

                        <fieldset>
                            <legend className="mb-2 text-xs font-semibold text-forest-900">Platforms</legend>
                            <div className="flex flex-wrap gap-2">
                                {(['facebook', 'instagram'] as Platform[]).map((platform) => (
                                    <button
                                        key={platform}
                                        type="button"
                                        aria-pressed={platforms.includes(platform)}
                                        onClick={() => togglePlatform(platform)}
                                        disabled={!canWrite}
                                        className={cn(
                                            'rounded-xl border px-3 py-2 text-xs font-semibold transition-colors disabled:opacity-50',
                                            platforms.includes(platform)
                                                ? 'border-forest-600 bg-forest-50 text-forest-800'
                                                : 'border-forest-900/15 bg-white text-forest-900/55'
                                        )}
                                    >
                                        <span className="flex items-center gap-2">
                                            <PlatformBadge platform={platform} />
                                            {platforms.includes(platform) ? 'Selected' : 'Add'}
                                        </span>
                                    </button>
                                ))}
                            </div>
                        </fieldset>

                        <Field label="Media URL" htmlFor="media-url" hint="Optional. Instagram publishing requires an image or video URL.">
                            <div className="relative">
                                <Upload className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-forest-900/40" aria-hidden />
                                <input
                                    id="media-url"
                                    type="url"
                                    value={mediaUrl}
                                    onChange={(event) => setMediaUrl(event.target.value)}
                                    placeholder="https://…"
                                    className={cn(inputClass, 'pl-9')}
                                    disabled={!canWrite}
                                />
                            </div>
                        </Field>

                        <Field label="Schedule for" htmlFor="schedule-at" hint="Leave blank to save a draft or publish immediately.">
                            <div className="relative">
                                <CalendarClock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-forest-900/40" aria-hidden />
                                <input
                                    id="schedule-at"
                                    type="datetime-local"
                                    value={scheduledFor}
                                    onChange={(event) => setScheduledFor(event.target.value)}
                                    className={cn(inputClass, 'pl-9')}
                                    disabled={!canWrite}
                                />
                            </div>
                        </Field>

                        {disabledPublishing.length ? (
                            <p role="status" className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
                                Publishing is paused for {disabledPublishing.map((a) => a.platform).join(' and ')}. Re-enable it in Integrations.
                            </p>
                        ) : null}

                        {formError ? (
                            <p role="alert" className="rounded-xl border border-hhred-100 bg-hhred-50 p-3 text-xs font-medium text-hhred-700">
                                {formError}
                            </p>
                        ) : null}

                        <div className="flex flex-wrap gap-2">
                            <Button
                                variant="outline"
                                onClick={() => handleCreate('draft')}
                                disabled={!canWrite}
                                loading={createMutation.isPending}
                            >
                                Save draft
                            </Button>
                            <Button
                                variant="secondary"
                                onClick={() => handleCreate('schedule')}
                                disabled={!canWrite}
                                loading={createMutation.isPending}
                            >
                                <CalendarClock className="h-4 w-4" aria-hidden />
                                Schedule
                            </Button>
                            <Button
                                onClick={() => handleCreate('publish')}
                                disabled={!canWrite}
                                loading={createMutation.isPending}
                            >
                                <Send className="h-4 w-4" aria-hidden />
                                Publish now
                            </Button>
                        </div>
                    </div>
                </Card>

                <div className="space-y-3 lg:sticky lg:top-24 lg:self-start">
                    <div className="flex gap-1 rounded-xl border border-forest-900/10 bg-white p-1" role="tablist" aria-label="Preview platform">
                        {(platforms.length ? platforms : ['facebook'] as Platform[]).map((platform) => (
                            <button
                                key={platform}
                                type="button"
                                role="tab"
                                aria-selected={previewPlatform === platform}
                                onClick={() => setPreviewPlatform(platform)}
                                className={cn(
                                    'flex-1 rounded-lg px-2 py-1.5 text-xs font-semibold capitalize',
                                    previewPlatform === platform ? 'bg-forest-600 text-cream-50' : 'text-forest-900/55'
                                )}
                            >
                                {platform}
                            </button>
                        ))}
                    </div>
                    <PostPreview
                        content={content}
                        mediaUrl={mediaUrl}
                        platform={previewPlatform}
                        scheduledFor={scheduledFor ? new Date(scheduledFor).toISOString() : undefined}
                    />
                    <p className="text-center text-[11px] text-forest-900/45">
                        Live preview · {previewPlatform === 'instagram' ? 'Instagram feed' : 'Facebook feed'}
                    </p>
                </div>
            </div>

            <Card className="p-5">
                <div className="flex items-center justify-between gap-3">
                    <div>
                        <h2 className="font-display text-lg font-semibold text-forest-900">Recent posts</h2>
                        <p className="text-xs text-forest-900/55">Drafts, scheduled posts and published content.</p>
                    </div>
                </div>

                <div className="mt-4">
                    {postsQuery.isLoading ? (
                        <div className="space-y-2">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-16" />)}</div>
                    ) : postsQuery.isError ? (
                        <ErrorState message="Posts could not be loaded." onRetry={() => postsQuery.refetch()} />
                    ) : !postsQuery.data?.length ? (
                        <EmptyState title="No posts yet" description="Create your first post above." />
                    ) : (
                        <ul className="divide-y divide-forest-900/5">
                            {postsQuery.data.slice(0, 8).map((post: Post) => (
                                <li key={post.id} className="flex flex-col gap-3 py-3 sm:flex-row sm:items-center sm:justify-between">
                                    <div className="min-w-0">
                                        <p className="line-clamp-2 text-sm text-forest-900">{post.content}</p>
                                        <div className="mt-1.5 flex flex-wrap items-center gap-2">
                                            <Badge tone={statusTone[post.status]}>{post.status.replace('_', ' ')}</Badge>
                                            {post.platforms.map((p) => <PlatformBadge key={p} platform={p} compact />)}
                                            <span className="text-[11px] text-forest-900/45">
                                                {post.scheduledFor ? `Scheduled ${formatDateTime(post.scheduledFor)}` : post.publishedAt ? `Published ${formatDateTime(post.publishedAt)}` : `Created ${formatDateTime(post.createdAt)}`}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="flex shrink-0 gap-1">
                                        {canWrite && post.status !== 'published' && post.status !== 'publishing' ? (
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={() => publishMutation.mutate(post.id)}
                                                loading={publishMutation.isPending && publishMutation.variables === post.id}
                                            >
                                                <Send className="h-3.5 w-3.5" aria-hidden />
                                                Publish
                                            </Button>
                                        ) : null}
                                        {canWrite && post.status !== 'published' && post.status !== 'publishing' ? (
                                            <Button
                                                size="sm"
                                                variant="ghost"
                                                onClick={() => {
                                                    if (window.confirm('Delete this post?')) deleteMutation.mutate(post.id);
                                                }}
                                                loading={deleteMutation.isPending && deleteMutation.variables === post.id}
                                                aria-label="Delete post"
                                            >
                                                <Trash2 className="h-3.5 w-3.5" aria-hidden />
                                            </Button>
                                        ) : null}
                                    </div>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            </Card>
        </div>
    );
}