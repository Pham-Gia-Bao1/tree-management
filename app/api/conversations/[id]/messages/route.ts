// PATH: /api/conversations/[id]/messages
import { NextRequest } from 'next/server';
import { apiFailure, apiSuccess } from '@/lib/api/api-response';
import { ApiError } from '@/lib/api/api-error';
import { readJsonBody, requireString, optionalString } from '@/lib/api/validation';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';
import type { Database } from '@/types/database.types';

type RouteContext = {
    params: Promise<{ id: string }>;
};

type AdminClient = ReturnType<typeof getSupabaseAdminClient>;
type MessageType = Database['public']['Tables']['messages']['Row']['type'];
type MessageRow = Database['public']['Tables']['messages']['Row'];
type UserRow = Pick<Database['public']['Tables']['users']['Row'], 'id' | 'full_name'>;

function handleError(error: unknown) {
    if (error instanceof ApiError) return apiFailure(error.message, error.status, error.details);
    return apiFailure(error instanceof Error ? error.message : 'Unexpected error.', 500, error);
}

async function assertMember(admin: AdminClient, conversationId: string, userId: string) {
    const membership = await admin
        .from('conversation_members')
        .select('id')
        .eq('conversation_id', conversationId)
        .eq('user_id', userId)
        .maybeSingle();
    if (membership.error) throw membership.error;
    if (!membership.data) throw new ApiError('You are not a member of this conversation.', 403);
}

/**
 * `messages.sender_id` is nullable (FK is `on delete set null`), so every
 * lookup keyed by sender must guard against `null` before hitting the Map.
 */
function resolveSenderName(senderId: string | null, senderNames: Map<string, string>): string {
    if (!senderId) return 'Unknown user';
    return senderNames.get(senderId) ?? 'Unknown user';
}

function mapMessage(row: MessageRow, senderNames: Map<string, string>, repliedTo: Map<string, MessageRow>) {
    const reply = row.reply_to_id ? repliedTo.get(row.reply_to_id) : undefined;
    return {
        id: row.id,
        conversationId: row.conversation_id,
        senderId: row.sender_id,
        senderName: resolveSenderName(row.sender_id, senderNames),
        type: row.type,
        content: row.is_deleted ? 'Message deleted' : row.content,
        attachmentUrl: row.is_deleted ? null : row.attachment_url,
        attachmentName: row.is_deleted ? null : row.attachment_name,
        attachmentSize: row.is_deleted ? null : row.attachment_size,
        replyToId: row.reply_to_id,
        replyPreview: reply
            ? {
                id: reply.id,
                senderName: resolveSenderName(reply.sender_id, senderNames),
                content: reply.is_deleted ? 'Message deleted' : reply.content,
            }
            : null,
        isEdited: row.is_edited,
        isDeleted: row.is_deleted,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
    };
}

export async function GET(request: NextRequest, { params }: RouteContext) {
    try {
        const { id } = await params;
        const admin = getSupabaseAdminClient();
        const conversationId = requireString(id, 'id');

        const searchParams = new URL(request.url).searchParams;
        const userId = requireString(searchParams.get('userId'), 'userId');
        const page = Math.max(1, Number(searchParams.get('page') ?? '1') || 1);
        const limit = Math.min(100, Math.max(1, Number(searchParams.get('limit') ?? '30') || 30));

        await assertMember(admin, conversationId, userId);

        const totalResult = await admin
            .from('messages')
            .select('id', { count: 'exact', head: true })
            .eq('conversation_id', conversationId);
        if (totalResult.error) throw totalResult.error;
        const total = totalResult.count ?? 0;

        // Fetch newest-first page, then reverse so the page itself is ascending.
        const offset = (page - 1) * limit;
        const messagesResult = await admin
            .from('messages')
            .select('*')
            .eq('conversation_id', conversationId)
            .order('created_at', { ascending: false })
            .range(offset, offset + limit - 1);
        if (messagesResult.error) throw messagesResult.error;

        const rows = ((messagesResult.data ?? []) as MessageRow[]).slice().reverse();

        const senderIds = Array.from(new Set(rows.map((r) => r.sender_id).filter((id): id is string => Boolean(id))));
        const replyIds = Array.from(new Set(rows.map((r) => r.reply_to_id).filter((id): id is string => Boolean(id))));

        const [usersResult, repliesResult] = await Promise.all([
            senderIds.length > 0
                ? admin.from('users').select('id, full_name').in('id', senderIds)
                : Promise.resolve({ data: [] as UserRow[], error: null }),
            replyIds.length > 0
                ? admin.from('messages').select('*').in('id', replyIds)
                : Promise.resolve({ data: [] as MessageRow[], error: null }),
        ]);
        if (usersResult.error) throw usersResult.error;
        if (repliesResult.error) throw repliesResult.error;

        const senderNames = new Map((usersResult.data ?? []).map((u) => [u.id, u.full_name]));
        const repliedTo = new Map(((repliesResult.data ?? []) as MessageRow[]).map((r) => [r.id, r]));

        return apiSuccess({
            messages: rows.map((row) => mapMessage(row, senderNames, repliedTo)),
            page,
            limit,
            total,
            hasMore: offset + rows.length < total,
        });
    } catch (error) {
        return handleError(error);
    }
}

