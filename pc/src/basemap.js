// Статичный слой города: земля, дороги, здания, подписи и карта ночного света.
// Работает и в фоновом потоке (OffscreenCanvas), и в основном — как запасной вариант.
import {METRES, DISTRICTS, query} from './world.js';

export const AREA = {residential: '#59665c', industrial: '#666b68', commercial: '#6a6c70', grass: '#5f8a5c', scrub: '#587f58', park: '#63a05f', forest: '#4a8452', pitch: '#74b56c', beach: '#d8c592', water: '#4b8fbd'};
const ROAD = ['#7d858a', '#868e93', '#90989c', '#9ba3a7', '#a8afb3', '#b7bdc0'];
const ROOF = {home: ['#c2674c', '#93a0ab', '#cf8158', '#aeb4b8'], civic: ['#6f93dc', '#7a9ce0', '#6a8cd2', '#82a4e6'], shop: ['#b08fd6', '#b898dc', '#a886cf', '#c0a2e2'], ind: ['#8b9498', '#949da1', '#9aa3a6', '#858e92']};
const WALL_DARK = '#565f66', WALL_LIGHT = '#7f8a91', LAND = '#56645a';
export function poly(c, pts) { c.moveTo(pts[0], pts[1]); for (let i = 2; i < pts.length; i += 2) c.lineTo(pts[i], pts[i + 1]); }

