import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { buildStructuredData, resolveSiteOrigin } from './seo.config.js';

// The live property is already verified. Keep this public token as a fallback so
// a deploy without VITE_GOOGLE_SITE_VERIFICATION cannot silently lose
// Search Console verification. Set the environment variable to replace it.
const DEFAULT_GOOGLE_SITE_VERIFICATION = 'YeseToEpjuTTwYEvh6J1m0eKX4BPsYN8Pxux97Gg3lQ';

function sanitizeVerificationToken(value) {
  return String(value || '').trim().replace(/[^A-Za-z0-9._-]/g, '');
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), 'VITE_');
  const siteOrigin = resolveSiteOrigin(
    process.env.VITE_SITE_URL,
    env.VITE_SITE_URL,
    process.env.VERCEL_PROJECT_PRODUCTION_URL,
    process.env.URL
  );
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
  const structuredData = JSON.stringify(buildStructuredData(siteOrigin)).replace(/</g, '\\u003c');

  return {
    plugins: [
      react(),
      {
        name: 'reloop-static-seo',
        transformIndexHtml(html) {
          let output = html.replaceAll('__SITE_ORIGIN__', siteOrigin);

          output = output.replace(
            '<!-- SEO_STRUCTURED_DATA -->',
            `<script id="reloop-structured-data" type="application/ld+json">${structuredData}</script>`
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
