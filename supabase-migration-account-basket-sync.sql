-- Reloop persistent basket: signed-in users can access their saved items on any device.
create table if not exists public.basket_items (
  user_id uuid not null references auth.users(id) on delete cascade,
  listing_id text not null,
  item jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, listing_id)
);

alter table public.basket_items enable row level security;

drop policy if exists "Users can read their own basket" on public.basket_items;
create policy "Users can read their own basket" on public.basket_items
  for select using (auth.uid() = user_id);

drop policy if exists "Users can add to their own basket" on public.basket_items;
create policy "Users can add to their own basket" on public.basket_items
  for insert with check (auth.uid() = user_id);

drop policy if exists "Users can update their own basket" on public.basket_items;
create policy "Users can update their own basket" on public.basket_items
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "Users can remove from their own basket" on public.basket_items;
create policy "Users can remove from their own basket" on public.basket_items
  for delete using (auth.uid() = user_id);

create index if not exists basket_items_user_id_idx on public.basket_items(user_id);
