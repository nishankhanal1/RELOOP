# Technical SEO setup

Reloop is a Vite 8 + React 19 marketplace with six public, crawlable pages: `/`, `/how-it-works`, `/sell`, `/exchange`, `/secondhand` and `/about`. Each page is generated as static HTML with its own title, description, canonical URL and structured data, so search engines can discover its content without first rendering the marketplace app. Basket, inbox, offer, chat, account, profile-setup and listing-detail screens are client-side UI states rather than separate public URLs, and they remain private or noindex as appropriate.

## What ships in the build

- Unique titles, meta descriptions, canonical URLs, Open Graph tags and Twitter cards for the homepage and five supporting pages.
- Organization / OnlineMarketplace, WebSite, WebPage and breadcrumb JSON-LD with absolute URLs.
- `robots.txt` that allows the public site and points to the absolute sitemap URL.
- `sitemap.xml` containing all six public URLs; private app states are deliberately excluded.
- A 1200 × 630 social image at `public/og-image.jpg` and a 512 × 512 organization logo at `public/reloop-logo.png`.
- A build-time SEO check that fails the build if required metadata, JSON-LD, robots.txt, sitemap.xml or referenced local assets are missing or inconsistent.

The page content and metadata are defined in `site-pages-content.js` and `seo.config.js`, injected into static HTML during the build, and kept in sync at runtime by `site-seo.js`. The cart view receives a unique `noindex, nofollow` title; returning to the marketplace restores the indexable homepage metadata.

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
2. Confirm `https://reloop-iota-blue.vercel.app/robots.txt` and `https://reloop-iota-blue.vercel.app/sitemap.xml` return HTTP 200 and that the sitemap URLs use the production origin. Replace this example origin if `VITE_SITE_URL` is set to a custom domain.
3. In [Google Search Console](https://search.google.com/search-console), add a **URL-prefix** property for the exact HTTPS site URL, or a **Domain** property if you control its DNS.
4. Choose **HTML tag** verification and publish the token in Vercel as `VITE_GOOGLE_SITE_VERIFICATION`. A token is currently configured as a fallback; use the token shown for the property you add if it differs.
5. Deploy, then return to Search Console and click **Verify**. The build injects the verification tag into every generated page.
6. Open **Indexing → Sitemaps**, submit `https://reloop-iota-blue.vercel.app/sitemap.xml` (with your actual production origin), and confirm Google can fetch it.
7. Use **URL Inspection** for the homepage and each public page: `/how-it-works`, `/sell`, `/exchange`, `/secondhand` and `/about`. If a page is eligible but not yet indexed, use **Request indexing**. This requests a recrawl; it does not guarantee indexing or a ranking.
8. Check **Indexing → Pages** and **Performance → Search results** periodically for crawl/indexing issues, impressions, clicks and queries. Keep page text useful and accurate; do not repeat keywords unnaturally.

## Indexing scope and limits

- The six public pages are crawlable. The sitemap must not include cart, account, inbox, offers, chat, profile setup, seller profile, or listing-detail modal states.
- Marketplace listings currently have no stable public detail URLs. Their titles, descriptions, images and Product/Offer structured data cannot become individual search results until public listing routes exist. Do not add them to the sitemap before those routes exist.
- Search Console verification, sitemap submission, indexing requests and performance reports require access to the site's Google account. Repository changes cannot sign in to or manage that account.
- No SEO implementation can guarantee first place for “Reloop,” “exchange” or any other search. Search Console helps monitor crawling and search performance; rankings depend on Google's systems, competition, location and the usefulness and reputation of the site. Avoid thin keyword pages; add genuinely useful buying, care, reuse and local-community content as the marketplace grows.
