import type { Platform, Post } from '../api/types';

export interface PublishResult {
    ok: boolean;
    externalId?: string;
    simulated: boolean;
    error?: string;
}

const GRAPH_VERSION = 'v21.0';

export async function publishToMeta(post: Post, platform: Platform): Promise<PublishResult> {
    const token = process.env.META_ACCESS_TOKEN;
    const accountId =
        platform === 'facebook'
            ? process.env.META_FB_PAGE_ID
            : process.env.META_IG_ACCOUNT_ID;

    if (!token || !accountId) {
        return {
            ok: true,
            simulated: true,
            externalId: `sim_${platform}_${Date.now()}`
        };
    }

    try {
        if (platform === 'facebook') {
            const response = await fetch(
                `https://graph.facebook.com/${GRAPH_VERSION}/${accountId}/feed`,
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ message: post.content, access_token: token })
                }
            );
            const data = await response.json();
            if (!response.ok) throw new Error(data.error?.message ?? 'Facebook publish failed');
            return { ok: true, simulated: false, externalId: data.id };
        }

        if (!post.mediaUrl) {
            throw new Error('Instagram publishing requires an image or video URL.');
        }

        const containerResponse = await fetch(
            `https://graph.facebook.com/${GRAPH_VERSION}/${accountId}/media`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    image_url: post.mediaUrl,
                    caption: post.content,
                    access_token: token
                })
            }
        );
        const container = await containerResponse.json();
        if (!containerResponse.ok) {
            throw new Error(container.error?.message ?? 'Instagram media container failed');
        }

        const publishResponse = await fetch(
            `https://graph.facebook.com/${GRAPH_VERSION}/${accountId}/media_publish`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ creation_id: container.id, access_token: token })
            }
        );
        const published = await publishResponse.json();
        if (!publishResponse.ok) {
            throw new Error(published.error?.message ?? 'Instagram publish failed');
        }

        return { ok: true, simulated: false, externalId: published.id };
    } catch (error) {
        return {
            ok: false,
            simulated: false,
            error: error instanceof Error ? error.message : 'Meta publish failed'
        };
    }
}