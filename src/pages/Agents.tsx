import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
    BarChart3, Bot, MessageSquare, PenLine, Play, Send
} from 'lucide-react';
import type { Agent, AgentId } from '../api/types';
import { api, errorMessage } from '../api/client';
import { usePermissions } from '../context/RoleContext';
import { useToast } from '../context/ToastContext';
import { useSystemStatus } from '../hooks/useSystemStatus';
import { EmergencyControl } from '../components/layout';
import {
    Badge, Button, Card, ErrorState, PageHeader, Skeleton, Toggle, cn
} from '../components/ui';
import { formatDateTime } from '../lib/format';

const icons: Record<AgentId, typeof Bot> = {
    content: PenLine,
    publishing: Send,
    engagement: MessageSquare,
    analytics: BarChart3
};

export default function Agents() {
    const queryClient = useQueryClient();
    const toast = useToast();
    const { canAdmin, canWrite } = usePermissions();
    const agentsQuery = useQuery({ queryKey: ['agents'], queryFn: api.getAgents });
    const systemQuery = useSystemStatus();

    const updateMutation = useMutation({
        mutationFn: ({ id, patch }: { id: AgentId; patch: { enabled?: boolean; mode?: Agent['mode'] } }) =>
            api.updateAgent(id, patch),
        onSuccess: () => {
            toast.push({ tone: 'success', title: 'Agent updated' });
            queryClient.invalidateQueries({ queryKey: ['agents'] });
            queryClient.invalidateQueries({ queryKey: ['overview'] });
        },
        onError: (error) => toast.push({ tone: 'error', title: 'Could not update agent', description: errorMessage(error) })
    });

    const runMutation = useMutation({
        mutationFn: (id: AgentId) => api.runAgent(id),
        onSuccess: (result) => {
            toast.push({
                tone: 'success',
                title: 'Agent run complete',
                description: result.actions[0] ?? 'The agent finished its work.'
            });
            queryClient.invalidateQueries({ queryKey: ['agents'] });
            queryClient.invalidateQueries({ queryKey: ['posts'] });
            queryClient.invalidateQueries({ queryKey: ['comments'] });
            queryClient.invalidateQueries({ queryKey: ['overview'] });
        },
        onError: (error) => toast.push({ tone: 'error', title: 'Agent run failed', description: errorMessage(error) })
    });

    const emergency = systemQuery.data?.emergencyStop ?? false;

    return (
        <div className="space-y-6">
            <PageHeader
                title="AI Agents"
                description="Four independently managed agents support content creation, publishing, engagement and reporting. Humans remain in control of sensitive conversations and emergency stops."
            />

            <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
                <div className="grid gap-4 sm:grid-cols-2">
                    {agentsQuery.isLoading ? (
                        Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-72" />)
                    ) : agentsQuery.isError ? (
                        <div className="sm:col-span-2"><ErrorState message="Agents could not be loaded." onRetry={() => agentsQuery.refetch()} /></div>
                    ) : (
                        agentsQuery.data?.map((agent) => {
                            const Icon = icons[agent.id];
                            const isUpdating = updateMutation.isPending && updateMutation.variables?.id === agent.id;
                            const isRunning = runMutation.isPending && runMutation.variables === agent.id;

                            return (
                                <Card key={agent.id} className={cn('flex flex-col p-5', !agent.enabled && 'bg-cream-50/60')}>
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="flex items-center gap-3">
                                            <div className="grid h-11 w-11 place-items-center rounded-xl bg-forest-50 text-forest-700">
                                                <Icon className="h-5 w-5" aria-hidden />
                                            </div>
                                            <div>
                                                <h2 className="font-display text-base font-semibold text-forest-900">{agent.name}</h2>
                                                <p className="text-[11px] text-forest-900/50">{agent.id}</p>
                                            </div>
                                        </div>
                                        <Toggle
                                            checked={agent.enabled}
                                            onChange={(enabled) => updateMutation.mutate({ id: agent.id, patch: { enabled } })}
                                            disabled={!canAdmin || isUpdating}
                                            label={`${agent.enabled ? 'Disable' : 'Enable'} ${agent.name}`}
                                        />
                                    </div>

                                    <p className="mt-3 text-sm leading-relaxed text-forest-900/65">{agent.description}</p>

                                    <div className="mt-4 grid grid-cols-2 gap-2">
                                        <div className="rounded-xl bg-cream-50 p-3">
                                            <p className="text-[10px] font-semibold uppercase tracking-wide text-forest-900/40">Tasks today</p>
                                            <p className="mt-1 font-display text-xl font-semibold text-forest-900">{agent.tasksToday}</p>
                                        </div>
                                        <div className="rounded-xl bg-cream-50 p-3">
                                            <p className="text-[10px] font-semibold uppercase tracking-wide text-forest-900/40">Success rate</p>
                                            <p className="mt-1 font-display text-xl font-semibold text-forest-900">{agent.successRate}%</p>
                                        </div>
                                    </div>

                                    <div className="mt-4">
                                        <label htmlFor={`mode-${agent.id}`} className="mb-1 block text-[11px] font-semibold text-forest-900/60">
                                            Operating mode
                                        </label>
                                        <select
                                            id={`mode-${agent.id}`}
                                            value={agent.mode}
                                            onChange={(event) =>
                                                updateMutation.mutate({
                                                    id: agent.id,
                                                    patch: { mode: event.target.value as Agent['mode'] }
                                                })
                                            }
                                            disabled={!canAdmin || isUpdating}
                                            className="h-9 w-full rounded-xl border border-forest-900/15 bg-white px-2.5 text-xs font-semibold text-forest-800 disabled:opacity-60"
                                        >
                                            <option value="auto">Automatic</option>
                                            <option value="human_review">Human review</option>
                                        </select>
                                    </div>

                                    <div className="mt-auto flex items-center justify-between gap-2 pt-4">
                                        <span className="text-[10px] text-forest-900/45">
                                            Last run {agent.lastRunAt ? formatDateTime(agent.lastRunAt) : 'never'}
                                        </span>
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={() => runMutation.mutate(agent.id)}
                                            disabled={!canWrite || !agent.enabled || emergency || isRunning}
                                            loading={isRunning}
                                        >
                                            <Play className="h-3.5 w-3.5" aria-hidden />
                                            Run now
                                        </Button>
                                    </div>

                                    {!agent.enabled ? (
                                        <p className="mt-2 text-[10px] font-medium text-forest-900/45">Agent paused — no automated work will run.</p>
                                    ) : null}
                                </Card>
                            );
                        })
                    )}
                </div>

                <div className="space-y-4">
                    <EmergencyControl variant="panel" />

                    <Card className="p-5">
                        <h2 className="font-display text-lg font-semibold text-forest-900">Escalation guardrails</h2>
                        <p className="mt-1 text-xs text-forest-900/55">
                            The Engagement Agent never answers these categories automatically:
                        </p>
                        <ul className="mt-3 space-y-2 text-xs text-forest-900/75">
                            {['Sensitive or crisis language', 'Complaints and service concerns', 'Medical questions', 'Donation and fundraising requests', 'Beneficiary or client matters'].map((item) => (
                                <li key={item} className="flex items-start gap-2">
                                    <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-hhred-500" aria-hidden />
                                    {item}
                                </li>
                            ))}
                        </ul>
                        <div className="mt-4 flex flex-wrap gap-2">
                            <Badge tone="green">Human override enabled</Badge>
                            <Badge tone="cream">Activity logged</Badge>
                        </div>
                    </Card>

                    {!canAdmin ? (
                        <p className="rounded-xl border border-cream-300 bg-cream-50 p-3 text-xs text-forest-900/60">
                            Only an Admin can change agent configuration or the emergency stop. Editors can run agents.
                        </p>
                    ) : null}
                </div>
            </div>
        </div>
    );
}