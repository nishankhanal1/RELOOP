import { HOME_DESCRIPTION, HOME_TITLE } from '../seo.config.js';
import { PUBLIC_PAGES, PUBLIC_PAGE_KEYS } from '../site-pages-content.js';

const NOSCRIPT_STYLE = 'max-width: 48rem; margin: 4rem auto; padding: 0 1.5rem; color: #f3ecdf; background: #120b10; font-family: system-ui, sans-serif; line-height: 1.6;';

export function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function renderStructuredData(data) {
  return JSON.stringify(data).replace(/</g, '\\u003c');
}

/**
 * The complete indexable head block for a page. The markers stay in the built
 * HTML so the post-build static page generator can swap the block per route.
 */
export function renderSeoHead(seo) {
  return [
    `    <title>${escapeHtml(seo.title)}</title>`,
    `    <meta name="description" content="${escapeHtml(seo.description)}" />`,
    `    <meta name="robots" content="${escapeHtml(seo.robots)}" />`,
    `    <link rel="canonical" href="${escapeHtml(seo.canonical)}" />`,
    `    <link rel="alternate" hreflang="en" href="${escapeHtml(seo.canonical)}" />`,
    `    <link rel="alternate" hreflang="x-default" href="${escapeHtml(seo.canonical)}" />`,
    `    <link rel="sitemap" type="application/xml" title="Sitemap" href="${escapeHtml(seo.origin)}/sitemap.xml" />`,
    '    <meta property="og:type" content="website" />',
    '    <meta property="og:site_name" content="Reloop" />',
    '    <meta property="og:locale" content="en_US" />',
    `    <meta property="og:title" content="${escapeHtml(seo.openGraph.title)}" />`,
    `    <meta property="og:description" content="${escapeHtml(seo.openGraph.description)}" />`,
    `    <meta property="og:url" content="${escapeHtml(seo.openGraph.url)}" />`,
    `    <meta property="og:image" content="${escapeHtml(seo.openGraph.image)}" />`,
    `    <meta property="og:image:secure_url" content="${escapeHtml(seo.openGraph.image)}" />`,
    `    <meta property="og:image:type" content="${escapeHtml(seo.openGraph.imageType)}" />`,
    `    <meta property="og:image:width" content="${escapeHtml(seo.openGraph.imageWidth)}" />`,
    `    <meta property="og:image:height" content="${escapeHtml(seo.openGraph.imageHeight)}" />`,
    `    <meta property="og:image:alt" content="${escapeHtml(seo.openGraph.imageAlt)}" />`,
    `    <meta name="twitter:card" content="${escapeHtml(seo.twitter.card)}" />`,
    `    <meta name="twitter:title" content="${escapeHtml(seo.twitter.title)}" />`,
    `    <meta name="twitter:description" content="${escapeHtml(seo.twitter.description)}" />`,
    `    <meta name="twitter:image" content="${escapeHtml(seo.twitter.image)}" />`,
    `    <meta name="twitter:image:alt" content="${escapeHtml(seo.twitter.imageAlt)}" />`,
    `    <script id="reloop-structured-data" type="application/ld+json">${renderStructuredData(seo.structuredData)}</script>`,
  ].join('\n');
}

function renderNoscriptNav(currentKey) {
  const links = PUBLIC_PAGE_KEYS
    .filter((key) => key !== currentKey)
    .map((key) => `<a href="${escapeHtml(PUBLIC_PAGES[key].path)}">${escapeHtml(PUBLIC_PAGES[key].breadcrumb)}</a>`);

  return `<nav aria-label="Reloop pages"><a href="/">Home</a>${links.length ? ` · ${links.join(' · ')}` : ''}</nav>`;
}

export function renderNoscriptContent(pageKey) {
  if (pageKey === 'home') {
    return `<main style="${NOSCRIPT_STYLE}">
        <p>Reloop</p>
        <h1>${escapeHtml(HOME_TITLE)}</h1>
        <p>${escapeHtml(HOME_DESCRIPTION)}</p>
        <p>Reloop is a community marketplace for passing useful things on. Browse local finds in clothing, home, tech and accessories, or list an item to sell or exchange.</p>
        ${renderNoscriptNav('home')}
        <p>Enable JavaScript to browse listings, post an item and message sellers.</p>
      </main>`;
  }

  const page = PUBLIC_PAGES[pageKey];
  if (!page) return '';

  const sections = page.sections.map((section) => {
    const paragraphs = (section.paragraphs || []).map((paragraph) => `<p>${escapeHtml(paragraph)}</p>`).join('');
    const items = section.items?.length
      ? `<ul>${section.items.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ul>`
      : '';
    const cards = section.cards?.length
      ? `<ul>${section.cards.map((card) => `<li><strong>${escapeHtml(card.heading)}</strong> — ${escapeHtml(card.body)}</li>`).join('')}</ul>`
      : '';
    return `<section><h2>${escapeHtml(section.heading)}</h2>${paragraphs}${items}${cards}</section>`;
  }).join('');

  const faq = page.faq?.length
    ? `<section><h2>Questions</h2>${page.faq.map((item) => `<h3>${escapeHtml(item.question)}</h3><p>${escapeHtml(item.answer)}</p>`).join('')}</section>`
    : '';

  return `<main style="${NOSCRIPT_STYLE}">
        <p>Reloop</p>
        <h1>${escapeHtml(page.heading)}</h1>
        <p>${escapeHtml(page.lede)}</p>
        ${sections}
        ${faq}
        ${renderNoscriptNav(pageKey)}
        <p>Enable JavaScript to browse listings, post an item and message sellers.</p>
      </main>`;
}

export function renderPageDocument(template, seo, noscriptHtml) {
  const headPattern = /<!-- SEO_HEAD_START -->[\s\S]*?<!-- SEO_HEAD_END -->/;
  const noscriptPattern = /<!-- SEO_NOSCRIPT_START -->[\s\S]*?<!-- SEO_NOSCRIPT_END -->/;

  if (!headPattern.test(template)) {
    throw new Error('index.html is missing the SEO_HEAD_START / SEO_HEAD_END markers.');
  }
  if (!noscriptPattern.test(template)) {
    throw new Error('index.html is missing the SEO_NOSCRIPT_START / SEO_NOSCRIPT_END markers.');
  }

  return template
    .replace(headPattern, `<!-- SEO_HEAD_START -->\n${renderSeoHead(seo)}\n    <!-- SEO_HEAD_END -->`)
    .replace(noscriptPattern, `<!-- SEO_NOSCRIPT_START -->\n      ${noscriptHtml}\n      <!-- SEO_NOSCRIPT_END -->`);
}
