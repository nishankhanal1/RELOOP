create table if not exists public.listing_comments (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings(id) on delete cascade,
  author_id uuid not null references auth.users(id) on delete cascade,
  body text not null check (char_length(trim(body)) between 1 and 1000),
  created_at timestamptz not null default now()
);
alter table public.listing_comments enable row level security;
drop policy if exists "Public comments are viewable" on public.listing_comments;
create policy "Public comments are viewable" on public.listing_comments for select using (true);
drop policy if exists "Signed in users can comment" on public.listing_comments;
create policy "Signed in users can comment" on public.listing_comments for insert with check (auth.uid() = author_id);
create index if not exists listing_comments_listing_idx on public.listing_comments(listing_id, created_at);

alter table public.messages add column if not exists listing_id uuid references public.listings(id) on delete set null;
alter table public.messages enable row level security;
drop policy if exists "Message participants can read" on public.messages;
create policy "Message participants can read" on public.messages for select using (auth.uid() = sender_id or auth.uid() = recipient_id);
drop policy if exists "Signed in users can send messages" on public.messages;
create policy "Signed in users can send messages" on public.messages for insert with check (auth.uid() = sender_id and sender_id <> recipient_id);
