export type Role = 'admin' | 'editor' | 'viewer';
export type Platform = 'facebook' | 'instagram';
export type AgentId = 'content' | 'publishing' | 'engagement' | 'analytics';
export type PostStatus =
    | 'draft'
    | 'scheduled'
    | 'publishing'
    | 'published'
    | 'failed'
    | 'needs_review';
export type CommentStatus = 'new' | 'auto_replied' | 'escalated' | 'resolved';
export type CommentCategory =
    | 'routine'
    | 'sensitive'
    | 'complaint'
    | 'medical'
    | 'donation'
    | 'beneficiary';
export type AgentMode = 'auto' | 'human_review';

export interface SocialAccount {
    id: string;
    platform: Platform;
    name: string;
    handle: string;
    status: 'connected' | 'disconnected' | 'needs_reauth';
    followers: number;
    lastSyncedAt: string | null;
    publishingEnabled: boolean;
}

export interface PostMetrics {
    impressions: number;
    reach: number;
    likes: number;
    comments: number;
    shares: number;
}

export interface Post {
    id: string;
    content: string;
    mediaUrl?: string;
    platforms: Platform[];
    status: PostStatus;
    scheduledFor?: string;
    publishedAt?: string;
    createdAt: string;
    createdBy: string;
    metrics?: PostMetrics;
}

export interface SocialComment {
    id: string;
    postId: string;
    platform: Platform;
    author: string;
    message: string;
    createdAt: string;
    status: CommentStatus;
    category?: CommentCategory;
    reply?: string;
    assignedTo?: string;
}

export interface Agent {
    id: AgentId;
    name: string;
    description: string;
    enabled: boolean;
    mode: AgentMode;
    lastRunAt?: string;
    tasksToday: number;
    successRate: number;
}

export interface ActivityEntry {
    id: string;
    at: string;
    actor: string;
    role: Role;
    action: string;
    target: string;
    detail?: string;
}

export interface Settings {
    orgName: string;
    timezone: string;
    autoPublish: boolean;
    autoReply: boolean;
    quietHoursStart: string;
    quietHoursEnd: string;
    escalationEmail: string;
    credentials: {
        metaAppId: string;
        metaAppSecretMasked: string;
        pageTokenMasked: string;
    };
}

export interface CredentialInput {
    metaAppId: string;
    metaAppSecret: string;
    pageToken: string;
}

export interface SystemStatus {
    emergencyStop: boolean;
    lastAutomationRun: string | null;
    activeAgents: number;
}

export interface Kpis {
    totalFollowers: number;
    followerChange: number;
    reach: number;
    reachChange: number;
    engagement: number;
    engagementChange: number;
    engagementRate: number;
    engagementRateChange: number;
    pendingComments: number;
    scheduledPosts: number;
}

export interface OverviewResponse {
    kpis: Kpis;
    accounts: SocialAccount[];
    upcomingPosts: Post[];
    recentActivity: ActivityEntry[];
    agents: Agent[];
    system: SystemStatus;
    platformStats: {
        platform: Platform;
        followers: number;
        reach: number;
        engagement: number;
    }[];
}

export interface AnalyticsPoint {
    date: string;
    facebook: number;
    instagram: number;
    impressions: number;
    reach: number;
    engagement: number;
}

export interface AnalyticsResponse {
    range: number;
    kpis: Kpis;
    series: AnalyticsPoint[];
    platformBreakdown: {
        platform: Platform;
        impressions: number;
        reach: number;
        engagement: number;
    }[];
    topPosts: Post[];
    followerGrowth: { date: string; followers: number }[];
}

export interface PostInput {
    content: string;
    platforms: Platform[];
    mediaUrl?: string;
    scheduledFor?: string;
    publishNow?: boolean;
}

export type AnalyticsRange = 7 | 30 | 90;

/**
 * Shape of GET /integrations. Adjust to match your actual backend response.
 */
export interface IntegrationsData {
    accounts: SocialAccount[];
    lastSyncedAt: string | null;
}

/* ---- Backwards-compatible aliases (used by client.ts) ---- */
export type Account = SocialAccount;
export type ActivityItem = ActivityEntry;
export type AnalyticsData = AnalyticsResponse;
export type OverviewData = OverviewResponse;