// PATH: /api/messages/[id]
import { NextRequest } from 'next/server';
import { apiFailure, apiSuccess } from '@/lib/api/api-response';
import { ApiError } from '@/lib/api/api-error';
import { readJsonBody, requireString } from '@/lib/api/validation';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';

type RouteContext = {
    params: Promise<{ id: string }>;
};

function handleError(error: unknown) {
    if (error instanceof ApiError) return apiFailure(error.message, error.status, error.details);
    return apiFailure(error instanceof Error ? error.message : 'Unexpected error.', 500, error);
}

async function loadOwnedMessage(admin: ReturnType<typeof getSupabaseAdminClient>, messageId: string, userId: string) {
    const result = await admin.from('messages').select('*').eq('id', messageId).maybeSingle();
    if (result.error) throw result.error;
    if (!result.data) throw new ApiError('Message not found.', 404);
    if (result.data.sender_id !== userId) throw new ApiError('Only the sender can modify this message.', 403);
    if (result.data.is_deleted) throw new ApiError('Cannot modify a deleted message.', 400);
    return result.data;
}

export async function PUT(request: NextRequest, { params }: RouteContext) {
    try {
        const { id } = await params;
        const admin = getSupabaseAdminClient();
        const messageId = requireString(id, 'id');

        const body = await readJsonBody<{ userId?: string; content?: string }>(request);
        const userId = requireString(body.userId, 'userId');
        const content = requireString(body.content, 'content');

        await loadOwnedMessage(admin, messageId, userId);

        const updatedResult = await admin
            .from('messages')
            .update({ content, is_edited: true, updated_at: new Date().toISOString() })
            .eq('id', messageId)
            .select('*')
            .single();
        if (updatedResult.error) throw updatedResult.error;

        return apiSuccess(updatedResult.data);
    } catch (error) {
        return handleError(error);
    }
}

export async function DELETE(request: NextRequest, { params }: RouteContext) {
    try {
        const { id } = await params;
        const admin = getSupabaseAdminClient();
        const messageId = requireString(id, 'id');

        const searchParams = new URL(request.url).searchParams;
        const userId = requireString(searchParams.get('userId'), 'userId');

        await loadOwnedMessage(admin, messageId, userId);

        const updatedResult = await admin
            .from('messages')
            .update({
                is_deleted: true,
                content: 'Message deleted',
                attachment_url: null,
                attachment_name: null,
                attachment_size: null,
                updated_at: new Date().toISOString(),
            })
            .eq('id', messageId)
            .select('*')
            .single();
        if (updatedResult.error) throw updatedResult.error;

        return apiSuccess(updatedResult.data);
    } catch (error) {
        return handleError(error);
    }
}
