import { useEffect, useState, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
    KeyRound, Lock, ShieldCheck, UserCog
} from 'lucide-react';

import type { Settings } from '../api/types';
import { usePermissions } from '../context/RoleContext';
import { useToast } from '../context/ToastContext';
import { EmergencyControl } from '../components/layout';
import {
    Badge, Button, Card, ErrorState, Field, Modal, PageHeader,
    Skeleton, Toggle, cn, inputClass
} from '../components/ui';
import { formatDateTime } from '../lib/format';

type SettingsForm = Pick<
    Settings,
    'orgName' | 'timezone' | 'autoPublish' | 'autoReply' |
    'quietHoursStart' | 'quietHoursEnd' | 'escalationEmail'
>;

const roleMatrix = [
    { capability: 'Create and edit content', admin: true, editor: true, viewer: false },
    { capability: 'Publish posts', admin: true, editor: true, viewer: false },
    { capability: 'Reply / escalate comments', admin: true, editor: true, viewer: false },
    { capability: 'Run agents', admin: true, editor: true, viewer: false },
    { capability: 'Configure agents', admin: true, editor: false, viewer: false },
    { capability: 'Manage integrations', admin: true, editor: false, viewer: false },
    { capability: 'Rotate credentials', admin: true, editor: false, viewer: false },
    { capability: 'Emergency stop', admin: true, editor: false, viewer: false }
];

