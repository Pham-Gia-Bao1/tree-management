// PATH: /api/conversations
import { NextRequest } from 'next/server';
import { apiFailure, apiSuccess } from '@/lib/api/api-response';
import { ApiError } from '@/lib/api/api-error';
import { readJsonBody, requireString, optionalString } from '@/lib/api/validation';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';

type AdminClient = ReturnType<typeof getSupabaseAdminClient>;

/**
 * `conversation_members` is not yet present in the generated Supabase
 * Database types. Route all access through this helper so the type
 * escape hatch lives in one place instead of scattered inline casts.
 */
function membersTable(admin: AdminClient): any {
    return (admin as unknown as { from: (table: string) => any }).from('conversation_members');
}

type ConversationType = 'private' | 'group' | 'system';

interface ConversationRow {
    id: string;
    type: ConversationType;
    title: string | null;
    avatar_url: string | null;
    course_id: string | null;
    training_link_id: string | null;
    created_by: string | null;
    last_message_id: string | null;
    last_message_at: string | null;
    is_archived: boolean;
    created_at: string;
    updated_at: string;
}

interface MemberRow {
    id: string;
    conversation_id: string;
    user_id: string;
    role: string;
    is_muted: boolean;
    is_pinned: boolean;
    last_read_at: string | null;
    joined_at: string;
}

