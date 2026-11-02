-- Run after supabase-marketplace-schema.sql, supabase-migration-listing-offers.sql,
-- and supabase-migration-member-profile-details.sql.
-- Phone and city stay private; only the public_profiles view is exposed.
drop policy if exists "Public profiles are viewable" on public.profiles;
drop policy if exists "Users manage their own profile" on public.profiles;
create policy "Users manage their own profile" on public.profiles for all using (auth.uid() = id) with check (auth.uid() = id);

create or replace view public.public_profiles as
select id, display_name, username, avatar_url
from public.profiles;
grant select on public.public_profiles to anon, authenticated;

update public.listings set min_price = greatest(coalesce(price, 1), 1) where min_price < 1;
alter table public.listings drop constraint if exists listings_min_price_check;
alter table public.listings add constraint listings_min_price_check check (min_price >= 1);

alter table public.offers drop constraint if exists offers_cash_amount_check;
alter table public.offers add constraint offers_cash_amount_check check (cash_amount >= 0);
