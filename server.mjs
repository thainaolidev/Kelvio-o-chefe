import { createServer as createHttpServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { publicConfig } from './lib/env.js';
import { renderSite } from './ui.js';

const root = process.cwd();
const mimeTypes = { '.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.xml':'application/xml; charset=utf-8','.txt':'text/plain; charset=utf-8' };
const baseRoutes = ['/','/marmitas-e-servicos','/o-chefe','/conteudo','/fazer-pedido'];
const routes = new Set([...baseRoutes, ...baseRoutes.map((route) => route === '/' ? '/en' : `/en${route}`)]);
const publicFiles = new Map([
  ['/styles.css', join(root, 'styles.css')],
  ['/polish.css', join(root, 'polish.css')],
  ['/app.js', join(root, 'app.js')],
  ['/ui.js', join(root, 'ui.js')],
  ['/data/i18n.js', join(root, 'data', 'i18n.js')],
  ['/data/images.js', join(root, 'data', 'images.js')],
  ['/data/menu.js', join(root, 'data', 'menu.js')],
  ['/lib/order.js', join(root, 'lib', 'order.js')],
  ['/lib/order-form.js', join(root, 'lib', 'order-form.js')]
]);

function securityHeaders(isHttps = false) {
  const headers = {
    'Content-Security-Policy': "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self'; font-src 'self'; connect-src 'self' https://api.web3forms.com; form-action 'self'; base-uri 'self'; object-src 'none'; frame-ancestors 'none'",
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
    'X-Frame-Options': 'DENY'
  };
  if (isHttps) headers['Strict-Transport-Security'] = 'max-age=15552000';
  return headers;
}

export function createAppServer({ projectRoot = root, configProvider = publicConfig } = {}) {
  return createHttpServer(async (req, res) => {
    const isHttps = req.headers['x-forwarded-proto'] === 'https';
    const headers = securityHeaders(isHttps);
    try {
      const url = new URL(req.url ?? '/', 'http://localhost');
      const pathname = decodeURIComponent(url.pathname);
      if (!['GET', 'HEAD'].includes(req.method ?? 'GET')) {
        res.writeHead(405, { ...headers, Allow: 'GET, HEAD' });
        res.end('Method not allowed');
        return;
      }

      const isImage = /^\/images\/(?:chef-portrait|food-detail)\.jpg$/.test(pathname) || /^\/images\/(?:logo-full-dark|logo-full-light|logo-mark-dark|logo-mark-light|logo-wordmark)\.png$/.test(pathname) || /^\/assets\/(?:chef\/kelvio-back|marmitas\/marmitas-real|eventos\/eventos-real|encomendas\/encomendas-real)\.jpg$/.test(pathname);
      const isUtilityFile = pathname === '/config.js' || pathname === '/robots.txt' || pathname === '/sitemap.xml';
      if (routes.has(pathname) || (!publicFiles.has(pathname) && !isUtilityFile && !isImage)) {
        const statusCode = routes.has(pathname) ? 200 : 404;
        res.writeHead(statusCode, { ...headers, 'Content-Type': mimeTypes['.html'], 'Cache-Control': 'no-cache' });
        let pageHtml = await readFile(join(projectRoot, 'index.html'), 'utf8');
        const page = renderSite(routes.has(pathname) ? pathname : pathname, url.search);
        const documentLanguage = pathname === '/en' || pathname.startsWith('/en/') ? 'en' : 'pt-PT';
        pageHtml = pageHtml.replace('<html lang="pt-PT">', `<html lang="${documentLanguage}">`)
          .replace('<div id="app"></div>', `<div id="app">${page.html}</div>`)
          .replace(/<title>[^<]*<\/title>/, `<title>${page.title}</title>`)
          .replace(/<meta name="description" content="[^"]*">/, `<meta name="description" content="${page.description}">`);
        if (page.notFound) pageHtml = pageHtml.replace('</head>', '  <meta name="robots" content="noindex, nofollow">\n</head>');
        res.end(req.method === 'HEAD' ? undefined : pageHtml);
        return;
      }

      if (pathname === '/config.js') {
        const config = await configProvider();
        const source = `export const web3formsAccessKey = ${JSON.stringify(config.accessKey)};\nexport const siteUrl = ${JSON.stringify(config.siteUrl)};\nexport const socialLinks = ${JSON.stringify(config.socialLinks ?? { instagram: '', tiktok: '' })};\n`;
        res.writeHead(200, { ...headers, 'Content-Type': mimeTypes['.js'], 'Cache-Control': 'no-store' });
        res.end(req.method === 'HEAD' ? undefined : source);
        return;
      }

      if (pathname === '/sitemap.xml') {
        const config = await configProvider();
        if (!config.siteUrl) {
          res.writeHead(404, { ...headers, 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' });
          res.end('Set PUBLIC_SITE_URL to enable the sitemap');
          return;
        }
        const paths = ['/','/marmitas-e-servicos','/o-chefe','/conteudo','/fazer-pedido','/en','/en/marmitas-e-servicos','/en/o-chefe','/en/conteudo','/en/fazer-pedido'];
        const urls = paths.map((path) => `<url><loc>${config.siteUrl}${path}</loc></url>`).join('');
        res.writeHead(200, { ...headers, 'Content-Type': mimeTypes['.xml'], 'Cache-Control': 'no-cache' });
        res.end(req.method === 'HEAD' ? undefined : `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls}</urlset>`);
        return;
      }

      if (pathname === '/robots.txt') {
        const config = await configProvider();
        const body = `User-agent: *\nAllow: /\n${config.siteUrl ? `Sitemap: ${config.siteUrl}/sitemap.xml\n` : ''}`;
        res.writeHead(200, { ...headers, 'Content-Type': mimeTypes['.txt'], 'Cache-Control': 'no-cache' });
        res.end(req.method === 'HEAD' ? undefined : body);
        return;
      }

      let file = publicFiles.get(pathname);
      if (!file && isImage) {
        file = join(projectRoot, 'public', pathname.slice(1));
      }
      if (!file) {
        res.writeHead(404, { ...headers, 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' });
        res.end(req.method === 'HEAD' ? undefined : 'Not found');
        return;
      }
      const data = await readFile(file);
      res.writeHead(200, { ...headers, 'Content-Type': mimeTypes[extname(file)] ?? 'application/octet-stream', 'Cache-Control': pathname.startsWith('/images/') || pathname.startsWith('/assets/') ? 'public, max-age=604800' : 'no-cache' });
      res.end(req.method === 'HEAD' ? undefined : data);
    } catch {
      res.writeHead(400, { ...headers, 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' });
      res.end('Bad request');
    }
  });
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const server = createAppServer();
  const host = process.env.HOST || '127.0.0.1';
  const listen = (port) => {
    server.once('error', (error) => {
      if (error.code === 'EADDRINUSE' && port < 4199) {
        listen(port + 1);
        return;
      }
      throw error;
    });
    server.listen(port, host, () => console.log(`Kelvio dev server at http://127.0.0.1:${port}`));
  };
  listen(Number(process.env.PORT || 4173));
}
