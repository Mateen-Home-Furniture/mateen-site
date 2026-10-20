import { createHmac, timingSafeEqual } from 'node:crypto';
import { put, list } from '@vercel/blob';

const key = () => process.env.SESSION_SECRET || process.env.ADMIN_PASSWORD;

export const sign = () => {
  const e = String(Date.now() + 7 * 864e5);
  return e + '.' + createHmac('sha256', key()).update(e).digest('hex');
};

export const isOwner = (req) => {
  const t = (req.headers.cookie || '').split(/;\s*/).find((c) => c.startsWith('mt='))?.slice(3);
  if (!t || !key()) return false;
  const [e, s] = t.split('.');
  if (!e || !s || +e < Date.now()) return false;
  const h = createHmac('sha256', key()).update(e).digest('hex');
  return s.length === h.length && timingSafeEqual(Buffer.from(s), Buffer.from(h));
};

export async function readGallery() {
  const { blobs } = await list({ prefix: 'gallery.json' });
  const b = blobs.find((x) => x.pathname === 'gallery.json');
  if (!b) return [];
  const r = await fetch(b.url + '?t=' + Date.now());
  return r.ok ? r.json() : [];
}

export const writeGallery = (items) =>
  put('gallery.json', JSON.stringify(items), {
    access: 'public', contentType: 'application/json',
    addRandomSuffix: false, allowOverwrite: true, cacheControlMaxAge: 60,
  });