interface MessageRow {
    id: string;
    conversation_id: string;
    sender_id: string;
    type: string;
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

interface UserRow {
    id: string;
    full_name: string;
    avatar_url: string | null;
    mentor_id?: string | null;
}

interface ConversationListItem {
    id: string;
    title: string;
    avatarUrl: string | null;
    type: ConversationType;
    lastMessage: string | null;
    lastMessageAt: string | null;
    unreadCount: number;
    memberCount: number;
}

function handleError(error: unknown) {
    if (error instanceof ApiError) return apiFailure(error.message, error.status, error.details);
    return apiFailure(error instanceof Error ? error.message : 'Unexpected error.', 500, error);
}

function sortedPair(a: string, b: string): [string, string] {
    return a < b ? [a, b] : [b, a];
}

/**
 * Business rule: a member can only chat with their mentor, their disciple,
 * or users that already share a conversation with them.
 * Assumes `users.mentor_id` exists to express the mentor/disciple link.
 */
async function assertAllowedToChat(
    admin: ReturnType<typeof getSupabaseAdminClient>,
    userId: string,
    otherUserId: string,
) {
    if (userId === otherUserId) {
        throw new ApiError('Cannot start a conversation with yourself.', 400);
    }

    const usersResult = await admin
        .from('users')
        .select('id, mentor_id')
        .in('id', [userId, otherUserId]);
    if (usersResult.error) throw usersResult.error;

    const byId = new Map((usersResult.data ?? []).map((u) => [u.id, u as UserRow]));
    const me = byId.get(userId);
    const other = byId.get(otherUserId);
    if (!me || !other) throw new ApiError('User not found.', 404);

    const isMentorOrDisciple = me.mentor_id === otherUserId || other.mentor_id === userId;
    if (isMentorOrDisciple) return;

    // Fallback: allowed if they already share any conversation.
    const myMemberships = await membersTable(admin).select('conversation_id').eq('user_id', userId);
    if (myMemberships.error) throw myMemberships.error;
    const conversationIds = (myMemberships.data ?? []).map((m) => m.conversation_id);
    if (conversationIds.length === 0) {
        throw new ApiError('You are not allowed to message this user.', 403);
    }

    const sharedResult = await membersTable(admin)
        .select('conversation_id')
        .eq('user_id', otherUserId)
        .in('conversation_id', conversationIds)
        .limit(1);
    if (sharedResult.error) throw sharedResult.error;

    if (!sharedResult.data || sharedResult.data.length === 0) {
        throw new ApiError('You are not allowed to message this user.', 403);
    }
}

export async function GET(request: NextRequest) {
    try {
        const admin = getSupabaseAdminClient();
        const params = new URL(request.url).searchParams;
        const userId = requireString(params.get('userId'), 'userId');

        const membershipResult = await membersTable(admin)
            .select('*')
            .eq('user_id', userId);
        if (membershipResult.error) throw membershipResult.error;

        const myMemberships = (membershipResult.data ?? []) as MemberRow[];
        if (myMemberships.length === 0) return apiSuccess<ConversationListItem[]>([]);

        const conversationIds = myMemberships.map((m) => m.conversation_id);
        const lastReadByConversation = new Map(myMemberships.map((m) => [m.conversation_id, m.last_read_at]));

        const [conversationsResult, allMembersResult] = await Promise.all([
            admin.from('conversations').select('*').in('id', conversationIds).eq('is_archived', false),
            membersTable(admin).select('*').in('conversation_id', conversationIds),
        ]);
        if (conversationsResult.error) throw conversationsResult.error;
        if (allMembersResult.error) throw allMembersResult.error;

        const conversations = (conversationsResult.data ?? []) as ConversationRow[];
        const allMembers = (allMembersResult.data ?? []) as MemberRow[];

        const memberCountByConversation = new Map<string, number>();
        const otherUserIdByConversation = new Map<string, string>();
        for (const member of allMembers) {
            memberCountByConversation.set(
                member.conversation_id,
                (memberCountByConversation.get(member.conversation_id) ?? 0) + 1,
            );
            if (member.user_id !== userId) {
                otherUserIdByConversation.set(member.conversation_id, member.user_id);
            }
        }

        const lastMessageIds = conversations.map((c) => c.last_message_id).filter((id): id is string => Boolean(id));
        const otherUserIds = Array.from(new Set(Array.from(otherUserIdByConversation.values())));

        const [lastMessagesResult, otherUsersResult, unreadCountsResult] = await Promise.all([
            lastMessageIds.length > 0
                ? admin.from('messages').select('*').in('id', lastMessageIds)
                : Promise.resolve({ data: [] as MessageRow[], error: null }),
            otherUserIds.length > 0
                ? admin.from('users').select('id, full_name, avatar_url').in('id', otherUserIds)
                : Promise.resolve({ data: [] as UserRow[], error: null }),
            admin
                .from('messages')
                .select('id, conversation_id, sender_id, created_at, is_deleted')
                .in('conversation_id', conversationIds)
                .eq('is_deleted', false),
        ]);
        if (lastMessagesResult.error) throw lastMessagesResult.error;
        if (otherUsersResult.error) throw otherUsersResult.error;
        if (unreadCountsResult.error) throw unreadCountsResult.error;

        const lastMessageById = new Map((lastMessagesResult.data ?? []).map((m) => [m.id, m as MessageRow]));
        const otherUserById = new Map((otherUsersResult.data ?? []).map((u) => [u.id, u as UserRow]));

        const unreadCountByConversation = new Map<string, number>();
        for (const row of (unreadCountsResult.data ?? []) as Pick<MessageRow, 'id' | 'conversation_id' | 'sender_id' | 'created_at' | 'is_deleted'>[]) {
            if (row.sender_id === userId) continue;
            const lastReadAt = lastReadByConversation.get(row.conversation_id);
            if (!lastReadAt || new Date(row.created_at) > new Date(lastReadAt)) {
                unreadCountByConversation.set(row.conversation_id, (unreadCountByConversation.get(row.conversation_id) ?? 0) + 1);
            }
        }

        const items: ConversationListItem[] = conversations
            .map((conversation) => {
                const lastMessage = conversation.last_message_id ? lastMessageById.get(conversation.last_message_id) : undefined;
                const otherUser = conversation.type === 'private'
                    ? otherUserById.get(otherUserIdByConversation.get(conversation.id) ?? '')
                    : undefined;

                const title = conversation.type === 'private'
                    ? (otherUser?.full_name ?? conversation.title ?? 'Unknown user')
                    : (conversation.title ?? 'Group');

                const avatarUrl = conversation.type === 'private'
                    ? (otherUser?.avatar_url ?? null)
                    : conversation.avatar_url;

                return {
                    id: conversation.id,
                    title,
                    avatarUrl,
                    type: conversation.type,
                    lastMessage: lastMessage ? (lastMessage.is_deleted ? 'Message deleted' : lastMessage.content) : null,
                    lastMessageAt: conversation.last_message_at,
                    unreadCount: unreadCountByConversation.get(conversation.id) ?? 0,
                    memberCount: memberCountByConversation.get(conversation.id) ?? 0,
                };
            })
            .sort((a, b) => {
                const aTime = a.lastMessageAt ? new Date(a.lastMessageAt).getTime() : 0;
                const bTime = b.lastMessageAt ? new Date(b.lastMessageAt).getTime() : 0;
                return bTime - aTime;
            });

        return apiSuccess(items);
    } catch (error) {
        return handleError(error);
    }
}

export async function POST(request: NextRequest) {
    try {
        const admin = getSupabaseAdminClient();
        const body = await readJsonBody<{
            type?: string;
            memberIds?: string[];
            createdBy?: string;
            title?: string;
            avatarUrl?: string;
            courseId?: string;
            trainingLinkId?: string;
        }>(request);

        const createdBy = requireString(body.createdBy, 'createdBy');
        const type = (optionalString(body.type) ?? 'private') as ConversationType;
        const memberIds = Array.isArray(body.memberIds) ? Array.from(new Set(body.memberIds.filter(Boolean))) : [];

        if (type === 'private') {
            if (memberIds.length !== 1) {
                throw new ApiError('A private conversation requires exactly one other member.', 400);
            }
            const otherUserId = memberIds[0];
            await assertAllowedToChat(admin, createdBy, otherUserId);

            const [userA, userB] = sortedPair(createdBy, otherUserId);

            const myMemberships = await membersTable(admin).select('conversation_id').eq('user_id', userA);
            if (myMemberships.error) throw myMemberships.error;
            const candidateIds = (myMemberships.data ?? []).map((m) => m.conversation_id);

            if (candidateIds.length > 0) {
                const candidatesResult = await admin
                    .from('conversations')
                    .select('id')
                    .eq('type', 'private')
                    .in('id', candidateIds);
                if (candidatesResult.error) throw candidatesResult.error;

                for (const candidate of candidatesResult.data ?? []) {
                    const membersResult = await membersTable(admin)
                        .select('user_id')
                        .eq('conversation_id', candidate.id);
                    if (membersResult.error) throw membersResult.error;
                    const ids = (membersResult.data ?? []).map((m) => m.user_id).sort();
                    if (ids.length === 2 && ids[0] === userA && ids[1] === userB) {
                        const existingConversation = await admin.from('conversations').select('*').eq('id', candidate.id).single();
                        if (existingConversation.error) throw existingConversation.error;
                        return apiSuccess(existingConversation.data, 200);
                    }
                }
            }

            const insertedConversation = await admin
                .from('conversations')
                .insert({ type: 'private', created_by: createdBy })
                .select('*')
                .single();
            if (insertedConversation.error) throw insertedConversation.error;

            const membersInsert = await membersTable(admin).insert([
                { conversation_id: insertedConversation.data.id, user_id: userA, role: 'member' },
                { conversation_id: insertedConversation.data.id, user_id: userB, role: 'member' },
            ]);
            if (membersInsert.error) throw membersInsert.error;

            return apiSuccess(insertedConversation.data, 201);
        }

        if (type === 'group') {
            const title = requireString(body.title, 'title');
            if (memberIds.length < 1) {
                throw new ApiError('A group conversation requires at least one other member.', 400);
            }

            const insertedConversation = await admin
                .from('conversations')
                .insert({
                    type: 'group',
                    title,
                    avatar_url: optionalString(body.avatarUrl) ?? null,
                    course_id: optionalString(body.courseId) ?? null,
                    training_link_id: optionalString(body.trainingLinkId) ?? null,
                    created_by: createdBy,
                })
                .select('*')
                .single();
            if (insertedConversation.error) throw insertedConversation.error;

            const allMemberIds = Array.from(new Set([createdBy, ...memberIds]));
            const membersInsert = await membersTable(admin).insert(
                allMemberIds.map((userId) => ({
                    conversation_id: insertedConversation.data.id,
                    user_id: userId,
                    role: userId === createdBy ? 'admin' : 'member',
                })),
            );
            if (membersInsert.error) throw membersInsert.error;

            return apiSuccess(insertedConversation.data, 201);
        }

        throw new ApiError('Unsupported conversation type.', 400);
    } catch (error) {
        return handleError(error);
    }
}
