import { createHmac, timingSafeEqual } from 'node:crypto';
import { mkdir, readFile, writeFile, unlink } from 'node:fs/promises';
import path from 'node:path';
import { put, list, del } from '@vercel/blob';

// إن وُجد BLOB_READ_WRITE_TOKEN تُحفظ الصور في Vercel Blob، وإلا تُحفظ على قرص الخادم (DATA_DIR)
const useBlob = !!process.env.BLOB_READ_WRITE_TOKEN;
export const DATA_DIR = process.env.DATA_DIR || path.join(process.cwd(), 'data');
const JSON_FILE = path.join(DATA_DIR, 'gallery.json');

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
  if (!useBlob) {
    try { return JSON.parse(await readFile(JSON_FILE, 'utf8')); } catch { return []; }
  }
  const { blobs } = await list({ prefix: 'gallery.json' });
  const b = blobs.find((x) => x.pathname === 'gallery.json');
  if (!b) return [];
  const r = await fetch(b.url + '?t=' + Date.now());
  return r.ok ? r.json() : [];
}

export async function writeGallery(items) {
  if (!useBlob) {
    await mkdir(DATA_DIR, { recursive: true });
    return writeFile(JSON_FILE, JSON.stringify(items));
  }
  return put('gallery.json', JSON.stringify(items), {
    access: 'public', contentType: 'application/json',
    addRandomSuffix: false, allowOverwrite: true, cacheControlMaxAge: 60,
  });
}

export async function saveImage(id, buf) {
  if (!useBlob) {
    const d = path.join(DATA_DIR, 'gallery');
    await mkdir(d, { recursive: true });
    await writeFile(path.join(d, id + '.jpg'), buf);
    return '/uploads/' + id + '.jpg';
  }
  const b = await put(`gallery/${id}.jpg`, buf, { access: 'public', contentType: 'image/jpeg', addRandomSuffix: true });
  return b.url;
}

export async function removeImage(url) {
  if (!useBlob) return unlink(path.join(DATA_DIR, 'gallery', path.basename(url))).catch(() => {});
  return del(url).catch(() => {});
}
