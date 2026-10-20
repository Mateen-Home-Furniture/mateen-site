import { isOwner, readGallery, writeGallery, saveImage, removeImage } from '../lib/util.js';

export default async function handler(req, res) {
  if (req.method === 'GET') {
    res.setHeader('Cache-Control', 's-maxage=20, stale-while-revalidate=60');
    return res.json(await readGallery());
  }
  if (!isOwner(req)) return res.status(401).json({ error: 'unauthorized' });
  const items = await readGallery();

  if (req.method === 'POST') {
    const { cat, name, size, image } = req.body || {};
    const m = /^data:image\/jpeg;base64,(.+)$/.exec(image || '');
    if (!m || !['tables', 'lounge'].includes(cat) || !String(name || '').trim())
      return res.status(400).json({ error: 'bad request' });
    const buf = Buffer.from(m[1], 'base64');
    if (buf.length > 3.5e6) return res.status(413).json({ error: 'too large' });
    const id = Date.now().toString(36);
    const url = await saveImage(id, buf);
    items.push({ id, cat, name: String(name).trim().slice(0, 60), size: String(size || '').trim().slice(0, 30), url });
    await writeGallery(items);
    return res.json({ ok: true, items });
  }

  if (req.method === 'DELETE') {
    const it = items.find((x) => x.id === req.query.id);
    if (!it) return res.status(404).json({ error: 'not found' });
    await removeImage(it.url);
    const rest = items.filter((x) => x !== it);
    await writeGallery(rest);
    return res.json({ ok: true, items: rest });
  }
  res.status(405).end();
}
