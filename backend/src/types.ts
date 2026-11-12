export type AgentId = 'content' | 'publishing' | 'engagement' | 'analytics';
export type Platform = 'facebook' | 'instagram';
export type PostStatus = 'draft' | 'scheduled' | 'publishing' | 'published' | 'failed' | 'needs_review';
export type CommentStatus = 'new' | 'auto_replied' | 'escalated' | 'resolved';
export type CommentCategory = 'routine' | 'sensitive' | 'complaint' | 'medical' | 'donation' | 'beneficiary';
export type AgentMode = 'auto' | 'human_review';
export type Role = 'admin' | 'editor' | 'viewer';
export type AnalyticsRange = 7 | 30 | 90;

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

export interface Post {
    id: string;
    content: string;
    platforms: Platform[];
    mediaUrl: string | null;
    status: PostStatus;
    scheduledFor: string | null;
    publishedAt: string | null;
    createdAt: string | null;
    metrics: { impressions: number; reach: number; likes: number; comments: number; shares: number };
}

/** Body of POST /posts. */
export interface PostInput {
    content: string;
    platforms: Platform[];
    mediaUrl?: string | null;
    publishNow?: boolean;
    scheduledFor?: string | null; // ISO 8601 string
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