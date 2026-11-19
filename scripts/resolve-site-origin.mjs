import { loadEnv } from 'vite';
import {
  DEFAULT_SITE_URL,
  normalizeSiteOrigin,
  resolveSiteOrigin,
} from '../seo.config.js';

/**
 * Resolve the production origin the same way for Vite, the sitemap generator
 * and the static page generator. A malformed explicit value must fail the
 * build instead of publishing a bad canonical URL.
 */
export function resolveBuildSiteOrigin(mode = 'production') {
  const env = loadEnv(mode, process.cwd(), 'VITE_');
  const explicit = process.env.VITE_SITE_URL || env.VITE_SITE_URL;

  if (explicit && !normalizeSiteOrigin(explicit)) {
    throw new Error(
      'VITE_SITE_URL must be a clean HTTPS origin, for example https://reloop-reloop00.vercel.app'
    );
  }

  return resolveSiteOrigin(
    explicit,
    process.env.VERCEL_PROJECT_PRODUCTION_URL,
    process.env.URL,
    DEFAULT_SITE_URL
  );
}
