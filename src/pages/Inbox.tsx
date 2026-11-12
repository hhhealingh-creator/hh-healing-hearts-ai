import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
    ArrowLeft, CheckCircle2, MessageSquare, ShieldAlert
} from 'lucide-react';
import { api, errorMessage } from '../api/client';
import type {
    CommentCategory, CommentStatus, SocialComment
} from '../api/types';
import { usePermissions } from '../context/RoleContext';
import { useToast } from '../context/ToastContext';
import { PlatformBadge } from '../components/social';
import {
    Badge, Button, Card, EmptyState, ErrorState, PageHeader,
    Skeleton, Textarea, cn
} from '../components/ui';
import { formatDateTime } from '../lib/format';

const statusTone: Record<CommentStatus, 'green' | 'red' | 'amber' | 'slate' | 'blue'> = {
    new: 'blue',
    auto_replied: 'green',
    escalated: 'red',
    resolved: 'slate'
};

const categoryTone: Record<CommentCategory, 'green' | 'red' | 'amber' | 'slate'> = {
    routine: 'green',
    sensitive: 'red',
    complaint: 'red',
    medical: 'amber',
    donation: 'amber',
    beneficiary: 'amber'
};

const escalationCopy: Record<CommentCategory, string> = {
    routine: 'Routine messages can be handled automatically.',
    sensitive: 'Sensitive language detected. A human administrator must review this conversation.',
    complaint: 'Complaints are escalated so a person can respond with care and accountability.',
    medical: 'Medical questions are never answered automatically. A qualified human must respond.',
    donation: 'Donation and fundraising requests are escalated for secure, human handling.',
    beneficiary: 'Beneficiary-related matters are private and must be handled by a human administrator.'
};

const filters: Array<{ value: 'all' | CommentStatus; label: string }> = [
    { value: 'all', label: 'All' },
    { value: 'new', label: 'New' },
    { value: 'escalated', label: 'Escalated' },
    { value: 'auto_replied', label: 'Auto-replied' },
    { value: 'resolved', label: 'Resolved' }
];

