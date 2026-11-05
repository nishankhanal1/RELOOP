/**
 * Single source of truth for public SEO metadata.
 *
 * The production origin is resolved from VITE_SITE_URL (or Vercel/Netlify
 * build variables) and this constant is only the safe fallback for local
 * builds. Keep the site's public URL overrides in environment variables.
 */
export const SITE_NAME = 'Reloop';
export const SITE_LANGUAGE = 'en';
export const SITE_LOCALE = 'en_US';
export const DEFAULT_SITE_URL = 'https://reloop-iota-blue.vercel.app';
export const HOME_PATH = '/';

export const HOME_TITLE = 'Reloop — Buy, Sell & Exchange Pre-Loved Goods Nearby';
export const HOME_DESCRIPTION = 'Buy, sell and exchange new and pre-loved clothes, home goods, tech and accessories on Reloop. Browse local finds and message sellers directly.';
export const HOME_ROBOTS = 'index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1';
export const CART_TITLE = 'Your Saved Finds — Reloop';
export const CART_DESCRIPTION = 'Review the pre-loved finds you saved on Reloop.';
export const CART_ROBOTS = 'noindex, nofollow';

export const SOCIAL_IMAGE_PATH = '/og-image.jpg';
export const SOCIAL_IMAGE_WIDTH = 1200;
export const SOCIAL_IMAGE_HEIGHT = 630;
export const SOCIAL_IMAGE_TYPE = 'image/jpeg';
export const SOCIAL_IMAGE_ALT = 'An ornate doorway surrounded by forest trees and mist';
export const LOGO_PATH = '/reloop-logo.png';
export const LOGO_WIDTH = 512;
export const LOGO_HEIGHT = 512;
export const THEME_COLOR = '#111111';

export const ORGANIZATION_DESCRIPTION = 'Reloop is a community marketplace for buying, selling and exchanging new and pre-loved goods nearby.';
export const SITE_SLOGAN = 'Pre-loved, passed on.';

/**
 * Accept only a clean HTTPS origin. A path, query, hash, credentials or a
 * non-HTTPS protocol is rejected so canonical URLs can never be malformed.
 */
export function normalizeSiteOrigin(value) {
  if (typeof value !== 'string' || !value.trim()) return '';
  try {
    const candidate = /^https?:\/\//i.test(value.trim()) ? value.trim() : `https://${value.trim()}`;
    const parsed = new URL(candidate);
    if (
      parsed.protocol !== 'https:' ||
      parsed.pathname !== '/' ||
      parsed.search ||
      parsed.hash ||
      parsed.username ||
      parsed.password
    ) {
      return '';
    }
    return parsed.origin;
  } catch {
    return '';
  }
}

export function resolveSiteOrigin(...candidates) {
  for (const candidate of candidates) {
    const origin = normalizeSiteOrigin(candidate);
    if (origin) return origin;
  }
  return DEFAULT_SITE_URL;
}

export function buildStructuredData(origin = DEFAULT_SITE_URL) {
  const siteOrigin = normalizeSiteOrigin(origin) || DEFAULT_SITE_URL;
  const homeUrl = `${siteOrigin}/`;

  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': ['Organization', 'OnlineMarketplace'],
        '@id': `${siteOrigin}/#organization`,
        name: SITE_NAME,
        url: homeUrl,
        description: ORGANIZATION_DESCRIPTION,
        slogan: SITE_SLOGAN,
        image: `${siteOrigin}${SOCIAL_IMAGE_PATH}`,
        logo: {
          '@type': 'ImageObject',
          url: `${siteOrigin}${LOGO_PATH}`,
          width: LOGO_WIDTH,
          height: LOGO_HEIGHT,
        },
      },
      {
        '@type': 'WebSite',
        '@id': `${siteOrigin}/#website`,
        name: SITE_NAME,
        alternateName: 'Reloop Marketplace',
        url: homeUrl,
        description: HOME_DESCRIPTION,
        publisher: { '@id': `${siteOrigin}/#organization` },
        inLanguage: SITE_LANGUAGE,
        isAccessibleForFree: true,
      },
      {
        '@type': 'WebPage',
        '@id': `${siteOrigin}/#webpage`,
        url: homeUrl,
        name: HOME_TITLE,
        description: HOME_DESCRIPTION,
        isPartOf: { '@id': `${siteOrigin}/#website` },
        about: { '@id': `${siteOrigin}/#organization` },
        primaryImageOfPage: {
          '@type': 'ImageObject',
          url: `${siteOrigin}${SOCIAL_IMAGE_PATH}`,
          width: SOCIAL_IMAGE_WIDTH,
          height: SOCIAL_IMAGE_HEIGHT,
        },
        inLanguage: SITE_LANGUAGE,
      },
    ],
  };
}

export function buildHomeSeo(origin = DEFAULT_SITE_URL) {
  const siteOrigin = normalizeSiteOrigin(origin) || DEFAULT_SITE_URL;
  const canonical = `${siteOrigin}/`;

  return {
    origin: siteOrigin,
    canonical,
    title: HOME_TITLE,
    description: HOME_DESCRIPTION,
    robots: HOME_ROBOTS,
    openGraph: {
      type: 'website',
      siteName: SITE_NAME,
      locale: SITE_LOCALE,
      title: HOME_TITLE,
      description: HOME_DESCRIPTION,
      url: canonical,
      image: `${siteOrigin}${SOCIAL_IMAGE_PATH}`,
      imageWidth: String(SOCIAL_IMAGE_WIDTH),
      imageHeight: String(SOCIAL_IMAGE_HEIGHT),
      imageType: SOCIAL_IMAGE_TYPE,
      imageAlt: SOCIAL_IMAGE_ALT,
    },
    twitter: {
      card: 'summary_large_image',
      title: HOME_TITLE,
      description: HOME_DESCRIPTION,
      image: `${siteOrigin}${SOCIAL_IMAGE_PATH}`,
      imageAlt: SOCIAL_IMAGE_ALT,
    },
    structuredData: buildStructuredData(siteOrigin),
  };
}

export function buildViewSeo(view, origin = DEFAULT_SITE_URL) {
  const home = buildHomeSeo(origin);
  if (view !== 'cart') return home;

  return {
    ...home,
    title: CART_TITLE,
    description: CART_DESCRIPTION,
    robots: CART_ROBOTS,
    openGraph: {
      ...home.openGraph,
      title: CART_TITLE,
      description: CART_DESCRIPTION,
      url: home.canonical,
    },
    twitter: {
      ...home.twitter,
      title: CART_TITLE,
      description: CART_DESCRIPTION,
    },
  };
}
