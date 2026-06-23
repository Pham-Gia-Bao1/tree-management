// PATH: /api/conversations/[id]/messages
import { NextRequest } from 'next/server';
import { apiFailure, apiSuccess } from '@/lib/api/api-response';
import { ApiError } from '@/lib/api/api-error';
import { readJsonBody, requireString, optionalString } from '@/lib/api/validation';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';

type RouteContext = {
    params: Promise<{ id: string }>;
};

type AdminClient = ReturnType<typeof getSupabaseAdminClient>;

/**
 * `conversation_members` is not yet present in the generated Supabase
 * Database types. Route all access through this helper so the type
 * escape hatch lives in one place instead of scattered inline casts.
 */
function membersTable(admin: AdminClient): any {
    return (admin as unknown as { from: (table: string) => any }).from('conversation_members');
}

type MessageType = 'text' | 'image' | 'file' | 'system';

interface MessageRow {
    id: string;
    conversation_id: string;
    sender_id: string;
    type: MessageType;
    content: string;
    attachment_url: string | null;
    attachment_name: string | null;
    attachment_size: number | null;
    reply_to_id: string | null;
    is_edited: boolean;
    is_deleted: boolean;
    created_at: string;
    updated_at: string;
}

function handleError(error: unknown) {
    if (error instanceof ApiError) return apiFailure(error.message, error.status, error.details);
    return apiFailure(error instanceof Error ? error.message : 'Unexpected error.', 500, error);
}

async function assertMember(admin: ReturnType<typeof getSupabaseAdminClient>, conversationId: string, userId: string) {
    const membership = await membersTable(admin)
        .select('id')
        .eq('conversation_id', conversationId)
        .eq('user_id', userId)
        .maybeSingle();
    if (membership.error) throw membership.error;
    if (!membership.data) throw new ApiError('You are not a member of this conversation.', 403);
}

function mapMessage(row: MessageRow, senderNames: Map<string, string>, repliedTo: Map<string, MessageRow>) {
    const reply = row.reply_to_id ? repliedTo.get(row.reply_to_id) : undefined;
    return {
        id: row.id,
        conversationId: row.conversation_id,
        senderId: row.sender_id,
        senderName: senderNames.get(row.sender_id) ?? 'Unknown user',
        type: row.type,
        content: row.is_deleted ? 'Message deleted' : row.content,
        attachmentUrl: row.is_deleted ? null : row.attachment_url,
        attachmentName: row.is_deleted ? null : row.attachment_name,
        attachmentSize: row.is_deleted ? null : row.attachment_size,
        replyToId: row.reply_to_id,
        replyPreview: reply
            ? {
                id: reply.id,
                senderName: senderNames.get(reply.sender_id) ?? 'Unknown user',
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

        const senderIds = Array.from(new Set(rows.map((r) => r.sender_id)));
        const replyIds = Array.from(new Set(rows.map((r) => r.reply_to_id).filter((id): id is string => Boolean(id))));

        const [usersResult, repliesResult] = await Promise.all([
            senderIds.length > 0
                ? admin.from('users').select('id, full_name').in('id', senderIds)
                : Promise.resolve({ data: [], error: null }),
            replyIds.length > 0
                ? admin.from('messages').select('*').in('id', replyIds)
                : Promise.resolve({ data: [], error: null }),
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

        if (body.replyToId) {
            const replyResult = await admin
                .from('messages')
                .select('id')
                .eq('id', body.replyToId)
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
                reply_to_id: optionalString(body.replyToId) ?? null,
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

        const senderNames = new Map([[senderId, senderResult.data.full_name]]);
        const repliedTo = new Map<string, MessageRow>();
        if (body.replyToId) {
            const replyRowResult = await admin.from('messages').select('*').eq('id', body.replyToId).single();
            if (!replyRowResult.error && replyRowResult.data) {
                repliedTo.set(body.replyToId, replyRowResult.data as MessageRow);
                const replySenderResult = await admin.from('users').select('id, full_name').eq('id', replyRowResult.data.sender_id).maybeSingle();
                if (!replySenderResult.error && replySenderResult.data) {
                    senderNames.set(replySenderResult.data.id, replySenderResult.data.full_name);
                }
            }
        }

        return apiSuccess(mapMessage(insertedResult.data as MessageRow, senderNames, repliedTo), 201);
    } catch (error) {
        return handleError(error);
    }
}
