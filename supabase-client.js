import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);
const supabaseGlobalKey = '__reloop_supabase_client__';
export const supabase = isSupabaseConfigured
  ? globalThis[supabaseGlobalKey] || (globalThis[supabaseGlobalKey] = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
        flowType: 'pkce',
        storageKey: 'reloop-auth-session'
      }
    }))
  : null;


const isMissingCurrencyColumn = (error) => /column .*currency.*(?:does not exist|schema cache)|could not find the 'currency' column/i.test(error?.message || '');

export function getFriendlyError(error, fallback = 'Something went wrong. Please try again.') {
  const message = error?.message || String(error || '');
  if (!message) return fallback;
  if (isMissingCurrencyColumn(error)) return 'Currency support is not enabled in the database yet. Your listing can still be saved in USD; run supabase-migration-listing-currency.sql in Supabase SQL Editor to enable USD and NPR persistence.';
  if (/failed to fetch|networkerror|network request failed|fetch failed/i.test(message)) return 'Network connection failed. Check your internet connection and try again.';
  if (/row-level security|violates row-level security|permission denied|not authorized/i.test(message)) return 'You do not have permission to perform this action. Please sign in again and retry.';
  if (/jwt|token|session.*expired|invalid.*token/i.test(message)) return 'Your session has expired. Please sign in again.';
  if (/duplicate|already exists|unique constraint/i.test(message)) return 'This information already exists. Try a different value.';
  if (/not found|no rows/i.test(message)) return 'That item could not be found. Refresh the page and try again.';
  return message;
}

export async function signInWithGoogle() {
  if (!supabase) throw new Error('Supabase is not configured yet.');
  const settingsResponse = await fetch(`${supabaseUrl}/auth/v1/settings`, { headers: { apikey: supabaseAnonKey } });
  const settings = await settingsResponse.json();
  if (!settings?.external?.google) {
    throw new Error('Google sign-in is not enabled in Supabase yet. Open Authentication → Providers → Google and enable it.');
  }
  const { data, error } = await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: window.location.origin, queryParams: { prompt: 'select_account' } } });
  if (error) throw new Error(`Google sign-in is unavailable: ${error.message}`);
  return data;
}

export async function signInWithEmail(email) {
  if (!supabase) throw new Error('Supabase is not configured yet.');
  const normalizedEmail = email.trim().toLowerCase();
  if (!normalizedEmail || !normalizedEmail.includes('@')) throw new Error('Enter a valid email address.');
  const { error } = await supabase.auth.signInWithOtp({ email: normalizedEmail, options: { emailRedirectTo: window.location.origin } });
  if (error) throw new Error(`Email sign-in is unavailable: ${error.message}`);
}

export async function signOut() {
  if (supabase) return supabase.auth.signOut();
}

export async function ensureProfile(user) {
  if (!supabase || !user) return;
  const { error } = await supabase.from('profiles').upsert({
    id: user.id,
    display_name: user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split('@')[0] || 'Reloop member',
    avatar_url: user.user_metadata?.avatar_url || null
  }, { onConflict: 'id' });
  if (error) throw new Error(getFriendlyError(error));
}

export async function getProfile(userId) {
  if (!supabase || !userId) return null;
  const { data, error } = await supabase.from('profiles').select('id,display_name,username,phone,city,avatar_url,created_at').eq('id', userId).maybeSingle();
  if (error) throw new Error(getFriendlyError(error));
  return data;
}

export async function updateProfile(user, profile) {
  if (!supabase || !user) throw new Error('Sign in before completing your profile.');
  const { data, error } = await supabase.from('profiles').upsert({
    id: user.id,
    display_name: profile.username.trim(),
    username: profile.username.trim(),
    phone: profile.phone.trim(),
    city: profile.city.trim(),
    avatar_url: user.user_metadata?.avatar_url || null
  }, { onConflict: 'id' }).select().single();
  if (error) throw new Error(getFriendlyError(error));
  return data;
}

export const COMMUNITY_LISTING_PAGE_SIZE = 24;

export async function getCommunityListings(from = 0, pageSize = COMMUNITY_LISTING_PAGE_SIZE) {
  if (!supabase) return [];
  const { data, error } = await supabase.from('listings').select('*').eq('status', 'published').order('created_at', { ascending: false }).range(from, from + pageSize - 1);
  if (error) throw new Error(getFriendlyError(error));
  const listings = data || [];
  if (!listings.length) return listings;
  const { data: publicProfiles, error: profileError } = await supabase.from('public_profiles').select('id, display_name, username, avatar_url').in('id', listings.map((listing) => listing.seller_id));
  if (profileError) return listings.map((listing) => ({ ...listing, profiles: null }));
  const profiles = new Map((publicProfiles || []).map((profile) => [profile.id, profile]));
  return listings.map((listing) => ({ ...listing, profiles: profiles.get(listing.seller_id) || null }));
}

