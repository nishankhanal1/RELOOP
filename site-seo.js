const siteOrigin = (() => {
  const configured = import.meta.env.VITE_SITE_URL;
  if (configured) {
    try {
      const url = new URL(configured);
      if (url.protocol === 'https:' && url.pathname === '/' && !url.search && !url.hash) return url.origin;
    } catch {
      // Use the current origin for local previews; the build script validates production configuration.
    }
  }
  return typeof window === 'undefined' ? '' : window.location.origin;
})();

const homeTitle = 'Reloop — Find pre-loved things nearby';
const homeDescription = 'Discover pre-loved clothes, home goods, tech and more in your community. Browse local finds, compare item details, and arrange a direct handoff.';

function setMeta(selector, content) {
  const element = document.querySelector(selector);
  if (element) element.setAttribute('content', content);
}

export function syncSiteSeo(view) {
  if (typeof document === 'undefined') return;
  const isHome = view !== 'cart';
  const title = isHome ? homeTitle : 'Your saved finds — Reloop';
  const description = isHome ? homeDescription : 'Review the pre-loved finds you saved on Reloop.';
  document.title = title;
  setMeta('meta[name="description"]', description);
  setMeta('meta[property="og:title"]', title);
  setMeta('meta[property="og:description"]', description);
  setMeta('meta[name="twitter:title"]', title);
  setMeta('meta[name="twitter:description"]', description);
  if (siteOrigin) setMeta('meta[property="og:image"]', `${siteOrigin}/forest-door.jpg`);

  let robots = document.querySelector('meta[name="robots"]');
  if (!robots) {
    robots = document.createElement('meta');
    robots.name = 'robots';
    document.head.append(robots);
  }
  robots.content = isHome ? 'index, follow, max-image-preview:large' : 'noindex, nofollow';

  if (siteOrigin) {
    let canonical = document.querySelector('link[rel="canonical"]');
    if (!canonical) {
      canonical = document.createElement('link');
      canonical.rel = 'canonical';
      document.head.append(canonical);
    }
    canonical.href = `${siteOrigin}/`;
  }

  let structuredData = document.getElementById('reloop-structured-data');
  if (!structuredData) {
    structuredData = document.createElement('script');
    structuredData.id = 'reloop-structured-data';
    structuredData.type = 'application/ld+json';
    document.head.append(structuredData);
  }
  structuredData.textContent = JSON.stringify({
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Organization',
        '@id': `${siteOrigin}/#organization`,
        name: 'Reloop',
        description: 'A neighbourhood marketplace for passing useful pre-loved things on.',
        url: `${siteOrigin}/`,
        logo: `${siteOrigin}/forest-door.jpg`,
      },
      {
        '@type': 'WebSite',
        '@id': `${siteOrigin}/#website`,
        name: 'Reloop',
        description: homeDescription,
        url: `${siteOrigin}/`,
        publisher: { '@id': `${siteOrigin}/#organization` },
        inLanguage: 'en',
      },
    ],
  });
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
