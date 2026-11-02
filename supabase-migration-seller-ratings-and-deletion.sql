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
drop policy if exists "Public ratings are viewable" on public.ratings;
create policy "Public ratings are viewable" on public.ratings for select using (true);
drop policy if exists "Signed-in users can rate members" on public.ratings;
create policy "Signed-in users can rate members" on public.ratings for insert with check (auth.uid() = rater_id and rater_id <> rated_id);
drop policy if exists "Users can update their own ratings" on public.ratings;
create policy "Users can update their own ratings" on public.ratings for update using (auth.uid() = rater_id) with check (auth.uid() = rater_id and rater_id <> rated_id);

drop policy if exists "Users delete their own listings" on public.listings;
create policy "Users delete their own listings" on public.listings for delete using (auth.uid() = seller_id);

create index if not exists ratings_rated_id_idx on public.ratings (rated_id);
create index if not exists ratings_rater_id_idx on public.ratings (rater_id);
