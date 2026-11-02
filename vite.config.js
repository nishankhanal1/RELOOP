import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), 'VITE_');
  const configuredUrl = process.env.VITE_SITE_URL || env.VITE_SITE_URL || process.env.URL || process.env.VERCEL_PROJECT_PRODUCTION_URL;
  let siteOrigin = '';
  if (configuredUrl) {
    const parsed = new URL(configuredUrl.startsWith('https://') ? configuredUrl : `https://${configuredUrl}`);
    if (parsed.protocol === 'https:' && parsed.pathname === '/' && !parsed.search && !parsed.hash) siteOrigin = parsed.origin;
  }

  return {
    plugins: [
      react(),
      {
        name: 'reloop-static-seo',
        transformIndexHtml(html) {
          if (!siteOrigin) return html;
          const metadata = [
            `<link rel="canonical" href="${siteOrigin}/" />`,
            `<script id="reloop-structured-data" type="application/ld+json">${JSON.stringify({
              '@context': 'https://schema.org',
              '@graph': [
                { '@type': 'Organization', '@id': `${siteOrigin}/#organization`, name: 'Reloop', description: 'A neighbourhood marketplace for passing useful pre-loved things on.', url: `${siteOrigin}/`, logo: `${siteOrigin}/forest-door.jpg` },
                { '@type': 'WebSite', '@id': `${siteOrigin}/#website`, name: 'Reloop', description: 'Discover pre-loved clothes, home goods, tech and more in your community. Browse local finds, compare item details, and arrange a direct handoff.', url: `${siteOrigin}/`, publisher: { '@id': `${siteOrigin}/#organization` }, inLanguage: 'en' },
              ],
            })}</script>`,
          ].join('\n    ');
          return html
            .replace('content="/forest-door.jpg"', `content="${siteOrigin}/forest-door.jpg"`)
            .replace('</head>', `    ${metadata}\n  </head>`);
        }
      },
    ],
    build: {
      rolldownOptions: {
        output: {
          codeSplitting: {
            groups: [{ name: 'vendor', test: /node_modules[\\/]/ }]
          }
        }
      }
    },
    server: {
      host: '0.0.0.0',
      allowedHosts: ['localhost', '127.0.0.1']
    }
  };
});