export function subscribeToListings(onChange) {
  if (!supabase) return null;
  supabase.getChannels()
    .filter((channel) => channel.topic.startsWith('realtime:reloop-listings-live'))
    .forEach((channel) => supabase.removeChannel(channel));
  const channelName = `reloop-listings-live-${Date.now()}`;
  return supabase.channel(channelName).on('postgres_changes', { event: '*', schema: 'public', table: 'listings' }, onChange).subscribe();
}



export async function getBasketItems(user) {
  if (!supabase || !user) return [];
  const { data, error } = await supabase.from('basket_items').select('listing_id,item').eq('user_id', user.id).order('created_at', { ascending: true });
  if (error) throw new Error(getFriendlyError(error));
  return (data || []).map((row) => row.item).filter(Boolean);
}

export async function saveBasketItem(item, user) {
  if (!supabase || !user || !item?.id) return;
  const { error } = await supabase.from('basket_items').upsert({ user_id: user.id, listing_id: String(item.id), item }, { onConflict: 'user_id,listing_id' });
  if (error) throw new Error(getFriendlyError(error));
}

export async function removeBasketItem(listingId, user) {
  if (!supabase || !user || !listingId) return;
  const { error } = await supabase.from('basket_items').delete().eq('user_id', user.id).eq('listing_id', String(listingId));
  if (error) throw new Error(getFriendlyError(error));
}

export async function saveListing(listing, user) {
  if (!supabase || !user) throw new Error('Sign in to save a listing.');
  const payload = {
    seller_id: user.id,
    title: listing.title,
    category: listing.category || 'Other',
    price: Number(listing.price || listing.minPrice || 0),
    min_price: Number(listing.minPrice || listing.price || 0),
    currency: listing.currency === 'NPR' ? 'NPR' : 'USD',
    accepts_any_item: listing.acceptsAnyItem !== false,
    exchange_preference: listing.exchangePreference || 'Buy or exchange',
    description: listing.description || '',
    image_url: listing.imageUrl,
    months_owned: Number(listing.monthsOwned),
    original_price: Number(listing.originalPrice),
    condition: listing.condition,
    quality: listing.quality,
    status: 'published'
  };
  let { data, error } = await supabase.from('listings').insert(payload).select().single();
  if (error && isMissingCurrencyColumn(error)) {
    const { currency, ...legacyPayload } = payload;
    ({ data, error } = await supabase.from('listings').insert(legacyPayload).select().single());
    if (!error) return { ...data, currency: 'USD', currencyFallback: true };
  }
  if (error) throw new Error(getFriendlyError(error));
  return data;
}

async function compressListingImage(file) {
  let bitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    throw new Error('This photo could not be opened. Choose a valid JPG, PNG, or WebP image.');
  }

  try {
    if (!bitmap.width || !bitmap.height || bitmap.width * bitmap.height > 40000000) {
      throw new Error('This photo has too many pixels. Choose a smaller image.');
    }

    const maxDimension = 1600;
    const scale = Math.min(1, maxDimension / Math.max(bitmap.width, bitmap.height));
    let width = Math.max(1, Math.round(bitmap.width * scale));
    let height = Math.max(1, Math.round(bitmap.height * scale));
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Photo compression is unavailable in this browser.');

    while (true) {
      canvas.width = width;
      canvas.height = height;
      context.drawImage(bitmap, 0, 0, width, height);
      const compressed = await new Promise((resolve) => canvas.toBlob(resolve, 'image/webp', 0.76));
      if (!compressed || compressed.type !== 'image/webp') {
        throw new Error('This browser cannot compress photos to WebP. Try a current version of Chrome, Edge, Firefox, or Safari.');
      }
      if (compressed.size <= 1024 * 1024) {
        return new File([compressed], `${crypto.randomUUID()}.webp`, { type: 'image/webp' });
      }

      if (Math.max(width, height) <= 480) {
        throw new Error('This photo could not be compressed below 1 MB. Choose a smaller photo.');
      }
      const downscale = Math.max(480 / Math.max(width, height), 0.8);
      width = Math.max(1, Math.round(width * downscale));
      height = Math.max(1, Math.round(height * downscale));
    }
  } finally {
    bitmap.close();
  }
}

