-- =====================================================
-- CHAT / MESSAGING MODULE
-- =====================================================

drop table if exists public.messages cascade;
drop table if exists public.conversation_members cascade;
drop table if exists public.conversations cascade;

drop type if exists public.message_type cascade;
drop type if exists public.conversation_type cascade;

-- =====================================================
-- ENUMS
-- =====================================================

create type public.conversation_type as enum (
    'private',
    'group',
    'system'
);

create type public.message_type as enum (
    'text',
    'image',
    'file',
    'system'
);

-- =====================================================
-- CONVERSATIONS
-- =====================================================

create table public.conversations (
    id uuid primary key default gen_random_uuid(),

    type public.conversation_type
        not null
        default 'private',

    title varchar(255),

    avatar_url text,

    course_id uuid
        references public.courses(id)
        on update cascade
        on delete set null,

    training_link_id uuid
        references public.training_links(id)
        on update cascade
        on delete set null,

    created_by uuid
        references public.users(id)
        on update cascade
        on delete set null,

    last_message_id uuid,

    last_message_at timestamptz,

    is_archived boolean
        not null
        default false,

    created_at timestamptz
        not null
        default now(),

    updated_at timestamptz
        not null
        default now()
);

create index conversations_type_idx
on public.conversations(type);

create index conversations_course_idx
on public.conversations(course_id);

create index conversations_training_link_idx
on public.conversations(training_link_id);

create index conversations_last_message_idx
on public.conversations(last_message_at desc);

-- =====================================================
-- CONVERSATION MEMBERS
-- =====================================================

create table public.conversation_members (
    id uuid primary key default gen_random_uuid(),

    conversation_id uuid not null
        references public.conversations(id)
        on update cascade
        on delete cascade,

    user_id uuid not null
        references public.users(id)
        on update cascade
        on delete cascade,

    role varchar(50)
        not null
        default 'member',

    is_muted boolean
        not null
        default false,

    is_pinned boolean
        not null
        default false,

    last_read_at timestamptz,

    joined_at timestamptz
        not null
        default now(),

    constraint conversation_members_unique
        unique (conversation_id, user_id)
);

create index conversation_members_conversation_idx
on public.conversation_members(conversation_id);

create index conversation_members_user_idx
on public.conversation_members(user_id);

-- =====================================================
-- MESSAGES
-- =====================================================

create table public.messages (
    id uuid primary key default gen_random_uuid(),

    conversation_id uuid not null
        references public.conversations(id)
        on update cascade
        on delete cascade,

    sender_id uuid
        references public.users(id)
        on update cascade
        on delete set null,

    type public.message_type
        not null
        default 'text',

    content text,

    attachment_url text,

    attachment_name varchar(255),

    attachment_size bigint,

    reply_to_id uuid
        references public.messages(id)
        on update cascade
        on delete set null,

    is_edited boolean
        not null
        default false,

    is_deleted boolean
        not null
        default false,

    created_at timestamptz
        not null
        default now(),

    updated_at timestamptz
        not null
        default now()
);

create index messages_conversation_idx
on public.messages(conversation_id);

create index messages_sender_idx
on public.messages(sender_id);

create index messages_created_at_idx
on public.messages(created_at desc);

create index messages_reply_to_idx
on public.messages(reply_to_id);

-- =====================================================
-- LINK LAST MESSAGE FK
-- =====================================================

alter table public.conversations
add constraint conversations_last_message_fk
foreign key (last_message_id)
references public.messages(id)
on update cascade
on delete set null;

-- =====================================================
-- NOTIFICATIONS
-- =====================================================

drop table if exists public.notifications cascade;

create table public.notifications (
    id uuid primary key default gen_random_uuid(),

    user_id uuid not null
        references public.users(id)
        on update cascade
        on delete cascade,

    conversation_id uuid
        references public.conversations(id)
        on update cascade
        on delete cascade,

    title varchar(255) not null,

    content text,

    is_read boolean
        not null
        default false,

    created_at timestamptz
        not null
        default now()
);

