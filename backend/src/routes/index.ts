export type AgentId = 'content' | 'publishing' | 'engagement' | 'analytics';
export type AgentMode = 'auto' | 'human_review';
export type Platform = 'facebook' | 'instagram';
export type PostStatus =
    | 'draft' | 'scheduled' | 'publishing' | 'published' | 'failed' | 'needs_review';
export type CommentStatus = 'new' | 'auto_replied' | 'escalated' | 'resolved';
export type CommentCategory =
    | 'routine' | 'sensitive' | 'complaint' | 'medical' | 'donation' | 'beneficiary';
export type AnalyticsRange = 7 | 30 | 90;
export type Role = 'admin' | 'editor' | 'viewer';

export interface Agent {
    id: AgentId;
    name: string;
    description: string;
    enabled: boolean;
    mode: AgentMode;
    tasksToday: number;
    successRate: number;
    lastRunAt: string | null;
}

export interface Account {
    id: string;
    platform: Platform;
    name: string;
    handle: string;
    status: 'connected' | 'disconnected' | 'error';
    followers: number;
    publishingEnabled: boolean;
    lastSyncedAt: string | null;
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
    platforms: Platform[];
    mediaUrl: string | null;
    status: PostStatus;
    scheduledFor: string | null;
    publishedAt: string | null;
    createdAt: string;
    metrics: PostMetrics;
}

export interface PostInput {
    content: string;
    platforms: Platform[];
    mediaUrl?: string;
    scheduledFor?: string;
    publishNow?: boolean;
}

export interface SocialComment {
    id: string;
    author: string;
    message: string;
    platform: Platform;
    status: CommentStatus;
    category: CommentCategory | null;
    reply: string | null;
    assignedTo: string | null;
    createdAt: string;
}

export interface ActivityItem {
    id: string;
    actor: string;
    role: Role;
    action: string;
    target: string;
    at: string;
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
    emergencyStop: boolean;
}

export interface IntegrationsData {
    accounts: Account[];
    webhookUrl: string;
    graphVersion: string;
}

export interface AnalyticsKpis {
    totalFollowers: number;
    followerChange: number;
    reach: number;
    reachChange: number;
    engagementRate: number;
    engagementRateChange: number;
    engagement: number;
    pendingComments: number;
    scheduledPosts: number;
}

export interface AnalyticsData {
    kpis: AnalyticsKpis;
    series: { date: string; facebook: number; instagram: number }[];
    platformBreakdown: { platform: string; reach: number; engagement: number }[];
    topPosts: Post[];
    followerGrowth: { date: string; followers: number }[];
}

export interface OverviewData {
    kpis: AnalyticsKpis;
    accounts: Account[];
    upcomingPosts: Post[];
    recentActivity: ActivityItem[];
    agents: Agent[];
    platformStats: { platform: Platform; followers: number; reach: number; engagement: number }[];
    system: { emergencyStop: boolean };
}

export interface SystemStatus {
    emergencyStop: boolean;
}

export interface CredentialInput {
    metaAppId?: string;
    metaAppSecret?: string;
    pageToken?: string;
}