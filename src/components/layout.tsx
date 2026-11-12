import { useEffect, useState, type ReactNode } from 'react';
import { NavLink, Outlet, Link, useLocation } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
    Menu, ShieldAlert, ShieldCheck, X
} from 'lucide-react';
import { navItems } from '../navigation';
import { api, errorMessage } from '../api/client';
import { useSystemStatus } from '../hooks/useSystemStatus';
import { usePermissions, useRole } from '../context/RoleContext';
import { useToast } from '../context/ToastContext';
import { BrandLogo } from './social';
import { Button, Card, Modal, Skeleton, cn } from './ui';
import type { Role } from '../api/types';

export function EmergencyControl({ variant = 'panel' }: { variant?: 'sidebar' | 'panel' }) {
    const systemQuery = useSystemStatus();
    const queryClient = useQueryClient();
    const toast = useToast();
    const { canAdmin } = usePermissions();
    const [confirming, setConfirming] = useState(false);

    const active = systemQuery.data?.emergencyStop ?? false;

    const mutation = useMutation({
        mutationFn: (stopped: boolean) => api.setEmergencyStop(stopped),
        onSuccess: (_status, stopped) => {
            toast.push({
                tone: stopped ? 'error' : 'success',
                title: stopped ? 'Emergency stop activated' : 'Automation resumed',
                description: stopped
                    ? 'Publishing and automated replies are paused until a human clears the stop.'
                    : 'Agents may resume scheduled work.'
            });
            queryClient.invalidateQueries();
            setConfirming(false);
        },
        onError: (error) =>
            toast.push({ tone: 'error', title: 'Could not update emergency stop', description: errorMessage(error) })
    });

    const trigger = () => {
        if (!canAdmin || mutation.isPending || systemQuery.isLoading) return;
        setConfirming(true);
    };

    const button = (
        <button
            type="button"
            onClick={trigger}
            disabled={!canAdmin || mutation.isPending || systemQuery.isLoading}
            className={cn(
                'inline-flex w-full items-center justify-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50',
                active
                    ? 'bg-hhred-600 text-white hover:bg-hhred-700'
                    : 'border border-hhred-100 bg-hhred-50 text-hhred-700 hover:bg-hhred-100'
            )}
        >
            {active ? <ShieldAlert className="h-4 w-4" /> : <ShieldCheck className="h-4 w-4" />}
            {active ? 'Clear emergency stop' : 'Emergency stop'}
        </button>
    );

    const content = (
        <>
            <div className="flex items-start gap-2">
                <div className={cn('mt-0.5 h-2.5 w-2.5 rounded-full', active ? 'animate-pulse bg-hhred-500' : 'bg-forest-400')} />
                <div>
                    <p className={cn('text-sm font-semibold', variant === 'sidebar' ? 'text-cream-50' : 'text-forest-900')}>
                        {active ? 'Emergency stop active' : 'Automation is running'}
                    </p>
                    <p className={cn('mt-0.5 text-[11px]', variant === 'sidebar' ? 'text-cream-200/65' : 'text-forest-900/55')}>
                        {active
                            ? 'Publishing and auto-replies are paused. Human overrides remain available.'
                            : 'Scheduled publishing and routine replies are enabled.'}
                    </p>
                </div>
            </div>
            <div className="mt-3">{button}</div>
            {!canAdmin ? (
                <p className={cn('mt-2 text-[10px]', variant === 'sidebar' ? 'text-cream-200/50' : 'text-forest-900/45')}>
                    Only an Admin can activate or clear the emergency stop.
                </p>
            ) : null}
        </>
    );

    return (
        <>
            {variant === 'sidebar' ? (
                <div className="rounded-xl border border-white/10 bg-white/5 p-3">{content}</div>
            ) : (
                <Card className={cn('p-5', active && 'border-hhred-300 bg-hhred-50/50')}>{content}</Card>
            )}

            <Modal
                open={confirming}
                onClose={() => setConfirming(false)}
                title={active ? 'Clear emergency stop?' : 'Activate emergency stop?'}
                size="sm"
                footer={
                    <>
                        <Button variant="ghost" onClick={() => setConfirming(false)}>Cancel</Button>
                        <Button
                            variant={active ? 'primary' : 'danger'}
                            loading={mutation.isPending}
                            onClick={() => mutation.mutate(!active)}
                        >
                            {active ? 'Resume automation' : 'Activate stop'}
                        </Button>
                    </>
                }
            >
                <p className="text-sm leading-relaxed text-forest-900/75">
                    {active
                        ? 'Clearing the stop allows the Automatic Publishing Agent and Engagement Agent to resume. Human replies and manual publishing will remain available.'
                        : 'This immediately pauses all automated publishing and auto-replies. Escalated conversations stay in the Unified Inbox for human follow-up. Manual publishing also remains blocked until the stop is cleared.'}
                </p>
            </Modal>
        </>
    );
}

