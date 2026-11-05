import {
  DEFAULT_SITE_URL,
  buildStructuredData,
  buildViewSeo,
  normalizeSiteOrigin,
} from './seo.config.js';

function readCanonicalOrigin() {
  if (typeof document === 'undefined') return '';
  const canonical = document.querySelector('link[rel="canonical"]');
  if (!canonical) return '';
  try {
    return normalizeSiteOrigin(new URL(canonical.getAttribute('href') || '', window.location.href).href);
  } catch {
    return '';
  }
}

const siteOrigin = (() => {
  const configured = normalizeSiteOrigin(import.meta.env.VITE_SITE_URL);
  if (configured) return configured;
  return readCanonicalOrigin() || DEFAULT_SITE_URL;
})();

function setMeta(attribute, key, content) {
  if (typeof document === 'undefined') return;
  const selector = `meta[${attribute}="${key}"]`;
  const elements = [...document.querySelectorAll(selector)];
  let element = elements.shift();

  if (!element) {
    element = document.createElement('meta');
    element.setAttribute(attribute, key);
    document.head.append(element);
  }

  element.setAttribute('content', content);
  elements.forEach((duplicate) => duplicate.remove());
}

function setLink(rel, href) {
  if (typeof document === 'undefined') return;
  const elements = [...document.querySelectorAll(`link[rel="${rel}"]`)];
  let element = elements.shift();

  if (!element) {
    element = document.createElement('link');
    element.rel = rel;
    document.head.append(element);
  }

  element.href = href;
  elements.forEach((duplicate) => duplicate.remove());
}

function setStructuredData(origin) {
  if (typeof document === 'undefined') return;
  let structuredData = document.getElementById('reloop-structured-data');

  if (!structuredData) {
    structuredData = document.createElement('script');
    structuredData.id = 'reloop-structured-data';
    structuredData.type = 'application/ld+json';
    document.head.append(structuredData);
  }

  structuredData.textContent = JSON.stringify(buildStructuredData(origin)).replace(/</g, '\\u003c');
}

export function syncSiteSeo(view) {
  if (typeof document === 'undefined') return;
  const seo = buildViewSeo(view, siteOrigin);

  document.title = seo.title;
  setMeta('name', 'description', seo.description);
  setMeta('name', 'robots', seo.robots);

  setMeta('property', 'og:type', seo.openGraph.type);
  setMeta('property', 'og:site_name', seo.openGraph.siteName);
  setMeta('property', 'og:locale', seo.openGraph.locale);
  setMeta('property', 'og:title', seo.openGraph.title);
  setMeta('property', 'og:description', seo.openGraph.description);
  setMeta('property', 'og:url', seo.openGraph.url);
  setMeta('property', 'og:image', seo.openGraph.image);
  setMeta('property', 'og:image:secure_url', seo.openGraph.image);
  setMeta('property', 'og:image:type', seo.openGraph.imageType);
  setMeta('property', 'og:image:width', seo.openGraph.imageWidth);
  setMeta('property', 'og:image:height', seo.openGraph.imageHeight);
  setMeta('property', 'og:image:alt', seo.openGraph.imageAlt);

  setMeta('name', 'twitter:card', seo.twitter.card);
  setMeta('name', 'twitter:title', seo.twitter.title);
  setMeta('name', 'twitter:description', seo.twitter.description);
  setMeta('name', 'twitter:image', seo.twitter.image);
  setMeta('name', 'twitter:image:alt', seo.twitter.imageAlt);

  setLink('canonical', seo.canonical);
  document.querySelectorAll('link[rel="alternate"][hreflang]').forEach((link) => {
    link.href = seo.canonical;
  });

  setStructuredData(siteOrigin);
}

export function loadConsentBasedAnalytics(consent) {
  const measurementId = import.meta.env.VITE_GA4_ID;
  if (typeof window === 'undefined') return;
  if (consent !== 'accepted') {
    if (window.gtag) {
      window.gtag('consent', 'update', { analytics_storage: 'denied', ad_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied' });
    }
    return;
  }
  if (!/^G-[A-Z0-9]+$/i.test(measurementId || '')) return;
  if (window.__reloopAnalyticsLoaded) return;
  window.__reloopAnalyticsLoaded = true;

  window.dataLayer = window.dataLayer || [];
  window.gtag = function gtag() { window.dataLayer.push(arguments); };
  window.gtag('consent', 'default', { ad_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied', analytics_storage: 'granted' });
  window.gtag('js', new Date());
  window.gtag('config', measurementId, { anonymize_ip: true, allow_google_signals: false, allow_ad_personalization_signals: false });

  const script = document.createElement('script');
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(measurementId)}`;
  script.onerror = () => { window.__reloopAnalyticsLoaded = false; };
  document.head.append(script);
}
