import { renderSite } from './ui.js';
import { siteUrl, web3formsAccessKey } from './config.js';
import { attachOrderForm } from './lib/order-form.js';

let path = location.pathname.replace(/\/$/, '') || '/';
const app = document.querySelector('#app');
let language = 'pt';
try { language = path === '/en' || path.startsWith('/en/') || localStorage.getItem('kelvio-language') === 'en' ? 'en' : 'pt'; } catch { language = path === '/en' || path.startsWith('/en/') ? 'en' : 'pt'; }

function initializePage(nextLanguage, render = true) {
  language = nextLanguage;
  const page = renderSite(path, location.search, language);
  if (render) app.innerHTML = page.html;
  document.documentElement.lang = language === 'en' ? 'en' : 'pt-PT';
  document.title = page.title;
  document.querySelector('meta[name="description"]').content = page.description;
  const robots = document.querySelector('meta[name="robots"]');
  if (page.notFound && !robots) document.head.insertAdjacentHTML('beforeend', '<meta name="robots" content="noindex, nofollow">');
  else if (!page.notFound) robots?.remove();
  document.querySelector('meta[property="og:title"]').content = page.title;
  document.querySelector('meta[property="og:description"]').content = page.description;
  document.querySelector('meta[property="og:locale"]').content = language === 'en' ? 'en_GB' : 'pt_PT';
  document.querySelector('meta[property="og:image"]').content = `${siteUrl || ''}/images/chef-portrait.jpg`;
  for (const [selector, value] of [['link[rel="canonical"]', `${siteUrl}${path}`], ['meta[property="og:url"]', `${siteUrl}${path}`]]) {
    let element = document.querySelector(selector);
    if (!siteUrl) { element?.remove(); continue; }
    if (!element) {
      element = document.createElement(selector.startsWith('link') ? 'link' : 'meta');
      if (selector.startsWith('link')) element.rel = 'canonical';
      else element.setAttribute('property', 'og:url');
      document.head.append(element);
    }
    if (element.href !== undefined) element.href = value;
    else element.content = value;
  }
  attachOrderForm(document.querySelector('#order-form'), web3formsAccessKey, fetch, language);
}

initializePage(language, language !== 'pt' || !app.firstElementChild);
document.addEventListener('click', (event) => {
  const languageButton = event.target.closest('[data-language]');
  if (languageButton) {
    const next = languageButton.dataset.language;
    if (next !== language) {
      try { localStorage.setItem('kelvio-language', next); } catch { /* The selected language still works for this visit. */ }
      const basePath = path.replace(/^\/en(?=\/|$)/, '') || '/';
      path = next === 'en' ? (basePath === '/' ? '/en' : `/en${basePath}`) : basePath;
      history.pushState({}, '', `${path}${location.search}`);
      initializePage(next);
      document.querySelector(`[data-language="${next}"]`)?.focus();
    }
    return;
  }
  const menuButton = event.target.closest('.menu-toggle');
  if (menuButton) {
    const isOpen = menuButton.getAttribute('aria-expanded') === 'true';
    menuButton.setAttribute('aria-expanded', String(!isOpen));
    menuButton.setAttribute('aria-label', isOpen ? (language === 'en' ? 'Open menu' : 'Abrir menu') : (language === 'en' ? 'Close menu' : 'Fechar menu'));
    document.querySelector('#primary-navigation')?.classList.toggle('open', !isOpen);
    return;
  }
  if (event.target.closest('#primary-navigation a')) {
    document.querySelector('.menu-toggle')?.setAttribute('aria-expanded', 'false');
    document.querySelector('#primary-navigation')?.classList.remove('open');
  }
});
window.addEventListener('popstate', () => {
  path = location.pathname.replace(/\/$/, '') || '/';
  const next = path === '/en' || path.startsWith('/en/') ? 'en' : 'pt';
  try { localStorage.setItem('kelvio-language', next); } catch { /* URL language remains available for this visit. */ }
  initializePage(next);
});
document.addEventListener('keydown', (event) => {
  if (event.key !== 'Escape' || document.querySelector('.menu-toggle')?.getAttribute('aria-expanded') !== 'true') return;
  document.querySelector('.menu-toggle')?.setAttribute('aria-expanded', 'false');
  document.querySelector('.menu-toggle')?.setAttribute('aria-label', language === 'en' ? 'Open menu' : 'Abrir menu');
  document.querySelector('#primary-navigation')?.classList.remove('open');
  document.querySelector('.menu-toggle')?.focus();
});
