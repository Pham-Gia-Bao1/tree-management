// PATH: /app/api/conversations/[id]/messages/route.ts

import { NextRequest } from 'next/server';
import { apiFailure, apiSuccess } from '@/lib/api/api-response';
import { ApiError } from '@/lib/api/api-error';
import {
    readJsonBody,
    requireString,
    optionalString,
} from '@/lib/api/validation';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';
import { Database } from '@/types/database';

type RouteContext = {
    params: Promise<{ id: string }>;
};

type AdminClient = ReturnType<typeof getSupabaseAdminClient>;

type MessageRow =
    Database['public']['Tables']['messages']['Row'];

type MessageInsert =
    Database['public']['Tables']['messages']['Insert'];

type UserRow =
    Database['public']['Tables']['users']['Row'];

type MessageType = MessageRow['type'];

function membersTable(admin: AdminClient) {
    return admin.from('conversation_members');
}

function handleError(error: unknown) {
    if (error instanceof ApiError) {
        return apiFailure(error.message, error.status, error.details);
    }

    return apiFailure(
        error instanceof Error ? error.message : 'Unexpected error.',
        500,
        error,
    );
}

async function assertMember(
    admin: AdminClient,
    conversationId: string,
    userId: string,
) {
    const result = await membersTable(admin)
        .select('id')
        .eq('conversation_id', conversationId)
        .eq('user_id', userId)
        .maybeSingle();

    if (result.error) {
        throw result.error;
    }

    if (!result.data) {
        throw new ApiError(
            'You are not a member of this conversation.',
            403,
        );
    }
}

function mapMessage(
    row: MessageRow,
    senderNames: Map<string, string>,
    repliedTo: Map<string, MessageRow>,
) {
    const reply = row.reply_to_id
        ? repliedTo.get(row.reply_to_id)
        : undefined;

    return {
        id: row.id,
        conversationId: row.conversation_id,

        senderId: row.sender_id,

        senderName:
            senderNames.get(row.sender_id) ??
            'Unknown user',

        type: row.type,

        content: row.is_deleted
            ? 'Message deleted'
            : row.content,

        attachmentUrl: row.is_deleted
            ? null
            : row.attachment_url,

        attachmentName: row.is_deleted
            ? null
            : row.attachment_name,

        attachmentSize: row.is_deleted
            ? null
            : row.attachment_size,

        replyToId: row.reply_to_id,

        replyPreview: reply
            ? {
                  id: reply.id,

                  senderName:
                      senderNames.get(reply.sender_id) ??
                      'Unknown user',

                  content: reply.is_deleted
                      ? 'Message deleted'
                      : reply.content,
              }
            : null,

        isEdited: row.is_edited,
        isDeleted: row.is_deleted,

        createdAt: row.created_at,
        updatedAt: row.updated_at,
    };
}

/* =========================================================
   GET MESSAGES
========================================================= */

export async function GET(
    request: NextRequest,
    { params }: RouteContext,
) {
    try {
        const { id } = await params;

        const admin = getSupabaseAdminClient();

        const conversationId = requireString(id, 'id');

        const searchParams = new URL(request.url).searchParams;

        const userId = requireString(
            searchParams.get('userId'),
            'userId',
        );

        const page = Math.max(
            1,
            Number(searchParams.get('page') ?? '1') || 1,
        );

        const limit = Math.min(
            100,
            Math.max(
                1,
                Number(searchParams.get('limit') ?? '30') || 30,
            ),
        );

        await assertMember(
            admin,
            conversationId,
            userId,
        );

        const totalResult = await admin
            .from('messages')
            .select('id', {
                count: 'exact',
                head: true,
            })
            .eq('conversation_id', conversationId);

        if (totalResult.error) {
            throw totalResult.error;
        }

        const total = totalResult.count ?? 0;

        const offset = (page - 1) * limit;

        const messagesResult = await admin
            .from('messages')
            .select('*')
            .eq('conversation_id', conversationId)
            .order('created_at', {
                ascending: false,
            })
            .range(offset, offset + limit - 1);

        if (messagesResult.error) {
            throw messagesResult.error;
        }

        const rows: MessageRow[] =
            messagesResult.data?.slice().reverse() ?? [];

        const senderIds = Array.from(
            new Set(
                rows
                    .map((row) => row.sender_id)
                    .filter(Boolean),
            ),
        );

        const replyIds = Array.from(
            new Set(
                rows
                    .map((row) => row.reply_to_id)
                    .filter(
                        (id): id is string =>
                            typeof id === 'string',
                    ),
            ),
        );

        const [usersResult, repliesResult] =
            await Promise.all([
                senderIds.length
                    ? admin
                          .from('users')
                          .select('id, full_name')
                          .in('id', senderIds)
                    : Promise.resolve({
                          data: [] as Pick<
                              UserRow,
                              'id' | 'full_name'
                          >[],
                          error: null,
                      }),

                replyIds.length
                    ? admin
                          .from('messages')
                          .select('*')
                          .in('id', replyIds)
                    : Promise.resolve({
                          data: [] as MessageRow[],
                          error: null,
                      }),
            ]);

        if (usersResult.error) {
            throw usersResult.error;
        }

        if (repliesResult.error) {
            throw repliesResult.error;
        }

        const senderNames = new Map<string, string>(
            (usersResult.data ?? []).map((user) => [
                user.id,
                user.full_name ?? 'Unknown user',
            ]),
        );

        const repliedTo = new Map<string, MessageRow>(
            (repliesResult.data ?? []).map((message) => [
                message.id,
                message,
            ]),
        );

        return apiSuccess({
            messages: rows.map((row) =>
                mapMessage(
                    row,
                    senderNames,
                    repliedTo,
                ),
            ),

            page,
            limit,
            total,

            hasMore: offset + rows.length < total,
        });
    } catch (error) {
        return handleError(error);
    }
}

