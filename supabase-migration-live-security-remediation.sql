-- Reloop live security remediation: private offers/chats + escrow notifications.
-- Idempotent: safe to run against the currently connected project.

-- Offers must always carry both participants.
alter table public.offers add column if not exists recipient_id uuid references auth.users(id) on delete cascade;
alter table public.offers add column if not exists status text not null default 'pending';
alter table public.offers add column if not exists escrow_status text not null default 'not_started';
alter table public.offers add column if not exists updated_at timestamptz not null default now();
alter table public.offers add column if not exists accepted_at timestamptz;
alter table public.offers drop constraint if exists offers_escrow_status_check;
alter table public.offers add constraint offers_escrow_status_check check (escrow_status in ('not_started','pending_handoff','held','released','cancelled'));

alter table public.offers enable row level security;
drop policy if exists "Public offers are viewable" on public.offers;
drop policy if exists "Users can view participant offers" on public.offers;
create policy "Users can view participant offers" on public.offers for select using (auth.uid() = proposer_id or auth.uid() = recipient_id);
drop policy if exists "Signed-in users can make offers" on public.offers;
drop policy if exists "Users can insert participant offers" on public.offers;
create policy "Users can insert participant offers" on public.offers for insert with check (auth.uid() = proposer_id and auth.uid() <> recipient_id);
drop policy if exists "Users manage their own offers" on public.offers;
drop policy if exists "Participants can update offers" on public.offers;
revoke all on table public.offers from public, anon, authenticated;
grant select, insert on table public.offers to authenticated;

-- Messages are private to the sender and recipient.
alter table public.messages add column if not exists listing_id uuid references public.listings(id) on delete set null;
alter table public.messages add column if not exists is_read boolean not null default false;
alter table public.messages add column if not exists message_type text not null default 'user';
alter table public.messages add column if not exists offer_id uuid references public.offers(id) on delete set null;
alter table public.messages enable row level security;
drop policy if exists "Participants can read messages" on public.messages;
drop policy if exists "Message participants can read" on public.messages;
create policy "Message participants can read" on public.messages for select using (auth.uid() = sender_id or auth.uid() = recipient_id);
drop policy if exists "Signed-in users can send messages" on public.messages;
drop policy if exists "Participants can send messages" on public.messages;
create policy "Participants can send messages" on public.messages for insert with check (auth.uid() = sender_id and auth.uid() <> recipient_id);
drop policy if exists "Recipients can mark messages read" on public.messages;
create policy "Recipients can mark messages read" on public.messages for update using (auth.uid() = recipient_id) with check (auth.uid() = recipient_id);

-- Notification history is private to its owner.
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
create policy "Users update own notifications" on public.notifications for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Accepted trades and escrow transitions create private history for both parties.
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
    values (new.recipient_id, new.proposer_id, new.listing_id, new.id, 'Offer status updated to ' || replace(new.status, '_', ' ') || '.', 'system');
  end if;
  if (tg_op = 'UPDATE' and new.status = 'accepted' and old.status is distinct from 'accepted') then
    update public.listings set availability_status = 'under_offer' where id = new.listing_id;
    update public.offers set status = 'declined', updated_at = now()
      where listing_id = new.listing_id and id <> new.id and status in ('pending', 'counter_offered');
    update public.offers set escrow_status = 'pending_handoff' where id = new.id;
    insert into public.notifications(user_id, category, title, body, listing_id, offer_id)
    values (new.proposer_id, 'escrow', 'Trade accepted · handoff pending', 'The seller accepted your offer. Confirm the handoff details to move the trade forward.', new.listing_id, new.id);
    insert into public.notifications(user_id, category, title, body, listing_id, offer_id)
    values (new.recipient_id, 'escrow', 'Trade accepted · handoff pending', 'Your accepted trade is ready for handoff coordination.', new.listing_id, new.id);
  end if;
  if (tg_op = 'UPDATE' and new.escrow_status is distinct from old.escrow_status) then
    insert into public.notifications(user_id, category, title, body, listing_id, offer_id)
    values (new.proposer_id, 'escrow', 'Escrow status updated', 'Trade escrow status is now ' || replace(new.escrow_status, '_', ' ') || '.', new.listing_id, new.id);
    insert into public.notifications(user_id, category, title, body, listing_id, offer_id)
    values (new.recipient_id, 'escrow', 'Escrow status updated', 'Trade escrow status is now ' || replace(new.escrow_status, '_', ' ') || '.', new.listing_id, new.id);
  end if;
  return new;
end;
$$;
drop trigger if exists reloop_offer_activity_trigger on public.offers;
create trigger reloop_offer_activity_trigger after insert or update of status, escrow_status on public.offers for each row execute function public.reloop_offer_activity();

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

-- Idempotently register tables for Supabase Realtime.
do $$
begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'messages') then alter publication supabase_realtime add table public.messages; end if;
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'offers') then alter publication supabase_realtime add table public.offers; end if;
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'notifications') then alter publication supabase_realtime add table public.notifications; end if;
exception when undefined_object then
  raise notice 'supabase_realtime publication is not available in this environment';
end $$;
