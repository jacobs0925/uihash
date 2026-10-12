// Assets replaced under the same name: a new logo.png, a new background texture, a new font file for
// the same font-family. Images used to be identified by URL and fonts by family name, so all three
// passed as "no change". Now each same-origin asset is hashed by content (src/capture.js hashAssets).
// Base and head are served over HTTP from different ports, as in CI, so URLs must compare relative.
// The font case needs two font files: set FONT_A / FONT_B, or it looks in a few usual places.
// Usage: node eval.js [outDir]
const fs = require('fs');
const os = require('os');
const path = require('path');
const http = require('http');
const { PNG } = require('playwright-core/lib/utilsBundle');
const { runPR } = require('../../src/pr.js');

const OUT = process.argv[2] || fs.mkdtempSync(path.join(os.tmpdir(), 'uihash-assets-'));
const HTML = `<!doctype html><html><head><meta charset="utf-8"><style>
@font-face { font-family: Brand; src: url(brand.ttf); }
body { margin: 0; font: 15px/1.4 Arial, sans-serif; background: #f8fafc; color: #0f172a; }
header { display: flex; align-items: center; gap: 12px; padding: 16px 24px; background: #fff; border-bottom: 1px solid #e2e8f0; }
header img { width: 40px; height: 40px; }
h1 { font-family: Brand, Georgia, serif; font-size: 28px; margin: 0; }
.hero { padding: 24px; background: url(texture.png) repeat; height: 120px; }
p { padding: 0 24px; }
</style></head><body>
<header><img src="img/logo.png?v=3" alt="logo"><h1>Northwind Analytics</h1></header>
<div class="hero"></div>
<p>Quarterly report <span id="n"></span>.</p>
<script>document.getElementById('n').textContent = 'Q' + new URLSearchParams(location.search).get('seed');</script>
</body></html>`;

function png(w, h, paint) {
  const img = new PNG({ width: w, height: h });
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const [r, g, b, a] = paint(x, y); const i = (y * w + x) * 4; img.data[i] = r; img.data[i + 1] = g; img.data[i + 2] = b; img.data[i + 3] = a; }
  return PNG.sync.write(img);
}
const logo = (blue) => png(80, 80, (x, y) => ((x - 40) ** 2 + (y - 40) ** 2 < 36 ** 2 ? (x > 30 && x < 50 && y > 20 && y < 60 ? [255, 255, 255, 255] : [37, blue, 235, 255]) : [0, 0, 0, 0]));
const texture = (c) => png(16, 16, (x, y) => (x + y === 15 ? [c, c + 6, c + 14, 255] : [241, 245, 249, 255]));
function fonts() {
  if (process.env.FONT_A && process.env.FONT_B) return [process.env.FONT_A, process.env.FONT_B];
  for (const dir of ['/mnt/skills/examples/canvas-design/canvas-fonts', '/usr/share/fonts/truetype/dejavu', '/usr/share/fonts/TTF']) {
    if (!fs.existsSync(dir)) continue;
    const ttf = fs.readdirSync(dir).filter((f) => f.endsWith('.ttf')).sort();
    if (ttf.length >= 2) return [path.join(dir, ttf[0]), path.join(dir, ttf[1])];
  }
  return null;
}

function site(dir, { logoBlue = 99, tex = 226, font }) {
  fs.mkdirSync(path.join(dir, 'img'), { recursive: true });
  fs.writeFileSync(path.join(dir, 'index.html'), HTML);
  fs.writeFileSync(path.join(dir, 'img', 'logo.png'), logo(logoBlue));
  fs.writeFileSync(path.join(dir, 'texture.png'), texture(tex));
  if (font) fs.copyFileSync(font, path.join(dir, 'brand.ttf'));
}
function serve(dir) {
  return new Promise((resolve) => {
    const srv = http.createServer((req, res) => {
      const file = path.join(dir, decodeURIComponent(new URL(req.url, 'http://x').pathname));
      if (!file.startsWith(dir) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) { res.writeHead(404); res.end(); return; }
      res.writeHead(200, { 'content-type': { '.html': 'text/html', '.png': 'image/png', '.ttf': 'font/ttf' }[path.extname(file)] || 'application/octet-stream' });
      fs.createReadStream(file).pipe(res);
    }).listen(0, '127.0.0.1', () => resolve(srv));
  });
}

(async () => {
  const [fontA, fontB] = fonts() || [];
  const base = { font: fontA };
  const variants = [
    ['same files (must pass)', { ...base }, 0],
    ['logo.png replaced (slightly darker blue)', { ...base, logoBlue: 78 }, 1],
    ['texture.png replaced', { ...base, tex: 203 }, 1],
    ...(fontA && fontB ? [['brand.ttf replaced (same font-family name)', { ...base, font: fontB }, 1]] : []),
  ];
  const cfg = { runs: 6, pseudoStates: [], pages: [{ name: 'Report', path: 'index.html?seed={i}' }] };
  site(path.join(OUT, 'base'), base);
  const sb = await serve(path.join(OUT, 'base'));
  let ok = true;
  for (const [i, [label, v, expect]] of variants.entries()) {
    const dir = path.join(OUT, `head${i}`);
    site(dir, v);
    const sh = await serve(dir);
    const s = await runPR({ baseUrl: `http://127.0.0.1:${sb.address().port}/`, headUrl: `http://127.0.0.1:${sh.address().port}/`, config: cfg, outDir: path.join(OUT, `report${i}`) });
    sh.close();
    const f = s.pages[0].findings;
    const got = f.length;
    if ((got > 0) !== (expect > 0)) ok = false;
    console.log(`${(got > 0) === (expect > 0) ? '✓' : '✗'} ${label.padEnd(44)} ${got ? `${got} finding(s): ${f.map((x) => x.changes[0]).join(' | ').slice(0, 150)}` : 'no findings'}`);
  }
  sb.close();
  if (!fontA || !fontB) console.log('(font case skipped: set FONT_A and FONT_B to two .ttf files)');
  console.log(ok ? 'PASS' : 'FAIL', `(reports in ${OUT})`);
  process.exitCode = ok ? 0 : 1;
})();
