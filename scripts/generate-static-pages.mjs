import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { buildHomeSeo, buildPageSeo } from '../seo.config.js';
import { PUBLIC_PAGES } from '../site-pages-content.js';
import { resolveBuildSiteOrigin } from './resolve-site-origin.mjs';
import { renderNoscriptContent, renderPageDocument } from './seo-html.mjs';

const distDir = resolve('dist');
const templatePath = resolve(distDir, 'index.html');
const siteOrigin = resolveBuildSiteOrigin('production');

let template;
try {
  template = await readFile(templatePath, 'utf8');
} catch {
  console.error('dist/index.html was not found. Run vite build before generating static pages.');
  process.exit(1);
}

const homeHtml = renderPageDocument(
  template,
  buildHomeSeo(siteOrigin),
  renderNoscriptContent('home')
);
await writeFile(templatePath, homeHtml, 'utf8');

for (const [key, page] of Object.entries(PUBLIC_PAGES)) {
  const pageHtml = renderPageDocument(
    template,
    buildPageSeo(key, siteOrigin),
    renderNoscriptContent(key)
  );
  const pageDir = resolve(distDir, `.${page.path}`);
  await mkdir(pageDir, { recursive: true });
  await writeFile(resolve(pageDir, 'index.html'), pageHtml, 'utf8');
}

console.log(`Static SEO pages generated for ${siteOrigin} (${Object.keys(PUBLIC_PAGES).length + 1} pages).`);
