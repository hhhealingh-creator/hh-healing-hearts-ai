import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
    CheckCircle2, Copy, Plug, RefreshCw, ShieldCheck, Unplug
} from 'lucide-react';
import { api, errorMessage } from '../api/client';
import type { Platform } from '../api/types';
import { usePermissions } from '../context/RoleContext';
import { useToast } from '../context/ToastContext';
import { useSystemStatus } from '../hooks/useSystemStatus';
import { PlatformBadge } from '../components/social';
import {
    Badge, Button, Card, ErrorState, PageHeader, Skeleton, Toggle
} from '../components/ui';
import { formatDateTime, formatNumber } from '../lib/format';

const permissions: Record<Platform, string[]> = {
    facebook: [
        'pages_show_list',
        'pages_read_engagement',
        'pages_manage_posts',
        'pages_read_user_content'
    ],
    instagram: [
        'instagram_basic',
        'instagram_content_publish',
        'instagram_manage_comments',
        'pages_show_list'
    ]
};

export default function Integrations() {
    const queryClient = useQueryClient();
    const toast = useToast();
    const { canAdmin, canWrite } = usePermissions();
    const systemQuery = useSystemStatus();

    const query = useQuery({ queryKey: ['integrations'], queryFn: api.getIntegrations });

    const refresh = () => {
        queryClient.invalidateQueries({ queryKey: ['integrations'] });
        queryClient.invalidateQueries({ queryKey: ['accounts'] });
        queryClient.invalidateQueries({ queryKey: ['overview'] });
    };

    const connectMutation = useMutation({
        mutationFn: (platform: Platform) => api.connectPlatform(platform),
        onSuccess: (account) => {
            toast.push({ tone: 'success', title: `${account.platform} connected` });
            refresh();
        },
        onError: (error) => toast.push({ tone: 'error', title: 'Connection failed', description: errorMessage(error) })
    });

    const disconnectMutation = useMutation({
        mutationFn: (platform: Platform) => api.disconnectPlatform(platform),
        onSuccess: (account) => {
            toast.push({ tone: 'info', title: `${account.platform} disconnected` });
            refresh();
        },
        onError: (error) => toast.push({ tone: 'error', title: 'Could not disconnect', description: errorMessage(error) })
    });

    const syncMutation = useMutation({
        mutationFn: (platform: Platform) => api.syncPlatform(platform),
        onSuccess: (account) => {
            toast.push({ tone: 'success', title: `${account.platform} synced`, description: `${formatNumber(account.followers)} followers` });
            refresh();
        },
        onError: (error) => toast.push({ tone: 'error', title: 'Sync failed', description: errorMessage(error) })
    });

    const publishingMutation = useMutation({
        mutationFn: ({ id, enabled }: { id: string; enabled: boolean }) => api.updateAccount(id, enabled),
        onSuccess: () => {
            toast.push({ tone: 'success', title: 'Publishing control updated' });
            refresh();
        },
        onError: (error) => toast.push({ tone: 'error', title: 'Could not update publishing', description: errorMessage(error) })
    });

    if (query.isLoading) {
        return (
            <div className="space-y-6">
                <Skeleton className="h-12 w-64" />
                <div className="grid gap-4 lg:grid-cols-2">
                    <Skeleton className="h-80" />
                    <Skeleton className="h-80" />
                </div>
            </div>
        );
    }

    if (query.isError || !query.data) {
        return <ErrorState message="Integrations could not be loaded." onRetry={() => query.refetch()} />;
    }

    const { accounts, webhookUrl, graphVersion } = query.data;
    const emergency = systemQuery.data?.emergencyStop ?? false;

    const copyWebhook = async () => {
        try {
            await navigator.clipboard.writeText(webhookUrl);
            toast.push({ tone: 'success', title: 'Webhook URL copied' });
        } catch {
            toast.push({ tone: 'error', title: 'Could not copy webhook URL' });
        }
    };

    return (
        <div className="space-y-6">
            <PageHeader
                title="Integrations"
                description="Connect Facebook and Instagram, control publishing, and review the credentials and webhook configuration used by the backend."
            />

            <div className="grid gap-4 lg:grid-cols-2">
                {accounts.map((account) => {
                    const connected = account.status === 'connected';
                    return (
                        <Card key={account.id} className="p-5">
                            <div className="flex items-start justify-between gap-3">
                                <div>
                                    <div className="flex items-center gap-2">
                                        <PlatformBadge platform={account.platform} />
                                        <Badge tone={connected ? 'green' : 'red'}>{account.status}</Badge>
                                    </div>
                                    <h2 className="mt-2 font-display text-lg font-semibold text-forest-900">{account.name}</h2>
                                    <p className="text-xs text-forest-900/55">{account.handle}</p>
                                </div>
                                <div className="text-right">
                                    <p className="font-display text-xl font-semibold text-forest-900">{formatNumber(account.followers)}</p>
                                    <p className="text-[10px] uppercase tracking-wide text-forest-900/40">followers</p>
                                </div>
                            </div>

                            <div className="mt-4 rounded-xl border border-forest-900/10 bg-cream-50 p-3">
                                <div className="flex items-center justify-between gap-3">
                                    <div>
                                        <p className="text-xs font-semibold text-forest-900">Publishing enabled</p>
                                        <p className="text-[11px] text-forest-900/50">
                                            {emergency ? 'Emergency stop is active.' : 'Controls whether this account can receive posts.'}
                                        </p>
                                    </div>
                                    <Toggle
                                        checked={account.publishingEnabled}
                                        onChange={(enabled) => publishingMutation.mutate({ id: account.id, enabled })}
                                        disabled={!canWrite || !connected || emergency || publishingMutation.isPending}
                                        label={`Publishing for ${account.platform}`}
                                    />
                                </div>
                            </div>

                            <div className="mt-3">
                                <p className="text-[10px] font-semibold uppercase tracking-wide text-forest-900/40">Granted permissions</p>
                                <ul className="mt-1.5 grid gap-1 sm:grid-cols-2">
                                    {permissions[account.platform].map((permission) => (
                                        <li key={permission} className="flex items-center gap-1.5 text-[11px] text-forest-900/65">
                                            <CheckCircle2 className="h-3 w-3 shrink-0 text-forest-500" aria-hidden />
                                            <code className="truncate">{permission}</code>
                                        </li>
                                    ))}
                                </ul>
                            </div>

                            <p className="mt-3 text-[11px] text-forest-900/45">
                                Last synced {account.lastSyncedAt ? formatDateTime(account.lastSyncedAt) : 'never'}
                            </p>

                            <div className="mt-4 flex flex-wrap gap-2">
                                {connected ? (
                                    <>
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={() => syncMutation.mutate(account.platform)}
                                            disabled={!canWrite}
                                            loading={syncMutation.isPending && syncMutation.variables === account.platform}
                                        >
                                            <RefreshCw className="h-3.5 w-3.5" aria-hidden />
                                            Sync now
                                        </Button>
                                        <Button
                                            size="sm"
                                            variant="ghost"
                                            onClick={() => disconnectMutation.mutate(account.platform)}
                                            disabled={!canAdmin}
                                            loading={disconnectMutation.isPending && disconnectMutation.variables === account.platform}
                                        >
                                            <Unplug className="h-3.5 w-3.5" aria-hidden />
                                            Disconnect
                                        </Button>
                                    </>
                                ) : (
                                    <Button
                                        size="sm"
                                        onClick={() => connectMutation.mutate(account.platform)}
                                        disabled={!canAdmin}
                                        loading={connectMutation.isPending && connectMutation.variables === account.platform}
                                    >
                                        <Plug className="h-3.5 w-3.5" aria-hidden />
                                        Connect {account.platform}
                                    </Button>
                                )}
                            </div>
                        </Card>
                    );
                })}
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
                <Card className="p-5">
                    <div className="flex items-center gap-2">
                        <ShieldCheck className="h-5 w-5 text-forest-600" aria-hidden />
                        <h2 className="font-display text-lg font-semibold text-forest-900">Webhook & Graph API</h2>
                    </div>
                    <p className="mt-1 text-xs text-forest-900/55">
                        Meta webhooks are verified and processed by the backend. The frontend never receives the app secret or page token.
                    </p>
                    <dl className="mt-4 space-y-3 text-xs">
                        <div>
                            <dt className="font-semibold text-forest-900">Webhook URL</dt>
                            <dd className="mt-1 flex items-center gap-2 rounded-xl bg-cream-50 p-2.5">
                                <code className="min-w-0 flex-1 truncate text-[11px] text-forest-900/70">{webhookUrl}</code>
                                <Button size="sm" variant="ghost" onClick={copyWebhook} aria-label="Copy webhook URL">
                                    <Copy className="h-3.5 w-3.5" />
                                </Button>
                            </dd>
                        </div>
                        <div className="flex items-center justify-between rounded-xl border border-forest-900/10 p-2.5">
                            <dt className="font-semibold text-forest-900">Graph API version</dt>
                            <dd className="font-mono text-forest-900/65">{graphVersion}</dd>
                        </div>
                        <div className="flex items-center justify-between rounded-xl border border-forest-900/10 p-2.5">
                            <dt className="font-semibold text-forest-900">Credential storage</dt>
                            <dd><Badge tone="green">Server-side only</Badge></dd>
                        </div>
                    </dl>
                    <p className="mt-3 text-[11px] text-forest-900/45">
                        Add `META_ACCESS_TOKEN`, `META_FB_PAGE_ID` and `META_IG_ACCOUNT_ID` to the server environment to switch from simulation to live Graph API publishing.
                    </p>
                </Card>

                <Card className="p-5">
                    <h2 className="font-display text-lg font-semibold text-forest-900">Publishing controls</h2>
                    <p className="mt-1 text-xs text-forest-900/55">
                        Publishing is controlled at three levels: the account-level toggle above, the Automatic Publishing Agent, and the workspace emergency stop.
                    </p>
                    <ul className="mt-4 space-y-3 text-xs">
                        <li className="flex items-start gap-2 rounded-xl bg-cream-50 p-3">
                            <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-forest-500" />
                            <div>
                                <p className="font-semibold text-forest-900">Account publishing</p>
                                <p className="text-forest-900/60">Paused accounts reject both manual and automated publishing.</p>
                            </div>
                        </li>
                        <li className="flex items-start gap-2 rounded-xl bg-cream-50 p-3">
                            <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-forest-500" />
                            <div>
                                <p className="font-semibold text-forest-900">Automatic Publishing Agent</p>
                                <p className="text-forest-900/60">When enabled, due scheduled posts are published automatically. In human-review mode they become review items.</p>
                            </div>
                        </li>
                        <li className="flex items-start gap-2 rounded-xl bg-cream-50 p-3">
                            <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-hhred-500" />
                            <div>
                                <p className="font-semibold text-forest-900">Emergency stop</p>
                                <p className="text-forest-900/60">Overrides all automation and blocks publishing until cleared by an Admin.</p>
                            </div>
                        </li>
                    </ul>
                </Card>
            </div>

            {!canAdmin ? (
                <p className="rounded-xl border border-cream-300 bg-cream-50 p-3 text-xs text-forest-900/60">
                    Connecting or disconnecting accounts requires an Admin role. Editors can sync and adjust publishing toggles.
                </p>
            ) : null}
        </div>
    );
}