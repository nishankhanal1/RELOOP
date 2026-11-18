import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { buildHomeSeo } from './seo.config.js';
import { renderSeoHead } from './scripts/seo-html.mjs';
import { resolveBuildSiteOrigin } from './scripts/resolve-site-origin.mjs';

// The live property is already verified. Keep this public token as a fallback so
// a deploy without VITE_GOOGLE_SITE_VERIFICATION cannot silently lose
// Search Console verification. Set the environment variable to replace it.
const DEFAULT_GOOGLE_SITE_VERIFICATION = 'YeseToEpjuTTwYEvh6J1m0eKX4BPsYN8Pxux97Gg3lQ';

function sanitizeVerificationToken(value) {
  return String(value || '').trim().replace(/[^A-Za-z0-9._-]/g, '');
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), 'VITE_');
  const siteOrigin = resolveBuildSiteOrigin(mode);
  const homeSeo = buildHomeSeo(siteOrigin);
  const googleVerification = sanitizeVerificationToken(
    process.env.VITE_GOOGLE_SITE_VERIFICATION ||
    process.env.GOOGLE_SITE_VERIFICATION ||
    env.VITE_GOOGLE_SITE_VERIFICATION ||
    DEFAULT_GOOGLE_SITE_VERIFICATION
  );
  const bingVerification = sanitizeVerificationToken(
    process.env.VITE_BING_SITE_VERIFICATION ||
    process.env.BING_SITE_VERIFICATION ||
    env.VITE_BING_SITE_VERIFICATION
  );
  const verificationTags = [
    googleVerification ? `    <meta name="google-site-verification" content="${googleVerification}" />` : '',
    bingVerification ? `    <meta name="msvalidate.01" content="${bingVerification}" />` : '',
  ].filter(Boolean).join('\n');

  return {
    plugins: [
      react(),
      {
        name: 'reloop-static-seo',
        transformIndexHtml(html) {
          const headPattern = /<!-- SEO_HEAD_START -->[\s\S]*?<!-- SEO_HEAD_END -->/;
          if (!headPattern.test(html)) {
            throw new Error('index.html is missing the SEO_HEAD_START / SEO_HEAD_END markers.');
          }

          let output = html.replace(
            headPattern,
            `<!-- SEO_HEAD_START -->\n${renderSeoHead(homeSeo)}\n    <!-- SEO_HEAD_END -->`
          );

          if (verificationTags) {
            output = output.replace('</head>', `${verificationTags}\n  </head>`);
          }

          return output;
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
