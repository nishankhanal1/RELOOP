# Reloop

Reloop is a plain-local second-hand marketplace prototype for buying, exchanging, and messaging around useful goods.

## Run locally

```bash
npm ci
npm run dev
```

The app uses Supabase for authentication, listings, profiles, baskets, offers, and messages. Add the Supabase project URL and publishable key to `.env.local` using `.env.example`.

## Supabase authentication and datastore

The app includes Google OAuth through Supabase Auth plus persistence helpers for profiles, listings, and messages.

1. Create or open your Supabase project.
2. Run `supabase-marketplace-schema.sql` in the Supabase SQL Editor.
3. In **Authentication → Providers → Google**, enable Google and add the Supabase callback URL shown in the provider settings.
4. Add the project URL and public anon key to `.env.local` using `.env.example`.
5. Restart `npm run dev`.

The browser only uses the public anon key. Never place a Supabase service-role key in this frontend.

### Supabase schema and migrations

The SQL files are kept in the project root and use purpose-based names:

- `supabase-marketplace-schema.sql` — base marketplace schema.
- `supabase-migration-account-basket-sync.sql` — account-synced basket items.
- `supabase-migration-listing-comments-and-direct-messages.sql` — listing comments and private messages.
- `supabase-migration-listing-currency.sql` — USD and NPR listing currencies.
- `supabase-migration-escrow-status-notifications.sql` — accepted-trade status and notification history.
- `supabase-migration-listing-details-and-history.sql` — listing photos, ownership history, condition, and quality.
- `supabase-migration-live-security-remediation.sql` — security remediation for the live project.
- `supabase-migration-offer-negotiation-engine.sql` — offer status and negotiation/chat fields.
- `supabase-migration-listing-offers.sql` — listing offer fields and table.
- `supabase-migration-privacy-and-realtime-policies.sql` — privacy policies and Realtime setup.
- `supabase-migration-member-profile-details.sql` — member username, phone, and city fields.
- `supabase-migration-seller-ratings-and-deletion.sql` — seller ratings and related deletion policies.
- `supabase-migration-realtime-offers.sql` — indexes and Realtime support for offers.
- `supabase-migration-profile-privacy-security.sql` — profile privacy and related security policies.

Run only the migrations needed by the project, and follow any prerequisite notes at the top of each SQL file.

### Security hardening migration

Run `supabase-migration-security-final.sql` after the other database migrations. It removes broad client access to private tables, keeps public listing data intentionally public, and prevents users from reading or changing another user's private records. Test the result with two separate accounts.

## Permanent external hosting

This project is prepared for Vercel, Netlify, and compatible static hosts.

### Vercel

1. Push this project to a private GitHub repository.
2. Import the repository into Vercel.
3. Vercel will use `vercel.json`, run `npm run build`, and publish `dist`.
4. Add these production environment variables in Vercel:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - `VITE_SITE_URL` (the exact HTTPS production origin, required for sitemap and canonical SEO metadata)
   - `VITE_GA4_ID` (optional; leave unset unless analytics consent tracking is configured)
5. Add the final Vercel domain to Supabase Auth → URL Configuration → Site URL and Redirect URLs.
6. In Supabase Storage, confirm the `listing-images` bucket and its RLS/storage policies are enabled before accepting uploads.

For CLI deployment, install and authenticate the Vercel CLI, then run `vercel` for a preview or `vercel --prod` for production from this project directory. Never pass secrets as command-line arguments; configure them in Vercel Project Settings → Environment Variables.

### Netlify

Import the same repository into Netlify. `netlify.toml` configures the build and SPA fallback. Add the same `VITE_*` environment variables in Site configuration → Environment variables.

The local `.env.local` file is ignored and is not included in deployment. Only the public Supabase anon/publishable key belongs in the browser; never deploy a Supabase service-role key.