export async function uploadListingImage(file, user) {
  if (!supabase || !user) throw new Error('Sign in before uploading a listing photo.');
  if (!file || !file.type.startsWith('image/')) throw new Error('Choose a real image file.');
  if (file.size > 8 * 1024 * 1024) throw new Error('Listing photos must be smaller than 8 MB.');
  const compressedFile = await compressListingImage(file);
  const path = `${user.id}/${compressedFile.name}`;
  const { error } = await supabase.storage.from('listing-images').upload(path, compressedFile, { cacheControl: '31536000', upsert: false, contentType: compressedFile.type });
  if (error) throw new Error(`Photo upload failed: ${error.message}`);
  const { data } = supabase.storage.from('listing-images').getPublicUrl(path);
  return data.publicUrl;
}

export async function createOffer({ listingId, offerType, cashAmount, itemDescription, message }, user) {
  if (!supabase || !user) throw new Error('Sign in to make an offer.');
  const { data: listing, error: listingError } = await supabase.from('listings').select('seller_id').eq('id', listingId).single();
  if (listingError) throw listingError;
  if (listing.seller_id === user.id) throw new Error('You cannot make an offer on your own listing.');
  const { data, error } = await supabase.from('offers').insert({
    listing_id: listingId,
    proposer_id: user.id,
    recipient_id: listing.seller_id,
    offer_type: offerType,
    cash_amount: Number(cashAmount || 0),
    item_description: itemDescription || '',
    message: message || ''
  }).select('*').single();
  if (error) throw new Error(getFriendlyError(error));
  return data;
}

export async function deleteListing(listingId, user) { if (!supabase || !user) throw new Error('Sign in to delete a listing.'); const { error } = await supabase.from('listings').delete().eq('id', listingId).eq('seller_id', user.id); if (error) throw new Error(getFriendlyError(error)); }
export async function getListingComments(listingId) { if (!supabase || !listingId) return []; const { data, error } = await supabase.from('listing_comments').select('*').eq('listing_id', listingId).order('created_at', { ascending: true }); if (error) throw new Error(getFriendlyError(error)); return data || []; }
export async function addListingComment({ listingId, body }, user) { if (!supabase || !user) throw new Error('Sign in to comment.'); const { data, error } = await supabase.from('listing_comments').insert({ listing_id: listingId, author_id: user.id, body: body.trim() }).select().single(); if (error) throw new Error(getFriendlyError(error)); return data; }
export async function updateListing(listingId, changes, user) { if (!supabase || !user) throw new Error('Sign in to update a listing.'); let { data, error } = await supabase.from('listings').update(changes).eq('id', listingId).eq('seller_id', user.id).select().single(); if (error && isMissingCurrencyColumn(error)) { const { currency, ...legacyChanges } = changes; ({ data, error } = await supabase.from('listings').update(legacyChanges).eq('id', listingId).eq('seller_id', user.id).select().single()); if (!error) return { ...data, currency: 'USD', currencyFallback: true }; } if (error) throw new Error(getFriendlyError(error)); return data; }
export async function sendDirectMessage({ recipientId, listingId, body }, user) { if (!supabase || !user) throw new Error('Sign in to message this member.'); if (!recipientId || String(recipientId) === String(user.id)) throw new Error('You cannot send a private message to yourself. Buyers can message you from your listing.'); if (!body.trim()) throw new Error('Write a message first.'); const { data, error } = await supabase.from('messages').insert({ sender_id: user.id, recipient_id: recipientId, listing_id: listingId || null, body: body.trim() }).select().single(); if (error) throw new Error(getFriendlyError(error)); return data; }

export async function getDirectMessages(user) {
  if (!supabase || !user) return [];
  const { data, error } = await supabase
    .from('messages')
    .select('id,listing_id,sender_id,recipient_id,body,is_read,message_type,created_at')
    .or(`sender_id.eq.${user.id},recipient_id.eq.${user.id}`)
    .order('created_at', { ascending: false });
  if (error) throw new Error(getFriendlyError(error));
  return data || [];
}

export async function getPublicProfile(userId) { if (!supabase || !userId) return null; const { data, error } = await supabase.from('public_profiles').select('id,display_name,username,avatar_url').eq('id', userId).maybeSingle(); if (error) throw new Error(getFriendlyError(error)); return data; }
