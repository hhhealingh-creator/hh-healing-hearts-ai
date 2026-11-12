import { useEffect, useState, type ReactNode } from 'react';
import {
    Bookmark, Facebook, Globe2, Heart, Instagram, MessageCircle,
    MoreHorizontal, Send
} from 'lucide-react';
import type { ActivityEntry, Platform } from '../api/types';
import { Card, cn } from './ui';
import { relativeTime } from '../lib/format';

export function BrandLogo({
    compact = false,
    variant = 'dark'
}: {
    compact?: boolean;
    variant?: 'dark' | 'light';
}) {
    const [failed, setFailed] = useState(false);

    return (
        <div className="flex items-center gap-3">
            {!failed ? (
                <img
                    src="/brand/hh-healing-hearts-logo.png"
                    alt="HH Healing Hearts Inc. logo"
                    className="h-10 w-10 rounded-xl bg-cream-50 object-contain p-1"
                    onError={() => setFailed(true)}
                />
            ) : (
                <div
                    aria-hidden
                    className="grid h-10 w-10 place-items-center rounded-xl bg-cream-100 font-display text-sm font-bold text-forest-800"
                >
                    HH
                </div>
            )}
            {!compact ? (
                <div>
                    <p
                        className={cn(
                            'font-display text-base font-semibold leading-tight',
                            variant === 'dark' ? 'text-cream-50' : 'text-forest-900'
                        )}
                    >
                        HH Healing Hearts
                    </p>
                    <p
                        className={cn(
                            'text-[10px] uppercase tracking-[0.18em]',
                            variant === 'dark' ? 'text-cream-200/70' : 'text-forest-900/50'
                        )}
                    >
                        AI Manager
                    </p>
                </div>
            ) : null}
        </div>
    );
}

export function PlatformBadge({
    platform,
    compact = false
}: {
    platform: Platform;
    compact?: boolean;
}) {
    const Icon = platform === 'facebook' ? Facebook : Instagram;

    return (
        <span
            className={cn(
                'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold capitalize',
                platform === 'facebook'
                    ? 'border-blue-200 bg-blue-50 text-blue-700'
                    : 'border-hhred-100 bg-hhred-50 text-hhred-700'
            )}
        >
            <Icon className="h-3.5 w-3.5" aria-hidden />
            {compact ? null : platform}
        </span>
    );
}

export function PostPreview({
    content,
    mediaUrl,
    platform,
    accountName = 'HH Healing Hearts Inc.',
    scheduledFor
}: {
    content: string;
    mediaUrl?: string;
    platform: Platform;
    accountName?: string;
    scheduledFor?: string;
}) {
    const [mediaError, setMediaError] = useState(false);
    const isInstagram = platform === 'instagram';

    useEffect(() => setMediaError(false), [mediaUrl]);

    return (
        <article className="overflow-hidden rounded-2xl border border-forest-900/10 bg-white shadow-sm">
            <div className="flex items-center gap-3 px-4 pt-4">
                <div className="grid h-10 w-10 place-items-center rounded-full bg-forest-100 font-display text-xs font-bold text-forest-800">
                    HH
                </div>
                <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-forest-900">{accountName}</p>
                    <p className="flex items-center gap-1 text-[11px] text-forest-900/50">
                        {scheduledFor ? 'Scheduled' : 'Just now'} <Globe2 className="h-3 w-3" aria-hidden />
                    </p>
                </div>
                <MoreHorizontal className="h-5 w-5 text-forest-900/40" aria-hidden />
            </div>

            <p className="whitespace-pre-wrap px-4 py-3 text-sm leading-relaxed text-forest-900">
                {content || 'Your caption preview will appear here.'}
            </p>

            {mediaUrl && !mediaError ? (
                <img
                    src={mediaUrl}
                    alt="Post media preview"
                    className={cn('w-full object-cover', isInstagram ? 'aspect-square' : 'aspect-video')}
                    onError={() => setMediaError(true)}
                />
            ) : (
                <div
                    className={cn(
                        'flex flex-col items-center justify-center gap-2 bg-gradient-to-br from-forest-700 via-forest-600 to-forest-800 px-6 text-center text-cream-50',
                        isInstagram ? 'aspect-square' : 'aspect-video'
                    )}
                >
                    <Heart className="h-8 w-8 text-cream-100/80" aria-hidden />
                    <p className="font-display text-sm font-semibold">Touching Hearts.</p>
                    <p className="text-[11px] text-cream-100/75">Transforming Lives. Restoring Hope.</p>
                </div>
            )}

            <div className="flex items-center gap-4 border-t border-forest-900/5 px-4 py-3 text-forest-900/60">
                <Heart className="h-5 w-5" aria-hidden />
                <MessageCircle className="h-5 w-5" aria-hidden />
                <Send className="h-5 w-5" aria-hidden />
                <Bookmark className="ml-auto h-5 w-5" aria-hidden />
            </div>
        </article>
    );
}

export function StatCard({
    label,
    value,
    change,
    icon,
    tone = 'forest',
    hint
}: {
    label: string;
    value: string;
    change?: number;
    icon: ReactNode;
    tone?: 'forest' | 'red' | 'cream';
    hint?: string;
}) {
    const positive = (change ?? 0) >= 0;
    const toneClasses = {
        forest: 'bg-forest-50 text-forest-700',
        red: 'bg-hhred-50 text-hhred-700',
        cream: 'bg-cream-100 text-forest-800'
    };

    return (
        <Card className="p-5">
            <div className="flex items-start justify-between gap-3">
                <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-forest-900/50">
                        {label}
                    </p>
                    <p className="mt-2 font-display text-2xl font-semibold text-forest-900">{value}</p>
                </div>
                <div className={cn('grid h-10 w-10 place-items-center rounded-xl', toneClasses[tone])}>
                    {icon}
                </div>
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-2">
                {typeof change === 'number' ? (
                    <span
                        className={cn(
                            'text-xs font-semibold',
                            positive ? 'text-forest-600' : 'text-hhred-600'
                        )}
                    >
                        {positive ? '↑' : '↓'} {Math.abs(change).toFixed(1)}%
                    </span>
                ) : null}
                {hint ? <span className="text-[11px] text-forest-900/45">{hint}</span> : null}
            </div>
        </Card>
    );
}

export function ActivityFeed({ items }: { items: ActivityEntry[] }) {
    if (!items.length) {
        return (
            <p className="rounded-xl border border-dashed border-forest-900/15 bg-cream-50 p-4 text-sm text-forest-900/55">
                No activity has been recorded yet.
            </p>
        );
    }

    return (
        <ol className="space-y-3">
            {items.map((item) => (
                <li key={item.id} className="flex gap-3">
                    <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-forest-400" aria-hidden />
                    <div className="min-w-0">
                        <p className="text-sm text-forest-900">
                            <span className="font-semibold">{item.actor}</span> {item.action.toLowerCase()}{' '}
                            <span className="text-forest-900/65">{item.target}</span>
                        </p>
                        <p className="mt-0.5 text-[11px] text-forest-900/45">
                            {relativeTime(item.at)}
                        </p>
                    </div>
                </li>
            ))}
        </ol>
    );
}