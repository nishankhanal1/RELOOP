-- Reloop privacy and Supabase Realtime hardening.
-- Public comments remain readable by everyone, but only signed-in users can post.
alter table public.listing_comments enable row level security;
drop policy if exists "Public comments are viewable" on public.listing_comments;
create policy "Public comments are viewable" on public.listing_comments for select using (true);
drop policy if exists "Signed in users can comment" on public.listing_comments;
create policy "Signed in users can comment" on public.listing_comments for insert with check (auth.uid() is not null and auth.uid() = author_id);

-- Offers are private to the seller/recipient and the buyer/proposer.
alter table public.offers add column if not exists recipient_id uuid references auth.users(id) on delete cascade;
alter table public.offers enable row level security;
drop policy if exists "Public offers are viewable" on public.offers;
drop policy if exists "Users can view participant offers" on public.offers;
create policy "Users can view participant offers" on public.offers for select using (
  auth.uid() = proposer_id or auth.uid() = recipient_id
);
drop policy if exists "Signed-in users can make offers" on public.offers;
drop policy if exists "Users can insert participant offers" on public.offers;
create policy "Users can insert participant offers" on public.offers for insert with check (
  auth.uid() = proposer_id and auth.uid() <> recipient_id
);
drop policy if exists "Users manage their own offers" on public.offers;
drop policy if exists "Participants can update offers" on public.offers;
create policy "Participants can update offers" on public.offers for update using (
  auth.uid() = proposer_id or auth.uid() = recipient_id
) with check (
  auth.uid() = proposer_id or auth.uid() = recipient_id
);

-- Messages are private to the two participants, including Realtime API reads.
alter table public.messages add column if not exists is_read boolean not null default false;
alter table public.messages enable row level security;
drop policy if exists "Message participants can read" on public.messages;
create policy "Message participants can read" on public.messages for select using (
  auth.uid() = sender_id or auth.uid() = recipient_id
);
drop policy if exists "Signed in users can send messages" on public.messages;
drop policy if exists "Participants can send messages" on public.messages;
create policy "Participants can send messages" on public.messages for insert with check (
  auth.uid() = sender_id and auth.uid() <> recipient_id
);
drop policy if exists "Recipients can mark messages read" on public.messages;
create policy "Recipients can mark messages read" on public.messages for update using (
  auth.uid() = recipient_id
) with check (
  auth.uid() = recipient_id
);

-- Ensure messages are available to Supabase Realtime. The DO block is idempotent.
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'messages'
  ) then
    alter publication supabase_realtime add table public.messages;
  end if;
exception when undefined_object then
  raise notice 'supabase_realtime publication is not available in this environment';
end $$;

-- Private offer and notification events also need Realtime publication coverage.
alter table public.notifications enable row level security;
drop policy if exists "Users read own notifications" on public.notifications;
create policy "Users read own notifications" on public.notifications for select using (auth.uid() = user_id);
drop policy if exists "Users update own notifications" on public.notifications;
create policy "Users update own notifications" on public.notifications for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

do $$
begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'offers') then
    alter publication supabase_realtime add table public.offers;
  end if;
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'notifications') then
    alter publication supabase_realtime add table public.notifications;
  end if;
exception when undefined_object then
  raise notice 'supabase_realtime publication is not available in this environment';
end $$;
