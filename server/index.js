import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

const PORT = process.env.PORT || 3001;

const candidates = [
  path.join(__dirname, '..', 'webapp'),
  path.join(__dirname, '..', 'www'),
  path.join(__dirname, '..', 'dist')
];
const distPath = candidates.find(p => fs.existsSync(p));
if (distPath) {
  app.use(express.static(distPath));
  app.get(/.*/, (req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Static server running on http://0.0.0.0:${PORT}`);
});
