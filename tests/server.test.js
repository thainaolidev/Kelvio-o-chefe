import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { createAppServer } from '../server.mjs';

const server = createAppServer({ configProvider: async () => ({ accessKey: 'public-test-key', siteUrl: 'https://kelvio.example' }) });
await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
const origin = `http://127.0.0.1:${server.address().port}`;
after(() => new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve())));

test('serves all direct routes and whitelisted modules with security headers', async () => {
  for (const path of ['/', '/marmitas-e-servicos', '/o-chefe', '/conteudo', '/fazer-pedido', '/en', '/en/marmitas-e-servicos', '/en/o-chefe', '/en/conteudo', '/en/fazer-pedido', '/app.js', '/ui.js', '/lib/order-form.js', '/lib/order.js', '/data/menu.js', '/data/i18n.js', '/data/images.js', '/config.js', '/styles.css', '/polish.css', '/images/chef-portrait.jpg', '/images/logo-wordmark.png']) {
    const response = await fetch(`${origin}${path}`);
    assert.equal(response.status, 200, path);
    assert.ok(response.headers.get('content-type'), path);
    assert.match(response.headers.get('content-security-policy'), /frame-ancestors 'none'/, path);
    assert.equal(response.headers.get('x-content-type-options'), 'nosniff', path);
    if (path === '/en') assert.match(await response.text(), /<html lang="en">[\s\S]*Meals, custom orders/);
    if (path === '/') assert.match(await response.text(), /<html lang="pt-PT">[\s\S]*À mesa/);
  }
});

test('never exposes project files and returns a real 404 for unknown routes', async () => {
  for (const path of ['/.env', '/package.json', '/server.mjs', '/lib/env.js', '/not-a-page']) {
    const response = await fetch(`${origin}${path}`);
    assert.equal(response.status, 404, path);
    const body = await response.text();
    assert.doesNotMatch(body, /"scripts"|WEB3FORMS_ACCESS_KEY|listen\(/);
  }
});

test('serves deployment-aware robots, sitemap, and the public Web3Forms key', async () => {
  const robots = await fetch(`${origin}/robots.txt`);
  assert.match(await robots.text(), /Sitemap: https:\/\/kelvio\.example\/sitemap\.xml/);
  const sitemap = await fetch(`${origin}/sitemap.xml`);
  assert.match(await sitemap.text(), /https:\/\/kelvio\.example\/marmitas-e-servicos/);
  const config = await fetch(`${origin}/config.js`);
  assert.match(await config.text(), /public-test-key/);
  assert.equal(config.headers.get('cache-control'), 'no-store');
});

test('rejects writes and emits HSTS only for HTTPS requests', async () => {
  const post = await fetch(`${origin}/`, { method: 'POST' });
  assert.equal(post.status, 405);
  const http = await fetch(`${origin}/`);
  assert.equal(http.headers.get('strict-transport-security'), null);
  const https = await fetch(`${origin}/`, { headers: { 'x-forwarded-proto': 'https' } });
  assert.match(https.headers.get('strict-transport-security'), /max-age=15552000/);
});
