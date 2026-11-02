import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import HoldButton from './HoldButton';
import { addListingComment, COMMUNITY_LISTING_PAGE_SIZE, createOffer, deleteListing, ensureProfile, getCommunityListings, getListingComments, getProfile, getBasketItems, saveBasketItem, removeBasketItem, getDirectMessages, getPublicProfile, getFriendlyError, isSupabaseConfigured, saveListing, sendDirectMessage, signInWithEmail, signInWithGoogle, signOut, subscribeToListings, supabase, updateListing, updateProfile, uploadListingImage } from './supabase-client';
import { loadConsentBasedAnalytics, syncSiteSeo } from './site-seo';
import './marketplace-design-system.css';

const Icon = ({ name, size = 20 }) => {
  const paths = { search: 'M11 4a7 7 0 1 0 4.9 12L21 21M16 16l5 5', bag: 'M5 8h14l-1 13H6L5 8Zm3 0V6a4 4 0 0 1 8 0v2', arrow: 'M5 12h14m-6-6 6 6-6 6', close: 'M6 6l12 12M18 6 6 18', message: 'M20 11.5a7.5 7.5 0 0 1-8 7.5 8.7 8.7 0 0 1-4-.9L4 20l1.3-3.4A7.5 7.5 0 1 1 20 11.5Z', plus: 'M12 5v14M5 12h14', check: 'm5 12 4 4L19 6', pin: 'M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z M12 10a2 2 0 1 0 0-.01' };
  return <svg aria-hidden="true" focusable="false" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d={paths[name]} /></svg>;
};

const CURRENCY_OPTIONS = [{ code: 'NPR', label: 'NPR (NRs.)' }, { code: 'USD', label: 'USD ($)' }];
const LISTING_CATEGORIES = ['All finds', 'Clothing', 'Home', 'Tech', 'Accessories'];
const formatMoney = (amount, currency = 'USD') => { const value = Number(amount || 0); const formatted = value.toLocaleString('en-US', { maximumFractionDigits: 2 }); return currency === 'NPR' ? `NRs. ${formatted}` : `$${formatted}`; };
const HERO_COPY = 'Find pre-loved things nearby, meet the people behind them, and keep good things moving.';

function useTypewriter(text, speed = 38, startDelay = 600) {
  const [displayed, setDisplayed] = useState('');
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setDisplayed(text);
      setDone(true);
      return undefined;
    }
    let interval;
    setDisplayed('');
    setDone(false);

    const delay = window.setTimeout(() => {
      let index = 0;
      interval = window.setInterval(() => {
        index += 1;
        setDisplayed(text.slice(0, index));
        if (index >= text.length) {
          window.clearInterval(interval);
          setDone(true);
        }
      }, speed);
    }, startDelay);

    return () => {
      window.clearTimeout(delay);
      if (interval) window.clearInterval(interval);
    };
  }, [text, speed, startDelay]);

  return { displayed, done };
}

