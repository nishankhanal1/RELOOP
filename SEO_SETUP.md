# Technical SEO setup

Reloop is a Vite 8 + React 19 single-page marketplace. Its only public, crawlable URL is the homepage, `/`. Basket, inbox, offer, chat, account, profile-setup and listing-detail screens are client-side UI states rather than separate URLs, and they remain private or noindex as appropriate.

## What ships in the build

- A unique homepage title and meta description, canonical URL, Open Graph tags and Twitter card tags.
- Organization / OnlineMarketplace, WebSite and WebPage JSON-LD with absolute URLs.
- `robots.txt` that allows the public site and points to the absolute sitemap URL.
- `sitemap.xml` containing every public, crawlable URL. Today that is only the homepage; private state is deliberately excluded.
- A 1200 × 630 social image at `public/og-image.jpg` and a 512 × 512 organization logo at `public/reloop-logo.png`.
- A build-time SEO check that fails the build if required metadata, JSON-LD, robots.txt, sitemap.xml or referenced local assets are missing or inconsistent.

The page-level metadata is defined once in `seo.config.js`, injected into static HTML by `vite.config.js`, and kept in sync at runtime by `site-seo.js`. The cart view receives a unique `noindex, nofollow` title; returning to the marketplace restores the indexable homepage metadata.

## Before deploying

Set these variables in Vercel → Project Settings → Environment Variables (Production):

1. `VITE_SITE_URL` — the exact HTTPS origin, for example `https://reloop-iota-blue.vercel.app`. A trailing slash is accepted; a path, query or hash is not. This controls the canonical URL, Open Graph URL, sitemap and robots sitemap line. If it is omitted on Vercel, the build falls back to `VERCEL_PROJECT_PRODUCTION_URL`; the final fallback is the current production URL in `seo.config.js`.
2. `VITE_GOOGLE_SITE_VERIFICATION` — the content token from Google Search Console's **HTML tag** verification method. The token for the currently verified property is kept as a fallback, so a deploy without this variable does not silently lose verification; set the variable to replace it.
3. Optional: `VITE_BING_SITE_VERIFICATION` for Bing Webmaster Tools (`msvalidate.01`).
4. Optional: `VITE_GA4_ID` for consent-based Google Analytics 4. Analytics still loads only after a visitor chooses **Accept analytics**.

`VITE_SITE_URL` is validated. A non-HTTPS URL, a URL with a path/query/hash, or a malformed value fails the production build rather than publishing a bad canonical.

## Build and verify locally

```bash
npm ci
npm run build
npm run seo:check
npm run preview
```

Then open these locally:

- `/` — inspect the `<head>` and confirm the canonical, robots meta, Open Graph, Twitter and JSON-LD tags.
- `/robots.txt` — must contain `Allow: /` and the absolute `Sitemap:` line.
- `/sitemap.xml` — must contain the absolute homepage URL.
- `/og-image.jpg` and `/reloop-logo.png` — must return HTTP 200.

The build runs the same checks automatically, so a deployment with missing or duplicate metadata fails before it reaches production.

## Google Search Console

1. Deploy the updated build.
2. Confirm `https://reloop-iota-blue.vercel.app/robots.txt` and `https://reloop-iota-blue.vercel.app/sitemap.xml` return HTTP 200 with the production origin.
3. In Google Search Console, add a **URL-prefix** property for the exact origin, or a **Domain** property if you control DNS.
4. Choose **HTML tag** verification, copy only the token from the supplied meta tag into `VITE_GOOGLE_SITE_VERIFICATION`, and redeploy.
5. Return to Search Console and click **Verify**. The verification tag is injected into the built homepage.
6. Open **Indexing → Sitemaps**, submit `https://reloop-iota-blue.vercel.app/sitemap.xml`, and confirm Google can fetch it.
7. Use **URL Inspection** on `https://reloop-iota-blue.vercel.app/` and choose **Request indexing** if you want to prompt a recrawl. This is a request, not a guarantee; indexing and ranking depend on Google's crawl, quality and policy decisions.

## Indexing scope and limits

- Only the homepage is public and crawlable. The sitemap must not include cart, account, inbox, offers, chat, profile setup, seller profile, or listing-detail modal states.
- Marketplace listings currently have no stable public detail URLs. Their titles, descriptions, images and Product/Offer structured data cannot become individual search results until public listing routes exist. Do not add them to the sitemap before those routes exist.
- The React app is client-rendered. Google can render JavaScript, but initial HTML contains only the app shell. Adding prerendering or public listing routes would improve crawl efficiency and long-tail discovery; it is outside this metadata pass.
- Search Console verification, sitemap submission, indexing requests, backlinks and content publishing require the domain owner's Google account and cannot be completed from this repository.
- No SEO implementation guarantees indexing or rankings. Avoid publishing thin keyword pages; add genuinely useful buying, care, reuse and local-community content as the marketplace grows.
