export type Json =
    | string
    | number
    | boolean
    | null
    | { [key: string]: Json | undefined }
    | Json[];

// ─── Enums (chỉ còn các enums không liên quan đến role vì role đã chuyển sang RBAC) ───
export type UserStatus = 'active' | 'inactive' | 'pending';
export type TrainingLinkStatus = 'in_progress' | 'completed';
export type MentorRequestStatus = 'pending' | 'approved' | 'rejected';
export type UserCourseProgressStatus = 'not_started' | 'in_progress' | 'completed';

// ─── Chat module enums (migration: chat / messaging module) ───
export type ConversationType = 'private' | 'group' | 'system';
export type MessageType = 'text' | 'image' | 'file' | 'system';

// ─── Role codes từ bảng roles (seed2) ───
export type RoleCode = 'ADMIN' | 'MENTOR' | 'MEMBER';

export interface Database {
    public: {
        Tables: {
            // branches: thêm cột code (seed2)
            branches: {
                Row: {
                    id: string;
                    code: string;
                    name: string;
                    city: string;
                    is_active: boolean;
                    created_at: string;
                    updated_at: string;
                };
                Insert: {
                    id?: string;
                    code: string;
                    name: string;
                    city: string;
                    is_active?: boolean;
                    created_at?: string;
                    updated_at?: string;
                };
                Update: {
                    id?: string;
                    code?: string;
                    name?: string;
                    city?: string;
                    is_active?: boolean;
                    updated_at?: string;
                };
                Relationships: [];
            };

            // roles: RBAC
            roles: {
                Row: {
                    id: string;
                    code: RoleCode;
                    name: string;
                    description: string | null;
                    created_at: string;
                    updated_at: string;
                };
                Insert: {
                    id?: string;
                    code: RoleCode;
                    name: string;
                    description?: string | null;
                    created_at?: string;
                    updated_at?: string;
                };
                Update: {
                    id?: string;
                    code?: RoleCode;
                    name?: string;
                    description?: string | null;
                    updated_at?: string;
                };
                Relationships: [];
            };

            // permission_groups
            permission_groups: {
                Row: {
                    id: string;
                    code: string;
                    name: string;
                    created_at: string;
                };
                Insert: {
                    id?: string;
                    code: string;
                    name: string;
                    created_at?: string;
                };
                Update: {
                    id?: string;
                    code?: string;
                    name?: string;
                };
                Relationships: [];
            };

            // permissions
            permissions: {
                Row: {
                    id: string;
                    permission_group_id: string;
                    code: string;
                    name: string;
                    module: string;
                    created_at: string;
                };
                Insert: {
                    id?: string;
                    permission_group_id: string;
                    code: string;
                    name: string;
                    module: string;
                    created_at?: string;
                };
                Update: {
                    id?: string;
                    permission_group_id?: string;
                    code?: string;
                    name?: string;
                    module?: string;
                };
                Relationships: [
                    {
                        foreignKeyName: 'permissions_permission_group_id_fkey';
                        columns: ['permission_group_id'];
                        isOneToOne: false;
                        referencedRelation: 'permission_groups';
                        referencedColumns: ['id'];
                    },
                ];
            };

            // role_permissions: composite PK (role_id, permission_id)
            role_permissions: {
                Row: {
                    role_id: string;
                    permission_id: string;
                };
                Insert: {
                    role_id: string;
                    permission_id: string;
                };
                Update: {
                    role_id?: string;
                    permission_id?: string;
                };
                Relationships: [
                    {
                        foreignKeyName: 'role_permissions_role_id_fkey';
                        columns: ['role_id'];
                        isOneToOne: false;
                        referencedRelation: 'roles';
                        referencedColumns: ['id'];
                    },
                    {
                        foreignKeyName: 'role_permissions_permission_id_fkey';
                        columns: ['permission_id'];
                        isOneToOne: false;
                        referencedRelation: 'permissions';
                        referencedColumns: ['id'];
                    },
                ];
            };

            // users: KHÔNG có cột role (seed2 insert users không có role)
            users: {
                Row: {
                    id: string;
                    email: string;
                    password_hash: string;
                    full_name: string;
                    birth_date: string | null;
                    branch_id: string | null;
                    status: UserStatus;
                    avatar_url: string | null;
                    phone: string | null;
                    created_at: string;
                    updated_at: string;
                };
                Insert: {
                    id?: string;
                    email: string;
                    password_hash: string;
                    full_name: string;
                    birth_date?: string | null;
                    branch_id?: string | null;
                    status?: UserStatus;
                    avatar_url?: string | null;
                    phone?: string | null;
                    created_at?: string;
                    updated_at?: string;
                };
                Update: {
                    id?: string;
                    email?: string;
                    password_hash?: string;
                    full_name?: string;
                    birth_date?: string | null;
                    branch_id?: string | null;
                    status?: UserStatus;
                    avatar_url?: string | null;
                    phone?: string | null;
                    updated_at?: string;
                };
                Relationships: [
                    {
                        foreignKeyName: 'users_branch_id_fkey';
                        columns: ['branch_id'];
                        isOneToOne: false;
                        referencedRelation: 'branches';
                        referencedColumns: ['id'];
                    },
                ];
            };

            // user_roles: composite PK (user_id, role_id)
            user_roles: {
                Row: {
                    user_id: string;
                    role_id: string;
                    created_at: string;
                };
                Insert: {
                    user_id: string;
                    role_id: string;
                    created_at?: string;
                };
                Update: {
                    user_id?: string;
                    role_id?: string;
                };
                Relationships: [
                    {
                        foreignKeyName: 'user_roles_user_id_fkey';
                        columns: ['user_id'];
                        isOneToOne: false;
                        referencedRelation: 'users';
                        referencedColumns: ['id'];
                    },
                    {
                        foreignKeyName: 'user_roles_role_id_fkey';
                        columns: ['role_id'];
                        isOneToOne: false;
                        referencedRelation: 'roles';
                        referencedColumns: ['id'];
                    },
                ];
            };

            courses: {
                Row: {
                    id: string;
                    code: string;
                    name: string;
                    description: string | null;
                    order_no: number;
                    is_active: boolean;
                    created_at: string;
                    updated_at: string;
                };
                Insert: {
                    id?: string;
                    code: string;
                    name: string;
                    description?: string | null;
                    order_no?: number;
                    is_active?: boolean;
                    created_at?: string;
                    updated_at?: string;
                };
                Update: {
                    id?: string;
                    code?: string;
                    name?: string;
                    description?: string | null;
                    order_no?: number;
                    is_active?: boolean;
                    updated_at?: string;
                };
                Relationships: [];
            };

            // training_links: seed2 dùng start_date / end_date
            training_links: {
                Row: {
                    id: string;
                    course_id: string;
                    mentor_id: string;
                    disciple_id: string;
                    start_date: string;
                    end_date: string | null;
                    status: TrainingLinkStatus;
                    notes: string | null;
                    created_by: string | null;
                    created_at: string;
                    updated_at: string;
                };
                Insert: {
                    id?: string;
                    course_id: string;
                    mentor_id: string;
                    disciple_id: string;
                    start_date: string;
                    end_date?: string | null;
                    status?: TrainingLinkStatus;
                    notes?: string | null;
                    created_by?: string | null;
                    created_at?: string;
                    updated_at?: string;
                };
                Update: {
                    id?: string;
                    course_id?: string;
                    mentor_id?: string;
                    disciple_id?: string;
                    start_date?: string;
                    end_date?: string | null;
                    status?: TrainingLinkStatus;
                    notes?: string | null;
                    created_by?: string | null;
                    updated_at?: string;
                };
                Relationships: [
                    {
                        foreignKeyName: 'training_links_course_id_fkey';
                        columns: ['course_id'];
                        isOneToOne: false;
                        referencedRelation: 'courses';
                        referencedColumns: ['id'];
                    },
                    {
                        foreignKeyName: 'training_links_mentor_id_fkey';
                        columns: ['mentor_id'];
                        isOneToOne: false;
                        referencedRelation: 'users';
                        referencedColumns: ['id'];
                    },
                    {
                        foreignKeyName: 'training_links_disciple_id_fkey';
                        columns: ['disciple_id'];
                        isOneToOne: false;
                        referencedRelation: 'users';
                        referencedColumns: ['id'];
                    },
                    {
                        foreignKeyName: 'training_links_created_by_fkey';
                        columns: ['created_by'];
                        isOneToOne: false;
                        referencedRelation: 'users';
                        referencedColumns: ['id'];
                    },
                ];
            };

            // mentor_requests: "Become Mentor" request schema
            mentor_requests: {
                Row: {
                    id: string;
                    requester_id: string | null;

                    reason: string | null;
                    experience: string | null;
                    notes: string | null;
                    review_note: string | null;

                    status: MentorRequestStatus;

                    reviewed_by: string | null;
                    reviewed_at: string | null;

                    created_at: string;
                    updated_at: string;
                };
                Insert: {
                    id?: string;
                    requester_id?: string | null;

                    reason?: string | null;
                    experience?: string | null;
                    notes?: string | null;
                    review_note?: string | null;

                    status?: MentorRequestStatus;

                    reviewed_by?: string | null;
                    reviewed_at?: string | null;

                    created_at?: string;
                    updated_at?: string;
                };
                Update: {
                    id?: string;
                    requester_id?: string | null;

                    reason?: string | null;
                    experience?: string | null;
                    notes?: string | null;
                    review_note?: string | null;

                    status?: MentorRequestStatus;

                    reviewed_by?: string | null;
                    reviewed_at?: string | null;

                    updated_at?: string;
                };
                Relationships: [
                    {
                        foreignKeyName: 'mentor_requests_requester_id_fkey';
                        columns: ['requester_id'];
                        referencedRelation: 'users';
                        referencedColumns: ['id'];
                        isOneToOne: false;
                    },
                    {
                        foreignKeyName: 'mentor_requests_reviewed_by_fkey';
                        columns: ['reviewed_by'];
                        referencedRelation: 'users';
                        referencedColumns: ['id'];
                        isOneToOne: false;
                    },
                ];
            };

            // ─────────────────────────────────────────────
            // CHAT / MESSAGING MODULE
            // (migration: drop + recreate conversations/messages,
            // add conversation_members, notifications.conversation_id,
            // user_presence, pinned_messages, message_reactions, typing_status)
            // ─────────────────────────────────────────────

            // conversations: type/title/avatar/course/training_link/last_message/is_archived
            conversations: {
                Row: {
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
                };
                Insert: {
                    id?: string;
                    type?: ConversationType;
                    title?: string | null;
                    avatar_url?: string | null;
                    course_id?: string | null;
                    training_link_id?: string | null;
                    created_by?: string | null;
                    last_message_id?: string | null;
                    last_message_at?: string | null;
                    is_archived?: boolean;
                    created_at?: string;
                    updated_at?: string;
                };
                Update: {
                    id?: string;
                    type?: ConversationType;
                    title?: string | null;
                    avatar_url?: string | null;
                    course_id?: string | null;
                    training_link_id?: string | null;
                    created_by?: string | null;
                    last_message_id?: string | null;
                    last_message_at?: string | null;
                    is_archived?: boolean;
                    updated_at?: string;
                };
                Relationships: [
                    {
                        foreignKeyName: 'conversations_course_id_fkey';
                        columns: ['course_id'];
                        isOneToOne: false;
                        referencedRelation: 'courses';
                        referencedColumns: ['id'];
                    },
                    {
                        foreignKeyName: 'conversations_training_link_id_fkey';
                        columns: ['training_link_id'];
                        isOneToOne: false;
                        referencedRelation: 'training_links';
                        referencedColumns: ['id'];
                    },
                    {
                        foreignKeyName: 'conversations_created_by_fkey';
                        columns: ['created_by'];
                        isOneToOne: false;
                        referencedRelation: 'users';
                        referencedColumns: ['id'];
                    },
                    {
                        foreignKeyName: 'conversations_last_message_fk';
                        columns: ['last_message_id'];
                        isOneToOne: false;
                        referencedRelation: 'messages';
                        referencedColumns: ['id'];
                    },
                ];
            };

            // conversation_members: membership + per-member read state
            conversation_members: {
                Row: {
                    id: string;
                    conversation_id: string;
                    user_id: string;
                    role: string;
                    is_muted: boolean;
                    is_pinned: boolean;
                    last_read_at: string | null;
                    joined_at: string;
                };
                Insert: {
                    id?: string;
                    conversation_id: string;
                    user_id: string;
                    role?: string;
                    is_muted?: boolean;
                    is_pinned?: boolean;
                    last_read_at?: string | null;
                    joined_at?: string;
                };
                Update: {
                    id?: string;
                    conversation_id?: string;
                    user_id?: string;
                    role?: string;
                    is_muted?: boolean;
                    is_pinned?: boolean;
                    last_read_at?: string | null;
                    joined_at?: string;
                };
                Relationships: [
                    {
                        foreignKeyName: 'conversation_members_conversation_id_fkey';
                        columns: ['conversation_id'];
                        isOneToOne: false;
                        referencedRelation: 'conversations';
                        referencedColumns: ['id'];
                    },
                    {
                        foreignKeyName: 'conversation_members_user_id_fkey';
                        columns: ['user_id'];
                        isOneToOne: false;
                        referencedRelation: 'users';
                        referencedColumns: ['id'];
                    },
                ];
            };

            // messages: type/content/attachment/reply/edit/soft-delete
            messages: {
                Row: {
                    id: string;
                    conversation_id: string;
                    sender_id: string | null;
                    type: MessageType;
                    content: string | null;
                    attachment_url: string | null;
                    attachment_name: string | null;
                    attachment_size: number | null;
                    reply_to_id: string | null;
                    is_edited: boolean;
                    is_deleted: boolean;
                    created_at: string;
                    updated_at: string;
                };
                Insert: {
                    id?: string;
                    conversation_id: string;
                    sender_id?: string | null;
                    type?: MessageType;
                    content?: string | null;
                    attachment_url?: string | null;
                    attachment_name?: string | null;
                    attachment_size?: number | null;
                    reply_to_id?: string | null;
                    is_edited?: boolean;
                    is_deleted?: boolean;
                    created_at?: string;
                    updated_at?: string;
                };
                Update: {
                    id?: string;
                    conversation_id?: string;
                    sender_id?: string | null;
                    type?: MessageType;
                    content?: string | null;
                    attachment_url?: string | null;
                    attachment_name?: string | null;
                    attachment_size?: number | null;
                    reply_to_id?: string | null;
                    is_edited?: boolean;
                    is_deleted?: boolean;
                    updated_at?: string;
                };
                Relationships: [
                    {
                        foreignKeyName: 'messages_conversation_id_fkey';
                        columns: ['conversation_id'];
                        isOneToOne: false;
                        referencedRelation: 'conversations';
                        referencedColumns: ['id'];
                    },
                    {
                        foreignKeyName: 'messages_sender_id_fkey';
                        columns: ['sender_id'];
                        isOneToOne: false;
                        referencedRelation: 'users';
                        referencedColumns: ['id'];
                    },
                    {
                        foreignKeyName: 'messages_reply_to_id_fkey';
                        columns: ['reply_to_id'];
                        isOneToOne: false;
                        referencedRelation: 'messages';
                        referencedColumns: ['id'];
                    },
                ];
            };

            // notifications: now optionally linked to a conversation
            notifications: {
                Row: {
                    id: string;
                    user_id: string;
                    conversation_id: string | null;
                    title: string;
                    content: string | null;
                    is_read: boolean;
                    created_at: string;
                };
                Insert: {
                    id?: string;
                    user_id: string;
                    conversation_id?: string | null;
                    title: string;
                    content?: string | null;
                    is_read?: boolean;
                    created_at?: string;
                };
                Update: {
                    id?: string;
                    user_id?: string;
                    conversation_id?: string | null;
                    title?: string;
                    content?: string | null;
                    is_read?: boolean;
                };
                Relationships: [
                    {
                        foreignKeyName: 'notifications_user_id_fkey';
                        columns: ['user_id'];
                        isOneToOne: false;
                        referencedRelation: 'users';
                        referencedColumns: ['id'];
                    },
                    {
                        foreignKeyName: 'notifications_conversation_id_fkey';
                        columns: ['conversation_id'];
                        isOneToOne: false;
                        referencedRelation: 'conversations';
                        referencedColumns: ['id'];
                    },
                ];
            };

            // user_presence: online/offline + last seen
            user_presence: {
                Row: {
                    user_id: string;
                    is_online: boolean;
                    last_seen_at: string | null;
                    updated_at: string;
                };
                Insert: {
                    user_id: string;
                    is_online?: boolean;
                    last_seen_at?: string | null;
                    updated_at?: string;
                };
                Update: {
                    user_id?: string;
                    is_online?: boolean;
                    last_seen_at?: string | null;
                    updated_at?: string;
                };
                Relationships: [
                    {
                        foreignKeyName: 'user_presence_user_id_fkey';
                        columns: ['user_id'];
                        isOneToOne: true;
                        referencedRelation: 'users';
                        referencedColumns: ['id'];
                    },
                ];
            };

            // pinned_messages: per-conversation pinned message list
            pinned_messages: {
                Row: {
                    id: string;
                    conversation_id: string;
                    message_id: string;
                    pinned_by: string | null;
                    created_at: string;
                };
                Insert: {
                    id?: string;
                    conversation_id: string;
                    message_id: string;
                    pinned_by?: string | null;
                    created_at?: string;
                };
                Update: {
                    id?: string;
                    conversation_id?: string;
                    message_id?: string;
                    pinned_by?: string | null;
                };
                Relationships: [
                    {
                        foreignKeyName: 'pinned_messages_conversation_id_fkey';
                        columns: ['conversation_id'];
                        isOneToOne: false;
                        referencedRelation: 'conversations';
                        referencedColumns: ['id'];
                    },
                    {
                        foreignKeyName: 'pinned_messages_message_id_fkey';
                        columns: ['message_id'];
                        isOneToOne: false;
                        referencedRelation: 'messages';
                        referencedColumns: ['id'];
                    },
                    {
                        foreignKeyName: 'pinned_messages_pinned_by_fkey';
                        columns: ['pinned_by'];
                        isOneToOne: false;
                        referencedRelation: 'users';
                        referencedColumns: ['id'];
                    },
                ];
            };

            // message_reactions: emoji reactions per (message, user, emoji)
            message_reactions: {
                Row: {
                    id: string;
                    message_id: string;
                    user_id: string;
                    emoji: string;
                    created_at: string;
                };
                Insert: {
                    id?: string;
                    message_id: string;
                    user_id: string;
                    emoji: string;
                    created_at?: string;
                };
                Update: {
                    id?: string;
                    message_id?: string;
                    user_id?: string;
                    emoji?: string;
                };
                Relationships: [
                    {
                        foreignKeyName: 'message_reactions_message_id_fkey';
                        columns: ['message_id'];
                        isOneToOne: false;
                        referencedRelation: 'messages';
                        referencedColumns: ['id'];
                    },
                    {
                        foreignKeyName: 'message_reactions_user_id_fkey';
                        columns: ['user_id'];
                        isOneToOne: false;
                        referencedRelation: 'users';
                        referencedColumns: ['id'];
                    },
                ];
            };

            // typing_status: composite PK (conversation_id, user_id)
            typing_status: {
                Row: {
                    conversation_id: string;
                    user_id: string;
                    is_typing: boolean;
                    updated_at: string;
                };
                Insert: {
                    conversation_id: string;
                    user_id: string;
                    is_typing?: boolean;
                    updated_at?: string;
                };
                Update: {
                    conversation_id?: string;
                    user_id?: string;
                    is_typing?: boolean;
                    updated_at?: string;
                };
                Relationships: [
                    {
                        foreignKeyName: 'typing_status_conversation_id_fkey';
                        columns: ['conversation_id'];
                        isOneToOne: false;
                        referencedRelation: 'conversations';
                        referencedColumns: ['id'];
                    },
                    {
                        foreignKeyName: 'typing_status_user_id_fkey';
                        columns: ['user_id'];
                        isOneToOne: false;
                        referencedRelation: 'users';
                        referencedColumns: ['id'];
                    },
                ];
            };

            user_course_progress: {
                Row: {
                    id: string;
                    user_id: string;
                    course_id: string;
                    mentor_id: string | null;
                    status: UserCourseProgressStatus;
                    start_date: string | null;
                    completed_date: string | null;
                    created_at: string;
                    updated_at: string;
                };
                Insert: {
                    id?: string;
                    user_id: string;
                    course_id: string;
                    mentor_id?: string | null;
                    status?: UserCourseProgressStatus;
                    start_date?: string | null;
                    completed_date?: string | null;
                    created_at?: string;
                    updated_at?: string;
                };
                Update: {
                    id?: string;
                    user_id?: string;
                    course_id?: string;
                    mentor_id?: string | null;
                    status?: UserCourseProgressStatus;
                    start_date?: string | null;
                    completed_date?: string | null;
                    updated_at?: string;
                };
                Relationships: [
                    {
                        foreignKeyName: 'user_course_progress_user_id_fkey';
                        columns: ['user_id'];
                        isOneToOne: false;
                        referencedRelation: 'users';
                        referencedColumns: ['id'];
                    },
                    {
                        foreignKeyName: 'user_course_progress_course_id_fkey';
                        columns: ['course_id'];
                        isOneToOne: false;
                        referencedRelation: 'courses';
                        referencedColumns: ['id'];
                    },
                    {
                        foreignKeyName: 'user_course_progress_mentor_id_fkey';
                        columns: ['mentor_id'];
                        isOneToOne: false;
                        referencedRelation: 'users';
                        referencedColumns: ['id'];
                    },
                ];
            };

            audit_logs: {
                Row: {
                    id: string;
                    actor_id: string | null;
                    entity_type: string;
                    entity_id: string;
                    action: string;
                    old_data: Json | null;
                    new_data: Json | null;
                    created_at: string;
                };
                Insert: {
                    id?: string;
                    actor_id?: string | null;
                    entity_type: string;
                    entity_id: string;
                    action: string;
                    old_data?: Json | null;
                    new_data?: Json | null;
                    created_at?: string;
                };
                Update: {
                    id?: string;
                    actor_id?: string | null;
                    entity_type?: string;
                    entity_id?: string;
                    action?: string;
                    old_data?: Json | null;
                    new_data?: Json | null;
                };
                Relationships: [
                    {
                        foreignKeyName: 'audit_logs_actor_id_fkey';
                        columns: ['actor_id'];
                        isOneToOne: false;
                        referencedRelation: 'users';
                        referencedColumns: ['id'];
                    },
                ];
            };
        };
        Views: {
            mentor_statistics: {
                Row: {
                    mentor_id: string | null;
                    total_disciples: number | null;
                    total_courses: number | null;
                    total_completed: number | null;
                };
                Relationships: [];
            };
        };
        Functions: Record<string, never>;
        Enums: {
            user_status: UserStatus;
            training_link_status: TrainingLinkStatus;
            mentor_request_status: MentorRequestStatus;
            user_course_progress_status: UserCourseProgressStatus;
            conversation_type: ConversationType;
            message_type: MessageType;
        };
        CompositeTypes: Record<string, never>;
    };
}
