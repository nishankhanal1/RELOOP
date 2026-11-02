-- Reloop accepted-trade and escrow notification history.
alter table public.offers add column if not exists escrow_status text not null default 'not_started';
alter table public.offers drop constraint if exists offers_escrow_status_check;
alter table public.offers add constraint offers_escrow_status_check check (escrow_status in ('not_started','pending_handoff','held','released','cancelled'));

alter table public.notifications drop constraint if exists notifications_category_check;
alter table public.notifications add constraint notifications_category_check check (category in ('offer','message','offer_status','escrow'));

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
    update public.offers set escrow_status = 'pending_handoff' where id = new.id;
    insert into public.notifications(user_id, category, title, body, listing_id, offer_id)
    values (new.proposer_id, 'escrow', 'Trade accepted · handoff pending', 'The seller accepted your offer. Confirm the handoff details to move the trade forward.', new.listing_id, new.id);
    insert into public.notifications(user_id, category, title, body, listing_id, offer_id)
    values (new.recipient_id, 'escrow', 'Trade accepted · handoff pending', 'Your accepted trade is ready for handoff coordination.', new.listing_id, new.id);
  end if;
  if (tg_op = 'UPDATE' and new.escrow_status is distinct from old.escrow_status) then
    insert into public.notifications(user_id, category, title, body, listing_id, offer_id)
    values (new.proposer_id, 'escrow', 'Escrow status updated', 'Trade escrow status is now ' || replace(new.escrow_status, '_', ' ') || '.', new.listing_id, new.id);
    if new.recipient_id is not null then
      insert into public.notifications(user_id, category, title, body, listing_id, offer_id)
      values (new.recipient_id, 'escrow', 'Escrow status updated', 'Trade escrow status is now ' || replace(new.escrow_status, '_', ' ') || '.', new.listing_id, new.id);
    end if;
  end if;
  return new;
end;
$$;