export default function Inbox() {
    const [filter, setFilter] = useState<'all' | CommentStatus>('all');
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [reply, setReply] = useState('');
    const { canWrite } = usePermissions();
    const toast = useToast();
    const queryClient = useQueryClient();

    const commentsQuery = useQuery({ queryKey: ['comments'], queryFn: () => api.getComments() });
    const comments = commentsQuery.data ?? [];
    const filtered = filter === 'all' ? comments : comments.filter((c) => c.status === filter);
    const selected = comments.find((c) => c.id === selectedId) ?? null;

    useEffect(() => {
        if (!selectedId && filtered.length) setSelectedId(filtered[0].id);
        if (selectedId && !comments.some((c) => c.id === selectedId)) setSelectedId(null);
    }, [comments, filtered, selectedId]);

    useEffect(() => {
        setReply(selected?.reply ?? '');
    }, [selected?.id, selected?.reply]);

    const refresh = () => {
        queryClient.invalidateQueries({ queryKey: ['comments'] });
        queryClient.invalidateQueries({ queryKey: ['overview'] });
    };

    const replyMutation = useMutation({
        mutationFn: ({ id, text }: { id: string; text: string }) => api.replyToComment(id, text),
        onSuccess: () => {
            toast.push({ tone: 'success', title: 'Reply sent', description: 'The conversation is marked resolved.' });
            refresh();
        },
        onError: (error) => toast.push({ tone: 'error', title: 'Could not send reply', description: errorMessage(error) })
    });

    const escalateMutation = useMutation({
        mutationFn: (id: string) => api.escalateComment(id),
        onSuccess: () => {
            toast.push({ tone: 'info', title: 'Escalated to human administrator' });
            refresh();
        },
        onError: (error) => toast.push({ tone: 'error', title: 'Could not escalate', description: errorMessage(error) })
    });

    const resolveMutation = useMutation({
        mutationFn: (id: string) => api.resolveComment(id),
        onSuccess: () => {
            toast.push({ tone: 'success', title: 'Conversation resolved' });
            refresh();
        },
        onError: (error) => toast.push({ tone: 'error', title: 'Could not resolve', description: errorMessage(error) })
    });

    const counts = {
        all: comments.length,
        new: comments.filter((c) => c.status === 'new').length,
        escalated: comments.filter((c) => c.status === 'escalated').length,
        auto_replied: comments.filter((c) => c.status === 'auto_replied').length,
        resolved: comments.filter((c) => c.status === 'resolved').length
    };

    return (
        <div className="space-y-6">
            <PageHeader
                title="Comments & Unified Inbox"
                description="Monitor Facebook and Instagram comments. Routine messages can be answered automatically; sensitive, medical, donation, complaint and beneficiary matters are escalated to a human."
            />

            <div className="flex flex-wrap gap-2">
                {filters.map((item) => (
                    <button
                        key={item.value}
                        type="button"
                        onClick={() => setFilter(item.value)}
                        aria-pressed={filter === item.value}
                        className={cn(
                            'rounded-full border px-3 py-1.5 text-xs font-semibold',
                            filter === item.value
                                ? 'border-forest-600 bg-forest-600 text-cream-50'
                                : 'border-forest-900/15 bg-white text-forest-900/60'
                        )}
                    >
                        {item.label} <span className="ml-1 opacity-70">{counts[item.value]}</span>
                    </button>
                ))}
            </div>

            {commentsQuery.isLoading ? (
                <div className="grid gap-4 lg:grid-cols-[360px_1fr]">
                    <Skeleton className="h-96" />
                    <Skeleton className="h-96" />
                </div>
            ) : commentsQuery.isError ? (
                <ErrorState message="Comments could not be loaded." onRetry={() => commentsQuery.refetch()} />
            ) : (
                <div className="grid gap-4 lg:grid-cols-[360px_1fr]">
                    <Card className={cn('overflow-hidden', selected && 'hidden lg:block')}>
                        <div className="border-b border-forest-900/10 px-4 py-3">
                            <h2 className="font-display text-base font-semibold text-forest-900">Conversations</h2>
                            <p className="text-[11px] text-forest-900/50">{filtered.length} in this view</p>
                        </div>
                        <ul className="max-h-[70vh] divide-y divide-forest-900/5 overflow-y-auto">
                            {filtered.map((comment) => (
                                <li key={comment.id}>
                                    <button
                                        type="button"
                                        onClick={() => setSelectedId(comment.id)}
                                        className={cn(
                                            'w-full px-4 py-3 text-left hover:bg-cream-50',
                                            selectedId === comment.id && 'bg-cream-100'
                                        )}
                                    >
                                        <div className="flex items-center justify-between gap-2">
                                            <p className="truncate text-sm font-semibold text-forest-900">{comment.author}</p>
                                            <PlatformBadge platform={comment.platform} compact />
                                        </div>
                                        <p className="mt-1 line-clamp-2 text-xs text-forest-900/60">{comment.message}</p>
                                        <div className="mt-2 flex flex-wrap items-center gap-1.5">
                                            <Badge tone={statusTone[comment.status]}>{comment.status.replace('_', ' ')}</Badge>
                                            {comment.category ? <Badge tone={categoryTone[comment.category]}>{comment.category}</Badge> : null}
                                        </div>
                                    </button>
                                </li>
                            ))}
                            {!filtered.length ? (
                                <li className="p-4"><EmptyState title="No conversations" description="Try a different filter." /></li>
                            ) : null}
                        </ul>
                    </Card>

                    <Card className={cn('p-5', !selected && 'hidden lg:block')}>
                        {!selected ? (
                            <EmptyState title="Select a conversation" description="Choose a comment from the list to review the full message and take action." />
                        ) : (
                            <div>
                                <button
                                    type="button"
                                    onClick={() => setSelectedId(null)}
                                    className="mb-4 inline-flex items-center gap-1 text-xs font-semibold text-forest-600 lg:hidden"
                                >
                                    <ArrowLeft className="h-3.5 w-3.5" /> Back to inbox
                                </button>

                                <div className="flex flex-wrap items-start justify-between gap-3">
                                    <div>
                                        <h2 className="font-display text-lg font-semibold text-forest-900">{selected.author}</h2>
                                        <div className="mt-1 flex flex-wrap items-center gap-2">
                                            <PlatformBadge platform={selected.platform} />
                                            <Badge tone={statusTone[selected.status]}>{selected.status.replace('_', ' ')}</Badge>
                                            {selected.category ? <Badge tone={categoryTone[selected.category]}>{selected.category}</Badge> : null}
                                            <span className="text-[11px] text-forest-900/45">{formatDateTime(selected.createdAt)}</span>
                                        </div>
                                    </div>
                                    {selected.assignedTo ? (
                                        <p className="text-[11px] text-forest-900/50">Assigned to {selected.assignedTo}</p>
                                    ) : null}
                                </div>

                                <blockquote className="mt-4 rounded-xl border border-forest-900/10 bg-cream-50 p-4 text-sm leading-relaxed text-forest-900">
                                    {selected.message}
                                </blockquote>

                                {selected.category && selected.category !== 'routine' ? (
                                    <div className="mt-3 flex gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
                                        <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                                        <p>{escalationCopy[selected.category]}</p>
                                    </div>
                                ) : null}

                                {selected.reply ? (
                                    <div className="mt-4 rounded-xl border border-forest-200 bg-forest-50 p-4">
                                        <p className="text-[11px] font-semibold uppercase tracking-wide text-forest-700">Existing reply</p>
                                        <p className="mt-1 text-sm text-forest-900">{selected.reply}</p>
                                    </div>
                                ) : null}

                                <div className="mt-5">
                                    <label htmlFor="human-reply" className="mb-1.5 block text-xs font-semibold text-forest-900">
                                        Human reply
                                    </label>
                                    <Textarea
                                        id="human-reply"
                                        value={reply}
                                        onChange={(event) => setReply(event.target.value)}
                                        placeholder="Write a compassionate, human response…"
                                        disabled={!canWrite}
                                    />
                                    <p className="mt-1 text-[11px] text-forest-900/45">
                                        Human replies override automation and are recorded in the activity log.
                                    </p>
                                </div>

                                <div className="mt-4 flex flex-wrap gap-2">
                                    <Button
                                        onClick={() => replyMutation.mutate({ id: selected.id, text: reply })}
                                        disabled={!canWrite || !reply.trim()}
                                        loading={replyMutation.isPending}
                                    >
                                        <MessageSquare className="h-4 w-4" aria-hidden />
                                        Send human reply
                                    </Button>
                                    <Button
                                        variant="outline"
                                        onClick={() => escalateMutation.mutate(selected.id)}
                                        disabled={!canWrite || selected.status === 'escalated'}
                                        loading={escalateMutation.isPending}
                                    >
                                        <ShieldAlert className="h-4 w-4" aria-hidden />
                                        Escalate
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        onClick={() => resolveMutation.mutate(selected.id)}
                                        disabled={!canWrite || selected.status === 'resolved'}
                                        loading={resolveMutation.isPending}
                                    >
                                        <CheckCircle2 className="h-4 w-4" aria-hidden />
                                        Mark resolved
                                    </Button>
                                </div>

                                {!canWrite ? (
                                    <p className="mt-3 rounded-xl border border-cream-300 bg-cream-50 p-3 text-xs text-forest-900/60">
                                        You are viewing as a Viewer. Switch to Admin or Editor to reply or escalate.
                                    </p>
                                ) : null}
                            </div>
                        )}
                    </Card>
                </div>
            )}
        </div>
    );
}