function App() {
  const heroStageRef = useRef(null);
  const heroVideoRef = useRef(null);

  // -------------------------
  // 1) Product feed state
  // -------------------------
  const [products, setProducts] = useState([]);
  const [feedError, setFeedError] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMoreListings, setHasMoreListings] = useState(false);

  // -------------------------
  // 2) Search and filtering
  // -------------------------
  const [category, setCategory] = useState('All finds');
  const [query, setQuery] = useState('');
  const [sortBy, setSortBy] = useState('recent');

  // -------------------------
  // 3) Basket state
  // -------------------------
  // Do not hydrate a signed-out browser from a shared basket key. Account
  // baskets are loaded only after Supabase confirms the current user.
  const [cart, setCart] = useState([]);
  const [basketSyncOwner, setBasketSyncOwner] = useState(null);

  // -------------------------
  // 4) UI / modal state
  // -------------------------
  const [activeProduct, setActiveProduct] = useState(null);
  const [activeSellerId, setActiveSellerId] = useState(null);
  const [toast, setToast] = useState('');
  const [view, setView] = useState('home');
  const [showSell, setShowSell] = useState(false);
  const [showInbox, setShowInbox] = useState(false);
  const [showAuth, setShowAuth] = useState(false);
  const [showOffer, setShowOffer] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [chatProduct, setChatProduct] = useState(null);
  const [legalPage, setLegalPage] = useState(null);
  const [cookieConsent, setCookieConsent] = useState(() => {
    if (typeof document === 'undefined') return null;
    return document.cookie.match(/(?:^|; )reloop_cookie_consent=([^;]+)/)?.[1] || null;
  });

  // -------------------------
  // 5) Auth and profile state
  // -------------------------
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [showProfileSetup, setShowProfileSetup] = useState(false);
  const [showAccount, setShowAccount] = useState(false);
  const [authCallbackError, setAuthCallbackError] = useState('');
  const [heroHeaderAtTop, setHeroHeaderAtTop] = useState(true);
  const heroActionsVisible = true;
  const [heroVideoReady, setHeroVideoReady] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const listingRequestId = useRef(0);
  const loadedListingCount = useRef(0);
  const { displayed: heroMessage, done: heroMessageDone } = useTypewriter(HERO_COPY);

  const hasModalOpen = Boolean(activeProduct || activeSellerId || showSell || showInbox || showAuth || showOffer || showChat || showProfileSetup || showAccount || legalPage);

  useEffect(() => {
    syncSiteSeo(view);
  }, [view]);

  useEffect(() => {
    loadConsentBasedAnalytics(cookieConsent);
  }, [cookieConsent]);

  useEffect(() => {
    if (view !== 'home' || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return undefined;
    const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
    if (connection?.saveData || /(^|-)2g$/.test(connection?.effectiveType || '')) return undefined;

    const enableVideo = () => setHeroVideoReady(true);
    if ('requestIdleCallback' in window) {
      const idleId = window.requestIdleCallback(enableVideo, { timeout: 2500 });
      return () => window.cancelIdleCallback(idleId);
    }
    const timeoutId = window.setTimeout(enableVideo, 1200);
    return () => window.clearTimeout(timeoutId);
  }, [view]);

  useEffect(() => {
    if (!hasModalOpen) return undefined;
    const previousOverflow = document.body.style.overflow;
    const previouslyFocused = document.activeElement;
    document.body.style.overflow = 'hidden';
    const focusableSelector = 'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [href], [tabindex]:not([tabindex="-1"])';
    const getFocusable = () => [...document.querySelectorAll('.overlay:not([aria-hidden="true"]) .modal, .drawer-overlay aside')].flatMap((container) => [...container.querySelectorAll(focusableSelector)]);
    const focusFirst = () => getFocusable()[0]?.focus();
    const closeTopLayer = () => {
      if (showProfileSetup) return setShowProfileSetup(false);
      if (showAuth) return setShowAuth(false);
      if (showOffer) return setShowOffer(false);
      if (showChat) return setShowChat(false);
      if (showSell) return setShowSell(false);
      if (showInbox) return setShowInbox(false);
      if (showAccount) return setShowAccount(false);
      if (activeSellerId) return setActiveSellerId(null);
      if (activeProduct) return setActiveProduct(null);
      if (legalPage) return setLegalPage(null);
    };
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') return closeTopLayer();
      if (event.key !== 'Tab') return;
      const focusable = getFocusable();
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    document.addEventListener('keydown', handleKeyDown);
    window.setTimeout(focusFirst, 0);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = previousOverflow;
      if (previouslyFocused instanceof HTMLElement && previouslyFocused.isConnected) previouslyFocused.focus();
    };
  }, [activeProduct, activeSellerId, hasModalOpen, legalPage, showAccount, showAuth, showChat, showInbox, showOffer, showProfileSetup, showSell]);

  // -------------------------
  // 6) Data loading helpers
  // -------------------------
  const normalizeListing = (listing) => ({
    id: listing.id,
    sellerId: listing.seller_id ?? listing.user_id ?? listing.created_by ?? listing.author_id ?? listing.profiles?.id ?? listing.profile?.id ?? null,
    currency: listing.currency === 'NPR' ? 'NPR' : 'USD',
    seller_id: listing.seller_id ?? null,
    user_id: listing.user_id ?? null,
    created_by: listing.created_by ?? null,
    profiles: listing.profiles ?? null,
    title: listing.title,
    price: Number(listing.min_price || listing.price || 0),
    minPrice: Number(listing.min_price || listing.price || 0),
    category: listing.category || 'Other',
    condition: listing.condition || 'Condition provided',
    seller: listing.profiles?.username || listing.profiles?.display_name || 'Reloop member',
    location: listing.location || listing.city || 'Community',
    image: listing.image_url || null,
    tags: [listing.category || 'Other', listing.quality || 'Quality provided', listing.exchange_preference || 'Buy or exchange'].filter(Boolean),
    mode: listing.exchange_preference || 'Buy or exchange',
    description: listing.description || '',
  });

  const loadListings = async ({ append = false, preserveLoaded = false } = {}) => {
    const requestId = ++listingRequestId.current;
    const offset = append ? loadedListingCount.current : 0;
    const pageSize = preserveLoaded ? Math.max(COMMUNITY_LISTING_PAGE_SIZE, loadedListingCount.current) : COMMUNITY_LISTING_PAGE_SIZE;
    if (append) setIsLoadingMore(true);
    else {
      if (loadedListingCount.current === 0) setIsLoading(true);
      setHasMoreListings(false);
    }

    try {
      const live = await getCommunityListings(offset, pageSize + 1);
      if (requestId !== listingRequestId.current) return;
      const normalized = live.map(normalizeListing);
      const page = normalized.slice(0, pageSize);
      setFeedError('');
      setProducts((current) => append
        ? [...current, ...page.filter((item) => !current.some((existing) => String(existing.id) === String(item.id)))]
        : page);
      loadedListingCount.current = append ? offset + page.length : page.length;
      setHasMoreListings(normalized.length > pageSize);
    } catch (error) {
      if (requestId !== listingRequestId.current) return;
      setFeedError(getFriendlyError(error, 'Listings could not be loaded. Check your connection and try again.'));
    } finally {
      if (requestId === listingRequestId.current) {
        setIsLoading(false);
        setIsLoadingMore(false);
      }
    }
  };

  useEffect(() => {
    loadListings();
    let refreshTimer;
    const channel = subscribeToListings(() => {
      window.clearTimeout(refreshTimer);
      refreshTimer = window.setTimeout(() => loadListings({ preserveLoaded: true }), 250);
    });

    return () => {
      window.clearTimeout(refreshTimer);
      listingRequestId.current += 1;
      if (channel) supabase?.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    if (view !== 'home') {
      setHeroHeaderAtTop(false);
      return undefined;
    }

    const stage = heroStageRef.current;
    const video = heroVideoRef.current;
    if (!stage || !video) return undefined;
    let previousX = null;
    let targetTime = 0;
    let seekFrame = null;
    const smoothSeek = () => {
      const difference = targetTime - video.currentTime;
      if (Math.abs(difference) < 0.002) {
        video.currentTime = targetTime;
        seekFrame = null;
        return;
      }
      video.currentTime += difference * 0.34;
      seekFrame = window.requestAnimationFrame(smoothSeek);
    };
    const handlePointerMove = (event) => {
      const bounds = stage.getBoundingClientRect();
      const x = Math.min(1, Math.max(0, (event.clientX - bounds.left) / bounds.width));
      const y = Math.min(1, Math.max(0, (event.clientY - bounds.top) / bounds.height));
      stage.style.setProperty('--hero-pointer-x', `${(x * 100).toFixed(2)}%`);
      stage.style.setProperty('--hero-pointer-y', `${(y * 100).toFixed(2)}%`);
      if (!Number.isFinite(video.duration) || video.duration <= 0) return;
      if (previousX === null) { previousX = event.clientX; return; }
      const delta = event.clientX - previousX;
      previousX = event.clientX;
      targetTime = Math.max(0, Math.min(video.duration, targetTime + (delta / window.innerWidth) * 1.2 * video.duration));
      if (seekFrame === null) seekFrame = window.requestAnimationFrame(smoothSeek);
    };

    const updateHeader = () => {
      setHeroHeaderAtTop(stage.getBoundingClientRect().bottom > 120);
    };

    window.addEventListener('pointermove', handlePointerMove, { passive: true });
    window.addEventListener('scroll', updateHeader, { passive: true });
    updateHeader();

    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('scroll', updateHeader);
      if (seekFrame !== null) window.cancelAnimationFrame(seekFrame);
    };
  }, [view]);

  useEffect(() => {
    if (!mobileMenuOpen) return undefined;
    const closeOnEscape = (event) => {
      if (event.key === 'Escape') setMobileMenuOpen(false);
    };
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [mobileMenuOpen]);

  // -------------------------
  // 7) Local storage sync
  // -------------------------
  useEffect(() => {
    try {
      const storageKey = user ? `reloop-basket-user-${user.id}` : 'reloop-basket-guest';
      localStorage.setItem(storageKey, JSON.stringify(cart));
      localStorage.removeItem('reloop-basket-v1');
    } catch {
      // Storage can be unavailable in private browsing; basket remains usable for this visit.
    }
  }, [cart]);

  // -------------------------
  // 8) Auth / callback handling
  // -------------------------
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const callbackError = params.get('error_description') || params.get('error');

    if (callbackError) {
      setAuthCallbackError(callbackError);
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  useEffect(() => {
    if (!supabase) return;

    const hydrate = async (sessionUser) => {
      setUser(sessionUser || null);

      if (!sessionUser) {
        setProfile(null);
        setShowProfileSetup(false);
        return;
      }

      try {
        await ensureProfile(sessionUser);
        const savedProfile = await getProfile(sessionUser.id);
        setProfile(savedProfile);
        setShowProfileSetup(!savedProfile?.username || !savedProfile?.phone);
      } catch {
        setShowProfileSetup(true);
      }
    };

    supabase.auth.getSession().then(({ data }) => hydrate(data.session?.user || null));

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      hydrate(session?.user || null);
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  // -------------------------
  // 9) Basket sync to user account
  // -------------------------
  useEffect(() => {
    let cancelled = false;

    const syncBasket = async () => {
      if (!user) {
        setBasketSyncOwner(null);
        setCart([]);
        return;
      }

      setBasketSyncOwner(null);

      try {
        const cloudItems = await getBasketItems(user);
        if (cancelled) return;

        const cloudIds = new Set(cloudItems.map((item) => String(item.id)));
        const merged = [
          ...cloudItems,
          ...cart.filter((item) => !cloudIds.has(String(item.id))),
        ];

        setCart(Array.from(new Map(merged.map((item) => [String(item.id), item])).values()));

        await Promise.all(
          cart
            .filter((item) => !cloudIds.has(String(item.id)))
            .map((item) => saveBasketItem(item, user))
        );

        if (!cancelled) {
          setBasketSyncOwner(user.id);
          notify('Your basket is synced to your account');
        }
      } catch (error) {
        if (!cancelled) {
          setBasketSyncOwner(user.id);
          notify(getFriendlyError(error, 'Cloud basket sync is unavailable. Your local basket is still safe.'));
        }
      }
    };

    syncBasket();

    return () => {
      cancelled = true;
    };
  }, [user]);

  const categoryCounts = useMemo(
    () => Object.fromEntries(LISTING_CATEGORIES.map((item) => [
      item,
      item === 'All finds' ? products.length : products.filter((product) => product.category === item).length
    ])),
    [products]
  );
  const filtered = useMemo(
    () => {
      const matches = products.filter(
        (item) =>
          (category === 'All finds' || item.category === category) &&
          `${item.title} ${item.tags.join(' ')} ${item.location}`
            .toLowerCase()
            .includes(query.toLowerCase())
      );
      if (sortBy === 'price-low') return matches.sort((a, b) => a.currency.localeCompare(b.currency) || a.price - b.price);
      if (sortBy === 'price-high') return matches.sort((a, b) => a.currency.localeCompare(b.currency) || b.price - a.price);
      if (sortBy === 'title') return matches.sort((a, b) => a.title.localeCompare(b.title));
      return matches;
    },
    [products, category, query, sortBy]
  );

  useEffect(() => {
    if (view !== 'home') return undefined;
    const revealTargets = [...document.querySelectorAll('[data-reveal]')];
    if (!revealTargets.length) return undefined;
    revealTargets.forEach((target, index) => {
      target.style.setProperty('--reveal-delay', `${Math.min(index, 8) * 55}ms`);
    });
    if (!('IntersectionObserver' in window)) {
      revealTargets.forEach((target) => target.classList.add('is-visible'));
      return undefined;
    }
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        // Remove the state after an element leaves the viewport so the same
        // scroll animation can play again when the user comes back to it.
        entry.target.classList.toggle('is-visible', entry.isIntersecting);
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' });
    revealTargets.forEach((target) => observer.observe(target));
    return () => observer.disconnect();
  }, [filtered.length, view]);

  const clearFilters = () => {
    setCategory('All finds');
    setQuery('');
    setSortBy('recent');
  };

  const notify = (message) => {
    setToast(message);
    setTimeout(() => setToast(''), 2800);
  };

  const profileComplete = Boolean(profile?.username && profile?.phone);

  const saveCookiePreference = (preference) => {
    const secure = window.location.protocol === 'https:' ? '; Secure' : '';
    document.cookie = `reloop_cookie_consent=${preference}; Max-Age=31536000; Path=/; SameSite=Lax${secure}`;
    if (preference === 'essential' && cookieConsent === 'accepted') {
      const gaCookies = document.cookie.split(';').map((cookie) => cookie.trim().split('=')[0]).filter((name) => /^_ga(?:_|$)/.test(name));
      const hostParts = window.location.hostname.split('.');
      const domains = hostParts.length > 1 ? hostParts.slice(0, -1).map((_, index) => `.${hostParts.slice(index).join('.')}`) : [];
      for (const name of gaCookies) {
        document.cookie = `${name}=; Max-Age=0; Path=/; SameSite=Lax${secure}`;
        for (const domain of domains) document.cookie = `${name}=; Max-Age=0; Domain=${domain}; Path=/; SameSite=Lax${secure}`;
      }
      window.location.reload();
      return;
    }
    setCookieConsent(preference);
  };

  const requireMember = (action) => {
    if (!user) return setShowAuth(true);
    if (!profileComplete) return setShowProfileSetup(true);
    action();
  };

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      notify(getFriendlyError(error, 'Could not sign out. Please try again.'));
      return;
    }

    setUser(null);
    setProfile(null);
    setShowAccount(false);
    setShowProfileSetup(false);
    setBasketSyncOwner(null);
    setCart([]);
    try {
      localStorage.removeItem('reloop-basket-v1');
      localStorage.removeItem('reloop-basket-guest');
    } catch {
      // In-memory state is still cleared when storage is unavailable.
    }
  };

  const addToCart = (product) => {
    const alreadySaved = cart.some((item) => String(item.id) === String(product.id));

    if (alreadySaved) {
      notify(`${product.title} is already in your basket`);
      return;
    }

    setCart((items) => [...items, product]);

    if (user && basketSyncOwner === user.id) {
      saveBasketItem(product, user).catch((error) =>
        notify(getFriendlyError(error, 'Could not sync this item to your account.'))
      );
    }

    notify(`${product.title} added to your basket`);
  };

  const removeFromCart = (id) => {
    setCart((items) => items.filter((item) => String(item.id) !== String(id)));

    if (user && basketSyncOwner === user.id) {
      removeBasketItem(id, user).catch((error) =>
        notify(getFriendlyError(error, 'Could not remove this item from your synced basket.'))
      );
    }
  };

  const openBrowse = () => {
    setView('home');
    window.setTimeout(() => document.getElementById('browse')?.scrollIntoView({ behavior: 'smooth' }), 0);
  };

  const focusSearch = () => {
    setView('home');
    window.setTimeout(() => document.querySelector('.search-input')?.focus(), 0);
  };

  return <div className="app-shell">
    <header className={`topbar ${view === 'home' ? 'topbar--hero' : ''} ${heroHeaderAtTop ? '' : 'topbar--scrolled'}`}>
      <button className="wordmark mainframe-wordmark" onClick={() => { setView('home'); setShowSell(false); setShowInbox(false); }}><span className="mark">r</span><span>reloop</span></button>
      <nav className="main-nav mainframe-nav" aria-label="Main navigation"><button onClick={openBrowse}>Browse</button><button onClick={() => requireMember(() => setShowSell(true))}>Post an item</button><button onClick={() => requireMember(() => setShowInbox(true))}>Inbox</button></nav>
      <button className={`mobile-menu-toggle ${mobileMenuOpen ? 'is-open' : ''}`} aria-label={mobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'} aria-expanded={mobileMenuOpen} aria-controls="mobile-navigation" onClick={() => setMobileMenuOpen(open => !open)}><span/><span/><span/></button>
      <div className="top-actions mainframe-top-actions">{user ? <button className="avatar" title="Open profile" onClick={() => setShowAccount(true)}>{(profile?.username || user.user_metadata?.name || user.email || 'R').slice(0, 2).toUpperCase()}</button> : <button className="sign-in-link" onClick={() => setShowAuth(true)}>Sign in</button>}</div>
    </header>
    <div id="mobile-navigation" className={`mobile-navigation ${mobileMenuOpen ? 'is-open' : ''}`} aria-hidden={!mobileMenuOpen} inert={!mobileMenuOpen}>
      <button onClick={() => { setMobileMenuOpen(false); openBrowse(); }}>Browse nearby</button>
      <button onClick={() => { setMobileMenuOpen(false); requireMember(() => setShowSell(true)); }}>Post an item</button>
      <button onClick={() => { setMobileMenuOpen(false); requireMember(() => setShowInbox(true)); }}>Inbox</button>
      <button onClick={() => { setMobileMenuOpen(false); user ? setShowAccount(true) : setShowAuth(true); }}>{user ? 'Your account' : 'Sign in'}</button>
    </div>

    {view === 'cart' ? <CartView user={user} cart={cart} removeFromCart={removeFromCart} onBack={() => setView('home')} onOpen={(item) => setActiveProduct(item)} onMessage={(item) => { if (user?.id && item.sellerId && String(user.id) === String(item.sellerId)) return notify('This is your listing. Buyers can message you from the listing.'); requireMember(() => { setChatProduct(item); setShowChat(true); }); }} notify={notify} /> : <>
      <main>
        <div className="reloop-video-stage" ref={heroStageRef}>
          <video ref={heroVideoRef} className="reloop-hero-video" src={heroVideoReady ? 'https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260530_042513_df96a13b-6155-4f6e-8b93-c9dee66fba08.mp4' : undefined} muted playsInline preload={heroVideoReady ? 'metadata' : 'none'} aria-hidden="true" />
          <div className="reloop-hero-overlay" aria-hidden="true" />
          <div className="hero-effects" aria-hidden="true"><span className="hero-guide hero-guide-top"/><span className="hero-guide hero-guide-bottom"/><span className="hero-guide hero-guide-side"/><span className="hero-crosshair hero-crosshair-one"/><span className="hero-crosshair hero-crosshair-two"/><span className="hero-grain"/></div>
          <section className="reloop-video-hero">
            <div className="reloop-video-copy">
              <h1 className="reloop-video-intro">Find pre-loved things nearby.<br/>Keep good things moving.</h1>
              <p className="reloop-video-text"><span>{heroMessage}</span>{!heroMessageDone && <i className="typewriter-cursor" aria-hidden="true"/>}</p>
              <div className={`reloop-video-actions ${heroActionsVisible ? 'is-visible' : ''}`}>
                <button className="hero-pill" onClick={openBrowse}>Browse listings <Icon name="arrow" size={15}/></button>
                <button className="hero-pill" onClick={() => requireMember(() => setShowSell(true))}>Post an item <Icon name="plus" size={15}/></button>
                <button className="hero-pill" onClick={() => document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth' })}>How it works</button>
                <button className="hero-pill hero-pill-outline" onClick={focusSearch}>Search the community <Icon name="search" size={14}/></button>
              </div>
            </div>
          </section>
        </div>
        <section className="browse-section" data-reveal="section" id="browse">
          <div className="section-heading" data-reveal="heading">
            <div><p className="eyebrow">Recently shared</p><h2>Find your <em>next thing.</em></h2></div>
            <div className="heading-note">Browse available items, compare details, then contact the person who listed it.</div>
          </div>
          <div className="browse-layout">
            <aside className="feed-sidebar" aria-label="Listing categories">
              <h3>Categories</h3>
              <div className="category-tabs" role="group" aria-label="Filter by category">
                {LISTING_CATEGORIES.map(item => (
                  <button key={item} className={category === item ? 'active' : ''} aria-pressed={category === item} onClick={() => setCategory(item)}>
                    <span>{item}</span>{!hasMoreListings && <span className="category-count">{categoryCounts[item]}</span>}
                  </button>
                ))}
              </div>
            </aside>
            <div className="feed-main">
              <div className="feed-toolbar">
                <label className="search-field">
                  <Icon name="search" size={18}/>
                  <input className="search-input" aria-label="Search listings" value={query} onChange={e => setQuery(e.target.value)} placeholder="Search items or places"/>
                </label>
                <label className="sort-control">
                  <span>Sort by</span>
                  <select aria-label="Sort listings" value={sortBy} onChange={event => setSortBy(event.target.value)}>
                    <option value="recent">Recently added</option>
                    <option value="price-low">Price low (currency)</option>
                    <option value="price-high">Price high (currency)</option>
                    <option value="title">Name: A to Z</option>
                  </select>
                </label>
              </div>
              <div className="results-meta" aria-live="polite">
                <span>{isLoading ? 'Loading community listings' : hasMoreListings ? `Showing ${filtered.length} loaded listings so far` : `${filtered.length} ${filtered.length === 1 ? 'listing' : 'listings'}`}</span>
                {(query || category !== 'All finds' || sortBy !== 'recent') && <button onClick={clearFilters}>Clear filters <Icon name="close" size={13}/></button>}
              </div>
              {feedError && <div className="feed-error"><div><strong>We hit a small snag.</strong><span>{feedError}</span></div><button onClick={() => loadListings()}>Retry <Icon name="arrow" size={14}/></button></div>}
              {isLoading ? <div className="feed-loading" role="status"><span className="loading-indicator" aria-hidden="true"/><span>Loading listings from the community</span></div> : <div className="product-grid" data-reveal="grid">{filtered.map((product, index) => <ProductCard key={product.id} product={product} index={index} onOpen={() => setActiveProduct(product)} onAdd={() => addToCart(product)} />)}</div>}
              {!isLoading && filtered.length === 0 && !feedError && <div className="empty-state"><div className="empty-orbit">r</div><h3>{products.length === 0 ? isSupabaseConfigured ? 'The shelf is waiting for its first story.' : 'The marketplace is not connected yet.' : 'Nothing matches that search.'}</h3><p>{products.length === 0 ? isSupabaseConfigured ? 'Have something useful to pass on? List it and start the loop.' : 'Please check back soon while the marketplace is being set up.' : 'Try another keyword or clear your filters to see more finds.'}</p>{(products.length > 0 || isSupabaseConfigured) && <button className="button button-dark" onClick={products.length === 0 ? () => requireMember(() => setShowSell(true)) : clearFilters}>{products.length === 0 ? 'Post an item' : 'Show all finds'} <Icon name="arrow" size={15}/></button>}</div>}
              {!isLoading && hasMoreListings && <div className="load-more-wrap"><button className="button button-outline" type="button" onClick={() => loadListings({ append: true })} disabled={isLoadingMore}>{isLoadingMore ? 'Loading more finds…' : 'Load more finds'} <Icon name="arrow" size={15}/></button></div>}
            </div>
          </div>
        </section>
        <section className="how-section" data-reveal="section" id="how-it-works"><div className="how-intro"><p className="eyebrow">How it works</p><h2>From shelf to <em>someone new.</em></h2><p>Reloop helps neighbours find items, ask questions, and arrange a direct handoff.</p><button className="button button-outline" onClick={() => requireMember(() => setShowSell(true))}>List an item <Icon name="arrow" size={17}/></button></div><div className="steps"><div className="step"><span>01</span><div><h3>Share the details</h3><p>Add a real photo, describe the condition, and set a minimum cash offer.</p></div></div><div className="step"><span>02</span><div><h3>Talk it through</h3><p>Ask questions or suggest a cash offer, an exchange, or both.</p></div></div><div className="step"><span>03</span><div><h3>Arrange the handoff</h3><p>Agree on the details directly. Reloop does not collect payment or arrange delivery.</p></div></div></div></section>
      </main>
      <footer data-reveal="section"><div className="footer-brand"><span className="mark">r</span><span>reloop</span><p>Pre-loved, passed on.</p></div><nav className="footer-links" aria-label="Footer navigation"><button onClick={() => document.getElementById('browse')?.scrollIntoView({ behavior: 'smooth' })}>Browse</button><button onClick={() => document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth' })}>How it works</button><button onClick={() => setLegalPage('guidelines')}>Community guidelines</button><button onClick={() => setLegalPage('terms')}>Terms</button><button onClick={() => setLegalPage('privacy')}>Privacy</button><button onClick={() => setCookieConsent(null)}>Cookie settings</button></nav><span className="footer-note">A better place for useful things.</span></footer>
    </>}

    {!cookieConsent && <CookieBanner analyticsConfigured={/^G-[A-Z0-9]+$/i.test(import.meta.env.VITE_GA4_ID || '')} onAccept={() => saveCookiePreference('accepted')} onEssential={() => saveCookiePreference('essential')} onPrivacy={() => setLegalPage('privacy')} />}
    {activeProduct && <ProductModal product={activeProduct} user={user} onClose={() => setActiveProduct(null)} onAdd={() => { addToCart(activeProduct); setActiveProduct(null); }} onMessage={() => requireMember(() => { setActiveProduct(null); setChatProduct(activeProduct); setShowChat(true); })} onOffer={() => requireMember(() => setShowOffer(true))} onSellerProfile={() => { setActiveProduct(null); setActiveSellerId(activeProduct.sellerId); }} onDeleted={() => { setProducts(items => items.filter(item => item.id !== activeProduct.id)); setActiveProduct(null); notify('Listing deleted'); }} onUpdated={() => { setActiveProduct(null); notify('Listing updated'); }} />}
    {activeSellerId && <SellerProfileModal sellerId={activeSellerId} user={user} onClose={() => setActiveSellerId(null)} />}
    {showSell && <SellModal user={user} onRequireAuth={() => { setShowSell(false); setShowAuth(true); }} onClose={() => setShowSell(false)} notify={notify} />}
    {showInbox && user && <InboxModal user={user} onClose={() => setShowInbox(false)} />}
    {showOffer && activeProduct && <OfferModal product={activeProduct} user={user} onClose={() => setShowOffer(false)} onSubmitted={() => { setShowOffer(false); notify('Your offer is now visible to the community'); }} />}
    {showChat && chatProduct && <ChatModal product={chatProduct} user={user} onClose={() => setShowChat(false)} onSent={() => { setShowChat(false); notify('Private message sent'); }} />}
    {showAuth && <AuthModal onClose={() => setShowAuth(false)} onGoogle={async () => { try { await signInWithGoogle(); } catch (error) { notify(error.message); } }} onEmail={async (email) => { try { await signInWithEmail(email); return true; } catch (error) { notify(error.message); return false; } }} configured={isSupabaseConfigured} />}
    {user && showProfileSetup && <ProfileSetupModal user={user} onSaved={(savedProfile) => { setProfile(savedProfile); setShowProfileSetup(false); notify('Profile complete — you can now post and exchange'); }} onSignOut={handleSignOut} />}
    {user && showAccount && <AccountModal user={user} profile={profile} onClose={() => setShowAccount(false)} onSignOut={handleSignOut} />}
    {legalPage && <LegalModal page={legalPage} onClose={() => setLegalPage(null)} />}
    {toast && <div className="toast"><Icon name="check" size={17}/>{toast}</div>}
    {authCallbackError && <div className="toast auth-callback-toast"><Icon name="close" size={17}/>{authCallbackError}</div>}
  </div>;
}

// -----------------------------------------
// Card and modal components
// These are kept in the same file so the app
// stays easy to understand while still working
// as a single-page marketplace.
// -----------------------------------------

function ProductCard({ product, index, onOpen, onAdd }) {
  const mode = product.mode.toLowerCase();
  const modeType = mode.includes('exchange') && !mode.includes('sale') && !mode.includes('buy') ? 'exchange' : 'sale';

  return (
    <article className={`product-card card-${index % 3}`} data-reveal="card" style={{ animationDelay: `${(index % 6) * 55}ms` }}>
      <button className="product-image-wrap" onClick={onOpen} aria-label={`View ${product.title} listing`}>
        {product.image ? (
          <img src={product.image} alt={product.title} loading="lazy" decoding="async" />
        ) : (
          <div className="listing-placeholder">
            <span>{product.title.slice(0, 1).toUpperCase()}</span>
          </div>
        )}
        <span className="condition">{product.condition}</span>
        <span className="view-item">View item <Icon name="arrow" size={14} /></span>
      </button>

      <div className="product-info">
        <div>
          <h3>{product.title}</h3>
          <p>{product.seller} <span>·</span> {product.location}</p>
        </div>
        <strong>{formatMoney(product.price, product.currency)}</strong>
      </div>

      <div className="product-bottom">
        <span className="mode" data-mode={modeType}>{product.mode}</span>
        <button className="add-small" onClick={onAdd}>
          <Icon name="bag" size={15} /> Add
        </button>
      </div>
    </article>
  );
}

function ProductModal({product,user,onClose,onAdd,onMessage,onOffer,onSellerProfile,onDeleted,onUpdated}){
  // Product detail modal stores comment state locally so it can update without reloading the page.
  const [comments,setComments]=useState([]);
  const [body,setBody]=useState('');
  const [busy,setBusy]=useState(false);
  const [editing,setEditing]=useState(false);
  const [deleteConfirm,setDeleteConfirm]=useState(false);
  const [replyingTo,setReplyingTo]=useState(null);
  const listingAuthorId=product.sellerId ?? product.seller_id ?? product.user_id ?? product.created_by ?? product.author_id ?? product.profiles?.id ?? product.profile?.id ?? null;
  const owner=Boolean(user?.id && listingAuthorId && String(user.id)===String(listingAuthorId));
  const refresh=()=>getListingComments(product.id).then(setComments).catch(()=>{});
  useEffect(()=>{refresh()},[product.id]);
  const startReply=(comment)=>{setReplyingTo(comment);setBody(`@${comment.author_id?.slice(0,6)||'member'} `)};
  const post=async()=>{if(!user)return alert('Sign in to comment.');if(!body.trim())return;setBusy(true);try{await addListingComment({listingId:product.id,body},user);setBody('');setReplyingTo(null);refresh()}catch(e){alert(e.message)}finally{setBusy(false)}};
  const remove = async () => {
    setBusy(true);
    try {
      await deleteListing(product.id, user);
      setDeleteConfirm(false);
      onDeleted();
    } catch (error) {
      alert(error.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="overlay">
      <div className="modal product-modal clean-product-modal" role="dialog" aria-modal="true" aria-label={`${product.title} listing details`}>
        <button className="modal-close" onClick={onClose} aria-label="Close listing details"><Icon name="close"/></button>
        <div className="modal-product-image">
          {product.image ? <img src={product.image} alt={product.title}/> : <div className="listing-placeholder"><span>{product.title.slice(0, 1).toUpperCase()}</span></div>}
          <span className="photo-rgb-frame" aria-hidden="true"/>
          <span className="photo-floating-light photo-floating-light-red" aria-hidden="true"/>
          <span className="photo-floating-light photo-floating-light-blue" aria-hidden="true"/>
          <span className="photo-floating-light photo-floating-light-green" aria-hidden="true"/>
          <div className="listing-photo-caption"><span>Community find</span><strong>{product.category}</strong></div>
        </div>
        <div className="modal-product-copy">
          <div className="listing-kicker"><span>Community listing</span><span>{product.condition}</span></div>
          <h2>{product.title}</h2>
          <button className="seller-profile-row" onClick={onSellerProfile}>
            <span className="seller-mini-avatar">{product.seller.slice(0, 1).toUpperCase()}</span>
            <span><b>{product.seller}</b><small>View community profile</small></span>
            <Icon name="arrow" size={16}/>
          </button>
          <div className="modal-price">{formatMoney(product.minPrice || product.price, product.currency)}<span>minimum cash offer</span></div>
          <p className="listing-description">{product.description}</p>
          <div className="tag-list">{product.tags.map(tag => <span key={tag}>{tag}</span>)}</div>
          {owner ? (
            <div className="owner-toolbar">
              <span><b>Your listing</b><small>Manage this post</small></span>
              <button onClick={() => setEditing(true)}>Edit Listing</button>
              <button className="danger-text" onClick={() => setDeleteConfirm(true)} disabled={busy}>Delete Listing</button>
              <button onClick={onClose}>Post Another Item <Icon name="plus" size={13}/></button>
            </div>
          ) : (
            <div className="modal-actions">
              <button className="button button-dark" onClick={onOffer}><Icon name="message" size={17}/> Make an offer</button>
              <button className="button button-soft" onClick={onAdd}><Icon name="bag" size={17}/> Add to basket</button>
              <button className="text-link" onClick={onMessage}><Icon name="message" size={16}/> Chat privately with {product.seller}</button>
            </div>
          )}
          <div className="community-thread">
            <div className="thread-heading"><div><b>Community comments</b><small>Visible to everyone</small></div><span>{comments.length}</span></div>
            <div className="comment-list">
              {comments.length ? comments.map(comment => (
                <div className="public-comment" key={comment.id}>
                  <span className="comment-avatar">{(comment.author_id || 'R').slice(0, 1).toUpperCase()}</span>
                  <div><b>Community member</b><p>{comment.body}</p><button className="comment-reply" onClick={() => startReply(comment)}>Reply</button></div>
                </div>
              )) : <p className="thread-empty">Ask a question or leave the first helpful note.</p>}
            </div>
            <div className="comment-composer">
              {replyingTo && <div className="replying-note">Replying publicly to a community member <button onClick={() => { setReplyingTo(null); setBody(''); }}>Cancel</button></div>}
              <textarea value={body} onChange={event => setBody(event.target.value)} rows="2" placeholder={owner ? 'Reply to a buyer publicly...' : 'Write a public comment...'}/>
              <button className="button button-dark" onClick={post} disabled={busy}>{busy ? 'Posting...' : owner ? 'Post seller reply' : 'Post comment'} <Icon name="arrow" size={15}/></button>
            </div>
          </div>
        </div>
      </div>
      {editing && <EditListingModal product={product} user={user} onClose={() => setEditing(false)} onSaved={() => { setEditing(false); onUpdated(); }}/>}
      {deleteConfirm && <DeleteConfirmModal title={product.title} busy={busy} onCancel={() => setDeleteConfirm(false)} onConfirm={remove}/>}
    </div>
  );
}

function DeleteConfirmModal({ title, busy, onCancel, onConfirm }) {
  return (
    <div className="overlay confirm-overlay">
      <div className="confirm-card" role="dialog" aria-modal="true" aria-labelledby="delete-listing-title">
        <div className="confirm-icon" aria-hidden="true">!</div>
        <p className="eyebrow">Delete listing</p>
        <h2 id="delete-listing-title">Remove <em>{title}?</em></h2>
        <p>This action cannot be undone. Press and hold to confirm deletion.</p>
        <div className="confirm-actions">
          <button className="button button-soft" onClick={onCancel} disabled={busy} autoFocus>Keep listing</button>
          <HoldButton
            doneLabel={busy ? 'Deleting…' : 'Confirmed'}
            backgroundColor="var(--forest-deep)"
            fillColor="var(--rust-dark)"
            textColor="var(--paper)"
            fillTextColor="#ffffff"
            size="md"
            radius={6}
            holdTime={1800}
            releaseTime={180}
            pressScale={0.985}
            wave={false}
            glow={false}
            resetAfter={1500}
            disabled={busy}
            onHold={onConfirm}
          >
            Hold to delete
          </HoldButton>
        </div>
      </div>
    </div>
  );
}
function EditListingModal({product,user,onClose,onSaved}){const [form,setForm]=useState({title:product.title,description:product.description,min_price:product.minPrice,currency:product.currency || 'USD'});const [busy,setBusy]=useState(false);const save=async()=>{setBusy(true);try{await updateListing(product.id,{title:form.title,description:form.description,min_price:Number(form.min_price),price:Number(form.min_price),currency:form.currency},user);onSaved()}catch(e){alert(e.message)}finally{setBusy(false)}};return <div className="overlay edit-overlay"><div className="modal form-modal compact-edit"><button className="modal-close" onClick={onClose}><Icon name="close"/></button><p className="eyebrow">Manage listing</p><h2>Update your <em>post.</em></h2><label className="standalone-label">Item title<input value={form.title} onChange={e=>setForm({...form,title:e.target.value})}/></label><div className="price-currency-row"><label className="standalone-label">Minimum cash offer<input type="number" min="1" value={form.min_price} onChange={e=>setForm({...form,min_price:e.target.value})}/></label><label className="standalone-label">Currency<select value={form.currency} onChange={e=>setForm({...form,currency:e.target.value})}>{CURRENCY_OPTIONS.map(option=><option key={option.code} value={option.code}>{option.label}</option>)}</select></label></div><label className="standalone-label">Description<textarea rows="5" value={form.description} onChange={e=>setForm({...form,description:e.target.value})}/></label><button className="button button-dark full-button" onClick={save} disabled={busy}>{busy?'Saving changes...':'Save changes'} <Icon name="check" size={16}/></button></div></div>}
function ChatModal({product,user,onClose,onSent}){const [body,setBody]=useState('');const [busy,setBusy]=useState(false);const send=async()=>{if(!user)return alert('Sign in to message this member.');if(product.sellerId && String(user.id)===String(product.sellerId))return alert('You cannot message yourself. Buyers can message you from your listing.');setBusy(true);try{await sendDirectMessage({recipientId:product.sellerId,listingId:product.id,body},user);onSent()}catch(e){alert(e.message)}finally{setBusy(false)}};return <div className="overlay"><div className="modal chat-modal"><button className="modal-close" onClick={onClose}><Icon name="close"/></button><p className="eyebrow">Private conversation</p><h2>Message <em>{product.seller}.</em></h2><p className="form-lede">Only you and the listing owner can see this message.</p><textarea rows="6" value={body} onChange={e=>setBody(e.target.value)} placeholder="Hi, I am interested in this item..."/><button className="button button-dark full-button" onClick={send} disabled={busy}>{busy?'Sending...':'Send private message'} <Icon name="arrow" size={16}/></button></div></div>}
function SellerProfileModal({sellerId,onClose}){const [seller,setSeller]=useState(null);useEffect(()=>{getPublicProfile(sellerId).then(setSeller).catch(()=>{})},[sellerId]);const name=seller?.username||seller?.display_name||'Reloop member';return <div className="overlay"><div className="modal seller-profile-modal"><button className="modal-close" onClick={onClose}><Icon name="close"/></button><div className="seller-profile-hero"><div className="seller-large-avatar">{seller?.avatar_url?<img src={seller.avatar_url} alt=""/>:name.slice(0,2).toUpperCase()}</div><p className="eyebrow">Community member</p><h2>{name}</h2><p>{seller?.city||'Location not shared'}</p></div><div className="seller-profile-body"><p className="drawer-section-title">Seller ratings are paused</p><p className="drawer-muted">Ratings will return when the app can verify a completed trade. No rating is shown or accepted at this time.</p></div></div></div> }

function CartView({ user, cart, removeFromCart, onBack, onOpen, onMessage, notify }) { const currencies = [...new Set(cart.map(item => item.currency || 'USD'))]; const total = currencies.length === 1 ? formatMoney(cart.reduce((sum, item) => sum + Number(item.price || 0), 0), currencies[0]) : 'Mixed currencies'; const itemCount = cart.length; return <main className="cart-page premium-cart"><div className="cart-topline"><button className="back-link" onClick={onBack}><Icon name="arrow" size={15}/> Continue browsing</button><span className="cart-secure"><Icon name="check" size={13}/> {user ? 'Synced to your account across devices' : 'Saved on this device until you sign in'}</span></div><div className="cart-heading"><div><p className="eyebrow">Your considered collection</p><h1>Your <em>basket.</em></h1><p className="cart-lede">Keep a few good finds close. Message the seller before you decide whether it is a buy or a swap.</p></div><div className="cart-count-card"><strong>{itemCount.toString().padStart(2, '0')}</strong><span>{itemCount === 1 ? 'find saved' : 'finds saved'}</span></div></div>{cart.length === 0 ? <div className="premium-empty-cart"><div className="empty-bag-mark"><Icon name="bag" size={28}/></div><p className="eyebrow">A little room to fill</p><h2>Your basket is waiting.</h2><p>When something catches your eye, tap <b>Add</b> and it will appear here with its seller, price, and exchange details.</p><button className="button button-dark" onClick={onBack}>Explore community finds <Icon name="arrow" size={16}/></button></div> : <div className="cart-layout premium-cart-layout"><section className="cart-card premium-items-card"><div className="cart-card-heading"><div><span className="eyebrow">Ready when you are</span><h2>{itemCount === 1 ? 'One good find.' : 'Your good finds.'}</h2></div><span className="cart-card-kicker">{itemCount} {itemCount === 1 ? 'item' : 'items'}</span></div><div className="cart-items">{cart.map((item, index) => <article className="cart-item premium-cart-item" key={item.id}><div className="cart-item-number">{String(index + 1).padStart(2, '0')}</div><div className="cart-item-image">{item.image ? <img src={item.image} alt={item.title}/> : <div className="listing-placeholder"><span>{item.title.slice(0, 1).toUpperCase()}</span></div>}</div><div className="cart-item-copy"><span className="cart-item-mode">{item.mode || 'Community listing'}</span><h3>{item.title}</h3><p>{item.seller} <span>·</span> {item.location}</p><div className="cart-item-actions"><button className="cart-detail-link" onClick={() => onOpen(item)}>View details <Icon name="arrow" size={13}/></button><button className="cart-message-link" onClick={() => onMessage(item)}><Icon name="message" size={13}/> Message seller</button><button className="cart-remove" onClick={() => removeFromCart(item.id)}><Icon name="close" size={13}/> Remove</button></div></div><strong className="cart-item-price">{formatMoney(item.price, item.currency)}</strong></article>)}</div><button className="continue-link" onClick={onBack}><Icon name="plus" size={14}/> Add another find</button></section><aside className="cart-summary-card"><p className="eyebrow">Your basket, at a glance</p><h2>Take it <em>further.</em></h2><div className="summary-row"><span>{itemCount} {itemCount === 1 ? 'find' : 'finds'}</span><strong>{total}</strong></div><div className="summary-rule"/><div className="summary-note"><span className="summary-dot"><Icon name="message" size={14}/></span><p>Buying is only one path. Open an item to ask a question, make a cash offer, or suggest a swap.</p></div><button className="button button-dark full-button" onClick={() => onMessage(cart[0])}>Start a conversation <Icon name="message" size={16}/></button><p className="summary-footnote"><Icon name="check" size={13}/> No payment is taken here. Agree directly with the seller.</p></aside></div>}</main> }
function SellModal({ user, onRequireAuth, onClose, notify }) { const [form, setForm] = useState({ title: '', category: 'Other', monthsOwned: '', originalPrice: '', minPrice: '', condition: '', quality: '', exchangePreference: 'Buy or exchange', currency: 'NPR', description: '', acceptsAnyItem: true, photo: null, previewUrl: '' }); const [saving, setSaving] = useState(false); const update = (key, value) => setForm(current => ({ ...current, [key]: value })); const choosePhoto = (file) => { if (!file) return; if (!file.type.startsWith('image/')) return notify('Please choose an image file.'); if (file.size > 8 * 1024 * 1024) return notify('Listing photos must be smaller than 8 MB.'); update('photo', file); update('previewUrl', URL.createObjectURL(file)); }; const submit = async () => { if (!user) return onRequireAuth(); if (!form.photo || !form.title.trim() || !form.description.trim() || !form.condition || !form.quality || Number(form.monthsOwned) < 1 || Number(form.originalPrice) <= 0 || Number(form.minPrice) < 1) return notify('Photo, description, purchase months, original price, minimum offer, condition, and quality are required.'); setSaving(true); try { const imageUrl = await uploadListingImage(form.photo, user); const saved = await saveListing({ ...form, imageUrl }, user); onClose(); notify(saved?.currencyFallback ? 'Item posted. Run the currency migration in Supabase to enable NPR persistence.' : 'Your verified item is now live on Reloop'); } catch (error) { notify(error.message); } finally { setSaving(false); } }; return <div className="overlay"><div className="modal form-modal sell-modal"><button className="modal-close" onClick={onClose}><Icon name="close"/></button><p className="eyebrow">Put a good thing back in motion</p><h2>Post a real <em>item.</em></h2><p className="form-lede">A real photo and honest history help neighbours make safe, fair offers.</p><div className="photo-upload"><input id="listing-photo" type="file" accept="image/*" onChange={e => choosePhoto(e.target.files?.[0])}/><label htmlFor="listing-photo">{form.previewUrl ? <img src={form.previewUrl} alt="Selected listing preview"/> : <><span className="upload-plus">+</span><strong>Add a real photo</strong><small>Required · JPG, PNG, WEBP up to 8 MB</small></>}</label></div><div className="form-grid"><label className="full">Item name <span className="required-mark">required</span><input value={form.title} onChange={e => update('title', e.target.value)} placeholder="e.g. Bicycle, phone, books..."/></label><label className="full">Description <span className="required-mark">required</span><textarea rows="3" value={form.description} onChange={e => update('description', e.target.value)} placeholder="What is included, where it was used, and anything a buyer should know..."></textarea></label><label>How long owned <span className="required-mark">required</span><input type="number" min="1" step="1" value={form.monthsOwned} onChange={e => update('monthsOwned', e.target.value)} placeholder="e.g. 3 months"/></label><label>Original purchase price <span className="required-mark">required</span><input type="number" min="0.01" step="0.01" value={form.originalPrice} onChange={e => update('originalPrice', e.target.value)} placeholder="What you paid"/></label><div className="price-currency-row"><label>Current minimum cash offer <span className="required-mark">required</span><input type="number" min="1" step="0.01" value={form.minPrice} onChange={e => update('minPrice', e.target.value)} placeholder="Enter amount"/></label><label>Currency <span className="required-mark">required</span><select value={form.currency} onChange={e => update('currency', e.target.value)}>{CURRENCY_OPTIONS.map(option=><option key={option.code} value={option.code}>{option.label}</option>)}</select></label></div><label>Condition <span className="required-mark">required</span><select value={form.condition} onChange={e => update('condition', e.target.value)}><option value="">Choose condition</option><option>Like new</option><option>Good</option><option>Fair</option><option>Needs repair</option></select></label><label>Quality <span className="required-mark">required</span><select value={form.quality} onChange={e => update('quality', e.target.value)}><option value="">Choose quality</option><option>Excellent</option><option>Good</option><option>Average</option><option>Needs care</option></select></label><label>Category <span className="optional-mark">optional</span><select value={form.category} onChange={e => update('category', e.target.value)}><option>Other</option><option>Clothing</option><option>Home</option><option>Tech</option><option>Accessories</option><option>Sports</option><option>Kids</option><option>Vehicles</option></select></label><label>Offer preference <span className="optional-mark">optional</span><select value={form.exchangePreference} onChange={e => update('exchangePreference', e.target.value)}><option>Buy or exchange</option><option>Cash preferred</option><option>Exchange preferred</option></select></label><label className="checkbox-label full"><input type="checkbox" checked={form.acceptsAnyItem} onChange={e => update('acceptsAnyItem', e.target.checked)}/> Accept proposals for any kind of item <span className="optional-mark">optional</span></label></div><button className="button button-dark full-button" disabled={saving} onClick={submit}>{saving ? 'Uploading and publishing...' : 'Publish this item'} <Icon name="arrow" size={17}/></button><small className="form-footnote">Required details are stored with the listing so buyers can compare history honestly.</small></div></div> }

function OfferModal({ product, user, onClose, onSubmitted }) { const [form, setForm] = useState({ offerType: 'cash', cashAmount: '', itemDescription: '', message: '' }); const [saving, setSaving] = useState(false); const update = (key, value) => setForm(current => ({ ...current, [key]: value })); const submit = async () => { if (!/^[0-9a-f-]{36}$/i.test(product.id)) return onSubmitted(); if (form.offerType !== 'item' && Number(form.cashAmount) < Number(product.minPrice || product.price || 1)) return alert(`Cash offers must be at least ${formatMoney(product.minPrice || product.price, product.currency)}`); setSaving(true); try { await createOffer({ listingId: product.id, ...form }, user); onSubmitted(); } catch (error) { alert(error.message); } finally { setSaving(false); } }; return <div className="overlay"><div className="modal form-modal"><button className="modal-close" onClick={onClose}><Icon name="close"/></button><p className="eyebrow">Make it a good offer</p><h2>Offer for <em>{product.title}</em></h2><p className="form-lede">Your offer is private and will only be visible to you and the listing owner.</p><div className="offer-type-tabs">{[['cash','Cash'],['item','Item'],['cash_and_item','Cash + item']].map(([value, label]) => <button key={value} className={form.offerType === value ? 'active' : ''} onClick={() => update('offerType', value)}>{label}</button>)}</div>{form.offerType !== 'item' && <label className="standalone-label">Cash amount<input type="number" min={product.minPrice || product.price || 1} value={form.cashAmount} onChange={e => update('cashAmount', e.target.value)} placeholder={`Minimum ${formatMoney(product.minPrice || product.price || 1, product.currency)}`} /></label>}{form.offerType !== 'cash' && <label className="standalone-label">Item you will offer<input value={form.itemDescription} onChange={e => update('itemDescription', e.target.value)} placeholder="e.g. a desk lamp, bicycle, books..."/></label>}<label className="standalone-label">Private message<textarea rows="3" value={form.message} onChange={e => update('message', e.target.value)} placeholder="Tell the owner why this is a good match..."></textarea></label><button className="button button-dark full-button" onClick={submit} disabled={saving}>{saving ? 'Sending...' : 'Send private offer'} <Icon name="arrow" size={17}/></button><small className="form-footnote">Only you and the listing owner can view this offer.</small></div></div> }
function InboxModal({ user, onClose }) {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadMessages = () => {
    setLoading(true);
    setError('');
    return getDirectMessages(user)
      .then(setMessages)
      .catch((loadError) => setError(getFriendlyError(loadError, 'Your conversations could not be loaded.')))
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadMessages(); }, [user.id]);

  return <div className="overlay">
    <div className="modal inbox-modal">
      <button className="modal-close" onClick={onClose} aria-label="Close inbox"><Icon name="close"/></button>
      <p className="eyebrow">Your conversations</p>
      <h2>Keep the loop <em>moving.</em></h2>
      {loading && <div className="empty-state inbox-empty">Loading your private conversations...</div>}
      {!loading && error && <div className="auth-error-note">{error} <button className="text-link" onClick={loadMessages}>Try again</button></div>}
      {!loading && !error && messages.length === 0 && <div className="empty-state inbox-empty">Your private conversations will appear here when another member messages you about a live listing.</div>}
      {!loading && !error && messages.length > 0 && <div className="inbox-message-list" aria-label="Private messages">{messages.map((message) => <article className="inbox-message" key={message.id}><div className="inbox-message-meta"><strong>{message.sender_id === user.id ? 'You' : 'Another member'}</strong><time dateTime={message.created_at}>{new Date(message.created_at).toLocaleString()}</time></div><p>{message.body}</p></article>)}</div>}
      <button className="button button-soft full-button" onClick={onClose}>Close inbox</button>
    </div>
  </div>;
}
function AuthModal({ onClose, onGoogle, onEmail, configured }) { const [email, setEmail] = useState(''); const [sending, setSending] = useState(false); const [sent, setSent] = useState(false); const emailSubmit = async () => { setSending(true); const success = await onEmail(email); setSent(Boolean(success)); setSending(false); }; return <div className="overlay" onClick={event => { if (event.target === event.currentTarget) onClose(); }}><div className="modal auth-modal"><button className="modal-close" aria-label="Back to dashboard" title="Back to dashboard" onClick={onClose}><Icon name="close"/></button><div className="auth-mark">r</div><p className="eyebrow">Your corner of the loop</p><h2>Sign in to <em>reloop.</em></h2><p className="form-lede">Use Google or get a secure sign-in link by email. No password to remember.</p><button className="google-button" onClick={onGoogle}><span className="google-g">G</span> Continue with Google</button><div className="auth-divider"><span>or use email</span></div><input className="auth-email-input" type="email" value={email} onChange={e => { setEmail(e.target.value); setSent(false); }} placeholder="you@example.com"/><button className="button button-dark auth-email-button" disabled={sending || !email} onClick={emailSubmit}>{sending ? 'Sending link...' : 'Email me a sign-in link'} <Icon name="arrow" size={16}/></button>{sent && <div className="auth-success-note">Link sent. Check your inbox and spam folder, then click the secure Reloop link to finish signing in.</div>}{!configured && <div className="auth-config-note">Supabase is not connected in this preview yet. Add <code>VITE_SUPABASE_URL</code> and <code>VITE_SUPABASE_ANON_KEY</code> to activate authentication.</div>}<small className="form-footnote">Email links are verified by Supabase Auth. Google requires the Google provider to be enabled in Supabase.</small></div></div> }
function ProfileSetupModal({ user, onSaved, onSignOut }) { const [form, setForm] = useState({ username: user.user_metadata?.name || '', phone: '', city: '' }); const [saving, setSaving] = useState(false); const [error, setError] = useState(''); const update = (key, value) => setForm(current => ({ ...current, [key]: value })); const submit = async () => { if (!form.username.trim() || !form.phone.trim()) return setError('Username and phone number are required.'); if (!/^[+0-9 ()-]{7,20}$/.test(form.phone.trim())) return setError('Enter a valid phone number with 7–20 digits.'); setSaving(true); setError(''); try { const saved = await updateProfile(user, form); onSaved(saved); } catch (err) { setError(err.message); } finally { setSaving(false); } }; return <div className="overlay"><div className="modal form-modal profile-modal"><div className="auth-mark">r</div><p className="eyebrow">One last step</p><h2>Complete your <em>profile.</em></h2><p className="form-lede">Your Google account is verified. Add these details before posting goods or making exchanges.</p><div className="form-grid"><label className="full">Username<input value={form.username} onChange={e => update('username', e.target.value)} placeholder="How neighbours will see you"/></label><label>Phone number<input type="tel" value={form.phone} onChange={e => update('phone', e.target.value)} placeholder="+977 98..."/></label><label>City / area <span className="field-hint">free text</span><input type="text" value={form.city} onChange={e => update('city', e.target.value)} placeholder="Any city, village, neighbourhood, or area" autoComplete="address-level2"/></label></div>{error && <div className="auth-error-note">{error}</div>}<button className="button button-dark full-button" disabled={saving} onClick={submit}>{saving ? 'Saving profile...' : 'Save profile and continue'} <Icon name="arrow" size={17}/></button><button className="sign-out-secondary" onClick={onSignOut}>Use a different account</button><small className="form-footnote">Your email is verified by Google/Supabase. Phone is used for safer handoffs. Location accepts any name you type.</small></div></div> }
function AccountModal({ user, profile, onClose, onSignOut }) { const name = profile?.username || user.user_metadata?.name || 'Reloop member'; return <div className="drawer-overlay"><aside className="account-drawer"><div className="drawer-topline"><span className="drawer-label">Account</span><button className="drawer-close" aria-label="Close profile" onClick={onClose}><Icon name="close" size={19}/></button></div><div className="drawer-identity"><div className="account-avatar">{name.slice(0, 2).toUpperCase()}</div><div><h2>{name}</h2><span className="verified-pill"><Icon name="check" size={13}/> Google verified</span></div></div><div className="drawer-section"><p className="drawer-section-title">Profile details</p><div className="account-details"><div><span>Email</span><strong>{user.email || 'Not available'}</strong></div><div><span>Phone</span><strong>{profile?.phone || 'Not added'}</strong></div><div><span>City / area</span><strong>{profile?.city || 'Not added'}</strong></div></div></div><div className="drawer-section drawer-note"><p className="drawer-section-title">Your Reloop</p><p>Keep your profile current so neighbours know who they are meeting for a safe handoff.</p></div><div className="drawer-actions"><button className="button button-soft full-button" onClick={onClose}>Close profile</button><button className="account-signout" onClick={onSignOut}>Sign out</button></div></aside></div> }

function CookieBanner({ analyticsConfigured, onAccept, onEssential, onPrivacy }) {
  return <aside className="cookie-banner" aria-label="Cookie and privacy notice">
    <div><strong>Privacy choices</strong><p>Essential browser storage keeps sign-in and your basket working. {analyticsConfigured ? 'Google Analytics runs only after you accept analytics; it is never loaded when you choose essential only.' : 'Analytics is not enabled on this site.'}</p><button className="cookie-policy-link" onClick={onPrivacy}>Read the Privacy Policy</button></div>
    <div className="cookie-actions"><button className="button button-soft" onClick={onEssential}>Essential only</button><button className="button button-dark" onClick={onAccept}>{analyticsConfigured ? 'Accept analytics' : 'Accept'}</button></div>
  </aside>;
}

function LegalModal({ page, onClose }) {
  const content = {
    guidelines: {
      eyebrow: 'Community guidelines',
      title: <>Make room for <em>good exchanges.</em></>,
      sections: [
        ['List with care', 'Describe the item honestly, include its condition, and use a photo of the item you are offering.'],
        ['Use a genuine account', 'Use accurate information. Do not impersonate another person, create fake or duplicate accounts to mislead others, share an account, or evade a restriction. We may suspend or remove accounts that break these rules.'],
        ['Keep conversations respectful', 'Ask clear questions, share only the details needed to arrange an exchange, and respect another member’s boundaries.'],
        ['Plan handoffs thoughtfully', 'Members arrange collection, delivery, payment, and swaps directly. Choose a handoff that feels safe to everyone involved.']
      ]
    },
    terms: {
      eyebrow: 'Terms of use',
      title: <>Using <em>Reloop.</em></>,
      sections: [
        ['What Reloop does', 'Reloop provides tools for members to publish second-hand listings, discuss items, and make or respond to offers.'],
        ['About Reloop and our team', 'Reloop is a community marketplace operated by its team. We are not the seller, buyer, owner, custodian, delivery provider, payment processor, insurer, or authenticator of any item. We do not inspect, verify, price, store, deliver, or guarantee goods, user claims, payments, or handoffs.'],
        ['Offers, goods, and responsibility', 'Members decide directly whether to buy, swap, how to pay, and how to arrange collection or delivery. To the extent permitted by applicable law, the Reloop team is not responsible for the condition, legality, ownership, safety, loss, damage, fraud, non-delivery, payment, or performance of goods or user-to-user transactions.'],
        ['Genuine accounts', 'You must provide truthful account information and may not create fake, deceptive, impersonating, or duplicate accounts. Do not use another personâ€™s login or allow someone else to use yours.'],
        ['Member listings and conduct', 'You are responsible for the accuracy of content you post and for having the right to share it. Do not list items you cannot transfer or use the service to harass, mislead, or expose another person’s private information.'],
        ['Offers and handoffs', 'Members decide directly whether to buy, swap, how to pay, and how to arrange collection or delivery. Reloop does not collect payment, hold funds, arrange delivery, or verify the condition of an item.'],
        ['Using the service', 'Some features require a signed-in account and a completed profile. Features may depend on the availability and configuration of connected services.']
      ]
    },
    privacy: {
      eyebrow: 'Privacy',
      title: <>What the app <em>stores.</em></>,
      sections: [
        ['Account and profile', 'Sign-in is handled by Supabase. If you choose Google sign-in, Google also processes your sign-in. The app may store profile details such as your display name, username, phone number, city, and profile image.'],
        ['Marketplace activity', 'When Supabase is configured, listings and their photos, public listing comments, offers, and private messages may be stored with your account or the relevant listing. Historical ratings may remain stored, but the app currently does not show or accept them while completed trades cannot be verified. Published listings and public comments are visible to other visitors. Private messages are intended for their sender and recipient.'],
        ['Cookies and browser storage', 'Reloop uses one essential cookie to remember your privacy choice. If a Google Analytics 4 measurement ID is configured, analytics starts only after you choose Accept analytics; choosing Essential only prevents analytics from loading. Analytics is not used for advertising. While signed out, your basket is saved in this browser’s local storage. After sign-in, basket items can also sync to your account.'],
        ['Your basket', 'While signed out, your basket is saved in this browser’s local storage. After sign-in, basket items can also sync to your account. Clearing browser storage removes the local copy, but does not remove data already stored by the app.'],
        ['Account controls', 'You can sign out from account settings. Signing out does not itself delete listings, messages, or other data already stored by connected services. The app does not currently display a data-retention schedule or a contact for privacy requests.']
      ]
    }
  }[page];

  if (!content) return null;

  return <div className="overlay legal-overlay" onClick={event => { if (event.target === event.currentTarget) onClose(); }}><section className="modal legal-modal" role="dialog" aria-modal="true" aria-labelledby="legal-title">
    <button className="modal-close" aria-label="Back to dashboard" title="Back to dashboard" onClick={onClose}><Icon name="close" /></button>
    <p className="eyebrow">{content.eyebrow}</p>
    <h2 id="legal-title">{content.title}</h2>
    <div className="legal-sections">{content.sections.map(([heading, body]) => <section key={heading}><h3>{heading}</h3><p>{body}</p></section>)}</div>
    <p className="legal-disclosure">These notes describe the app’s current features. Supabase-dependent storage and account features are available only when the project is configured.</p>
  </section></div>;
}

const rootGlobalKey = '__reloop_react_root__';
const root = globalThis[rootGlobalKey] || (globalThis[rootGlobalKey] = createRoot(document.getElementById('root')));
root.render(<App />);
