-- Run after supabase-migration-listing-details-and-history.sql.
-- Listing photos are public; only compressed WebP files up to 1 MiB are accepted.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('listing-images', 'listing-images', true, 1048576, array['image/webp']::text[])
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Public listing images are viewable" on storage.objects;
create policy "Public listing images are viewable" on storage.objects
for select using (bucket_id = 'listing-images');

drop policy if exists "Signed-in users can upload listing images" on storage.objects;
create policy "Signed-in users can upload listing images" on storage.objects
for insert to authenticated
with check (
  bucket_id = 'listing-images'
  and (storage.foldername(name))[1] = (select auth.uid()::text)
);

drop policy if exists "Users can manage their listing images" on storage.objects;
create policy "Users can manage their listing images" on storage.objects
for delete to authenticated
using (
  bucket_id = 'listing-images'
  and (storage.foldername(name))[1] = (select auth.uid()::text)
);

create index if not exists listings_published_created_at_idx
on public.listings (created_at desc)
where status = 'published';