function Sidebar() {
    return (
        <aside className="hidden w-72 shrink-0 flex-col bg-forest-800 lg:flex">
            <div className="px-6 py-6">
                <BrandLogo />
            </div>

            <nav aria-label="Main navigation" className="flex-1 space-y-1 px-3">
                {navItems.map((item) => {
                    const Icon = item.icon;
                    return (
                        <NavLink
                            key={item.to}
                            to={item.to}
                            end={item.end}
                            className={({ isActive }) =>
                                cn(
                                    'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors',
                                    isActive
                                        ? 'bg-cream-100 text-forest-900'
                                        : 'text-cream-100/75 hover:bg-white/10 hover:text-cream-50'
                                )
                            }
                        >
                            <Icon className="h-4 w-4 shrink-0" aria-hidden />
                            <span>{item.label}</span>
                        </NavLink>
                    );
                })}
            </nav>

            <div className="space-y-3 p-4">
                <EmergencyControl variant="sidebar" />
                <div className="rounded-xl bg-white/5 p-3">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-cream-200/50">
                        Our mission
                    </p>
                    <p className="mt-1 font-display text-xs leading-relaxed text-cream-100/85">
                        Touching Hearts. Transforming Lives. Restoring Hope.
                    </p>
                </div>
            </div>
        </aside>
    );
}

function Topbar({ onMenu }: { onMenu: () => void }) {
    const location = useLocation();
    const { role, setRole } = useRole();
    const systemQuery = useSystemStatus();
    const current = navItems.find((item) =>
        item.to === '/' ? location.pathname === '/' : location.pathname.startsWith(item.to)
    );

    return (
        <header className="sticky top-0 z-30 border-b border-forest-900/10 bg-cream-50/90 backdrop-blur">
            <div className="flex h-16 items-center gap-3 px-4 sm:px-6 lg:px-8">
                <button
                    type="button"
                    onClick={onMenu}
                    className="rounded-xl border border-forest-900/15 bg-white p-2 text-forest-800 lg:hidden"
                    aria-label="Open navigation menu"
                >
                    <Menu className="h-5 w-5" />
                </button>

                <div className="min-w-0 flex-1">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-forest-900/40">
                        HH AI Manager
                    </p>
                    <p className="truncate font-display text-base font-semibold text-forest-900">
                        {current?.label ?? 'Overview'}
                    </p>
                </div>

                {systemQuery.data?.emergencyStop ? (
                    <Link
                        to="/agents"
                        className="hidden items-center gap-1.5 rounded-full border border-hhred-200 bg-hhred-50 px-3 py-1 text-[11px] font-semibold text-hhred-700 sm:inline-flex"
                    >
                        <ShieldAlert className="h-3.5 w-3.5" />
                        Emergency stop
                    </Link>
                ) : null}

                <label className="sr-only" htmlFor="role-select">Active role</label>
                <select
                    id="role-select"
                    value={role}
                    onChange={(event) => setRole(event.target.value as Role)}
                    className="h-9 rounded-xl border border-forest-900/15 bg-white px-2.5 text-xs font-semibold text-forest-800"
                >
                    <option value="admin">Admin</option>
                    <option value="editor">Editor</option>
                    <option value="viewer">Viewer</option>
                </select>

                <div className="grid h-9 w-9 place-items-center rounded-full bg-forest-700 text-xs font-bold text-cream-50">
                    {role === 'admin' ? 'JD' : role === 'editor' ? 'CS' : 'RV'}
                </div>
            </div>
        </header>
    );
}

