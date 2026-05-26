-- TripFinance Schema Migration
-- Date: 2026-05-26
-- Description: Sets up profiles, groups, members, cards, transactions, splits, triggers, helper functions, and RLS policies.

-- Enable UUID generation extension
create extension if not exists "uuid-ossp";

-- 1. Profiles Table
create table public.profiles (
  id uuid primary key references auth.users on delete cascade,
  name text,
  created_at timestamp with time zone default now()
);

-- Enable RLS for profiles
alter table public.profiles enable row level security;

-- 2. Groups Table (Workspaces / Family Hubs)
create table public.groups (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  join_code text unique not null,
  preset_card_names text[] default '{}'::text[] not null,
  created_by uuid references public.profiles(id) on delete cascade not null,
  created_at timestamp with time zone default now()
);

-- Enable RLS for groups
alter table public.groups enable row level security;

-- 3. Group Members Table
create table public.group_members (
  id uuid primary key default gen_random_uuid(),
  group_id uuid references public.groups(id) on delete cascade not null,
  profile_id uuid references public.profiles(id) on delete cascade not null,
  role text default 'member'::text not null,
  created_at timestamp with time zone default now(),
  constraint group_members_group_id_profile_id_key unique (group_id, profile_id)
);

-- Enable RLS for group_members
alter table public.group_members enable row level security;

-- 4. Cards Table (Private Cards)
create table public.cards (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade not null,
  card_name text not null,
  created_at timestamp with time zone default now()
);

-- Enable RLS for cards
alter table public.cards enable row level security;

-- 5. Transactions Table
create table public.transactions (
  id uuid primary key default gen_random_uuid(),
  amount numeric(12, 2) not null,
  description text not null,
  payer_id uuid references public.profiles(id) on delete cascade not null,
  card_id uuid references public.cards(id) on delete set null,
  card_name text, -- Denormalized card name
  group_id uuid references public.groups(id) on delete cascade,
  created_at timestamp with time zone default now()
);

-- Enable RLS for transactions
alter table public.transactions enable row level security;

-- 6. Transaction Splits Table
create table public.transaction_splits (
  id uuid primary key default gen_random_uuid(),
  transaction_id uuid references public.transactions(id) on delete cascade not null,
  debtor_id uuid references public.profiles(id) on delete cascade not null,
  amount_owed numeric(12, 2) not null,
  is_settled boolean default false not null,
  created_at timestamp with time zone default now()
);

-- Enable RLS for transaction_splits
alter table public.transaction_splits enable row level security;


-- =========================================================================
-- SECURITY DEFINER HELPER FUNCTIONS (Bypasses RLS to avoid recursive loops)
-- =========================================================================

-- Helper to fetch all group IDs that a user belongs to
create or replace function public.get_groups_for_user(user_id uuid)
returns setof uuid as $$
  select group_id from public.group_members where profile_id = user_id;
$$ language sql security definer;

-- Trigger function: automatically provisions profile on auth.users sign-up
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, name)
  values (
    new.id,
    coalesce(
      new.raw_user_meta_data->>'name',
      split_part(new.email, '@', 1)
    )
  );
  return new;
end;
$$ language plpgsql security definer;

-- Trigger to hook handle_new_user to auth.users insertion
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- RPC Function: allows users to join a group workspace via a valid join_code
create or replace function public.join_group_by_code(code text)
returns uuid as $$
declare
  target_group_id uuid;
begin
  select id into target_group_id from public.groups where upper(join_code) = upper(code);
  
  if target_group_id is null then
    raise exception 'Invalid invite code';
  end if;
  
  insert into public.group_members (group_id, profile_id, role)
  values (target_group_id, auth.uid(), 'member')
  on conflict (group_id, profile_id) do nothing;
  
  return target_group_id;
end;
$$ language plpgsql security definer;


-- =========================================================================
-- ROW-LEVEL SECURITY (RLS) POLICIES
-- =========================================================================

-- Profiles Policies
create policy "Enable read access for all authenticated users"
  on public.profiles for select
  using (auth.role() = 'authenticated');

create policy "Enable update for users own profile"
  on public.profiles for update
  using (auth.uid() = id);

-- Groups Policies
create policy "Allow read access to group members"
  on public.groups for select
  using (id in (select public.get_groups_for_user(auth.uid())) or created_by = auth.uid());

create policy "Allow authenticated users to create a group"
  on public.groups for insert
  with check (auth.role() = 'authenticated' and created_by = auth.uid());

create policy "Allow group creators to update or delete their group"
  on public.groups for all
  using (created_by = auth.uid());

-- Group Members Policies
create policy "Allow group members to view membership lists"
  on public.group_members for select
  using (group_id in (select public.get_groups_for_user(auth.uid())));

create policy "Allow direct group member insertions"
  on public.group_members for insert
  with check (auth.uid() = profile_id);

create policy "Allow creators to manage group memberships"
  on public.group_members for all
  using (group_id in (select id from public.groups where created_by = auth.uid()));

-- Cards Policies (Strictly Private)
create policy "Allow full private access to own cards"
  on public.cards for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- Transactions Policies
create policy "Allow users to view own or group transactions"
  on public.transactions for select
  using (payer_id = auth.uid() or group_id in (select public.get_groups_for_user(auth.uid())));

create policy "Allow users to manage own transactions"
  on public.transactions for all
  using (payer_id = auth.uid())
  with check (payer_id = auth.uid());

-- Transaction Splits Policies
create policy "Allow select to debtor, payer, or group member"
  on public.transaction_splits for select
  using (
    debtor_id = auth.uid() or 
    (select payer_id from public.transactions where id = transaction_id) = auth.uid() or
    (select group_id from public.transactions where id = transaction_id) in (select public.get_groups_for_user(auth.uid()))
  );

create policy "Allow transaction payers to manage splits"
  on public.transaction_splits for all
  using ((select payer_id from public.transactions where id = transaction_id) = auth.uid())
  with check ((select payer_id from public.transactions where id = transaction_id) = auth.uid());
