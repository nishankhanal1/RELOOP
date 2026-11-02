-- Run after supabase-migration-listing-offers.sql.
alter table public.offers add column if not exists recipient_id uuid references public.profiles(id) on delete cascade;
create index if not exists offers_listing_id_created_at_idx on public.offers (listing_id, created_at desc);
create index if not exists offers_recipient_id_idx on public.offers (recipient_id);

-- Allow the live app to receive INSERT/UPDATE/DELETE events for offers.
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'offers'
  ) then
    alter publication supabase_realtime add table public.offers;
  end if;
end
$$;