function MobileNav({
    open,
    onClose
}: {
    open: boolean;
    onClose: () => void;
}) {
    useEffect(() => {
        if (!open) return;
        const onKey = (event: KeyboardEvent) => {
            if (event.key === 'Escape') onClose();
        };
        document.addEventListener('keydown', onKey);
        const previous = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        return () => {
            document.removeEventListener('keydown', onKey);
            document.body.style.overflow = previous;
        };
    }, [open, onClose]);

    if (!open) return null;

    return (
        <div className="fixed inset-0 z-50 lg:hidden">
            <div className="absolute inset-0 bg-forest-900/50 backdrop-blur-sm" onClick={onClose} aria-hidden />
            <div
                role="dialog"
                aria-modal="true"
                aria-label="Navigation menu"
                className="relative flex h-full w-80 max-w-[85vw] flex-col bg-forest-800 shadow-2xl"
            >
                <div className="flex items-center justify-between px-5 py-5">
                    <BrandLogo />
                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-lg p-2 text-cream-100 hover:bg-white/10"
                        aria-label="Close navigation menu"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                <nav aria-label="Mobile navigation" className="flex-1 space-y-1 px-3">
                    {navItems.map((item) => {
                        const Icon = item.icon;
                        return (
                            <NavLink
                                key={item.to}
                                to={item.to}
                                end={item.end}
                                onClick={onClose}
                                className={({ isActive }) =>
                                    cn(
                                        'flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium',
                                        isActive
                                            ? 'bg-cream-100 text-forest-900'
                                            : 'text-cream-100/80 hover:bg-white/10'
                                    )
                                }
                            >
                                <Icon className="h-4 w-4" aria-hidden />
                                {item.label}
                            </NavLink>
                        );
                    })}
                </nav>

                <div className="p-4">
                    <EmergencyControl variant="sidebar" />
                </div>
            </div>
        </div>
    );
}

export function AppShell() {
    const [mobileOpen, setMobileOpen] = useState(false);
    const location = useLocation();
    const systemQuery = useSystemStatus();

    useEffect(() => setMobileOpen(false), [location.pathname]);

    return (
        <div className="min-h-screen lg:flex">
            <a href="#main-content" className="skip-link">Skip to main content</a>
            <Sidebar />
            <MobileNav open={mobileOpen} onClose={() => setMobileOpen(false)} />

            <div className="flex min-w-0 flex-1 flex-col">
                <Topbar onMenu={() => setMobileOpen(true)} />

                {systemQuery.data?.emergencyStop ? (
                    <div role="alert" className="bg-hhred-600 px-4 py-2.5 text-center text-xs font-semibold text-white sm:px-6">
                        Emergency stop is active — automated publishing and replies are paused.{' '}
                        <Link to="/agents" className="underline underline-offset-2">Review controls</Link>
                    </div>
                ) : null}

                <main id="main-content" className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
                    <Outlet />
                </main>

                <footer className="border-t border-forest-900/10 px-4 py-5 text-center sm:px-6">
                    <p className="font-display text-xs text-forest-900/55">
                        Touching Hearts. Transforming Lives. Restoring Hope.
                    </p>
                </footer>
            </div>
        </div>
    );
}