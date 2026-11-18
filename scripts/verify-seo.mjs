import { access, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import {
  HOME_DESCRIPTION,
  HOME_TITLE,
  buildHomeSeo,
  buildPageSeo,
} from '../seo.config.js';
import { PUBLIC_PAGES } from '../site-pages-content.js';

const distDir = resolve('dist');
const errors = [];
const warnings = [];

const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const decodeHtml = (value) => value
  .replace(/&amp;/g, '&')
  .replace(/&quot;/g, '"')
  .replace(/&#39;/g, "'")
  .replace(/&lt;/g, '<')
  .replace(/&gt;/g, '>');

function assert(condition, message) {
  if (!condition) errors.push(message);
}

function getMetaValues(html, attribute, key) {
  const regex = new RegExp(`<meta\\b[^>]*\\b${attribute}=["']${escapeRegExp(key)}["'][^>]*>`, 'gi');
  return [...html.matchAll(regex)].map((match) => {
    const content = match[0].match(/\bcontent=["']([^"']*)["']/i);
    return content ? decodeHtml(content[1]) : '';
  });
}

function getLinkHrefs(html, rel) {
  const regex = new RegExp(`<link\\b[^>]*\\brel=["']${escapeRegExp(rel)}["'][^>]*>`, 'gi');
  return [...html.matchAll(regex)].map((match) => {
    const href = match[0].match(/\bhref=["']([^"']*)["']/i);
    return href ? decodeHtml(href[1]) : '';
  });
}

function assertSingleMeta(html, attribute, key, label, expected) {
  const values = getMetaValues(html, attribute, key);
  assert(values.length === 1, `${label} must appear exactly once (found ${values.length}).`);
  if (expected !== undefined) {
    assert(values[0] === expected, `${label} should be "${expected}" (found "${values[0] || ''}").`);
  }
  return values[0] || '';
}

function assertSingleLink(html, rel, label, expected) {
  const values = getLinkHrefs(html, rel);
  assert(values.length === 1, `${label} must appear exactly once (found ${values.length}).`);
  if (expected !== undefined) {
    assert(values[0] === expected, `${label} should be "${expected}" (found "${values[0] || ''}").`);
  }
  return values[0] || '';
}

function getNoscriptH1(html) {
  const block = html.match(/<!-- SEO_NOSCRIPT_START -->([\s\S]*?)<!-- SEO_NOSCRIPT_END -->/i);
  if (!block) return { found: false, text: '' };
  const heading = block[1].match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/i);
  return { found: Boolean(heading), text: heading ? decodeHtml(heading[1].replace(/<[^>]+>/g, '').trim()) : '' };
}

let homeHtml;
try {
  homeHtml = await readFile(resolve(distDir, 'index.html'), 'utf8');
} catch {
  console.error('dist/index.html was not found. Run npm run build before npm run seo:check.');
  process.exit(1);
}

const canonical = (() => {
  const values = getLinkHrefs(homeHtml, 'canonical');
  return values.length === 1 ? values[0] : '';
})();

let origin = '';
try {
  const parsed = new URL(canonical);
  assert(parsed.protocol === 'https:', 'Canonical URL must use HTTPS.');
  assert(!parsed.search && !parsed.hash, 'Canonical URL must not contain a query or fragment.');
  origin = parsed.origin;
} catch {
  errors.push(`Canonical URL is not a valid absolute URL: "${canonical}".`);
}

if (!origin) {
  console.error('SEO verification failed: the homepage canonical origin could not be determined.');
  process.exit(1);
}

const pages = [
  {
    key: 'home',
    file: 'index.html',
    path: '/',
    title: HOME_TITLE,
    heading: HOME_TITLE,
    seo: buildHomeSeo(origin),
    isHome: true,
  },
  ...Object.entries(PUBLIC_PAGES).map(([key, page]) => ({
    key,
    file: `${page.path.replace(/^\//, '')}/index.html`,
    path: page.path,
    title: page.title,
    heading: page.heading,
    seo: buildPageSeo(key, origin),
    isHome: false,
  })),
];

for (const page of pages) {
  const label = page.isHome ? 'Homepage' : page.path;
  let html;
  try {
    html = await readFile(resolve(distDir, page.file), 'utf8');
  } catch {
    errors.push(`${label}: built page is missing at dist/${page.file}.`);
    continue;
  }

  assert(!html.includes('__SITE_ORIGIN__'), `${label}: built HTML still contains the __SITE_ORIGIN__ placeholder.`);
  assert(/<html\b[^>]*\blang=["']en["']/i.test(html), `${label}: the html element must declare lang="en".`);

  const titles = [...html.matchAll(/<title\b[^>]*>([\s\S]*?)<\/title>/gi)].map((match) => decodeHtml(match[1].trim()));
  assert(titles.length === 1, `${label}: the document must contain exactly one title element (found ${titles.length}).`);
  assert(titles[0] === page.title, `${label}: title should be "${page.title}" (found "${titles[0] || ''}").`);
  if (titles[0]) {
    if (titles[0].length > 65) warnings.push(`${label}: title is ${titles[0].length} characters; keep it under about 65 for search results.`);
    if (titles[0].length < 20) warnings.push(`${label}: title is only ${titles[0].length} characters; consider making it more descriptive.`);
  }

  const description = assertSingleMeta(html, 'name', 'description', `${label}: meta description`, page.seo.description);
  if (description) {
    if (description.length > 165) warnings.push(`${label}: meta description is ${description.length} characters; search engines may truncate it.`);
    if (description.length < 80) warnings.push(`${label}: meta description is only ${description.length} characters; consider making it more useful.`);
  }

  const robots = assertSingleMeta(html, 'name', 'robots', `${label}: robots meta`);
  assert(/\bindex\b/i.test(robots), `${label}: robots meta must allow indexing.`);
  assert(/\bfollow\b/i.test(robots), `${label}: robots meta must allow link following.`);
  assert(!/\bnoindex\b/i.test(robots), `${label}: robots meta must not contain noindex.`);

  const pageCanonical = assertSingleLink(html, 'canonical', `${label}: canonical URL`, page.seo.canonical);
  try {
    const parsed = new URL(pageCanonical);
    assert(parsed.protocol === 'https:', `${label}: canonical URL must use HTTPS.`);
    assert(parsed.origin === origin, `${label}: canonical URL must use the same origin as the homepage.`);
    assert(!parsed.search && !parsed.hash, `${label}: canonical URL must not contain a query or fragment.`);
  } catch {
    errors.push(`${label}: canonical URL is not a valid absolute URL: "${pageCanonical}".`);
  }

  assertSingleMeta(html, 'property', 'og:type', `${label}: og:type`, 'website');
  assertSingleMeta(html, 'property', 'og:site_name', `${label}: og:site_name`, 'Reloop');
  assertSingleMeta(html, 'property', 'og:locale', `${label}: og:locale`, 'en_US');
  assertSingleMeta(html, 'property', 'og:title', `${label}: og:title`, page.title);
  assertSingleMeta(html, 'property', 'og:description', `${label}: og:description`, page.seo.description);
  assertSingleMeta(html, 'property', 'og:url', `${label}: og:url`, page.seo.canonical);
  assertSingleMeta(html, 'property', 'og:image', `${label}: og:image`, `${origin}/og-image.jpg`);
  assertSingleMeta(html, 'property', 'og:image:type', `${label}: og:image:type`, 'image/jpeg');
  assertSingleMeta(html, 'property', 'og:image:width', `${label}: og:image:width`, '1200');
  assertSingleMeta(html, 'property', 'og:image:height', `${label}: og:image:height`, '630');
  assertSingleMeta(html, 'property', 'og:image:alt', `${label}: og:image:alt`);
  assertSingleMeta(html, 'name', 'twitter:card', `${label}: twitter:card`, 'summary_large_image');
  assertSingleMeta(html, 'name', 'twitter:title', `${label}: twitter:title`, page.title);
  assertSingleMeta(html, 'name', 'twitter:description', `${label}: twitter:description`, page.seo.description);
  assertSingleMeta(html, 'name', 'twitter:image', `${label}: twitter:image`, `${origin}/og-image.jpg`);
  assertSingleMeta(html, 'name', 'twitter:image:alt', `${label}: twitter:image:alt`);
  assertSingleMeta(html, 'name', 'application-name', `${label}: application-name`, 'Reloop');
  assertSingleMeta(html, 'name', 'google-site-verification', `${label}: Google Search Console verification meta`);

  const sitemapLinks = getLinkHrefs(html, 'sitemap');
  assert(sitemapLinks.length === 1, `${label}: sitemap link must appear exactly once (found ${sitemapLinks.length}).`);
  if (sitemapLinks[0]) {
    assert(sitemapLinks[0] === `${origin}/sitemap.xml`, `${label}: sitemap link should point to ${origin}/sitemap.xml.`);
  }

  const hreflangLinks = getLinkHrefs(html, 'alternate');
  const hreflangValues = [...html.matchAll(/<link\b[^>]*\brel=["']alternate["'][^>]*>/gi)].map((match) => {
    const href = match[0].match(/\bhref=["']([^"']*)["']/i);
    return href ? decodeHtml(href[1]) : '';
  }).filter(Boolean);
  assert(hreflangLinks.length === 2, `${label}: expected two hreflang alternates (found ${hreflangLinks.length}).`);
  assert(hreflangValues.every((href) => href === page.seo.canonical), `${label}: hreflang alternates must point to the canonical URL.`);

  const structuredDataMatches = [...html.matchAll(/<script\b[^>]*id=["']reloop-structured-data["'][^>]*>([\s\S]*?)<\/script>/gi)];
  assert(structuredDataMatches.length === 1, `${label}: the reloop-structured-data JSON-LD script must appear exactly once (found ${structuredDataMatches.length}).`);
  if (structuredDataMatches[0]) {
    try {
      const data = JSON.parse(structuredDataMatches[0][1]);
      const graph = Array.isArray(data['@graph']) ? data['@graph'] : [];
      const types = graph.flatMap((node) => Array.isArray(node['@type']) ? node['@type'] : [node['@type']]);
      assert(data['@context'] === 'https://schema.org', `${label}: JSON-LD must use the https://schema.org context.`);
      for (const type of ['Organization', 'OnlineMarketplace', 'WebSite', 'WebPage']) {
        assert(types.includes(type), `${label}: JSON-LD is missing the ${type} type.`);
      }
      if (!page.isHome) {
        assert(types.includes('BreadcrumbList'), `${label}: JSON-LD is missing the BreadcrumbList type.`);
      }
      assert(graph.some((node) => node.logo?.url === `${origin}/reloop-logo.png`), `${label}: Organization logo URL is missing or incorrect.`);
      assert(graph.some((node) => node.url === `${origin}/`), `${label}: JSON-LD home URL is missing or incorrect.`);
      assert(graph.some((node) => node.url === page.seo.canonical), `${label}: JSON-LD page URL is missing or incorrect.`);
      if (!page.isHome) {
        const breadcrumb = graph.find((node) => node['@type'] === 'BreadcrumbList');
        assert(Boolean(breadcrumb), `${label}: BreadcrumbList node is missing.`);
        if (breadcrumb) {
          assert(Array.isArray(breadcrumb.itemListElement) && breadcrumb.itemListElement.length === 2, `${label}: BreadcrumbList must contain two items.`);
          assert(breadcrumb.itemListElement[1]?.item === page.seo.canonical, `${label}: BreadcrumbList final item must point to the page canonical.`);
        }
      }
    } catch (error) {
      errors.push(`${label}: JSON-LD is not valid JSON: ${error.message}`);
    }
  }

  const noscriptHeading = getNoscriptH1(html);
  assert(noscriptHeading.found, `${label}: the noscript fallback must contain an h1.`);
  assert(noscriptHeading.text === page.heading, `${label}: noscript h1 should be "${page.heading}" (found "${noscriptHeading.text}").`);

  const internalReferences = new Set();
  for (const match of html.matchAll(/\b(?:src|href)=["']([^"']+)["']/gi)) {
    const value = decodeHtml(match[1]).trim();
    if (!value.startsWith('/') || value.startsWith('//')) continue;
    internalReferences.add(value.split(/[?#]/)[0]);
  }
  for (const reference of internalReferences) {
    try {
      await access(resolve(distDir, `.${reference}`));
    } catch {
      errors.push(`${label}: internal reference points to a missing built file: ${reference}`);
    }
  }
}

for (const path of ['/og-image.jpg', '/reloop-logo.png', '/forest-door.jpg', '/site-icon.jpg', '/robots.txt', '/sitemap.xml']) {
  try {
    await access(resolve(distDir, `.${path}`));
  } catch {
    errors.push(`Built asset is missing: ${path}`);
  }
}

let sitemap = '';
try {
  sitemap = await readFile(resolve(distDir, 'sitemap.xml'), 'utf8');
} catch {
  errors.push('dist/sitemap.xml is missing.');
}
if (sitemap) {
  assert(sitemap.startsWith('<?xml version="1.0" encoding="UTF-8"?>'), 'Sitemap must start with the XML declaration.');
  assert(sitemap.includes('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'), 'Sitemap must use the sitemaps.org 0.9 namespace.');
  assert(sitemap.includes('</urlset>'), 'Sitemap is not closed correctly.');
  const locations = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => decodeHtml(match[1]));
  const expectedLocations = pages.map((page) => page.seo.canonical);
  assert(locations.length === expectedLocations.length, `Sitemap should contain ${expectedLocations.length} URLs (found ${locations.length}).`);
  assert(new Set(locations).size === locations.length, 'Sitemap contains duplicate URLs.');
  for (const location of expectedLocations) {
    assert(locations.includes(location), `Sitemap must include ${location}.`);
  }
  assert(locations.every((location) => /^https:\/\//.test(location)), 'Every sitemap URL must use HTTPS.');
  assert(locations.every((location) => location.startsWith(`${origin}/`)), 'Every sitemap URL must use the production origin.');
  for (const privatePath of ['/cart', '/account', '/inbox', '/chat', '/offer', '/profile', '/login', '/checkout']) {
    assert(!locations.some((location) => new URL(location).pathname === privatePath), `Sitemap must not include the private path ${privatePath}.`);
  }
  assert(!sitemap.includes('noindex'), 'Sitemap must not contain noindex content.');
}

let robotsFile = '';
try {
  robotsFile = await readFile(resolve(distDir, 'robots.txt'), 'utf8');
} catch {
  errors.push('dist/robots.txt is missing.');
}
if (robotsFile) {
  assert(/^User-agent:\s*\*$/im.test(robotsFile), 'robots.txt must contain a User-agent: * block.');
  assert(/^Allow:\s*\/$/im.test(robotsFile), 'robots.txt must allow the public site.');
  assert(!/^Disallow:\s*\/\s*$/im.test(robotsFile), 'robots.txt must not block the entire site.');
  assert(robotsFile.includes(`Sitemap: ${origin}/sitemap.xml`), 'robots.txt must point to the absolute sitemap URL.');
}

if (warnings.length) {
  console.warn('SEO warnings:');
  warnings.forEach((warning) => console.warn(`- ${warning}`));
}

if (errors.length) {
  console.error('SEO verification failed:');
  errors.forEach((error) => console.error(`- ${error}`));
  process.exit(1);
}

console.log(`SEO verification passed for ${origin}.`);
console.log(`- Pages checked: ${pages.length}`);
console.log(`- Sitemap URLs: ${pages.length}`);
console.log(`- Canonical: ${canonical}`);
console.log('- Metadata, social cards, JSON-LD, robots.txt and sitemap.xml are present and consistent.');
