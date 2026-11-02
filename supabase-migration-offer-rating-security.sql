-- Close direct offer-state mutations and hide unverified community ratings.
-- Review and apply in staging after the offer negotiation and ratings migrations.
begin;

do $$
begin
  if to_regclass('public.offers') is null
     or to_regclass('public.listings') is null
     or to_regclass('public.ratings') is null then
    raise exception 'Apply the marketplace, offer negotiation, and seller ratings migrations first.';
  end if;
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'offers' and column_name = 'recipient_id'
  ) or not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'offers' and column_name = 'status'
  ) or not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'offers' and column_name = 'accepted_at'
  ) or not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'listings' and column_name = 'availability_status'
  ) then
    raise exception 'Apply the offer negotiation migration before offer security hardening.';
  end if;
end
$$;

alter table public.offers enable row level security;
do $$
declare
  policy_record record;
begin
  for policy_record in
    select policyname
    from pg_policies
    where schemaname = 'public' and tablename = 'offers'
  loop
    execute format('drop policy %I on public.offers', policy_record.policyname);
  end loop;
end
$$;

create policy "Offer participants read their offers"
  on public.offers for select to authenticated
  using (auth.uid() = proposer_id or auth.uid() = recipient_id);

create policy "Members create pending offers for listing owners"
  on public.offers for insert to authenticated
  with check (
    auth.uid() = proposer_id
    and auth.uid() <> recipient_id
    and status = 'pending'
    and accepted_at is null
    and recipient_id = (
      select listing.seller_id
      from public.listings as listing
      where listing.id = offers.listing_id
        and listing.availability_status = 'available'
    )
  );

-- Offer responses must be implemented through a trusted, validated server-side
-- operation; do not expose direct status or ownership updates to browser clients.
revoke all privileges on table public.offers from public, anon, authenticated;
grant select, insert on table public.offers to authenticated;

alter table public.ratings enable row level security;
do $$
declare
  policy_record record;
begin
  for policy_record in
    select policyname
    from pg_policies
    where schemaname = 'public' and tablename = 'ratings'
  loop
    execute format('drop policy %I on public.ratings', policy_record.policyname);
  end loop;
end
$$;

-- Keep historical rows, but do not expose or accept ratings until a completed
-- trade can be established by trusted database state.
revoke all privileges on table public.ratings from public, anon, authenticated;

commit;