export function paintBase(bctx, lctx, {x: vx, y: vy, scale: s, cw, ch, dpr}) {
  const ppm = s / METRES;
  const x0 = vx - cw / 2 / s, y0 = vy - ch / 2 / s, x1 = vx + cw / 2 / s, y1 = vy + ch / 2 / s;
  const world = c => c.setTransform(dpr * s, 0, 0, dpr * s, dpr * (cw / 2 - vx * s), dpr * (ch / 2 - vy * s));
  const screen = c => c.setTransform(dpr, 0, 0, dpr, 0, 0);
  screen(bctx); bctx.fillStyle = LAND; bctx.fillRect(0, 0, cw, ch);
  screen(lctx); lctx.clearRect(0, 0, cw, ch);
  world(bctx); world(lctx);

  const marks = [performance.now()], mark = () => marks.push(performance.now());
  // земля
  let style = null;
  for (const a of query('areas', x0, y0, x1, y1).sort((p, q) => p.order - q.order)) {
    if ((a.box[2] - a.box[0]) * s < 2 && (a.box[3] - a.box[1]) * s < 2) continue;
    if (a.style !== style) { if (style) bctx.fill('evenodd'); style = a.style; bctx.beginPath(); bctx.fillStyle = AREA[style]; }
    poly(bctx, a.pts); bctx.closePath();
  }
  if (style) bctx.fill('evenodd');

  mark();
  // дороги
  const list = query('roads', x0, y0, x1, y1), minRank = ppm < 0.1 ? 3 : ppm < 0.22 ? 1 : ppm < 0.45 ? 0 : -1;
  bctx.lineCap = 'round'; bctx.lineJoin = 'round';
  const width = r => Math.max(r.rank >= 3 ? 1.6 : 1, r.w * ppm) / s;
  if (minRank < 0) {
    bctx.beginPath(); for (const r of list) if (r.rank < 0) poly(bctx, r.pts);
    bctx.strokeStyle = '#a79f8c'; bctx.lineWidth = Math.max(1, 1.6 * ppm) / s; bctx.stroke();
  }
  if (ppm > 0.25) for (let rank = 0; rank <= 5; rank++) {
    bctx.beginPath(); let w = 0; for (const r of list) if (r.rank === rank) { poly(bctx, r.pts); w = width(r); }
    if (w) { bctx.strokeStyle = '#4a5257'; bctx.lineWidth = w + 2.4 / s; bctx.stroke(); }
  }
  for (let rank = Math.max(0, minRank); rank <= 5; rank++) {
    const byWidth = new Map();
    for (const r of list) if (r.rank === rank) { const w = width(r); (byWidth.get(w) ?? byWidth.set(w, []).get(w)).push(r); }
    for (const [w, group] of byWidth) { bctx.beginPath(); for (const r of group) poly(bctx, r.pts); bctx.strokeStyle = ROAD[rank]; bctx.lineWidth = w; bctx.stroke(); }
  }
  mark();
  // свет фонарей на крупных улицах
  lctx.lineCap = 'round'; lctx.beginPath(); for (const r of list) if (r.rank >= 3) poly(lctx, r.pts);
  lctx.strokeStyle = 'rgba(255,180,100,0.22)'; lctx.lineWidth = Math.max(3, 16 * ppm) / s; lctx.stroke();
  lctx.strokeStyle = 'rgba(255,215,150,0.38)'; lctx.lineWidth = Math.max(1.2, 5 * ppm) / s; lctx.stroke();

  mark();
  // деревья в парках и лесах: стабильная сетка с разбросом, чтобы не «плыли» при движении карты
  if (ppm >= 0.5) {
    const trees = [], frac = v => v - Math.floor(v);
    for (const a of query('areas', x0, y0, x1, y1)) {
      if (a.style !== 'park' && a.style !== 'forest') continue;
      const step = Math.max(a.style === 'forest' ? 9 : 16, 12 / ppm) / METRES, p = a.pts, n = p.length;
      const ax0 = Math.max(a.box[0], x0), ay0 = Math.max(a.box[1], y0), ax1 = Math.min(a.box[2], x1), ay1 = Math.min(a.box[3], y1);
      for (let iy = Math.ceil(ay0 / step); iy * step <= ay1 && trees.length < 9000; iy++) for (let ix = Math.ceil(ax0 / step); ix * step <= ax1; ix++) {
        const h = frac(Math.sin(ix * 127.1 + iy * 311.7) * 43758.5453), px = (ix + (h - 0.5) * 0.8) * step, py = (iy + (frac(h * 7.13) - 0.5) * 0.8) * step;
        let inside = false;
        for (let i = 0, j = n - 2; i < n; j = i, i += 2) if ((p[i + 1] > py) !== (p[j + 1] > py) && px < (p[j] - p[i]) * (py - p[i + 1]) / (p[j + 1] - p[i + 1]) + p[i]) inside = !inside;
        if (inside) trees.push(px, py, (2.4 + h * 2) / METRES);
      }
    }
    const circles = (dx, dy, k, color) => { bctx.beginPath(); for (let i = 0; i < trees.length; i += 3) { const r = trees[i + 2] * k; bctx.moveTo(trees[i] + dx + r, trees[i + 1] + dy); bctx.arc(trees[i] + dx, trees[i + 1] + dy, r, 0, 6.2832); } bctx.fillStyle = color; bctx.fill(); };
    circles(2.2 / METRES, 1.6 / METRES, 1, 'rgba(15,35,20,0.28)'); circles(0, 0, 1, '#3f7f46'); circles(-0.7 / METRES, -0.9 / METRES, 0.6, '#5fa35c');
  }
  // здания
  const t0 = performance.now(), bl = query('buildings', x0, y0, x1, y1), shade = ppm >= 0.3, each = ppm >= 0.6, solid = each;
  const ex = -0.5 / METRES, ey = -0.92 / METRES;
  if (shade) {
    bctx.fillStyle = 'rgba(20,30,28,0.30)';
    for (let start = 0; start < bl.length; start += 250) {
      bctx.beginPath();
      for (let q = start; q < Math.min(bl.length, start + 250); q++) { const b = bl[q], k = b.h * 0.9, dx = 0.55 * k / METRES, dy = 0.34 * k / METRES, p = b.pts, n = p.length;
        if (each) for (let i = 0; i < n; i += 2) { const j = (i + 2) % n; bctx.moveTo(p[i], p[i + 1]); bctx.lineTo(p[j], p[j + 1]); bctx.lineTo(p[j] + dx, p[j + 1] + dy); bctx.lineTo(p[i] + dx, p[i + 1] + dy); bctx.closePath(); }
        bctx.moveTo(p[0] + dx, p[1] + dy); for (let i = 2; i < n; i += 2) bctx.lineTo(p[i] + dx, p[i + 1] + dy); bctx.closePath(); }
      bctx.fill();
    }
  }
  const walls = (c, b, horizontal) => { const p = b.pts, n = p.length, dx = ex * b.h, dy = ey * b.h;
    for (let i = 0; i < n; i += 2) { const j = (i + 2) % n; if ((Math.abs(p[j] - p[i]) > Math.abs(p[j + 1] - p[i + 1])) !== horizontal) continue;
      c.moveTo(p[i], p[i + 1]); c.lineTo(p[j], p[j + 1]); c.lineTo(p[j] + dx, p[j + 1] + dy); c.lineTo(p[i] + dx, p[i + 1] + dy); c.closePath(); } };
  const roof = (c, b) => { const p = b.pts, dx = solid ? ex * b.h : 0, dy = solid ? ey * b.h : 0; c.moveTo(p[0] + dx, p[1] + dy); for (let i = 2; i < p.length; i += 2) c.lineTo(p[i] + dx, p[i + 1] + dy); c.closePath(); };
  if (each) {
    bctx.lineWidth = 1 / s; bctx.strokeStyle = 'rgba(255,255,255,0.22)';
    for (const b of bl) {
      bctx.beginPath(); walls(bctx, b, true); bctx.fillStyle = WALL_DARK; bctx.fill();
      bctx.beginPath(); walls(bctx, b, false); bctx.fillStyle = WALL_LIGHT; bctx.fill();
      bctx.beginPath(); roof(bctx, b); bctx.fillStyle = ROOF[b.style][b.tone]; bctx.fill(); bctx.stroke();
    }
  } else {
    const groups = new Map();
    for (const b of bl) { if ((b.box[2] - b.box[0]) * s < 1.2) continue; const key = ROOF[b.style][b.tone]; (groups.get(key) ?? groups.set(key, []).get(key)).push(b); }
    for (const [color, group] of groups) { bctx.beginPath(); for (const b of group) roof(bctx, b); bctx.fillStyle = color; bctx.fill(); }
  }
  lctx.beginPath(); for (const b of bl) if (b.lit && (b.box[2] - b.box[0]) * s >= 1.5) roof(lctx, b);
  lctx.fillStyle = 'rgba(255,186,96,0.85)'; lctx.fill();

  mark();
  // подписи
  screen(bctx);
  const tx = x => (x - vx) * s + cw / 2, ty = y => (y - vy) * s + ch / 2;
  bctx.textAlign = 'center'; bctx.textBaseline = 'middle';
  if (s >= 650) {
    const used = new Set(), minLabelRank = s >= 1700 ? 1 : s >= 1000 ? 3 : 4;
    bctx.font = '600 11px "Segoe UI",system-ui,sans-serif'; bctx.lineWidth = 3; bctx.strokeStyle = 'rgba(30,38,42,0.85)'; bctx.fillStyle = 'rgba(245,248,250,0.95)';
    for (const r of list) {
      if (!r.name || r.rank < minLabelRank) continue;
      const p = r.pts, m = Math.floor(p.length / 4) * 2, i = Math.max(0, m - 2), ax = tx(p[i]), ay = ty(p[i + 1]), bx = tx(p[i + 2]), by = ty(p[i + 3]);
      const whole = Math.hypot(tx(p[0]) - tx(p[p.length - 2]), ty(p[1]) - ty(p[p.length - 1])), need = bctx.measureText(r.name).width;
      if (whole < need + 24) continue;
      const cx = (ax + bx) / 2, cy = (ay + by) / 2, key = r.name + ':' + Math.round(cx / 340) + ':' + Math.round(cy / 340);
      if (used.has(key)) continue; used.add(key);
      let angle = Math.atan2(by - ay, bx - ax); if (angle > Math.PI / 2 || angle < -Math.PI / 2) angle += Math.PI;
      bctx.save(); bctx.translate(cx, cy); bctx.rotate(angle); bctx.strokeText(r.name, 0, 0); bctx.fillText(r.name, 0, 0); bctx.restore();
    }
  }
}
