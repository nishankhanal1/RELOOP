-- Reloop final security hardening.
-- Run this AFTER the existing marketplace, profile, basket, offer, message,
-- notification, ratings, and storage migrations. Run it last whenever the
-- schema is promoted to a new Supabase project.
begin;

-- Profiles: private table access. Public identity data is exposed only through
-- the deliberately limited public_profiles view below.
alter table public.profiles enable row level security;
drop policy if exists "Public profiles are viewable" on public.profiles;
drop policy if exists "Users manage their own profile" on public.profiles;
create policy "Users manage their own profile"
  on public.profiles for all to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);
revoke all on table public.profiles from anon;
revoke all on table public.profiles from authenticated;
grant select, insert, update, delete on table public.profiles to authenticated;

drop view if exists public.public_profiles;
create view public.public_profiles as
select id, display_name, username, avatar_url
from public.profiles;
revoke all on public.public_profiles from public;
grant select on public.public_profiles to anon, authenticated;

-- Listings: only published rows are public; draft/private rows belong to the
-- seller. WITH CHECK prevents an owner from transferring ownership in an edit.
alter table public.listings enable row level security;
drop policy if exists "Published listings are public" on public.listings;
drop policy if exists "Users create their own listings" on public.listings;
drop policy if exists "Users update their own listings" on public.listings;
drop policy if exists "Users delete their own listings" on public.listings;
drop policy if exists "Listing owners update availability" on public.listings;
create policy "Published listings are public"
  on public.listings for select to anon, authenticated
  using (status = 'published' or auth.uid() = seller_id);
create policy "Users create their own listings"
  on public.listings for insert to authenticated
  with check (auth.uid() = seller_id);
create policy "Users update their own listings"
  on public.listings for update to authenticated
  using (auth.uid() = seller_id)
  with check (auth.uid() = seller_id);
create policy "Users delete their own listings"
  on public.listings for delete to authenticated
  using (auth.uid() = seller_id);
revoke all on table public.listings from public;
grant select on table public.listings to anon, authenticated;
grant insert, update, delete on table public.listings to authenticated;

-- Offers: private to proposer and listing owner. Browser clients may create
-- and read offers, but cannot rewrite status, participants, or money fields.
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
do $$
declare p record;
begin
  for p in select policyname from pg_policies where schemaname = 'public' and tablename = 'offers' loop
    execute format('drop policy %I on public.offers', p.policyname);
  end loop;
end $$;
create policy "Offer participants read their offers"
  on public.offers for select to authenticated
  using (auth.uid() = proposer_id or auth.uid() = recipient_id);
create policy "Members create offers for published listing owners"
  on public.offers for insert to authenticated
  with check (
    auth.uid() = proposer_id
    and auth.uid() <> recipient_id
    and recipient_id = (
      select l.seller_id from public.listings l
      where l.id = offers.listing_id and l.status = 'published'
    )
  );
revoke all on table public.offers from public, anon, authenticated;
grant select, insert on table public.offers to authenticated;

-- Messages: only the two participants can read. No browser update/delete is
-- granted; this prevents changing sender, recipient, body, or read state.
alter table public.messages enable row level security;
do $$
declare p record;
begin
  for p in select policyname from pg_policies where schemaname = 'public' and tablename = 'messages' loop
    execute format('drop policy %I on public.messages', p.policyname);
  end loop;
end $$;
create policy "Message participants can read"
  on public.messages for select to authenticated
  using (auth.uid() = sender_id or auth.uid() = recipient_id);
create policy "Members can send messages"
  on public.messages for insert to authenticated
  with check (auth.uid() = sender_id and auth.uid() <> recipient_id);
revoke all on table public.messages from public, anon, authenticated;
grant select, insert on table public.messages to authenticated;

-- Ensure the table exists even if the optional basket migration was skipped.
create table if not exists public.basket_items (
  user_id uuid not null references auth.users(id) on delete cascade,
  listing_id text not null,
  item jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, listing_id)
);

-- Basket rows are account-owned, not shared browser data.
alter table public.basket_items enable row level security;
drop policy if exists "Users can read their own basket" on public.basket_items;
drop policy if exists "Users can add to their own basket" on public.basket_items;
drop policy if exists "Users can update their own basket" on public.basket_items;
drop policy if exists "Users can remove from their own basket" on public.basket_items;
create policy "Users can read their own basket" on public.basket_items for select to authenticated using (auth.uid() = user_id);
create policy "Users can add to their own basket" on public.basket_items for insert to authenticated with check (auth.uid() = user_id);
create policy "Users can update their own basket" on public.basket_items for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users can remove from their own basket" on public.basket_items for delete to authenticated using (auth.uid() = user_id);
revoke all on table public.basket_items from public, anon;
grant select, insert, update, delete on table public.basket_items to authenticated;

-- Notifications are generated by trusted database triggers and readable only
-- by their owner. No client insert/update/delete access is granted.
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  category text not null,
  title text not null,
  body text not null default '',
  listing_id uuid references public.listings(id) on delete cascade,
  offer_id uuid references public.offers(id) on delete cascade,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);
alter table public.notifications enable row level security;
drop policy if exists "Users read own notifications" on public.notifications;
drop policy if exists "Users update own notifications" on public.notifications;
create policy "Users read own notifications"
  on public.notifications for select to authenticated
  using (auth.uid() = user_id);
revoke all on table public.notifications from public, anon, authenticated;
grant select on table public.notifications to authenticated;

-- Comments are intentionally community-visible; posting still requires a
-- signed-in author. They contain no private profile fields.
create table if not exists public.listing_comments (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings(id) on delete cascade,
  author_id uuid not null references auth.users(id) on delete cascade,
  body text not null check (char_length(trim(body)) between 1 and 1000),
  created_at timestamptz not null default now()
);
alter table public.listing_comments enable row level security;
drop policy if exists "Public comments are viewable" on public.listing_comments;
drop policy if exists "Signed in users can comment" on public.listing_comments;
create policy "Public comments are viewable" on public.listing_comments for select to anon, authenticated using (true);
create policy "Signed in users can comment" on public.listing_comments for insert to authenticated with check (auth.uid() = author_id);
revoke all on table public.listing_comments from public;
grant select on table public.listing_comments to anon, authenticated;
grant insert on table public.listing_comments to authenticated;

-- Historical ratings stay inaccessible until completed-trade verification is
-- implemented through a trusted server-side operation.
create table if not exists public.ratings (
  id uuid primary key default gen_random_uuid(),
  rater_id uuid not null references public.profiles(id) on delete cascade,
  rated_id uuid not null references public.profiles(id) on delete cascade,
  score integer not null check (score between 1 and 5),
  comment text not null default '',
  created_at timestamptz not null default now(),
  unique (rater_id, rated_id),
  check (rater_id <> rated_id)
);
alter table public.ratings enable row level security;
do $$
declare p record;
begin
  for p in select policyname from pg_policies where schemaname = 'public' and tablename = 'ratings' loop
    execute format('drop policy %I on public.ratings', p.policyname);
  end loop;
end $$;
revoke all on table public.ratings from public, anon, authenticated;

commit;
