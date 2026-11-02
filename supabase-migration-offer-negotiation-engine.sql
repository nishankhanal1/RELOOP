-- Reloop offer negotiation engine and realtime chat extensions.
alter table public.offers add column if not exists recipient_id uuid references auth.users(id) on delete cascade;
alter table public.offers add column if not exists status text not null default 'pending';
alter table public.offers add column if not exists counter_cash_amount numeric(10,2);
alter table public.offers add column if not exists counter_item_description text not null default '';
alter table public.offers add column if not exists offered_item_photo_url text;
alter table public.offers add column if not exists accepted_at timestamptz;
alter table public.offers add column if not exists escrow_status text not null default 'not_started';
alter table public.offers drop constraint if exists offers_escrow_status_check;
alter table public.offers add constraint offers_escrow_status_check check (escrow_status in ('not_started','pending_handoff','held','released','cancelled'));
alter table public.offers add column if not exists updated_at timestamptz not null default now();
alter table public.offers drop constraint if exists offers_status_check;
alter table public.offers add constraint offers_status_check check (status in ('pending','accepted','counter_offered','declined'));
alter table public.listings add column if not exists availability_status text not null default 'available';
alter table public.listings drop constraint if exists listings_availability_status_check;
alter table public.listings add constraint listings_availability_status_check check (availability_status in ('available','under_offer','exchanged','removed'));

alter table public.messages add column if not exists offer_id uuid references public.offers(id) on delete set null;
alter table public.messages add column if not exists is_read boolean not null default false;
alter table public.messages add column if not exists message_type text not null default 'user';
alter table public.messages drop constraint if exists messages_message_type_check;
alter table public.messages add constraint messages_message_type_check check (message_type in ('user','system'));

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  category text not null check (category in ('offer','message','offer_status','escrow')),
  title text not null,
  body text not null default '',
  listing_id uuid references public.listings(id) on delete cascade,
  offer_id uuid references public.offers(id) on delete cascade,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);
alter table public.notifications enable row level security;
drop policy if exists "Users read own notifications" on public.notifications;
create policy "Users read own notifications" on public.notifications for select using (auth.uid() = user_id);
drop policy if exists "Users update own notifications" on public.notifications;
create policy "Users update own notifications" on public.notifications for update using (auth.uid() = user_id);

-- Offer state changes must happen through a trusted server-side operation.
-- Browser clients must not be able to rewrite offer state or money fields.
drop policy if exists "Listing owners update offer statuses" on public.offers;
drop policy if exists "Participants can update offers" on public.offers;
revoke all on table public.offers from public, anon, authenticated;
grant select, insert on table public.offers to authenticated;
drop policy if exists "Listing owners update availability" on public.listings;
create policy "Listing owners update availability" on public.listings for update using (auth.uid() = seller_id);

create or replace function public.reloop_offer_activity() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if (tg_op = 'INSERT') then
    insert into public.notifications(user_id, category, title, body, listing_id, offer_id)
    values (new.recipient_id, 'offer', 'New offer received', 'A member sent you a structured offer.', new.listing_id, new.id);
  elsif (tg_op = 'UPDATE' and new.status is distinct from old.status) then
    insert into public.notifications(user_id, category, title, body, listing_id, offer_id)
    values (new.proposer_id, 'offer_status', 'Offer ' || replace(new.status, '_', ' '), 'Your offer status changed for a listing.', new.listing_id, new.id);
  end if;
  if (tg_op = 'UPDATE' and new.status = 'accepted' and old.status is distinct from 'accepted') then
    update public.listings set availability_status = 'under_offer' where id = new.listing_id;
    update public.offers set status = 'declined', updated_at = now()
      where listing_id = new.listing_id and id <> new.id and status in ('pending', 'counter_offered');
  end if;
  return new;
end;
$$;
drop trigger if exists reloop_offer_activity_trigger on public.offers;
create trigger reloop_offer_activity_trigger after insert or update of status on public.offers for each row execute function public.reloop_offer_activity();

create or replace function public.reloop_message_activity() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if (new.message_type = 'user') then
    insert into public.notifications(user_id, category, title, body, listing_id)
    values (new.recipient_id, 'message', 'New message in chat', left(new.body, 120), new.listing_id);
  end if;
  return new;
end;
$$;
drop trigger if exists reloop_message_activity_trigger on public.messages;
create trigger reloop_message_activity_trigger after insert on public.messages for each row execute function public.reloop_message_activity();

-- Replace the offer trigger with chat system events included.
create or replace function public.reloop_offer_activity() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if (tg_op = 'INSERT') then
    insert into public.notifications(user_id, category, title, body, listing_id, offer_id)
    values (new.recipient_id, 'offer', 'New offer received', 'A member sent you a structured offer.', new.listing_id, new.id);
    insert into public.messages(sender_id, recipient_id, listing_id, offer_id, body, message_type)
    values (new.proposer_id, new.recipient_id, new.listing_id, new.id, 'A structured offer was submitted and is now Pending.', 'system');
  elsif (tg_op = 'UPDATE' and new.status is distinct from old.status) then
    insert into public.notifications(user_id, category, title, body, listing_id, offer_id)
    values (new.proposer_id, 'offer_status', 'Offer ' || replace(new.status, '_', ' '), 'Your offer status changed for a listing.', new.listing_id, new.id);
    insert into public.messages(sender_id, recipient_id, listing_id, offer_id, body, message_type)
    values (coalesce(new.recipient_id, new.proposer_id), case when new.recipient_id = coalesce(new.recipient_id, new.proposer_id) then new.proposer_id else new.recipient_id end, new.listing_id, new.id, 'Offer status updated to ' || replace(new.status, '_', ' ') || '.', 'system');
  end if;
  if (tg_op = 'UPDATE' and new.status = 'accepted' and old.status is distinct from 'accepted') then
    update public.listings set availability_status = 'under_offer' where id = new.listing_id;
    update public.offers set status = 'declined', updated_at = now()
      where listing_id = new.listing_id and id <> new.id and status in ('pending', 'counter_offered');
  end if;
  return new;
end;
$$;
