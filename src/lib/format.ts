export function formatNumber(value: number): string {
    return new Intl.NumberFormat('en-US').format(Math.round(value));
}

export function formatPercent(value: number, digits = 1): string {
    return `${value >= 0 ? '+' : ''}${value.toFixed(digits)}%`;
}

export function formatDate(value?: string | null): string {
    if (!value) return '—';
    return new Intl.DateTimeFormat('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
    }).format(new Date(value));
}

export function formatDateTime(value?: string | null): string {
    if (!value) return '—';
    return new Intl.DateTimeFormat('en-US', {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit'
    }).format(new Date(value));
}

export function relativeTime(value: string): string {
    const diff = Date.now() - new Date(value).getTime();
    const minutes = Math.round(diff / 60_000);
    if (minutes < 1) return 'just now';
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.round(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.round(hours / 24);
    return `${days}d ago`;
}