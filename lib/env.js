import { readFile } from 'node:fs/promises';

export async function readLocalEnv(path = '.env') {
  const source = await readFile(path, 'utf8').catch(() => '');
  return Object.fromEntries(source.split(/\r?\n/).flatMap((line) => {
    const match = line.match(/^\s*([A-Z][A-Z0-9_]*)\s*=\s*(.*)\s*$/);
    if (!match) return [];
    let value = match[2].trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) value = value.slice(1, -1);
    else value = value.replace(/\s+#.*$/, '');
    return [[match[1], value]];
  }));
}

export async function publicConfig() {
  const local = await readLocalEnv();
  return {
    accessKey: process.env.WEB3FORMS_ACCESS_KEY || local.WEB3FORMS_ACCESS_KEY || '',
    siteUrl: normalizeSiteUrl(process.env.PUBLIC_SITE_URL || local.PUBLIC_SITE_URL || ''),
    socialLinks: {
      instagram: normalizeSocialUrl(process.env.INSTAGRAM_URL || local.INSTAGRAM_URL || 'https://instagram.com/kelvio.antunes', 'instagram.com'),
      tiktok: normalizeSocialUrl(process.env.TIKTOK_URL || local.TIKTOK_URL || 'https://tiktok.com/@_kelvio_', 'tiktok.com'),
      youtube: normalizeSocialUrl(process.env.YOUTUBE_URL || local.YOUTUBE_URL || 'https://www.youtube.com/@Chef_Kelvio', 'youtube.com')
    }
  };
}

export function normalizeSiteUrl(value) {
  if (!value) return '';
  try {
    const url = new URL(value);
    if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password) return '';
    return url.origin;
  } catch {
    return '';
  }
}

function normalizeSocialUrl(value, domain) {
  try {
    const url = new URL(value);
    if (url.protocol !== 'https:' || url.username || url.password || ![domain, `www.${domain}`].includes(url.hostname)) return '';
    return url.href;
  } catch {
    return '';
  }
}
