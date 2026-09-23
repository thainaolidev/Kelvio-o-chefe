import { cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { publicConfig, readLocalEnv, normalizeSiteUrl } from '../lib/env.js';
import { renderSite } from '../ui.js';

const output = 'dist';
await rm(output, { recursive: true, force: true });
await mkdir(output, { recursive: true });
for (const file of ['index.html', 'app.js', 'ui.js', 'styles.css', 'polish.css']) {
  await cp(file, `${output}/${file}`);
}
await cp('data', `${output}/data`, { recursive: true });
await cp('lib', `${output}/lib`, { recursive: true });
await cp('public/images', `${output}/images`, { recursive: true });
await cp('public/assets', `${output}/assets`, { recursive: true });

const local = await readLocalEnv();
const runtimeConfig = await publicConfig();
const vercelDomain = process.env.VERCEL_PROJECT_PRODUCTION_URL || local.VERCEL_PROJECT_PRODUCTION_URL || '';
const siteUrl = runtimeConfig.siteUrl || normalizeSiteUrl(vercelDomain ? `https://${vercelDomain}` : '');
const config = await readFile(`${output}/config.js`, 'utf8').catch(() => readFile('config.js', 'utf8'));
await writeFile(`${output}/config.js`, config
  .replace("'__WEB3FORMS_ACCESS_KEY__'", JSON.stringify(runtimeConfig.accessKey))
  .replace("'__SITE_URL__'", JSON.stringify(siteUrl))
  .replace(/^export const socialLinks = .*;$/m, `export const socialLinks = ${JSON.stringify(runtimeConfig.socialLinks)};`));

const routes = ['/', '/marmitas-e-servicos', '/o-chefe', '/conteudo', '/fazer-pedido'];
const baseHtml = await readFile(`${output}/index.html`, 'utf8');
function makePage(path, language = 'pt', is404 = false) {
  const route = is404 ? '/__not_found__' : language === 'en' ? (path === '/' ? '/en' : `/en${path}`) : path;
  const page = renderSite(route, '', language);
  const rendered = page.html;
  let html = baseHtml
    .replace('<html lang="pt-PT">', `<html lang="${language === 'en' ? 'en' : 'pt-PT'}">`)
    .replace(/<title>[^<]*<\/title>/, `<title>${page.title}</title>`)
    .replace(/<meta name="description" content="[^"]*">/, `<meta name="description" content="${page.description}">`)
    .replace(/<meta property="og:title" content="[^"]*">/, `<meta property="og:title" content="${page.title}">`)
    .replace(/<meta property="og:description" content="[^"]*">/, `<meta property="og:description" content="${page.description}">`)
    .replace(/<meta property="og:locale" content="[^"]*">/, `<meta property="og:locale" content="${language === 'en' ? 'en_GB' : 'pt_PT'}">`);
  html = html.replace('<div id="app"></div>', `<div id="app">${rendered}</div>`);
  if (siteUrl) {
    const canonical = `${siteUrl}${route}`;
    const alternatePt = `${siteUrl}${path}`;
    const alternateEn = `${siteUrl}${path === '/' ? '/en' : `/en${path}`}`;
    html = html.replace(/\s*<meta property="og:image"[^>]*>/, '');
    html = html.replace('</head>', `  <link rel="canonical" href="${canonical}">\n  <link rel="alternate" hreflang="pt-PT" href="${alternatePt}">\n  <link rel="alternate" hreflang="en" href="${alternateEn}">\n  <meta property="og:url" content="${canonical}">\n  <meta property="og:image" content="${siteUrl}/assets/chef/kelvio-back.jpg">\n</head>`);
  } else {
    html = html.replace(/\s*<meta property="og:image"[^>]*>/, '').replace('</head>', '\n</head>');
  }
  if (is404) html = html.replace('</head>', '  <meta name="robots" content="noindex, nofollow">\n</head>');
  return html;
}

for (const language of ['pt', 'en']) {
  for (const path of routes) {
    const route = language === 'en' ? (path === '/' ? '/en' : `/en${path}`) : path;
    const directory = `${output}${route}`;
    await mkdir(directory, { recursive: true });
    await writeFile(`${directory}${route === '/' ? '/index.html' : '/index.html'}`, makePage(path, language));
  }
}
await writeFile(`${output}/404.html`, makePage('/404', 'pt', true));

const robots = `User-agent: *\nAllow: /\n${siteUrl ? `Sitemap: ${siteUrl}/sitemap.xml\n` : ''}`;
await writeFile(`${output}/robots.txt`, robots);
if (siteUrl) {
  const urls = ['pt', 'en'].flatMap((language) => routes.map((path) => {
    const route = language === 'en' ? (path === '/' ? '/en' : `/en${path}`) : path;
    return `  <url><loc>${siteUrl}${route}</loc></url>`;
  })).join('\n');
  await writeFile(`${output}/sitemap.xml`, `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`);
}
console.log(`Production site built in ${output}/${siteUrl ? ' with sitemap' : ' (set PUBLIC_SITE_URL to generate canonical URLs and sitemap)'}`);