/* =========================================================
   CREATE MESSAGE
========================================================= */

export async function POST(
    request: NextRequest,
    { params }: RouteContext,
) {
    try {
        const { id } = await params;

        const admin = getSupabaseAdminClient();

        const conversationId = requireString(id, 'id');

        const body = await readJsonBody<{
            senderId?: string;
            type?: MessageType;
            content?: string;
            attachmentUrl?: string;
            attachmentName?: string;
            attachmentSize?: number;
            replyToId?: string;
        }>(request);

        const senderId = requireString(
            body.senderId,
            'senderId',
        );

        await assertMember(
            admin,
            conversationId,
            senderId,
        );

        const type =
            (optionalString(body.type) as MessageType) ??
            'text';

        if (
            !['text', 'image', 'file', 'system'].includes(
                type,
            )
        ) {
            throw new ApiError(
                'Invalid message type.',
                400,
            );
        }

        if (
            type === 'text' &&
            !optionalString(body.content)
        ) {
            throw new ApiError(
                'content is required for text messages.',
                400,
            );
        }

        if (
            ['image', 'file'].includes(type) &&
            !optionalString(body.attachmentUrl)
        ) {
            throw new ApiError(
                'attachmentUrl is required.',
                400,
            );
        }

        if (body.replyToId) {
            const replyCheck = await admin
                .from('messages')
                .select('id')
                .eq('id', body.replyToId)
                .eq(
                    'conversation_id',
                    conversationId,
                )
                .maybeSingle();

            if (replyCheck.error) {
                throw replyCheck.error;
            }

            if (!replyCheck.data) {
                throw new ApiError(
                    'replyToId does not belong to this conversation.',
                    400,
                );
            }
        }

        const payload: MessageInsert = {
            conversation_id: conversationId,
            sender_id: senderId,

            type,

            content:
                optionalString(body.content) ?? '',

            attachment_url:
                optionalString(body.attachmentUrl) ??
                null,

            attachment_name:
                optionalString(body.attachmentName) ??
                null,

            attachment_size:
                body.attachmentSize ?? null,

            reply_to_id:
                optionalString(body.replyToId) ?? null,

            is_edited: false,
            is_deleted: false,
        };

        const insertResult = await admin
            .from('messages')
            .insert(payload)
            .select()
            .single();

        if (insertResult.error) {
            throw insertResult.error;
        }

        const insertedMessage = insertResult.data;

        const updateConversation = await admin
            .from('conversations')
            .update({
                last_message_id:
                    insertedMessage.id,
                last_message_at:
                    insertedMessage.created_at,
            })
            .eq('id', conversationId);

        if (updateConversation.error) {
            throw updateConversation.error;
        }

        const senderResult = await admin
            .from('users')
            .select('id, full_name')
            .eq('id', senderId)
            .single();

        if (senderResult.error) {
            throw senderResult.error;
        }

        const senderNames = new Map<string, string>([
            [
                senderResult.data.id,
                senderResult.data.full_name ??
                    'Unknown user',
            ],
        ]);

        const repliedTo = new Map<
            string,
            MessageRow
        >();

        if (body.replyToId) {
            const replyResult = await admin
                .from('messages')
                .select('*')
                .eq('id', body.replyToId)
                .maybeSingle();

            if (
                !replyResult.error &&
                replyResult.data
            ) {
                const replyMessage =
                    replyResult.data;

                repliedTo.set(
                    replyMessage.id,
                    replyMessage,
                );

                const replySenderResult =
                    await admin
                        .from('users')
                        .select('id, full_name')
                        .eq(
                            'id',
                            replyMessage.sender_id,
                        )
                        .maybeSingle();

                if (
                    !replySenderResult.error &&
                    replySenderResult.data
                ) {
                    senderNames.set(
                        replySenderResult.data.id,
                        replySenderResult.data
                            .full_name ??
                            'Unknown user',
                    );
                }
            }
        }

        return apiSuccess(
            mapMessage(
                insertedMessage,
                senderNames,
                repliedTo,
            ),
            201,
        );
    } catch (error) {
        return handleError(error);
    }
}
