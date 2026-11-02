-- Run this in Supabase SQL Editor after enabling Auth > Providers > Google.
create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null,
  avatar_url text,
  created_at timestamptz not null default now()
);

create table if not exists public.listings (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  category text not null,
  price numeric(10,2) not null default 0,
  currency text not null default 'USD' check (currency in ('USD', 'NPR')),
  exchange_preference text not null default 'Buy or exchange',
  description text not null default '',
  status text not null default 'draft' check (status in ('draft','published','sold','exchanged')),
  created_at timestamptz not null default now()
);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid references public.listings(id) on delete cascade,
  sender_id uuid not null references public.profiles(id) on delete cascade,
  recipient_id uuid not null references public.profiles(id) on delete cascade,
  body text not null,
  is_read boolean not null default false,
  message_type text not null default 'user' check (message_type in ('user','system')),
  offer_id uuid,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
alter table public.listings enable row level security;
alter table public.messages enable row level security;

drop policy if exists "Users manage their own profile" on public.profiles;
create policy "Users manage their own profile" on public.profiles for all to authenticated using (auth.uid() = id) with check (auth.uid() = id);

drop policy if exists "Published listings are public" on public.listings;
create policy "Published listings are public" on public.listings for select using (status = 'published' or auth.uid() = seller_id);
drop policy if exists "Users create their own listings" on public.listings;
create policy "Users create their own listings" on public.listings for insert with check (auth.uid() = seller_id);
drop policy if exists "Users update their own listings" on public.listings;
create policy "Users update their own listings" on public.listings for update using (auth.uid() = seller_id) with check (auth.uid() = seller_id);

drop policy if exists "Participants can read messages" on public.messages;
create policy "Participants can read messages" on public.messages for select using (auth.uid() = sender_id or auth.uid() = recipient_id);
drop policy if exists "Signed-in users can send messages" on public.messages;
create policy "Signed-in users can send messages" on public.messages for insert with check (auth.uid() = sender_id and auth.uid() <> recipient_id);

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, display_name, avatar_url)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', split_part(new.email, '@', 1), 'Reloop member'), new.raw_user_meta_data->>'avatar_url')
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute procedure public.handle_new_user();

-- Public cash/item offers shown beneath each listing, like community comments.
alter table public.listings add column if not exists min_price numeric(10,2) not null default 0;
alter table public.listings add column if not exists accepts_any_item boolean not null default true;

create table if not exists public.offers (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings(id) on delete cascade,
  proposer_id uuid not null references public.profiles(id) on delete cascade,
  recipient_id uuid references auth.users(id) on delete cascade,
  offer_type text not null check (offer_type in ('cash','item','cash_and_item')),
  cash_amount numeric(10,2) not null default 0,
  item_description text not null default '',
  message text not null default '',
  created_at timestamptz not null default now()
);

alter table public.offers add column if not exists recipient_id uuid references auth.users(id) on delete cascade;

alter table public.offers enable row level security;
drop policy if exists "Public offers are viewable" on public.offers;
drop policy if exists "Users can view participant offers" on public.offers;
create policy "Users can view participant offers" on public.offers for select to authenticated using (auth.uid() = proposer_id or auth.uid() = recipient_id);
drop policy if exists "Signed-in users can make offers" on public.offers;
drop policy if exists "Users can insert participant offers" on public.offers;
create policy "Users can insert participant offers" on public.offers for insert to authenticated with check (auth.uid() = proposer_id and auth.uid() <> recipient_id);
drop policy if exists "Users manage their own offers" on public.offers;
drop policy if exists "Participants can update offers" on public.offers;
