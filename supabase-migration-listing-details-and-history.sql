alter table public.listings add column if not exists image_url text;
alter table public.listings add column if not exists months_owned integer;
alter table public.listings add column if not exists original_price numeric(10,2);
alter table public.listings add column if not exists condition text;
alter table public.listings add column if not exists quality text;

alter table public.listings drop constraint if exists listings_months_owned_check;
alter table public.listings add constraint listings_months_owned_check check (months_owned is null or months_owned >= 1);
alter table public.listings drop constraint if exists listings_original_price_check;
alter table public.listings add constraint listings_original_price_check check (original_price is null or original_price > 0);

insert into storage.buckets (id, name, public)
values ('listing-images', 'listing-images', true)
on conflict (id) do update set public = true;

drop policy if exists "Public listing images are viewable" on storage.objects;
create policy "Public listing images are viewable" on storage.objects
for select using (bucket_id = 'listing-images');

drop policy if exists "Signed-in users can upload listing images" on storage.objects;
create policy "Signed-in users can upload listing images" on storage.objects
for insert to authenticated
with check (bucket_id = 'listing-images' and (storage.foldername(name))[1] = (select auth.uid()::text));

drop policy if exists "Users can manage their listing images" on storage.objects;
create policy "Users can manage their listing images" on storage.objects
for delete to authenticated
using (bucket_id = 'listing-images' and (storage.foldername(name))[1] = (select auth.uid()::text));
