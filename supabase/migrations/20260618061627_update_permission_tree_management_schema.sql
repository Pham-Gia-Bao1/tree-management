create table public.conversations (
id uuid primary key default gen_random_uuid(),


user_a_id uuid not null
    references public.users(id)
    on update cascade
    on delete cascade,

user_b_id uuid not null
    references public.users(id)
    on update cascade
    on delete cascade,

created_at timestamptz not null default now(),

constraint conversations_different_users
    check (user_a_id <> user_b_id)


);

create table public.messages (
id uuid primary key default gen_random_uuid(),


conversation_id uuid not null
    references public.conversations(id)
    on update cascade
    on delete cascade,

sender_id uuid not null
    references public.users(id)
    on update cascade
    on delete cascade,

content text not null,

is_read boolean not null default false,

created_at timestamptz not null default now()


);

create table public.notifications (
id uuid primary key default gen_random_uuid(),


user_id uuid not null
    references public.users(id)
    on update cascade
    on delete cascade,

title varchar(255) not null,
content text,

is_read boolean not null default false,

created_at timestamptz not null default now()


);

create table public.audit_logs (
id uuid primary key default gen_random_uuid(),


actor_id uuid
    references public.users(id)
    on update cascade
    on delete set null,

entity_type varchar(100) not null,
entity_id uuid not null,

action varchar(100) not null,

old_data jsonb,
new_data jsonb,

created_at timestamptz not null default now()


);

create index mentor_requests_requester_idx
on public.mentor_requests(requester_id);

create index mentor_requests_mentor_idx
on public.mentor_requests(mentor_id);

create index mentor_requests_course_idx
on public.mentor_requests(course_id);

create index user_course_progress_user_idx
on public.user_course_progress(user_id);

create index user_course_progress_course_idx
on public.user_course_progress(course_id);

create index user_course_progress_mentor_idx
on public.user_course_progress(mentor_id);

create index conversations_user_a_idx
on public.conversations(user_a_id);

create index conversations_user_b_idx
on public.conversations(user_b_id);

create index messages_conversation_idx
on public.messages(conversation_id);

create index messages_sender_idx
on public.messages(sender_id);

create index notifications_user_idx
on public.notifications(user_id);

create index audit_logs_actor_id_idx
on public.audit_logs(actor_id);

create index audit_logs_entity_idx
on public.audit_logs(entity_type, entity_id);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
new.updated_at = now();
return new;
end;
$$;

create trigger branches_updated_at
before update on public.branches
for each row
execute function public.set_updated_at();

create trigger roles_updated_at
before update on public.roles
for each row
execute function public.set_updated_at();

create trigger users_updated_at
before update on public.users
for each row
execute function public.set_updated_at();

create trigger courses_updated_at
before update on public.courses
for each row
execute function public.set_updated_at();

create trigger training_links_updated_at
before update on public.training_links
for each row
execute function public.set_updated_at();

create trigger mentor_requests_updated_at
before update on public.mentor_requests
for each row
execute function public.set_updated_at();

create trigger user_course_progress_updated_at
before update on public.user_course_progress
for each row
execute function public.set_updated_at();
