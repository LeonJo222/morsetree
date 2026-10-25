// Build: copies src/ to public/ and renders the app icons as PNG (no dependencies, Node >= 16).
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const OUT = path.join(__dirname, 'public');
fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(path.join(OUT, 'icons'), { recursive: true });
for (const f of fs.readdirSync(path.join(__dirname, 'src'))) {
  fs.copyFileSync(path.join(__dirname, 'src', f), path.join(OUT, f));
}

// ---------- PNG encoder ----------
const CRC = new Int32Array(256).map((_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c; });
const crc32 = buf => { let c = -1; for (const b of buf) c = CRC[(c ^ b) & 255] ^ (c >>> 8); return (c ^ -1) >>> 0; };
function chunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type), data]);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
}
function png(w, h, rgba) {
  const raw = Buffer.alloc((w * 4 + 1) * h);
  for (let y = 0; y < h; y++) { raw[y * (w * 4 + 1)] = 0; rgba.copy(raw, y * (w * 4 + 1) + 1, y * w * 4, (y + 1) * w * 4); }
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = 6;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw, { level: 9 })), chunk('IEND', Buffer.alloc(0))]);
}

// ---------- Icon drawing (signed-distance shapes, 4x4 supersampling) ----------
const BG = [9, 20, 15], COPPER = [185, 132, 71], GREEN = [93, 252, 156], PAD = [14, 31, 23], OFF = [18, 50, 36];
function segDist(px, py, ax, ay, bx, by) {
  const dx = bx - ax, dy = by - ay; const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy || 1)));
  return Math.hypot(px - ax - t * dx, py - ay - t * dy);
}
function roundRectInside(x, y, s, r) { // unit square [0,s], corner radius r
  const cx = Math.min(Math.max(x, r), s - r), cy = Math.min(Math.max(y, r), s - r);
  return Math.hypot(x - cx, y - cy) <= r;
}
function icon(size, maskable) {
  const S = 1; // work in unit coordinates
  const safe = maskable ? 0.60 : 0.78;
  const w = safe, top = 0.5 - w * 0.42, row = w * 0.36;
  const pos = code => { let x = 0.5, ww = 0.25; for (const s of code) { x += (s === '.' ? 1 : -1) * ww; ww /= 2; } return [0.5 - w / 2 + x * w, top + code.length * row]; };
  const codes = ['', '-', '.', '--', '-.', '.-', '..'];
  const lit = new Set(['', '.', '.-']);
  const lw = 0.011, r = 0.055;
  const segs = [];
  for (const c of codes.slice(1)) {
    const p = pos(c.slice(0, -1)), q = pos(c), y1 = p[1] + row * 0.45;
    const pts = [p, [p[0], y1], [q[0], y1], q];
    for (let i = 0; i < 3; i++) segs.push({ a: pts[i], b: pts[i + 1], col: lit.has(c) ? GREEN : COPPER });
  }
  const pads = codes.map(c => { const [x, y] = pos(c); return { x, y, r: c === '' ? r * 1.25 : r, lit: lit.has(c) }; });

  function shade(x, y) { // returns [r,g,b,a]
    if (!maskable && !roundRectInside(x, y, S, 0.22)) return [0, 0, 0, 0];
    let col = BG;
    // soft glow around lit parts
    let glow = 0;
    for (const s of segs) if (s.col === GREEN) glow = Math.max(glow, Math.max(0, 1 - segDist(x, y, s.a[0], s.a[1], s.b[0], s.b[1]) / 0.05));
    for (const p of pads) if (p.lit) glow = Math.max(glow, Math.max(0, 1 - (Math.hypot(x - p.x, y - p.y) - p.r * 0.6) / 0.07));
    if (glow > 0) { const g = glow * glow * 0.35; col = col.map((v, i) => v + (GREEN[i] - v) * g); }
    for (const s of segs) if (segDist(x, y, s.a[0], s.a[1], s.b[0], s.b[1]) <= lw) col = s.col;
    for (const p of pads) {
      const d = Math.hypot(x - p.x, y - p.y);
      if (d <= p.r) col = d >= p.r - 0.018 ? COPPER : (d <= p.r * 0.62 ? (p.lit ? GREEN : OFF) : PAD);
    }
    return [col[0], col[1], col[2], 255];
  }
  const buf = Buffer.alloc(size * size * 4), N = 4;
  for (let py = 0; py < size; py++) for (let px = 0; px < size; px++) {
    let acc = [0, 0, 0, 0];
    for (let sy = 0; sy < N; sy++) for (let sx = 0; sx < N; sx++) {
      const c = shade((px + (sx + 0.5) / N) / size, (py + (sy + 0.5) / N) / size);
      acc[0] += c[0] * c[3]; acc[1] += c[1] * c[3]; acc[2] += c[2] * c[3]; acc[3] += c[3];
    }
    const o = (py * size + px) * 4, a = acc[3];
    buf[o] = a ? Math.round(acc[0] / a) : 0; buf[o + 1] = a ? Math.round(acc[1] / a) : 0; buf[o + 2] = a ? Math.round(acc[2] / a) : 0; buf[o + 3] = Math.round(a / (N * N));
  }
  return png(size, size, buf);
}
const write = (name, data) => fs.writeFileSync(path.join(OUT, 'icons', name), data);
write('icon-192.png', icon(192, false));
write('icon-512.png', icon(512, false));
write('maskable-192.png', icon(192, true));
write('maskable-512.png', icon(512, true));
write('apple-touch-icon.png', icon(180, true));
console.log('MorseTree build ok ->', OUT);
