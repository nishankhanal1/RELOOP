# Website quality audit and fixes

This is a source-code audit, not a live Lighthouse, screen-reader, or production traffic audit. The fixes below address issues visible in this repository. The production URL and Google account actions still need the site owner.

## Fixed in this pass

| Priority | Finding | Change |
| --- | --- | --- |
| High | A full-screen entrance blocked browsing, intercepted scroll input, and forced a 2.1 MB video download. | Removed the gate and unused entrance video. The homepage is usable immediately. |
| High | The homepage eagerly fetched a large remote background video and a 774 KB poster image. | Replaced the poster with a 50 KB, 1000 px JPEG (about 93% smaller); the hero video now loads during idle time and is skipped for reduced-motion, data-saver, and 2G connections. Removed two blocking third-party font stylesheets and use the declared system-font fallbacks. |
| High | Listing reads had no limit and fetched every published row before showing the feed. | Added 24-item database pagination, an explicit Load more control, and a short debounce for realtime refreshes. |
| Medium | Off-screen sections repeatedly animated on every scroll, and the typewriter ignored reduced-motion preferences. | Reveal elements animate once; reduced-motion users get the full copy immediately and no hero video. |
| Medium | The JavaScript build exceeded the single-chunk warning threshold. | Split application and dependency code into separately cacheable files using Vite/Rolldown's supported code-splitting configuration. |
| Medium | Removing a previously configured production URL could leave an outdated generated sitemap behind. | The build script now marks its own sitemap output and removes only that generated file when the origin is unset; custom sitemap files are preserved. |
| Medium | The collapsed mobile menu could leave hidden buttons in keyboard navigation. | Made the hidden menu inert. Modal close now restores keyboard focus to its opener. |
| Medium | Missing Supabase configuration looked like an empty new marketplace; retrying errors reloaded the whole page. | Added an accurate setup state and an in-app feed retry. |
| Medium | The privacy banner offered analytics acceptance even when no GA4 ID was configured. | The copy and button now reflect whether analytics is configured. |

## Remaining work, in order

1. Set `VITE_SITE_URL` to the actual HTTPS production origin, rebuild, and verify the generated sitemap and robots file on the public domain.
2. Run Lighthouse/PageSpeed on the deployed homepage at mobile and desktop sizes. Check LCP, INP, CLS, console errors, and the Supabase feed on a real network. The first-load JavaScript is now split into a 78 KB app entry and a 433 KB vendor chunk (about 145 KB gzipped combined); profile it before removing dependencies or splitting more code.
3. Marketplace listings do not have public, crawlable detail URLs; they are currently loaded into one client-rendered page. If listing search traffic matters, add stable public listing routes and server/prerendered title, description, image, canonical URL, and Product/Offer structured data, while keeping private account actions protected.
4. Search Console verification, sitemap submission/indexing requests, backlink outreach, and publishing new editorial content need the production domain and site-owner accounts/work. Keep any guides original and useful.
5. Test keyboard-only navigation, screen-reader dialogs, small screens, slow connections, and reduced-motion behavior on the deployed build. This repository has no automated browser or accessibility test setup.

## Build-time note

`npm run build` succeeds locally. Without a configured production origin it intentionally does not emit `sitemap.xml`; see [SEO_SETUP.md](SEO_SETUP.md). A successful compile does not establish a Core Web Vitals score.

## Verification performed

- Production builds passed with and without a configured domain; the final workspace build is the unconfigured local build.
- With a temporary test origin, the generated XML parsed successfully and the preview served `sitemap.xml`, `robots.txt`, canonical metadata, absolute Open Graph image URL, and valid JSON-LD. The temporary origin was removed afterward.
- The preview returned HTTP 200 for the homepage, generated JS/CSS, hero image, favicon, and `robots.txt`.
- Invalid HTTP origins were rejected. Vercel JSON and configured Vercel/Netlify headers were checked.
- No Playwright, Puppeteer, Selenium, or browser app is installed in this workspace, so live UI, keyboard, network throttling, screen-reader, and console checks could not be run. No Supabase live credentials or production Google Analytics/Search Console setup was exercised.
