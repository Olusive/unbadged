-- Unbadged: board membership on the server, and board chats (public rooms) are members-only.
-- You join a board's chat only after joining the board; leaving the board removes you from its chat.
-- Safe to run more than once.

create table if not exists public.board_members (
  board text not null references public.boards(id) on delete cascade,
  user_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (board, user_id)
);
alter table public.board_members enable row level security;
revoke all on public.board_members from anon;
grant select, insert, delete on public.board_members to authenticated;
drop policy if exists bm_read on public.board_members;
drop policy if exists bm_insert on public.board_members;
drop policy if exists bm_delete on public.board_members;
create policy bm_read on public.board_members for select to authenticated using (user_id = (select auth.uid()));
create policy bm_insert on public.board_members for insert to authenticated with check (user_id = (select auth.uid()) and public.is_active());
create policy bm_delete on public.board_members for delete to authenticated using (user_id = (select auth.uid()));

create or replace function public.in_board(b text) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.board_members where board = b and user_id = auth.uid())
$$;

-- leaving a board removes you from that board's chat
create or replace function private.board_left() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  delete from public.room_members rm using public.rooms r
   where rm.room_id = r.id and r.kind = 'public' and r.board = old.board and rm.user_id = old.user_id;
  return old;
end $$;
drop trigger if exists board_left on public.board_members;
create trigger board_left after delete on public.board_members for each row execute function private.board_left();

create or replace function public.join_room(r uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare k text; b text;
begin
  select kind, board into k, b from public.rooms where id = r;
  if k is distinct from 'public' then raise exception 'That chat can''t be joined this way.'; end if;
  if not public.is_active() then raise exception 'Your account can''t join chats.'; end if;
  if b is not null and not public.in_board(b) then raise exception 'Join % first to chat here.', b; end if;
  if exists (select 1 from public.blocks where blocker = auth.uid() and kind = 'room' and target = r::text) then
    raise exception 'You blocked this chat. Unblock it in Settings first.';
  end if;
  insert into public.room_members (room_id, user_id) values (r, auth.uid()) on conflict do nothing;
end $$;
revoke execute on function public.join_room(uuid), public.in_board(text) from anon, public;
grant execute on function public.join_room(uuid), public.in_board(text) to authenticated;

-- board chats are members-only now (reading and sending)
drop policy if exists messages_read on public.messages;
create policy messages_read on public.messages for select to authenticated
 using (public.is_member(room_id) and not exists (select 1 from public.profiles p where p.id = messages.user_id and p.banned));
drop policy if exists messages_insert on public.messages;
create policy messages_insert on public.messages for insert to authenticated
 with check (user_id = (select auth.uid()) and not system and public.is_active() and public.is_member(room_id) and not public.is_silenced(room_id));

-- unread counts and notifications now include board chats you've joined
drop function if exists public.my_unread();
create or replace function public.my_unread()
returns table(room_id uuid, kind text, name text, other uuid, muted boolean, n bigint)
language sql stable security definer set search_path = '' as $$
  select rm.room_id, r.kind, r.name,
    case when r.kind = 'dm' then (select x.user_id from public.room_members x where x.room_id = rm.room_id and x.user_id <> auth.uid() limit 1) end,
    rm.muted,
    (select count(*) from public.messages m
      where m.room_id = rm.room_id and m.created_at > rm.last_read and not m.system and m.user_id is distinct from auth.uid()
        and not exists (select 1 from public.blocks b where b.blocker = auth.uid() and b.kind = 'user' and b.target = m.user_id::text))
  from public.room_members rm join public.rooms r on r.id = rm.room_id
  where rm.user_id = auth.uid() and r.kind in ('group','dm','public')
$$;
revoke execute on function public.my_unread() from anon, public;
grant execute on function public.my_unread() to authenticated;
