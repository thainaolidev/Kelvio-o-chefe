import test from 'node:test';
import assert from 'node:assert/strict';
import { renderSite } from '../ui.js';

const routes = ['/','/marmitas-e-servicos','/o-chefe','/conteudo','/fazer-pedido'];

test('renders each public route with a title and one main landmark', () => {
  for (const route of routes) {
    const page = renderSite(route);
    assert.ok(page.title.length > 5, route);
    assert.equal((page.html.match(/<main\b/g) ?? []).length, 1, route);
    assert.match(page.html, /<nav[^>]+aria-label="Navegação principal"/);
  }
});

test('preselects a pack flavour without inserting query content into HTML', () => {
  const page = renderSite('/fazer-pedido', '?sabor=1%22%20onfocus%3D%22alert(1)');
  assert.doesNotMatch(page.html, /onfocus=/);
  assert.match(page.html, /name="flavour_1"/);
  assert.match(renderSite('/fazer-pedido', '?tipo=Marmitas&sabor=1').html, /name="flavour_1" type="number" min="0" max="40" step="1" value="1"/);
});

test('renders English pages at language-specific URLs and keeps order values stable', () => {
  for (const route of routes) {
    const englishRoute = route === '/' ? '/en' : `/en${route}`;
    const page = renderSite(englishRoute);
    assert.match(page.title, /Kelvio, O Chefe/);
    assert.match(page.html, /aria-pressed="true">EN/);
    assert.doesNotMatch(page.html, /theme-toggle|Tema claro|FEITAS COM INTENÇÃO|Queres algo feito/);
  }
  const form = renderSite('/en/fazer-pedido').html;
  assert.match(form, /value="Marmitas">Meals/);
  assert.match(form, /name="email" type="email"/);
  assert.match(form, /Send request/);
});

test('renders an accessible not-found page for unknown routes', () => {
  const page = renderSite('/nao-existe');
  assert.equal(page.notFound, true);
  assert.match(page.html, /Esta página<br><em>não está no menu\.<\/em>/);
  assert.match(page.html, /href="\/"/);
});
