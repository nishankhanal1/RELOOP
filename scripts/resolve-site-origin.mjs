import { loadEnv } from 'vite';
import {
  DEFAULT_SITE_URL,
  normalizeSiteOrigin,
  resolveSiteOrigin,
} from '../seo.config.js';

/**
 * Resolve one canonical production origin for Vite and generated SEO files.
 * Vercel deployment aliases are not canonical; use the configured public URL
 * or the primary production URL instead.
 */
export function resolveBuildSiteOrigin(mode = 'production') {
  const env = loadEnv(mode, process.cwd(), 'VITE_');
  const explicit = process.env.VITE_SITE_URL || env.VITE_SITE_URL;

  if (explicit && !normalizeSiteOrigin(explicit)) {
    throw new Error(
      'VITE_SITE_URL must be a clean HTTPS origin, for example https://reloop-iota-blue.vercel.app'
    );
  }

  return resolveSiteOrigin(explicit, DEFAULT_SITE_URL);
}
