-- Reloop dual-currency support.
-- Existing rows safely default to USD; new listings may use USD or NPR.
alter table public.listings
  add column if not exists currency text not null default 'USD';

update public.listings
set currency = 'USD'
where currency is null or currency not in ('USD', 'NPR');

alter table public.listings
  drop constraint if exists listings_currency_check;

alter table public.listings
  add constraint listings_currency_check check (currency in ('USD', 'NPR'));