export async function POST(request: NextRequest, { params }: RouteContext) {
    try {
        const { id } = await params;
        const admin = getSupabaseAdminClient();
        const conversationId = requireString(id, 'id');

        const body = await readJsonBody<{
            senderId?: string;
            type?: string;
            content?: string;
            attachmentUrl?: string;
            attachmentName?: string;
            attachmentSize?: number;
            replyToId?: string;
        }>(request);

        const senderId = requireString(body.senderId, 'senderId');
        await assertMember(admin, conversationId, senderId);

        const type = (optionalString(body.type) ?? 'text') as MessageType;
        if (!['text', 'image', 'file', 'system'].includes(type)) {
            throw new ApiError('Invalid message type.', 400);
        }

        if (type === 'text' && !optionalString(body.content)) {
            throw new ApiError('content is required for text messages.', 400);
        }
        if ((type === 'image' || type === 'file') && !optionalString(body.attachmentUrl)) {
            throw new ApiError('attachmentUrl is required for image/file messages.', 400);
        }

        const replyToId = optionalString(body.replyToId) ?? null;
        if (replyToId) {
            const replyResult = await admin
                .from('messages')
                .select('id')
                .eq('id', replyToId)
                .eq('conversation_id', conversationId)
                .maybeSingle();
            if (replyResult.error) throw replyResult.error;
            if (!replyResult.data) throw new ApiError('replyToId does not belong to this conversation.', 400);
        }

        const insertedResult = await admin
            .from('messages')
            .insert({
                conversation_id: conversationId,
                sender_id: senderId,
                type,
                content: optionalString(body.content) ?? '',
                attachment_url: optionalString(body.attachmentUrl) ?? null,
                attachment_name: optionalString(body.attachmentName) ?? null,
                attachment_size: body.attachmentSize ?? null,
                reply_to_id: replyToId,
                is_edited: false,
                is_deleted: false,
            })
            .select('*')
            .single();
        if (insertedResult.error) throw insertedResult.error;

        const updateConversation = await admin
            .from('conversations')
            .update({ last_message_id: insertedResult.data.id, last_message_at: insertedResult.data.created_at })
            .eq('id', conversationId);
        if (updateConversation.error) throw updateConversation.error;

        const senderResult = await admin.from('users').select('id, full_name').eq('id', senderId).single();
        if (senderResult.error) throw senderResult.error;

        const senderNames = new Map<string, string>([[senderId, senderResult.data.full_name]]);
        const repliedTo = new Map<string, MessageRow>();

        if (replyToId) {
            const replyRowResult = await admin.from('messages').select('*').eq('id', replyToId).single();
            if (!replyRowResult.error && replyRowResult.data) {
                const replyRow = replyRowResult.data as MessageRow;
                repliedTo.set(replyToId, replyRow);

                if (replyRow.sender_id) {
                    const replySenderResult = await admin
                        .from('users')
                        .select('id, full_name')
                        .eq('id', replyRow.sender_id)
                        .maybeSingle();
                    if (!replySenderResult.error && replySenderResult.data) {
                        senderNames.set(replySenderResult.data.id, replySenderResult.data.full_name);
                    }
                }
            }
        }

        return apiSuccess(mapMessage(insertedResult.data as MessageRow, senderNames, repliedTo), 201);
    } catch (error) {
        return handleError(error);
    }
}