export default function SettingsPage() {
    const queryClient = useQueryClient();
    const toast = useToast();
    const { canAdmin } = usePermissions();

    const settingsQuery = useQuery({ queryKey: ['settings'], queryFn: api.getSettings });
    const activityQuery = useQuery({ queryKey: ['activity'], queryFn: () => api.getActivity(50) });

    const [form, setForm] = useState<SettingsForm | null>(null);
    const [credentialOpen, setCredentialOpen] = useState(false);
    const [credentialForm, setCredentialForm] = useState({
        metaAppId: '',
        metaAppSecret: '',
        pageToken: ''
    });

    useEffect(() => {
        if (!settingsQuery.data) return;
        const s = settingsQuery.data;
        setForm({
            orgName: s.orgName,
            timezone: s.timezone,
            autoPublish: s.autoPublish,
            autoReply: s.autoReply,
            quietHoursStart: s.quietHoursStart,
            quietHoursEnd: s.quietHoursEnd,
            escalationEmail: s.escalationEmail
        });
    }, [settingsQuery.data]);

    const saveMutation = useMutation({
        mutationFn: (patch: SettingsForm) => api.updateSettings(patch),
        onSuccess: () => {
            toast.push({ tone: 'success', title: 'Settings saved' });
            queryClient.invalidateQueries({ queryKey: ['settings'] });
            queryClient.invalidateQueries({ queryKey: ['activity'] });
        },
        onError: (error) =>
            toast.push({ tone: 'error', title: 'Could not save settings', description: errorMessage(error) })
    });

    const credentialMutation = useMutation({
        mutationFn: () => api.rotateCredentials(credentialForm),
        onSuccess: () => {
            toast.push({ tone: 'success', title: 'Credentials rotated', description: 'Only masked values are stored for display.' });
            setCredentialOpen(false);
            setCredentialForm({ metaAppId: '', metaAppSecret: '', pageToken: '' });
            queryClient.invalidateQueries({ queryKey: ['settings'] });
            queryClient.invalidateQueries({ queryKey: ['activity'] });
        },
        onError: (error) =>
            toast.push({ tone: 'error', title: 'Could not rotate credentials', description: errorMessage(error) })
    });

    const submit = (event: FormEvent) => {
        event.preventDefault();
        if (!form) return;
        saveMutation.mutate(form);
    };

    if (settingsQuery.isLoading) {
        return (
            <div className="space-y-6">
                <Skeleton className="h-12 w-64" />
                <Skeleton className="h-96" />
            </div>
        );
    }

    if (settingsQuery.isError || !settingsQuery.data || !form) {
        return <ErrorState message="Settings could not be loaded." onRetry={() => settingsQuery.refetch()} />;
    }

    const settings = settingsQuery.data;

    return (
        <div className="space-y-6">
            <PageHeader
                title="Settings"
                description="Organization profile, automation defaults, security controls, credentials and the audited activity log."
            />

            <div className="grid gap-6 xl:grid-cols-3">
                <div className="space-y-6 xl:col-span-2">
                    <Card className="p-5">
                        <h2 className="font-display text-lg font-semibold text-forest-900">Organization profile</h2>
                        <p className="text-xs text-forest-900/55">Used in reporting and escalation notifications.</p>
                        <form onSubmit={submit} className="mt-4 space-y-4">
                            <div className="grid gap-4 sm:grid-cols-2">
                                <Field label="Organization name" htmlFor="org-name">
                                    <input
                                        id="org-name"
                                        className={inputClass}
                                        value={form.orgName}
                                        onChange={(e) => setForm({ ...form, orgName: e.target.value })}
                                        disabled={!canAdmin}
                                    />
                                </Field>
                                <Field label="Timezone" htmlFor="timezone">
                                    <select
                                        id="timezone"
                                        className={inputClass}
                                        value={form.timezone}
                                        onChange={(e) => setForm({ ...form, timezone: e.target.value })}
                                        disabled={!canAdmin}
                                    >
                                        <option value="America/New_York">America/New_York</option>
                                        <option value="America/Chicago">America/Chicago</option>
                                        <option value="America/Denver">America/Denver</option>
                                        <option value="America/Los_Angeles">America/Los_Angeles</option>
                                        <option value="Europe/London">Europe/London</option>
                                    </select>
                                </Field>
                            </div>
                            <Field label="Escalation email" htmlFor="escalation-email" hint="Sensitive and complaint escalations are routed here.">
                                <input
                                    id="escalation-email"
                                    type="email"
                                    className={inputClass}
                                    value={form.escalationEmail}
                                    onChange={(e) => setForm({ ...form, escalationEmail: e.target.value })}
                                    disabled={!canAdmin}
                                />
                            </Field>

                            <div className="grid gap-4 sm:grid-cols-2">
                                <div className="flex items-center justify-between rounded-xl border border-forest-900/10 p-3">
                                    <div>
                                        <p className="text-xs font-semibold text-forest-900">Automatic publishing</p>
                                        <p className="text-[11px] text-forest-900/50">Default automation preference.</p>
                                    </div>
                                    <Toggle
                                        checked={form.autoPublish}
                                        onChange={(value) => setForm({ ...form, autoPublish: value })}
                                        disabled={!canAdmin}
                                        label="Automatic publishing"
                                    />
                                </div>
                                <div className="flex items-center justify-between rounded-xl border border-forest-900/10 p-3">
                                    <div>
                                        <p className="text-xs font-semibold text-forest-900">Automatic replies</p>
                                        <p className="text-[11px] text-forest-900/50">Routine comments only.</p>
                                    </div>
                                    <Toggle
                                        checked={form.autoReply}
                                        onChange={(value) => setForm({ ...form, autoReply: value })}
                                        disabled={!canAdmin}
                                        label="Automatic replies"
                                    />
                                </div>
                            </div>

                            <div className="grid gap-4 sm:grid-cols-2">
                                <Field label="Quiet hours start" htmlFor="quiet-start">
                                    <input
                                        id="quiet-start"
                                        type="time"
                                        className={inputClass}
                                        value={form.quietHoursStart}
                                        onChange={(e) => setForm({ ...form, quietHoursStart: e.target.value })}
                                        disabled={!canAdmin}
                                    />
                                </Field>
                                <Field label="Quiet hours end" htmlFor="quiet-end">
                                    <input
                                        id="quiet-end"
                                        type="time"
                                        className={inputClass}
                                        value={form.quietHoursEnd}
                                        onChange={(e) => setForm({ ...form, quietHoursEnd: e.target.value })}
                                        disabled={!canAdmin}
                                    />
                                </Field>
                            </div>

                            <div className="flex flex-wrap items-center gap-2 pt-2">
                                <Button type="submit" disabled={!canAdmin} loading={saveMutation.isPending}>
                                    Save settings
                                </Button>
                                {!canAdmin ? (
                                    <span className="text-[11px] text-forest-900/50">Admin role required to save.</span>
                                ) : null}
                            </div>
                        </form>
                    </Card>

                    <Card className="p-5">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                            <div className="flex items-center gap-2">
                                <KeyRound className="h-5 w-5 text-forest-600" aria-hidden />
                                <h2 className="font-display text-lg font-semibold text-forest-900">API credentials</h2>
                            </div>
                            <Button size="sm" variant="outline" onClick={() => setCredentialOpen(true)} disabled={!canAdmin}>
                                <Lock className="h-3.5 w-3.5" aria-hidden />
                                Rotate credentials
                            </Button>
                        </div>
                        <p className="mt-1 text-xs text-forest-900/55">
                            Secrets are stored server-side and are never returned to the browser. Only masked values are displayed.
                        </p>
                        <dl className="mt-4 grid gap-3 sm:grid-cols-3">
                            <div className="rounded-xl bg-cream-50 p-3">
                                <dt className="text-[10px] font-semibold uppercase tracking-wide text-forest-900/40">Meta App ID</dt>
                                <dd className="mt-1 font-mono text-xs text-forest-900/75">{settings.credentials.metaAppId}</dd>
                            </div>
                            <div className="rounded-xl bg-cream-50 p-3">
                                <dt className="text-[10px] font-semibold uppercase tracking-wide text-forest-900/40">App secret</dt>
                                <dd className="mt-1 font-mono text-xs text-forest-900/75">{settings.credentials.metaAppSecretMasked}</dd>
                            </div>
                            <div className="rounded-xl bg-cream-50 p-3">
                                <dt className="text-[10px] font-semibold uppercase tracking-wide text-forest-900/40">Page token</dt>
                                <dd className="mt-1 font-mono text-xs text-forest-900/75">{settings.credentials.pageTokenMasked}</dd>
                            </div>
                        </dl>
                    </Card>

                    <Card className="overflow-hidden">
                        <div className="border-b border-forest-900/10 px-5 py-4">
                            <h2 className="font-display text-lg font-semibold text-forest-900">Activity log</h2>
                            <p className="text-xs text-forest-900/55">Every write action is recorded with the acting role.</p>
                        </div>
                        {activityQuery.isLoading ? (
                            <div className="space-y-2 p-5">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12" />)}</div>
                        ) : activityQuery.isError ? (
                            <div className="p-5"><ErrorState message="Activity could not be loaded." onRetry={() => activityQuery.refetch()} /></div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full min-w-[640px] text-left text-sm">
                                    <thead className="bg-cream-50 text-[11px] uppercase tracking-wide text-forest-900/45">
                                        <tr>
                                            <th className="px-5 py-3 font-semibold">When</th>
                                            <th className="px-3 py-3 font-semibold">Actor</th>
                                            <th className="px-3 py-3 font-semibold">Action</th>
                                            <th className="px-5 py-3 font-semibold">Target</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-forest-900/5">
                                        {(activityQuery.data ?? []).map((item) => (
                                            <tr key={item.id}>
                                                <td className="whitespace-nowrap px-5 py-3 text-[11px] text-forest-900/50">{formatDateTime(item.at)}</td>
                                                <td className="px-3 py-3">
                                                    <p className="text-xs font-medium text-forest-900">{item.actor}</p>
                                                    <p className="text-[10px] uppercase tracking-wide text-forest-900/40">{item.role}</p>
                                                </td>
                                                <td className="px-3 py-3 text-xs text-forest-900/70">{item.action}</td>
                                                <td className="px-5 py-3 text-xs text-forest-900/60">{item.target}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </Card>
                </div>

                <div className="space-y-6">
                    <EmergencyControl variant="panel" />

                    <Card className="p-5">
                        <div className="flex items-center gap-2">
                            <UserCog className="h-5 w-5 text-forest-600" aria-hidden />
                            <h2 className="font-display text-lg font-semibold text-forest-900">Role-based access</h2>
                        </div>
                        <p className="mt-1 text-xs text-forest-900/55">
                            Roles are enforced by the backend. The role switcher in the top bar is for demonstration and should be replaced by your identity provider in production.
                        </p>
                        <div className="mt-3 overflow-x-auto">
                            <table className="w-full min-w-[280px] text-left text-[11px]">
                                <thead className="text-[10px] uppercase tracking-wide text-forest-900/40">
                                    <tr>
                                        <th className="py-2 font-semibold">Capability</th>
                                        <th className="py-2 text-center font-semibold">Admin</th>
                                        <th className="py-2 text-center font-semibold">Editor</th>
                                        <th className="py-2 text-center font-semibold">Viewer</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-forest-900/5">
                                    {roleMatrix.map((row) => (
                                        <tr key={row.capability}>
                                            <td className="py-2 pr-2 text-forest-900/70">{row.capability}</td>
                                            {[row.admin, row.editor, row.viewer].map((allowed, index) => (
                                                <td key={index} className="py-2 text-center">
                                                    <span className={cn('inline-block h-4 w-4 rounded-full', allowed ? 'bg-forest-500' : 'bg-forest-900/10')} aria-label={allowed ? 'Allowed' : 'Not allowed'} />
                                                </td>
                                            ))}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </Card>

                    <Card className="p-5">
                        <div className="flex items-center gap-2">
                            <ShieldCheck className="h-5 w-5 text-forest-600" aria-hidden />
                            <h2 className="font-display text-lg font-semibold text-forest-900">Security posture</h2>
                        </div>
                        <ul className="mt-3 space-y-2 text-xs text-forest-900/65">
                            <li className="flex items-center justify-between gap-2 rounded-xl bg-cream-50 p-2.5">
                                <span>Human override</span>
                                <Badge tone="green">Enabled</Badge>
                            </li>
                            <li className="flex items-center justify-between gap-2 rounded-xl bg-cream-50 p-2.5">
                                <span>Audit logging</span>
                                <Badge tone="green">Enabled</Badge>
                            </li>
                            <li className="flex items-center justify-between gap-2 rounded-xl bg-cream-50 p-2.5">
                                <span>Credential masking</span>
                                <Badge tone="green">Enabled</Badge>
                            </li>
                            <li className="flex items-center justify-between gap-2 rounded-xl bg-cream-50 p-2.5">
                                <span>Emergency stop</span>
                                <Badge tone="cream">Admin only</Badge>
                            </li>
                        </ul>
                    </Card>
                </div>
            </div>

            <Modal
                open={credentialOpen}
                onClose={() => setCredentialOpen(false)}
                title="Rotate Meta credentials"
                footer={
                    <>
                        <Button variant="ghost" onClick={() => setCredentialOpen(false)}>Cancel</Button>
                        <Button
                            onClick={() => credentialMutation.mutate()}
                            loading={credentialMutation.isPending}
                            disabled={!credentialForm.metaAppSecret && !credentialForm.pageToken}
                        >
                            Rotate credentials
                        </Button>
                    </>
                }
            >
                <div className="space-y-4">
                    <p className="text-xs leading-relaxed text-forest-900/60">
                        Provide new values only for the credentials you want to replace. The backend masks them and never returns the raw secret.
                    </p>
                    <Field label="Meta App ID" htmlFor="cred-app-id">
                        <input
                            id="cred-app-id"
                            className={inputClass}
                            value={credentialForm.metaAppId}
                            onChange={(e) => setCredentialForm({ ...credentialForm, metaAppId: e.target.value })}
                            placeholder="Optional"
                        />
                    </Field>
                    <Field label="Meta App Secret" htmlFor="cred-app-secret">
                        <input
                            id="cred-app-secret"
                            type="password"
                            className={inputClass}
                            value={credentialForm.metaAppSecret}
                            onChange={(e) => setCredentialForm({ ...credentialForm, metaAppSecret: e.target.value })}
                            placeholder="New app secret"
                        />
                    </Field>
                    <Field label="Page Access Token" htmlFor="cred-page-token">
                        <input
                            id="cred-page-token"
                            type="password"
                            className={inputClass}
                            value={credentialForm.pageToken}
                            onChange={(e) => setCredentialForm({ ...credentialForm, pageToken: e.target.value })}
                            placeholder="New page token"
                        />
                    </Field>
                </div>
            </Modal>
        </div>
    );
}