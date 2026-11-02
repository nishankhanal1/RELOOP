alter table public.profiles add column if not exists username text;
alter table public.profiles add column if not exists phone text;
alter table public.profiles add column if not exists city text;

create unique index if not exists profiles_username_unique on public.profiles (lower(username)) where username is not null;
