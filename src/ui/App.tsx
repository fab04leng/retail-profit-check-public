import { Component, useEffect, useId, type ErrorInfo, type ReactNode } from 'react';
import { I18nProvider, LANGS, useI18n, type Lang } from '../i18n';
import { href, PAGES, useRoute, type Page } from './router';
import { AppProvider, useApp } from './state';
import { LockIcon } from './components/Icons';
import { CashflowPage } from './pages/CashflowPage';
import { FindingsPage } from './pages/FindingsPage';
import { HealthPage } from './pages/HealthPage';
import { OutletsPage } from './pages/OutletsPage';
import { ProfitPage } from './pages/ProfitPage';
import { ReportPage } from './pages/ReportPage';
import { RulesPage } from './pages/RulesPage';
import { StartPage } from './pages/StartPage';
import { StockPage } from './pages/StockPage';
import { SuppliersPage } from './pages/SuppliersPage';

class ErrorBoundary extends Component<{ children: ReactNode; title: string; body: string; resetKey: string }, { error: boolean }> {
  state = { error: false };
  static getDerivedStateFromError() {
    return { error: true };
  }
  componentDidCatch(_e: Error, _i: ErrorInfo) {
    /* never send anywhere */
  }
  componentDidUpdate(prev: { resetKey: string }) {
    if (prev.resetKey !== this.props.resetKey && this.state.error) this.setState({ error: false });
  }
  render() {
    if (this.state.error)
      return (
        <div className="card" role="alert">
          <h1>{this.props.title}</h1>
          <p>{this.props.body}</p>
          <a className="btn" href="#/start">Start</a>
        </div>
      );
    return this.props.children;
  }
}

function Header() {
  const { t } = useI18n();
  const { lang, setLang, reviewMode, setReviewMode } = useApp();
  const langId = useId();
  return (
    <header className="topbar no-print">
      <a className="brand" href={href('start')}>
        <span className="logo" aria-hidden="true">
          <svg viewBox="0 0 32 32" width="28" height="28"><rect width="32" height="32" rx="7" fill="currentColor" /><path d="M8 21l5-6 4 4 7-9" stroke="#fff" strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </span>
        <span className="brand-name">{t('app.name')}</span>
      </a>
      <span className="privacy-badge" title={t('app.privacyLong')}>
        <LockIcon size={15} /> {t('app.privacy')}
      </span>
      <div className="topbar-controls">
        <label className="toggle">
          <input type="checkbox" checked={reviewMode} onChange={(e) => setReviewMode(e.target.checked)} data-testid="review-mode" />
          <span>{t('app.reviewMode')}</span>
        </label>
        <label htmlFor={langId} className="sr-only">{t('app.language')}</label>
        <select id={langId} value={lang} onChange={(e) => setLang(e.target.value as Lang)} data-testid="lang">
          {LANGS.map((l) => <option key={l.code} value={l.code}>{l.label}</option>)}
        </select>
      </div>
    </header>
  );
}

const NAV: Page[] = PAGES.filter((p) => p !== 'start');

function Nav({ page }: { page: Page }) {
  const { t } = useI18n();
  const { payload } = useApp();
  return (
    <nav className="nav no-print" aria-label={t('app.menu')}>
      <a href={href('start')} aria-current={page === 'start' ? 'page' : undefined}>{t('nav.start')}</a>
      {NAV.map((p) => (
        <a key={p} href={href(p)} aria-current={page === p ? 'page' : undefined} className={!payload && p !== 'rules' ? 'is-dim' : ''}>
          {t(`nav.${p}`)}
        </a>
      ))}
    </nav>
  );
}

function Shell() {
  const route = useRoute();
  const { t } = useI18n();
  const { isDemo, demoShop, busy, reviewMode, lang } = useApp();
  useEffect(() => {
    document.documentElement.lang = LANGS.find((l) => l.code === lang)?.htmlLang ?? 'en';
    document.title = `${t(`nav.${route.page}`)} · ${t('app.name')}`;
  }, [lang, route.page, t]);
  useEffect(() => {
    document.getElementById('page-title')?.focus({ preventScroll: true });
  }, [route.page]);
  const pages: Record<Page, ReactNode> = {
    start: <StartPage />,
    health: <HealthPage />,
    profit: <ProfitPage />,
    stock: <StockPage />,
    suppliers: <SuppliersPage />,
    outlets: <OutletsPage />,
    cashflow: <CashflowPage />,
    findings: <FindingsPage route={route} />,
    rules: <RulesPage route={route} />,
    report: <ReportPage />,
  };
  return (
    <>
      <a className="skip" href="#main">{t('app.skipToContent')}</a>
      <Header />
      <Nav page={route.page} />
      {isDemo ? <div className="demo-banner no-print" role="note">{t('app.demoBanner', { shop: demoShop ?? '' })}</div> : null}
      {reviewMode ? <div className="review-banner no-print" role="note">{t('app.reviewMode')}: {t('app.reviewModeHint')}</div> : null}
      <main id="main" className={`page page-${route.page}`} aria-busy={busy ? true : undefined}>
        <ErrorBoundary title={t('app.errorTitle')} body={t('app.errorBody')} resetKey={route.page}>
          {pages[route.page]}
        </ErrorBoundary>
        {busy === 'analysing' ? <div className="busy no-print" role="status">{t('common.analysing')}</div> : null}
      </main>
      <footer className="footer">
        <p>{t('app.disclaimer')}</p>
        <p className="no-print">
          <LockIcon size={13} /> {t('app.privacy')}
        </p>
      </footer>
    </>
  );
}

function WithLang() {
  const { lang } = useApp();
  return (
    <I18nProvider lang={lang}>
      <Shell />
    </I18nProvider>
  );
}

export function App() {
  return (
    <AppProvider>
      <WithLang />
    </AppProvider>
  );
}
