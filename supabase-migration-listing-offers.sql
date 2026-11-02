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
create policy "Users can view participant offers" on public.offers for select using (auth.uid() = proposer_id or auth.uid() = recipient_id);
drop policy if exists "Signed-in users can make offers" on public.offers;
drop policy if exists "Users can insert participant offers" on public.offers;
create policy "Users can insert participant offers" on public.offers for insert with check (auth.uid() = proposer_id and auth.uid() <> recipient_id);
drop policy if exists "Users manage their own offers" on public.offers;
drop policy if exists "Participants can update offers" on public.offers;
