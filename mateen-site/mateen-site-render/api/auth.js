import { timingSafeEqual } from 'node:crypto';
import { sign, isOwner } from '../lib/util.js';

const cookie = (v, age) => `mt=${v}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${age}`;

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method === 'GET') return res.json({ owner: isOwner(req) });
  if (req.method === 'DELETE') { res.setHeader('Set-Cookie', cookie('', 0)); return res.json({ ok: true }); }
  if (req.method !== 'POST') return res.status(405).end();
  const a = Buffer.from(String(req.body?.password ?? ''));
  const b = Buffer.from(process.env.ADMIN_PASSWORD || '');
  if (!b.length || a.length !== b.length || !timingSafeEqual(a, b)) {
    await new Promise((r) => setTimeout(r, 1200));
    return res.status(401).json({ ok: false });
  }
  res.setHeader('Set-Cookie', cookie(sign(), 604800));
  res.json({ ok: true });
}
