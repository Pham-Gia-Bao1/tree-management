import { NextRequest } from 'next/server';
import { apiFailure, apiSuccess } from '@/lib/api/api-response';
import { ApiError } from '@/lib/api/api-error';
import { requireString } from '@/lib/api/validation';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';

function handleError(error: unknown) {
    if (error instanceof ApiError) return apiFailure(error.message, error.status, error.details);
    return apiFailure(error instanceof Error ? error.message : 'Unexpected error.', 500, error);
}

export async function GET(_request: NextRequest, { params }: { params: { id: string } }) {
    try {
        const admin = getSupabaseAdminClient();
        const conversationId = requireString(params.id, 'id');

        const conversationResult = await admin.from('conversations').select('*').eq('id', conversationId).maybeSingle();
        if (conversationResult.error) throw conversationResult.error;
        if (!conversationResult.data) throw new ApiError('Conversation not found.', 404);

        const membersResult = await admin.from('conversation_members').select('*').eq('conversation_id', conversationId);
        if (membersResult.error) throw membersResult.error;

        const userIds = (membersResult.data ?? []).map((m) => m.user_id);
        const usersResult = userIds.length > 0
            ? await admin.from('users').select('id, full_name, avatar_url').in('id', userIds)
            : { data: [], error: null };
        if (usersResult.error) throw usersResult.error;

        const userById = new Map((usersResult.data ?? []).map((u) => [u.id, u]));

        const members = (membersResult.data ?? []).map((member) => {
            const user = userById.get(member.user_id);
            return {
                id: member.id,
                userId: member.user_id,
                fullName: user?.full_name ?? 'Unknown user',
                avatarUrl: user?.avatar_url ?? null,
                role: member.role,
                isMuted: member.is_muted,
                isPinned: member.is_pinned,
                lastReadAt: member.last_read_at,
                joinedAt: member.joined_at,
            };
        });

        return apiSuccess({
            id: conversationResult.data.id,
            type: conversationResult.data.type,
            title: conversationResult.data.title,
            avatarUrl: conversationResult.data.avatar_url,
            courseId: conversationResult.data.course_id,
            trainingLinkId: conversationResult.data.training_link_id,
            createdBy: conversationResult.data.created_by,
            lastMessageAt: conversationResult.data.last_message_at,
            isArchived: conversationResult.data.is_archived,
            createdAt: conversationResult.data.created_at,
            updatedAt: conversationResult.data.updated_at,
            members,
            memberCount: members.length,
        });
    } catch (error) {
        return handleError(error);
    }
}
