import { access, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

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

function countMatches(html, regex) {
  return [...html.matchAll(regex)].length;
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

function assertSingleLink(html, rel, label) {
  const values = getLinkHrefs(html, rel);
  assert(values.length === 1, `${label} must appear exactly once (found ${values.length}).`);
  return values[0] || '';
}

let html;
try {
  html = await readFile(resolve(distDir, 'index.html'), 'utf8');
} catch {
  console.error('dist/index.html was not found. Run npm run build before npm run seo:check.');
  process.exit(1);
}

assert(!html.includes('__SITE_ORIGIN__'), 'Built HTML still contains the __SITE_ORIGIN__ placeholder.');
assert(/<html\b[^>]*\blang=["']en["']/i.test(html), 'The html element must declare lang="en".');

const titles = [...html.matchAll(/<title\b[^>]*>([\s\S]*?)<\/title>/gi)].map((match) => decodeHtml(match[1].trim()));
assert(titles.length === 1, `The document must contain exactly one title element (found ${titles.length}).`);
assert(Boolean(titles[0]), 'The title must not be empty.');
if (titles[0]) {
  if (titles[0].length > 65) warnings.push(`Title is ${titles[0].length} characters; keep it under about 65 for search results.`);
  if (titles[0].length < 20) warnings.push(`Title is only ${titles[0].length} characters; consider making it more descriptive.`);
}

const description = assertSingleMeta(html, 'name', 'description', 'Meta description');
if (description) {
  if (description.length > 165) warnings.push(`Meta description is ${description.length} characters; search engines may truncate it.`);
  if (description.length < 80) warnings.push(`Meta description is only ${description.length} characters; consider making it more useful.`);
}

const robots = assertSingleMeta(html, 'name', 'robots', 'Robots meta');
assert(/\bindex\b/i.test(robots), 'The homepage robots meta must allow indexing.');
assert(/\bfollow\b/i.test(robots), 'The homepage robots meta must allow link following.');
assert(!/\bnoindex\b/i.test(robots), 'The homepage robots meta must not contain noindex.');

const canonical = assertSingleLink(html, 'canonical', 'Canonical URL');
let origin = '';
try {
  const parsed = new URL(canonical);
  assert(parsed.protocol === 'https:', 'Canonical URL must use HTTPS.');
  assert(parsed.pathname === '/', 'Canonical URL must point to the site root.');
  assert(!parsed.search && !parsed.hash, 'Canonical URL must not contain a query or fragment.');
  origin = parsed.origin;
} catch {
  errors.push(`Canonical URL is not a valid absolute URL: "${canonical}".`);
}

assertSingleMeta(html, 'property', 'og:type', 'og:type', 'website');
assertSingleMeta(html, 'property', 'og:site_name', 'og:site_name', 'Reloop');
assertSingleMeta(html, 'property', 'og:locale', 'og:locale', 'en_US');
assertSingleMeta(html, 'property', 'og:title', 'og:title');
assertSingleMeta(html, 'property', 'og:description', 'og:description');
const ogUrl = assertSingleMeta(html, 'property', 'og:url', 'og:url', canonical);
assertSingleMeta(html, 'property', 'og:image', 'og:image', origin ? `${origin}/og-image.jpg` : undefined);
assertSingleMeta(html, 'property', 'og:image:type', 'og:image:type', 'image/jpeg');
assertSingleMeta(html, 'property', 'og:image:width', 'og:image:width', '1200');
assertSingleMeta(html, 'property', 'og:image:height', 'og:image:height', '630');
assertSingleMeta(html, 'property', 'og:image:alt', 'og:image:alt');
assertSingleMeta(html, 'name', 'twitter:card', 'twitter:card', 'summary_large_image');
assertSingleMeta(html, 'name', 'twitter:title', 'twitter:title');
assertSingleMeta(html, 'name', 'twitter:description', 'twitter:description');
assertSingleMeta(html, 'name', 'twitter:image', 'twitter:image', origin ? `${origin}/og-image.jpg` : undefined);
assertSingleMeta(html, 'name', 'twitter:image:alt', 'twitter:image:alt');
assertSingleMeta(html, 'name', 'application-name', 'application-name', 'Reloop');
assertSingleMeta(html, 'name', 'google-site-verification', 'Google Search Console verification meta');

const structuredDataMatch = html.match(/<script\b[^>]*id=["']reloop-structured-data["'][^>]*>([\s\S]*?)<\/script>/i);
assert(Boolean(structuredDataMatch), 'The reloop-structured-data JSON-LD script is missing.');
if (structuredDataMatch) {
  try {
    const data = JSON.parse(structuredDataMatch[1]);
    const graph = Array.isArray(data['@graph']) ? data['@graph'] : [];
    const types = graph.flatMap((node) => Array.isArray(node['@type']) ? node['@type'] : [node['@type']]);
    assert(data['@context'] === 'https://schema.org', 'JSON-LD must use the https://schema.org context.');
    for (const type of ['Organization', 'OnlineMarketplace', 'WebSite', 'WebPage']) {
      assert(types.includes(type), `JSON-LD is missing the ${type} type.`);
    }
    assert(graph.some((node) => node.logo?.url === `${origin}/reloop-logo.png`), 'Organization logo URL is missing or incorrect.');
    assert(graph.some((node) => node.url === `${origin}/`), 'JSON-LD home URL is missing or incorrect.');
  } catch (error) {
    errors.push(`JSON-LD is not valid JSON: ${error.message}`);
  }
}

assert(ogUrl === canonical, 'og:url must match the canonical URL.');

for (const path of ['/og-image.jpg', '/reloop-logo.png', '/forest-door.jpg', '/site-icon.jpg', '/robots.txt', '/sitemap.xml']) {
  try {
    await access(resolve(distDir, `.${path}`));
  } catch {
    errors.push(`Built asset is missing: ${path}`);
  }
}

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
    errors.push(`Internal reference points to a missing built file: ${reference}`);
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
  assert(locations.includes(canonical), `Sitemap must include the canonical URL ${canonical}.`);
  assert(locations.every((location) => /^https:\/\//.test(location)), 'Every sitemap URL must use HTTPS.');
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
console.log(`- Canonical: ${canonical}`);
console.log(`- Sitemap URLs: ${[...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].length}`);
console.log('- Metadata, social cards, JSON-LD, robots.txt and sitemap.xml are present and consistent.');
