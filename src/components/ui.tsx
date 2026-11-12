import {
    createContext, useCallback, useContext, useEffect, useState,
    type ButtonHTMLAttributes, type HTMLAttributes, type ReactNode,
    type TextareaHTMLAttributes
} from 'react';
import { createPortal } from 'react-dom';
import { AlertTriangle, Loader2, RefreshCw, X } from 'lucide-react';

export function cn(...classes: (string | false | null | undefined)[]): string {
    return classes.filter(Boolean).join(' ');
}

type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
type ButtonSize = 'sm' | 'md';

const buttonVariants: Record<ButtonVariant, string> = {
    primary: 'bg-forest-600 text-cream-50 hover:bg-forest-700 disabled:bg-forest-300',
    secondary: 'bg-cream-200 text-forest-800 hover:bg-cream-300 disabled:opacity-60',
    outline:
        'border border-forest-900/15 bg-transparent text-forest-800 hover:bg-forest-50 disabled:opacity-50',
    ghost: 'bg-transparent text-forest-800 hover:bg-forest-50 disabled:opacity-50',
    danger: 'bg-hhred-600 text-white hover:bg-hhred-700 disabled:bg-hhred-300'
};

const buttonSizes: Record<ButtonSize, string> = {
    sm: 'h-9 px-3 text-xs',
    md: 'h-10 px-4 text-sm'
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: ButtonVariant;
    size?: ButtonSize;
    loading?: boolean;
}

export function Button({
    variant = 'primary',
    size = 'md',
    loading = false,
    disabled,
    className,
    children,
    ...props
}: ButtonProps) {
    return (
        <button
            type="button"
            disabled={disabled || loading}
            aria-busy={loading || undefined}
            className={cn(
                'inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition-colors',
                buttonVariants[variant],
                buttonSizes[size],
                className
            )}
            {...props}
        >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
            {children}
        </button>
    );
}

export function Card({ className, children, ...props }: HTMLAttributes<HTMLDivElement>) {
    return (
        <div
            className={cn(
                'rounded-2xl border border-forest-900/10 bg-white shadow-sm',
                className
            )}
            {...props}
        >
            {children}
        </div>
    );
}

type BadgeTone = 'green' | 'red' | 'amber' | 'slate' | 'cream' | 'blue';

const badgeTones: Record<BadgeTone, string> = {
    green: 'bg-forest-50 text-forest-700 border-forest-200',
    red: 'bg-hhred-50 text-hhred-700 border-hhred-100',
    amber: 'bg-amber-50 text-amber-700 border-amber-200',
    slate: 'bg-slate-100 text-slate-600 border-slate-200',
    cream: 'bg-cream-100 text-forest-700 border-cream-300',
    blue: 'bg-blue-50 text-blue-700 border-blue-200'
};

export function Badge({
    tone = 'slate',
    children,
    className
}: {
    tone?: BadgeTone;
    children: ReactNode;
    className?: string;
}) {
    return (
        <span
            className={cn(
                'inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold',
                badgeTones[tone],
                className
            )}
        >
            {children}
        </span>
    );
}

export function Toggle({
    checked,
    onChange,
    disabled,
    label
}: {
    checked: boolean;
    onChange: (next: boolean) => void;
    disabled?: boolean;
    label: string;
}) {
    return (
        <button
            type="button"
            role="switch"
            aria-checked={checked}
            aria-label={label}
            disabled={disabled}
            onClick={() => onChange(!checked)}
            className={cn(
                'relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors disabled:cursor-not-allowed disabled:opacity-50',
                checked ? 'bg-forest-600' : 'bg-forest-900/20'
            )}
        >
            <span
                className={cn(
                    'inline-block h-4 w-4 rounded-full bg-white shadow transition-transform',
                    checked ? 'translate-x-6' : 'translate-x-1'
                )}
            />
        </button>
    );
}

export const inputClass =
    'w-full rounded-xl border border-forest-900/15 bg-white px-3 py-2 text-sm text-forest-900 shadow-sm placeholder:text-forest-900/40 focus:border-forest-500 focus:outline-none focus:ring-2 focus:ring-forest-500/30 disabled:bg-forest-50 disabled:text-forest-900/60';