create index notifications_user_idx
on public.notifications(user_id);

create index notifications_conversation_idx
on public.notifications(conversation_id);

-- =====================================================
-- ONLINE PRESENCE
-- =====================================================

create table public.user_presence (
    user_id uuid primary key
        references public.users(id)
        on update cascade
        on delete cascade,

    is_online boolean
        not null
        default false,

    last_seen_at timestamptz,

    updated_at timestamptz
        not null
        default now()
);

-- =====================================================
-- PINNED MESSAGES
-- =====================================================

create table public.pinned_messages (
    id uuid primary key default gen_random_uuid(),

    conversation_id uuid not null
        references public.conversations(id)
        on update cascade
        on delete cascade,

    message_id uuid not null
        references public.messages(id)
        on update cascade
        on delete cascade,

    pinned_by uuid
        references public.users(id)
        on update cascade
        on delete set null,

    created_at timestamptz
        not null
        default now(),

    constraint pinned_messages_unique
        unique(conversation_id, message_id)
);

-- =====================================================
-- MESSAGE REACTIONS
-- =====================================================

create table public.message_reactions (
    id uuid primary key default gen_random_uuid(),

    message_id uuid not null
        references public.messages(id)
        on update cascade
        on delete cascade,

    user_id uuid not null
        references public.users(id)
        on update cascade
        on delete cascade,

    emoji varchar(20) not null,

    created_at timestamptz
        not null
        default now(),

    constraint message_reactions_unique
        unique(message_id, user_id, emoji)
);

create index message_reactions_message_idx
on public.message_reactions(message_id);

-- =====================================================
-- TYPING STATUS
-- =====================================================

create table public.typing_status (
    conversation_id uuid not null
        references public.conversations(id)
        on delete cascade,

    user_id uuid not null
        references public.users(id)
        on delete cascade,

    is_typing boolean
        not null
        default false,

    updated_at timestamptz
        not null
        default now(),

    primary key (conversation_id, user_id)
);

-- =====================================================
-- UPDATE TIMESTAMP TRIGGERS
-- =====================================================

create trigger conversations_updated_at
before update on public.conversations
for each row
execute function public.set_updated_at();

create trigger messages_updated_at
before update on public.messages
for each row
execute function public.set_updated_at();

create trigger user_presence_updated_at
before update on public.user_presence
for each row
execute function public.set_updated_at();

-- =====================================================
-- AUTO UPDATE CONVERSATION LAST MESSAGE
-- =====================================================

create or replace function public.update_conversation_last_message()
returns trigger
language plpgsql
as $$
begin

    update public.conversations
    set
        last_message_id = new.id,
        last_message_at = new.created_at,
        updated_at = now()
    where id = new.conversation_id;

    return new;
end;
$$;

create trigger update_conversation_last_message_trigger
after insert on public.messages
for each row
execute function public.update_conversation_last_message();

-- =====================================================
-- ENABLE SUPABASE REALTIME
-- =====================================================

alter publication supabase_realtime add table public.messages;
alter publication supabase_realtime add table public.conversations;
alter publication supabase_realtime add table public.conversation_members;
alter publication supabase_realtime add table public.typing_status;
alter publication supabase_realtime add table public.user_presence;

-- =====================================================
-- BUSINESS RULE NOTES
-- =====================================================
-- private:
--     exactly 2 members
--
-- group:
--     1 mentor + many disciples
--
-- system:
--     readonly announcements
--
-- unread count:
--     count(messages.created_at > conversation_members.last_read_at)
--
-- MEMBER only chats with:
--     mentor của mình
--     disciple của mình
--     hoặc người cùng conversation
--
-- File upload:
--     Supabase Storage bucket: chat-attachments
--
-- Presence:
--     sử dụng Supabase Presence API
--
-- Realtime:
--     subscribe table messages
-- =====================================================
