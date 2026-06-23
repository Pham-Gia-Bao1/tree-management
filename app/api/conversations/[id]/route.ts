// PATH: /app/api/conversations/[id]/route.ts

import { NextRequest } from 'next/server';
import { apiFailure, apiSuccess } from '@/lib/api/api-response';
import { ApiError } from '@/lib/api/api-error';
import { requireString } from '@/lib/api/validation';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';
import { Database } from '@/types/database.types';

type RouteContext = {
    params: Promise<{ id: string }>;
};

type ConversationRow =
    Database['public']['Tables']['conversations']['Row'];

type ConversationMemberRow =
    Database['public']['Tables']['conversation_members']['Row'];

type UserRow =
    Database['public']['Tables']['users']['Row'];

function handleError(error: unknown) {
    if (error instanceof ApiError) {
        return apiFailure(
            error.message,
            error.status,
            error.details,
        );
    }

    return apiFailure(
        error instanceof Error
            ? error.message
            : 'Unexpected error.',
        500,
        error,
    );
}

export async function GET(
    _request: NextRequest,
    { params }: RouteContext,
) {
    try {
        const { id } = await params;

        const admin = getSupabaseAdminClient();

        const conversationId = requireString(id, 'id');

        // ----------------------------------------------------
        // Conversation
        // ----------------------------------------------------

        const conversationResult = await admin
            .from('conversations')
            .select('*')
            .eq('id', conversationId)
            .maybeSingle();

        if (conversationResult.error) {
            throw conversationResult.error;
        }

        if (!conversationResult.data) {
            throw new ApiError(
                'Conversation not found.',
                404,
            );
        }

        const conversation =
            conversationResult.data as ConversationRow;

        // ----------------------------------------------------
        // Members
        // ----------------------------------------------------

        const membersResult = await admin
            .from('conversation_members')
            .select('*')
            .eq('conversation_id', conversationId);

        if (membersResult.error) {
            throw membersResult.error;
        }

        const memberRows =
            (membersResult.data ?? []) as ConversationMemberRow[];

        const userIds = memberRows.map(
            (member) => member.user_id,
        );

        // ----------------------------------------------------
        // Users
        // ----------------------------------------------------

        let userRows: UserRow[] = [];

        if (userIds.length > 0) {
            const usersResult = await admin
                .from('users')
                .select('id, full_name, avatar_url')
                .in('id', userIds);

            if (usersResult.error) {
                throw usersResult.error;
            }

            userRows = (usersResult.data ?? []) as UserRow[];
        }

        const userById = new Map<string, UserRow>(
            userRows.map((user) => [user.id, user]),
        );

        // ----------------------------------------------------
        // Response members
        // ----------------------------------------------------

        const members = memberRows.map((member) => {
            const user = userById.get(member.user_id);

            return {
                id: member.id,
                userId: member.user_id,

                fullName:
                    user?.full_name ?? 'Unknown user',

                avatarUrl:
                    user?.avatar_url ?? null,

                role: member.role,

                isMuted: member.is_muted,

                isPinned: member.is_pinned,

                lastReadAt: member.last_read_at,

                joinedAt: member.joined_at,
            };
        });

        // ----------------------------------------------------
        // Response
        // ----------------------------------------------------

        return apiSuccess({
            id: conversation.id,

            type: conversation.type,

            title: conversation.title,

            avatarUrl: conversation.avatar_url,

            courseId: conversation.course_id,

            trainingLinkId:
                conversation.training_link_id,

            createdBy: conversation.created_by,

            lastMessageAt:
                conversation.last_message_at,

            isArchived: conversation.is_archived,

            createdAt: conversation.created_at,

            updatedAt: conversation.updated_at,

            members,

            memberCount: members.length,
        });
    } catch (error) {
        return handleError(error);
    }
}
