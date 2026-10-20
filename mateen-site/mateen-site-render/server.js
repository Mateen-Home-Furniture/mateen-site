import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import auth from './api/auth.js';
import gallery from './api/gallery.js';
import { DATA_DIR } from './lib/util.js';

const root = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const wrap = (h) => (req, res) =>
  Promise.resolve(h(req, res)).catch((e) => {
    console.error(e);
    res.status(500).json({ error: 'server' });
  });

app.set('trust proxy', 1);
app.use(express.json({ limit: '6mb' }));
app.all('/api/auth', wrap(auth));
app.all('/api/gallery', wrap(gallery));
app.use('/uploads', express.static(path.join(DATA_DIR, 'gallery'), { maxAge: '30d' }));
app.use('/img', express.static(path.join(root, 'img'), { maxAge: '7d' }));
app.get('/', (_req, res) => res.sendFile(path.join(root, 'index.html')));

app.listen(process.env.PORT || 3000, '0.0.0.0', () => console.log('MATEEN is running'));
