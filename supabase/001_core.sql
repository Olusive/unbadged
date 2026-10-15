-- Unbadged closed beta: core schema
-- Everything a client can touch is protected by row-level security.
-- Sensitive actions (sign-up, invites, groups, moderation) go through security-definer functions.

create schema if not exists private;

-- ---------- profiles ----------
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text not null,
  avatar smallint not null default 0 check (avatar between 0 and 9),
  company text not null default '' check (char_length(company) <= 40),
  accent text not null default '#ff7b30' check (accent ~ '^#[0-9a-fA-F]{6}$'),
  role text not null default 'member' check (role in ('member','owner')),
  banned boolean not null default false,
  created_at timestamptz not null default now(),
  constraint username_shape check (username ~ '^[A-Za-z0-9_]{3,20}$')
);
create unique index profiles_username_lower on public.profiles (lower(username));

-- login key lives outside the API so nobody can list it
create table private.logins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  login_key uuid not null unique default gen_random_uuid()
);

-- ---------- helpers ----------
create or replace function public.is_owner() returns boolean
language sql stable security definer set search_path = '' as $$
  select coalesce((select role = 'owner' from public.profiles where id = auth.uid()), false)
$$;

create or replace function public.is_active() returns boolean
language sql stable security definer set search_path = '' as $$
  select coalesce((select not banned from public.profiles where id = auth.uid()), false)
$$;

-- ---------- boards ----------
create table public.boards (
  id text primary key check (id ~ '^b/[A-Za-z0-9]{2,30}$'),
  kind text not null default 'Industry',
  description text not null default '',
  locked boolean not null default false,
  sort smallint not null default 100
);
insert into public.boards (id, kind, description, sort) values
 ('b/Walmart','Company','Associates, team leads, and overnight crews.',1),
 ('b/Amazon','Company','Fulfillment, delivery, and sortation.',2),
 ('b/Target','Company','Team members and leads across all departments.',3),
 ('b/Starbucks','Company','Baristas and shift supervisors.',4),
 ('b/Retail','Industry','Every store, every register, every stockroom.',10),
 ('b/CustomerService','Industry','Call centers, help desks, and front counters.',11),
 ('b/Trades','Industry','Electricians, plumbers, HVAC, welders, carpenters.',12),
 ('b/Warehouse','Industry','Pickers, packers, loaders, forklift drivers.',13),
 ('b/NightShift','Everyone','For anyone working while the rest of the world sleeps.',20);

-- ---------- posts, comments, votes ----------
create table public.posts (
  id bigint generated always as identity primary key,
  user_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  board text not null references public.boards(id),
  title text not null check (char_length(title) between 1 and 200),
  body text not null default '' check (char_length(body) <= 5000),
  strong boolean not null default false,
  img_path text,
  removed boolean not null default false,
  created_at timestamptz not null default now()
);
create index posts_created on public.posts (created_at desc);

create table public.comments (
  id bigint generated always as identity primary key,
  post_id bigint not null references public.posts(id) on delete cascade,
  user_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  body text not null check (char_length(body) between 1 and 2000),
  removed boolean not null default false,
  created_at timestamptz not null default now()
);
create index comments_post on public.comments (post_id, created_at);

create table public.votes (
  post_id bigint not null references public.posts(id) on delete cascade,
  user_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  value smallint not null check (value in (-1, 1)),
  primary key (post_id, user_id)
);

-- ---------- shift report & pay ----------
create table public.shift_answers (
  day date not null default (now() at time zone 'America/Chicago')::date,
  user_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  choice smallint not null check (choice between 0 and 3),
  primary key (day, user_id)
);

-- pay entries are stored with no user attached
create table public.wages (
  id bigint generated always as identity primary key,
  role_key text not null check (char_length(role_key) between 2 and 80),
  rate numeric(6,2) not null check (rate > 5 and rate < 300),
  created_at timestamptz not null default now()
);

-- ---------- follows & blocks ----------
create table public.follows (
  follower uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  followee uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (follower, followee),
  check (follower <> followee)
);

create table public.blocks (
  blocker uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  kind text not null check (kind in ('user','board','room')),
  target text not null,
  created_at timestamptz not null default now(),
  primary key (blocker, kind, target)
);

-- ---------- chats ----------
create table public.rooms (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 40),
  kind text not null check (kind in ('public','group','dm')),
  board text references public.boards(id),
  allow_faces boolean not null default false,
  invites text not null default 'admins' check (invites in ('admins','everyone')),
  expiry text not null default '7 days' check (expiry in ('Off','24 hours','7 days','30 days')),
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create table public.room_members (
  room_id uuid not null references public.rooms(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role text not null default 'member' check (role in ('admin','member')),
  muted boolean not null default false,
  joined_at timestamptz not null default now(),
  primary key (room_id, user_id)
);

create or replace function public.is_member(r uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.room_members where room_id = r and user_id = auth.uid())
$$;
create or replace function public.is_room_admin(r uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.room_members where room_id = r and user_id = auth.uid() and role = 'admin')
$$;
create or replace function public.room_is_public(r uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.rooms where id = r and kind = 'public')
$$;

create table public.messages (
  id bigint generated always as identity primary key,
  room_id uuid not null references public.rooms(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete cascade,
  body text not null default '' check (char_length(body) <= 2000),
  img_path text,
  system boolean not null default false,
  created_at timestamptz not null default now()
);
create index messages_room on public.messages (room_id, created_at);

insert into public.rooms (name, kind, board) values
 ('Walmart Overnight Crew','public','b/Walmart'),
 ('Night Owls','public','b/NightShift'),
 ('Trades Talk','public','b/Trades'),
 ('Vent Room','public','b/Retail');

-- ---------- reports, feedback, invites ----------
create table public.reports (
  id bigint generated always as identity primary key,
  reporter uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  kind text not null check (kind in ('account','post','message','group','room','board')),
  target text not null check (char_length(target) <= 100),
  reason text not null check (char_length(reason) <= 80),
  details text not null default '' check (char_length(details) <= 1000),
  status text not null default 'open',
  created_at timestamptz not null default now()
);

create table public.feedback (
  id bigint generated always as identity primary key,
  user_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  type text not null check (char_length(type) <= 30),
  body text not null check (char_length(body) between 1 and 2000),
  created_at timestamptz not null default now()
);

create table private.invites (
  code text primary key,
  note text not null default '',
  status text not null default 'unused' check (status in ('unused','used','cancelled')),
  grants_role text not null default 'member' check (grants_role in ('member','owner')),
  created_by uuid,
  used_by uuid,
  used_at timestamptz,
  created_at timestamptz not null default now()
);

create table private.link_codes (
  code text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  expires_at timestamptz not null,
  used boolean not null default false
);
