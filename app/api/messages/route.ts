import { NextRequest } from 'next/server';
import { apiFailure, apiSuccess } from '@/lib/api/api-response';
import { ApiError } from '@/lib/api/api-error';
import { readJsonBody, requireString } from '@/lib/api/validation';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';
import type { ConversationThreadResponse, MessageInput, MessageRecord } from '@/types/message.types';

function handleError(error: unknown) {
    if (error instanceof ApiError) return apiFailure(error.message, error.status, error.details);
    return apiFailure(error instanceof Error ? error.message : 'Unexpected error.', 500, error);
}

function orderedPair(a: string, b: string): [string, string] {
    return a < b ? [a, b] : [b, a];
}

function mapMessage(row: {
    id: string; conversation_id: string; sender_id: string;
    content: string; is_read: boolean; created_at: string;
}, senderNames: Map<string, string>): MessageRecord {
    return {
        id: row.id,
        conversationId: row.conversation_id,
        senderId: row.sender_id,
        senderName: senderNames.get(row.sender_id),
        content: row.content,
        isRead: row.is_read,
        createdAt: row.created_at,
    };
}

export async function GET(request: NextRequest) {
    try {
        const admin = getSupabaseAdminClient();
        const params = new URL(request.url).searchParams;
        const userId = requireString(params.get('userId'), 'userId');
        const otherId = requireString(params.get('otherId'), 'otherId');

        const [userA, userB] = orderedPair(userId, otherId);

        // conversations v2: user_a_id / user_b_id (không có course_id)
        const conversationResult = await admin
            .from('conversations')
            .select('id')
            .eq('user_a_id', userA)
            .eq('user_b_id', userB)
            .maybeSingle();

        if (conversationResult.error) throw conversationResult.error;

        if (!conversationResult.data) {
            const response: ConversationThreadResponse = { conversationId: null, messages: [] };
            return apiSuccess(response);
        }

        const [messagesResult, usersResult] = await Promise.all([
            admin.from('messages').select('*')
                .eq('conversation_id', conversationResult.data.id)
                .order('created_at', { ascending: true }),
            admin.from('users').select('id, full_name'),
        ]);
        if (messagesResult.error) throw messagesResult.error;
        if (usersResult.error) throw usersResult.error;

        const senderNames = new Map((usersResult.data ?? []).map((u) => [u.id, u.full_name]));
        return apiSuccess({
            conversationId: conversationResult.data.id,
            messages: (messagesResult.data ?? []).map((m) => mapMessage(m, senderNames)),
        });
    } catch (error) { return handleError(error); }
}

export async function POST(request: NextRequest) {
    try {
        const admin = getSupabaseAdminClient();
        const body = await readJsonBody<Partial<MessageInput>>(request);

        const fromId = requireString(body.fromId, 'fromId');
        const toId = requireString(body.toId, 'toId');
        const content = requireString(body.content, 'content');

        if (fromId === toId) throw new ApiError('fromId and toId must be different.', 400);

        const [userA, userB] = orderedPair(fromId, toId);

        let conversationId: string;
        const existing = await admin
            .from('conversations').select('id')
            .eq('user_a_id', userA).eq('user_b_id', userB).maybeSingle();
        if (existing.error) throw existing.error;

        if (existing.data) {
            conversationId = existing.data.id;
        } else {
            const created = await admin
                .from('conversations')
                .insert({ user_a_id: userA, user_b_id: userB })
                .select('id').single();
            if (created.error) throw created.error;
            conversationId = created.data.id;
        }

        // messages v2: is_read (không có email_sent)
        const inserted = await admin
            .from('messages')
            .insert({ conversation_id: conversationId, sender_id: fromId, content, is_read: false })
            .select('*').single();
        if (inserted.error) throw inserted.error;

        const usersResult = await admin.from('users').select('id, full_name');
        if (usersResult.error) throw usersResult.error;
        const senderNames = new Map((usersResult.data ?? []).map((u) => [u.id, u.full_name]));

        return apiSuccess(mapMessage(inserted.data, senderNames), 201);
    } catch (error) { return handleError(error); }
}