export function Field({
    label,
    htmlFor,
    hint,
    error,
    children,
    className
}: {
    label: string;
    htmlFor?: string;
    hint?: string;
    error?: string;
    children: ReactNode;
    className?: string;
}) {
    return (
        <div className={cn('space-y-1.5', className)}>
            <label htmlFor={htmlFor} className="block text-xs font-semibold text-forest-900">
                {label}
            </label>
            {children}
            {hint ? <p className="text-[11px] text-forest-900/55">{hint}</p> : null}
            {error ? <p className="text-[11px] font-medium text-hhred-600">{error}</p> : null}
        </div>
    );
}

export function Skeleton({ className }: { className?: string }) {
    return <div className={cn('animate-pulse rounded-lg bg-forest-900/10', className)} />;
}

export function ErrorState({
    title = 'Unable to load this view',
    message,
    onRetry
}: {
    title?: string;
    message?: string;
    onRetry?: () => void;
}) {
    return (
        <div
            role="alert"
            className="flex flex-col items-start gap-3 rounded-2xl border border-hhred-100 bg-hhred-50 p-6"
        >
            <div className="flex items-center gap-2 text-hhred-700">
                <AlertTriangle className="h-5 w-5" aria-hidden />
                <p className="font-semibold">{title}</p>
            </div>
            {message ? <p className="text-sm text-hhred-700/80">{message}</p> : null}
            {onRetry ? (
                <Button variant="outline" size="sm" onClick={onRetry}>
                    <RefreshCw className="h-4 w-4" aria-hidden />
                    Try again
                </Button>
            ) : null}
        </div>
    );
}

export function EmptyState({
    title,
    description,
    action
}: {
    title: string;
    description?: string;
    action?: ReactNode;
}) {
    return (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-forest-900/15 bg-cream-50 px-6 py-12 text-center">
            <p className="font-display text-lg font-semibold text-forest-900">{title}</p>
            {description ? (
                <p className="mt-1 max-w-sm text-sm text-forest-900/60">{description}</p>
            ) : null}
            {action ? <div className="mt-4">{action}</div> : null}
        </div>
    );
}

export function PageHeader({
    title,
    description,
    actions
}: {
    title: string;
    description?: string;
    actions?: ReactNode;
}) {
    return (
        <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
                <h1 className="text-2xl font-semibold text-forest-900 sm:text-3xl">{title}</h1>
                {description ? (
                    <p className="mt-1 max-w-2xl text-sm text-forest-900/60">{description}</p>
                ) : null}
            </div>
            {actions ? <div className="flex shrink-0 flex-wrap gap-2">{actions}</div> : null}
        </header>
    );
}

export function Modal({
    open,
    onClose,
    title,
    children,
    footer,
    size = 'md'
}: {
    open: boolean;
    onClose: () => void;
    title: string;
    children: ReactNode;
    footer?: ReactNode;
    size?: 'sm' | 'md' | 'lg';
}) {
    useEffect(() => {
        if (!open) return;
        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') onClose();
        };
        document.addEventListener('keydown', onKeyDown);
        const previous = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        return () => {
            document.removeEventListener('keydown', onKeyDown);
            document.body.style.overflow = previous;
        };
    }, [open, onClose]);

    if (!open) return null;

    const sizes = { sm: 'max-w-md', md: 'max-w-xl', lg: 'max-w-3xl' };

    return createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div
                className="absolute inset-0 bg-forest-900/50 backdrop-blur-sm"
                onClick={onClose}
                aria-hidden
            />
            <div
                role="dialog"
                aria-modal="true"
                aria-label={title}
                className={cn(
                    'relative flex max-h-[90vh] w-full flex-col overflow-hidden rounded-2xl bg-white shadow-2xl',
                    sizes[size]
                )}
            >
                <div className="flex items-center justify-between border-b border-forest-900/10 px-5 py-4">
                    <h2 className="font-display text-lg font-semibold text-forest-900">{title}</h2>
                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-lg p-1.5 text-forest-900/60 hover:bg-forest-50"
                        aria-label="Close dialog"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>
                <div className="min-h-0 flex-1 overflow-y-auto p-5">{children}</div>
                {footer ? (
                    <div className="flex justify-end gap-2 border-t border-forest-900/10 bg-cream-50 px-5 py-3">
                        {footer}
                    </div>
                ) : null}
            </div>
        </div>,
        document.body
    );
}

export function Textarea({
    className,
    ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement>) {
    return <textarea className={cn(inputClass, 'min-h-28 resize-y', className)} {...props} />;
}

export const ToastContext = createContext<null>(null);