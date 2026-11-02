# Search and analytics setup

The site now ships a focused homepage title and description, social sharing tags, a semantic H1, canonical metadata, Organization/WebSite JSON-LD, `robots.txt`, and a one-page sitemap. Vite emits the sitemap during production builds only when the canonical production origin is configured.

## Before deploying

1. Set `VITE_SITE_URL` to the exact HTTPS origin used by the public site, with no path (for example, `https://www.example.com`). This generates `public/sitemap.xml` and adds its absolute URL to `robots.txt`.
2. Optionally set `VITE_GA4_ID` to the site's GA4 measurement ID. The app loads Google Analytics only after a visitor selects **Accept analytics**. **Essential only** prevents the analytics script from loading. Keep the privacy notice aligned with your jurisdiction and current analytics settings.
3. Deploy the build, then open `/robots.txt` and `/sitemap.xml` on the public domain to confirm both files are served.
4. Verify the public domain in Google Search Console using the site's chosen verification method. Submit the public sitemap URL there and inspect the homepage for crawl/indexing issues.

Google Search Console verification, sitemap submission/indexing requests, backlinks, and ongoing editorial publishing require the domain owner or an authenticated Google account. They cannot be completed from this source tree. Add genuinely useful, original buying, care, reuse, and local-community guides as the marketplace grows; do not publish thin keyword pages.

## Current indexing scope

Only the public homepage is included in the sitemap. Basket state, sign-in, messaging, offers, and account views are private or client-side UI states and should not be indexed. Marketplace listings are loaded after the app starts and do not have public, crawlable detail URLs yet, so their title, description, and structured data cannot be exposed as individual search results until public listing pages are built.
