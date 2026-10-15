-- Unbadged: group owner role, admin moderation (mute / remove / block), unread counts for notifications
-- Safe to run more than once.

alter table public.room_members drop constraint if exists room_members_role_check;
alter table public.room_members add constraint room_members_role_check check (role in ('owner','admin','member'));
alter table public.room_members add column if not exists silenced boolean not null default false;
alter table public.room_members add column if not exists last_read timestamptz not null default now();
grant update (last_read) on public.room_members to authenticated;

-- existing groups: the creator becomes owner; if the creator left, the longest-standing admin does
update public.room_members rm set role = 'owner' from public.rooms r
 where r.id = rm.room_id and r.kind = 'group' and r.created_by = rm.user_id;
update public.room_members rm set role = 'owner'
 where rm.role = 'admin'
   and not exists (select 1 from public.room_members o where o.room_id = rm.room_id and o.role = 'owner')
   and rm.user_id = (select a.user_id from public.room_members a where a.room_id = rm.room_id and a.role = 'admin' order by a.joined_at limit 1);

create table if not exists public.room_bans (
  room_id uuid not null references public.rooms(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  primary key (room_id, user_id)
);
alter table public.room_bans enable row level security;
revoke all on public.room_bans from anon;
revoke insert, update, delete on public.room_bans from authenticated;
grant select on public.room_bans to authenticated;

create or replace function public.is_room_admin(r uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.room_members where room_id = r and user_id = auth.uid() and role in ('admin','owner'))
$$;
create or replace function public.is_room_owner(r uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.room_members where room_id = r and user_id = auth.uid() and role = 'owner')
$$;
create or replace function public.is_silenced(r uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.room_members where room_id = r and user_id = auth.uid() and silenced)
$$;
-- the owner can manage anyone but themself; admins can manage regular members only
create or replace function private.can_manage(r uuid, u uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select u <> auth.uid() and exists (select 1 from public.rooms where id = r and kind = 'group') and (
    public.is_room_owner(r)
    or (public.is_room_admin(r) and exists (select 1 from public.room_members where room_id = r and user_id = u and role = 'member'))
  )
$$;

drop policy if exists room_bans_read on public.room_bans;
create policy room_bans_read on public.room_bans for select to authenticated using (public.is_room_admin(room_id));

drop policy if exists messages_insert on public.messages;
create policy messages_insert on public.messages for insert to authenticated
 with check (user_id = (select auth.uid()) and not system and public.is_active()
   and (public.room_is_public(room_id) or public.is_member(room_id)) and not public.is_silenced(room_id));

create or replace function public.create_group(p_name text, p_members uuid[], p_faces boolean default false)
returns uuid language plpgsql security definer set search_path = '' as $$
declare r uuid; m uuid; me uuid := auth.uid(); names text := '';
begin
  if not public.is_active() then raise exception 'Your account can''t create groups.'; end if;
  if coalesce(array_length(p_members,1),0) = 0 then raise exception 'Add at least one person.'; end if;
  insert into public.rooms (name, kind, allow_faces, created_by) values (p_name, 'group', coalesce(p_faces,false), me) returning id into r;
  insert into public.room_members (room_id, user_id, role) values (r, me, 'owner');
  foreach m in array p_members loop
    if m <> me and private.mutual(me, m) and not private.blocked_either(me, m) then
      insert into public.room_members (room_id, user_id) values (r, m) on conflict do nothing;
      names := names || case when names = '' then '' else ', ' end || private.uname(m);
    end if;
  end loop;
  insert into public.messages (room_id, body, system) values (r, private.uname(me) || ' created the group' || case when names <> '' then ' and added ' || names else '' end, true);
  return r;
end $$;

create or replace function public.add_members(r uuid, p_members uuid[])
returns void language plpgsql security definer set search_path = '' as $$
declare m uuid; me uuid := auth.uid(); names text := ''; inv text;
begin
  select invites into inv from public.rooms where id = r and kind = 'group';
  if inv is null then raise exception 'Group not found.'; end if;
  if not (public.is_room_admin(r) or (inv = 'everyone' and public.is_member(r))) then raise exception 'Only admins can add people to this group.'; end if;
  if public.is_silenced(r) then raise exception 'You''re muted in this group.'; end if;
  foreach m in array p_members loop
    if private.mutual(me, m) and not private.blocked_either(me, m)
       and not exists (select 1 from public.blocks where blocker = m and kind = 'room' and target = r::text)
       and not exists (select 1 from public.room_bans where room_id = r and user_id = m) then
      insert into public.room_members (room_id, user_id) values (r, m) on conflict do nothing;
      names := names || case when names = '' then '' else ', ' end || private.uname(m);
    end if;
  end loop;
  if names <> '' then insert into public.messages (room_id, body, system) values (r, private.uname(me) || ' added ' || names, true); end if;
end $$;

create or replace function public.set_admin(r uuid, u uuid, make boolean)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_room_owner(r) then raise exception 'Only the group owner can add or remove admins.'; end if;
  if u = auth.uid() then raise exception 'You''re the owner. To step down, make someone else the owner.'; end if;
  update public.room_members set role = case when make then 'admin' else 'member' end where room_id = r and user_id = u and role <> 'owner';
  if not found then raise exception 'They''re not in this group.'; end if;
  insert into public.messages (room_id, body, system) values (r, private.uname(u) || case when make then ' is now an admin' else ' is no longer an admin' end, true);
end $$;

create or replace function public.transfer_owner(r uuid, u uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_room_owner(r) then raise exception 'Only the group owner can do this.'; end if;
  if u = auth.uid() or not exists (select 1 from public.room_members where room_id = r and user_id = u) then raise exception 'Pick someone in the group.'; end if;
  update public.room_members set role = 'admin' where room_id = r and user_id = auth.uid();
  update public.room_members set role = 'owner', silenced = false where room_id = r and user_id = u;
  insert into public.messages (room_id, body, system) values (r, private.uname(auth.uid()) || ' made ' || private.uname(u) || ' the owner', true);
end $$;

create or replace function public.set_silenced(r uuid, u uuid, p_on boolean)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not private.can_manage(r, u) then raise exception 'Admins can mute members. Only the owner can mute admins.'; end if;
  update public.room_members set silenced = p_on where room_id = r and user_id = u;
  insert into public.messages (room_id, body, system) values (r, private.uname(auth.uid()) || case when p_on then ' muted ' else ' unmuted ' end || private.uname(u), true);
end $$;

create or replace function public.remove_member(r uuid, u uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not private.can_manage(r, u) then raise exception 'Admins can remove members. Only the owner can remove admins.'; end if;
  delete from public.room_members where room_id = r and user_id = u;
  insert into public.messages (room_id, body, system) values (r, private.uname(auth.uid()) || ' removed ' || private.uname(u), true);
end $$;

create or replace function public.ban_member(r uuid, u uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not private.can_manage(r, u) then raise exception 'Admins can block members. Only the owner can block admins.'; end if;
  delete from public.room_members where room_id = r and user_id = u;
  insert into public.room_bans (room_id, user_id, by) values (r, u, auth.uid()) on conflict do nothing;
  insert into public.messages (room_id, body, system) values (r, private.uname(auth.uid()) || ' blocked ' || private.uname(u) || ' from the group', true);
end $$;

create or replace function public.unban_member(r uuid, u uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_room_admin(r) then raise exception 'Only admins can do this.'; end if;
  delete from public.room_bans where room_id = r and user_id = u;
end $$;

create or replace function public.leave_room(r uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare me uuid := auth.uid();
begin
  if public.is_room_owner(r) and exists (select 1 from public.room_members where room_id = r and user_id <> me) then
    raise exception 'You own this group. Make someone else the owner before you leave, or delete the group.';
  end if;
  delete from public.room_members where room_id = r and user_id = me;
  if exists (select 1 from public.rooms where id = r and kind = 'group') then
    insert into public.messages (room_id, body, system) values (r, private.uname(me) || ' left the group', true);
  end if;
end $$;

create or replace function public.delete_group(r uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_room_owner(r) then raise exception 'Only the group owner can delete the group.'; end if;
  delete from public.rooms where id = r and kind = 'group';
end $$;

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
  where rm.user_id = auth.uid() and r.kind in ('group','dm')
$$;

revoke execute on function public.transfer_owner(uuid,uuid), public.set_silenced(uuid,uuid,boolean), public.ban_member(uuid,uuid),
  public.unban_member(uuid,uuid), public.my_unread(), public.is_room_owner(uuid), public.is_silenced(uuid) from anon, public;
grant execute on function public.transfer_owner(uuid,uuid), public.set_silenced(uuid,uuid,boolean), public.ban_member(uuid,uuid),
  public.unban_member(uuid,uuid), public.my_unread(), public.is_room_owner(uuid), public.is_silenced(uuid) to authenticated;
revoke execute on function private.can_manage(uuid,uuid) from anon, public;
grant execute on function private.can_manage(uuid,uuid) to authenticated;
