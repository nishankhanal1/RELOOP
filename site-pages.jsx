import React from 'react';
import { PUBLIC_PAGES, PUBLIC_PAGE_KEYS, getPublicPageKey } from './site-pages-content';

export { getPublicPageKey };

function PageLink({ href, onNavigate, onBrowse, className, children }) {
  const handleClick = (event) => {
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
      return;
    }

    if (href === '/#browse' && onBrowse) {
      event.preventDefault();
      onBrowse();
      return;
    }

    if (onNavigate) {
      event.preventDefault();
      onNavigate(href);
    }
  };

  return <a className={className} href={href} onClick={handleClick}>{children}</a>;
}

function PageActions({ page, onNavigate, onBrowse }) {
  return <div className="info-actions">
    <PageLink className="button button-dark" href={page.cta.primary.href} onNavigate={onNavigate} onBrowse={onBrowse}>
      {page.cta.primary.label} <span aria-hidden="true">→</span>
    </PageLink>
    <PageLink className="button button-outline" href={page.cta.secondary.href} onNavigate={onNavigate} onBrowse={onBrowse}>
      {page.cta.secondary.label}
    </PageLink>
  </div>;
}

export function PublicPage({ pageKey, onNavigate, onBrowse }) {
  const page = PUBLIC_PAGES[pageKey];
  if (!page) return null;

  return <main className="info-page">
    <header className="info-hero">
      <nav className="info-breadcrumb" aria-label="Breadcrumb">
        <PageLink href="/" onNavigate={onNavigate}>Home</PageLink>
        <span aria-hidden="true">/</span>
        <span aria-current="page">{page.breadcrumb}</span>
      </nav>
      <p className="eyebrow">{page.eyebrow}</p>
      <h1>{page.heading}</h1>
      <p className="info-lede">{page.lede}</p>
      <PageActions page={page} onNavigate={onNavigate} onBrowse={onBrowse} />
    </header>

    {page.sections.map((section) => <section className="info-section" key={section.heading}>
      <div className="info-section-heading">
        <h2>{section.heading}</h2>
      </div>
      <div className="info-section-body">
        {section.paragraphs?.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
        {section.cards?.length ? <div className="info-card-grid">
          {section.cards.map((card) => <article className="info-card" key={card.heading}>
            <h3>{card.heading}</h3>
            <p>{card.body}</p>
          </article>)}
        </div> : null}
        {section.items?.length ? <ul className="info-list">
          {section.items.map((item) => <li key={item}>{item}</li>)}
        </ul> : null}
      </div>
    </section>)}

    {page.faq?.length ? <section className="info-faq">
      <div className="info-section-heading">
        <p className="eyebrow">Common questions</p>
        <h2>Good to know.</h2>
      </div>
      <div className="info-faq-list">
        {page.faq.map((item) => <details key={item.question}>
          <summary>{item.question}</summary>
          <p>{item.answer}</p>
        </details>)}
      </div>
    </section> : null}

    <section className="info-cta">
      <div>
        <p className="eyebrow">Keep the loop moving</p>
        <h2>{page.cta.heading}</h2>
        <p>{page.cta.body}</p>
      </div>
      <PageActions page={page} onNavigate={onNavigate} onBrowse={onBrowse} />
    </section>

    <nav className="info-related" aria-label="More about Reloop">
      <p className="eyebrow">More about Reloop</p>
      <div>
        {PUBLIC_PAGE_KEYS.filter((key) => key !== pageKey).map((key) => <PageLink
          key={key}
          href={PUBLIC_PAGES[key].path}
          onNavigate={onNavigate}
        >{PUBLIC_PAGES[key].breadcrumb}</PageLink>)}
      </div>
    </nav>
  </main>;
}
