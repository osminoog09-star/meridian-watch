// Мир: реальная карта Пярну (OpenStreetMap), дорожный граф, маршруты и пространственные индексы.
import data from '../data/city-data.js';

export const METRES = 1670; // метров в одной единице карты
export const BOUNDS = {
  minX: 0, minY: 0,
  maxX: (data.bbox[2] - data.bbox[0]) * 35,
  maxY: (data.bbox[3] - data.bbox[1]) * 65,
};
export const ATTRIBUTION = data.source;
export const project = (lon, lat) => ({x: (lon - data.bbox[0]) * 35, y: (data.bbox[3] - lat) * 65});
const inside = (x, y, m = 0) => x >= -m && y >= -m && x <= BOUNDS.maxX + m && y <= BOUNDS.maxY + m;

const CLASSES = {
  trunk: {w: 13, speed: 70, rank: 5}, primary: {w: 12, speed: 50, rank: 5},
  trunk_link: {w: 8, speed: 50, rank: 4}, primary_link: {w: 8, speed: 50, rank: 4},
  secondary: {w: 10, speed: 50, rank: 4}, secondary_link: {w: 7, speed: 40, rank: 3},
  tertiary: {w: 9, speed: 50, rank: 3}, tertiary_link: {w: 7, speed: 40, rank: 3},
  unclassified: {w: 7, speed: 40, rank: 2}, residential: {w: 7, speed: 40, rank: 2},
  living_street: {w: 6, speed: 20, rank: 1}, service: {w: 4, speed: 20, rank: 0},
};
const FOOT = new Set(['footway', 'path', 'cycleway', 'steps', 'pedestrian', 'track']);

export const DISTRICTS = [
  ['Кесклинн', 24.5005, 58.3850], ['Раннарайон', 24.4950, 58.3745], ['Ээслинн', 24.5180, 58.3800],
  ['Юлейыэ', 24.5130, 58.3965], ['Ряэма', 24.5380, 58.3980], ['Вана-Пярну', 24.4760, 58.3905],
  ['Май', 24.5260, 58.3700], ['Папинийду', 24.5450, 58.3760], ['Раэкюла', 24.5600, 58.3630],
  ['Нийду', 24.5650, 58.3900], ['Таммисте', 24.5700, 58.4100], ['Лодья', 24.4850, 58.4030],
].map(([name, lon, lat]) => ({name, ...project(lon, lat)}));

function flat(points) {
  const out = new Float32Array(points.length * 2);
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (let i = 0; i < points.length; i++) {
    const x = points[i][0], y = points[i][1];
    out[i * 2] = x; out[i * 2 + 1] = y;
    if (x < minX) minX = x; if (x > maxX) maxX = x; if (y < minY) minY = y; if (y > maxY) maxY = y;
  }
  return {pts: out, box: [minX, minY, maxX, maxY]};
}

// ---------- объекты для отрисовки ----------
export const roads = [];
for (const r of data.roads) {
  const cls = r.drive ? CLASSES[r.kind] : null;
  if (!cls && !FOOT.has(r.kind)) continue;
  const f = flat(r.p);
  if (f.box[2] < -0.1 || f.box[3] < -0.1 || f.box[0] > BOUNDS.maxX + 0.1 || f.box[1] > BOUNDS.maxY + 0.1) continue;
  roads.push({...f, name: r.name || '', kind: r.kind, rank: cls ? cls.rank : -1, w: cls ? cls.w : 2, bridge: !!r.bridge, q: 0});
}

const hash = s => { let h = 2166136261; for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619); return h >>> 0; };
const SPECIAL = {church: 'civic', school: 'civic', kindergarten: 'civic', university: 'civic', hospital: 'civic', public: 'civic', civic: 'civic', government: 'civic', train_station: 'civic',
  retail: 'shop', commercial: 'shop', hotel: 'shop', restaurant: 'shop', kiosk: 'shop', office: 'shop',
  industrial: 'ind', warehouse: 'ind', hangar: 'ind', garage: 'ind', garages: 'ind', service: 'ind', shed: 'ind', greenhouse: 'ind'};
export const buildings = [];
for (const b of data.buildings) {
  if (b.p.length < 3) continue;
  const f = flat(b.p);
  if (f.box[2] < 0 || f.box[3] < 0 || f.box[0] > BOUNDS.maxX || f.box[1] > BOUNDS.maxY) continue;
  const h = hash(b.id);
  buildings.push({...f, h: Math.max(3, Math.min(60, b.h || 6)), style: SPECIAL[b.kind] || 'home', tone: h % 4, lit: (h >>> 3) % 100 < 46, cy: f.box[3], q: 0});
}
buildings.sort((a, b) => a.cy - b.cy);

const AREA_STYLE = {water: 'water', park: 'park', garden: 'park', recreation_ground: 'park', pitch: 'pitch', grass: 'grass', meadow: 'grass', flowerbed: 'grass', greenfield: 'grass',
  wood: 'forest', forest: 'forest', scrub: 'scrub', beach: 'beach', cemetery: 'park', allotments: 'grass', farmland: 'grass',
  industrial: 'industrial', commercial: 'commercial', retail: 'commercial', residential: 'residential', construction: 'industrial', brownfield: 'industrial', military: 'industrial'};
const AREA_ORDER = ['residential', 'industrial', 'commercial', 'grass', 'scrub', 'beach', 'park', 'forest', 'pitch', 'water'];
export const areas = [];
for (const a of data.areas) {
  const style = AREA_STYLE[a.kind];
  if (!style || a.p.length < 3) continue;
  const f = flat(a.p);
  if (f.box[2] < 0 || f.box[3] < 0 || f.box[0] > BOUNDS.maxX || f.box[1] > BOUNDS.maxY) continue;
  areas.push({...f, style, order: AREA_ORDER.indexOf(style), q: 0});
}
areas.sort((a, b) => a.order - b.order);

// ---------- пространственный индекс ----------
const CELL = 0.1, COLS = Math.ceil(BOUNDS.maxX / CELL) + 1, ROWS = Math.ceil(BOUNDS.maxY / CELL) + 1;
const clampCol = v => Math.max(0, Math.min(COLS - 1, Math.floor(v / CELL)));
const clampRow = v => Math.max(0, Math.min(ROWS - 1, Math.floor(v / CELL)));
function buildIndex(list) {
  const cells = Array.from({length: COLS * ROWS}, () => null), large = [];
  for (const f of list) {
    const c0 = clampCol(f.box[0]), c1 = clampCol(f.box[2]), r0 = clampRow(f.box[1]), r1 = clampRow(f.box[3]);
    if ((c1 - c0 + 1) * (r1 - r0 + 1) > 400) { large.push(f); continue; }
    for (let r = r0; r <= r1; r++) for (let c = c0; c <= c1; c++) (cells[r * COLS + c] ??= []).push(f);
  }
  return {cells, large};
}
const indexes = {roads: buildIndex(roads), buildings: buildIndex(buildings), areas: buildIndex(areas)};
let stamp = 0;
export function query(kind, x0, y0, x1, y1) {
  const {cells, large} = indexes[kind], out = [], mark = ++stamp;
  for (const f of large) if (f.box[2] >= x0 && f.box[0] <= x1 && f.box[3] >= y0 && f.box[1] <= y1) { f.q = mark; out.push(f); }
  const c0 = clampCol(x0), c1 = clampCol(x1), r0 = clampRow(y0), r1 = clampRow(y1);
  for (let r = r0; r <= r1; r++) for (let c = c0; c <= c1; c++) {
    const cell = cells[r * COLS + c];
    if (!cell) continue;
    for (const f of cell) if (f.q !== mark) { f.q = mark; if (f.box[2] >= x0 && f.box[0] <= x1 && f.box[3] >= y0 && f.box[1] <= y1) out.push(f); }
  }
  return out;
}

// ---------- дорожный граф ----------
const byId = new Map();
for (const r of data.roads) {
  const cls = r.drive ? CLASSES[r.kind] : null;
  if (!cls) continue;
  const tagged = Number.parseInt(r.speedTags?.maxspeed, 10);
  const speed = Number.isFinite(tagged) && tagged >= 10 && tagged <= 110 ? tagged : cls.speed;
  const get = k => {
    const [x, y] = r.p[k];
    if (!inside(x, y)) return null;
    let n = byId.get(r.nodes[k]);
    if (!n) { n = {id: r.nodes[k], x, y, edges: [], back: [], name: '', rank: -1, district: 0, i: 0}; byId.set(n.id, n); }
    if (cls.rank > n.rank || (!n.name && r.name)) { n.rank = Math.max(n.rank, cls.rank); if (r.name) n.name = r.name; }
    return n;
  };
  for (let k = 1; k < r.nodes.length; k++) {
    const a = get(k - 1), b = get(k);
    if (!a || !b || a === b) continue;
    const len = Math.hypot(a.x - b.x, a.y - b.y) * METRES, time = len / (speed / 3.6);
    const link = (u, v) => { u.edges.push({to: v, len, speed, time, name: r.name || '', rank: cls.rank}); v.back.push(u); };
    if (r.oneway !== '-1') link(a, b);
    if (!['yes', '1', 'true'].includes(r.oneway)) link(b, a);
  }
}
// Оставляем только сильно связную часть вокруг центра, чтобы любой маршрут существовал.
{
  const centre = project(24.5005, 58.385);
  let start = null, best = Infinity;
  for (const n of byId.values()) { const d = Math.hypot(n.x - centre.x, n.y - centre.y); if (d < best && n.edges.length) { best = d; start = n; } }
  const reach = (next) => { const seen = new Set([start]), queue = [start]; for (let k = 0; k < queue.length; k++) for (const m of next(queue[k])) if (!seen.has(m)) { seen.add(m); queue.push(m); } return seen; };
  const out = reach(n => n.edges.map(e => e.to)), back = reach(n => n.back);
  for (const [id, n] of byId) if (!out.has(n) || !back.has(n)) byId.delete(id);
  for (const n of byId.values()) { n.edges = n.edges.filter(e => byId.has(e.to.id)); delete n.back; }
}
export const nodes = [...byId.values()];
nodes.forEach((n, i) => {
  n.i = i;
  let best = Infinity;
  DISTRICTS.forEach((d, k) => { const dist = Math.hypot(n.x - d.x, n.y - d.y); if (dist < best) { best = dist; n.district = k; } });
});
export const nodeById = id => byId.get(id) ?? null;

const nodeCells = new Map();
const NCELL = 0.04;
for (const n of nodes) { const key = Math.floor(n.x / NCELL) + ':' + Math.floor(n.y / NCELL); (nodeCells.get(key) ?? nodeCells.set(key, []).get(key)).push(n); }
export function nearestNode(x, y, filter = null) {
  const cx = Math.floor(x / NCELL), cy = Math.floor(y / NCELL);
  let best = null, bestD = Infinity;
  for (let ring = 0; ring < 40; ring++) {
    for (let dy = -ring; dy <= ring; dy++) for (let dx = -ring; dx <= ring; dx++) {
      if (Math.max(Math.abs(dx), Math.abs(dy)) !== ring) continue;
      const cell = nodeCells.get((cx + dx) + ':' + (cy + dy));
      if (!cell) continue;
      for (const n of cell) { if (filter && !filter(n)) continue; const d = Math.hypot(n.x - x, n.y - y); if (d < bestD) { bestD = d; best = n; } }
    }
    if (best && bestD < ring * NCELL) break;
  }
  return best ?? nodes[0];
}

// Места для происшествий: улицы с названием, не у самого края карты.
export const callNodes = nodes.filter(n => n.rank >= 1 && n.name && n.x > 0.15 && n.y > 0.15 && n.x < BOUNDS.maxX - 0.15 && n.y < BOUNDS.maxY - 0.15);
export const districtNodes = DISTRICTS.map((_, k) => callNodes.filter(n => n.district === k));
export const STATION = nearestNode(...Object.values(project(24.4998, 58.3868)), n => n.rank >= 2);
export const placeName = n => (n.name || 'Местный проезд') + ', ' + DISTRICTS[n.district].name;

// ---------- A* ----------
const g = new Float64Array(nodes.length), came = new Int32Array(nodes.length), seenAt = new Uint32Array(nodes.length), closedAt = new Uint32Array(nodes.length);
let generation = 0;
const TOP = 70 / 3.6;
export function route(from, to) {
  if (!from || !to || from === to) return [];
  generation++;
  const heap = [], hn = n => Math.hypot(n.x - to.x, n.y - to.y) * METRES / TOP;
  const push = (f, i) => { heap.push([f, i]); let k = heap.length - 1; while (k > 0) { const p = (k - 1) >> 1; if (heap[p][0] <= heap[k][0]) break; [heap[p], heap[k]] = [heap[k], heap[p]]; k = p; } };
  const pop = () => { const top = heap[0], last = heap.pop(); if (heap.length) { heap[0] = last; let k = 0; for (;;) { const l = k * 2 + 1, r = l + 1; let m = k; if (l < heap.length && heap[l][0] < heap[m][0]) m = l; if (r < heap.length && heap[r][0] < heap[m][0]) m = r; if (m === k) break; [heap[m], heap[k]] = [heap[k], heap[m]]; k = m; } } return top; };
  g[from.i] = 0; seenAt[from.i] = generation; came[from.i] = -1; push(hn(from), from.i);
  while (heap.length) {
    const [, i] = pop();
    if (closedAt[i] === generation) continue;
    closedAt[i] = generation;
    if (i === to.i) break;
    const n = nodes[i];
    for (const e of n.edges) {
      const j = e.to.i, cost = g[i] + e.time;
      if (seenAt[j] !== generation || cost < g[j]) { seenAt[j] = generation; g[j] = cost; came[j] = i; push(cost + hn(e.to), j); }
    }
  }
  if (closedAt[to.i] !== generation) return [];
  const path = [];
  for (let i = to.i; i !== from.i && i !== -1; i = came[i]) path.push(nodes[i]);
  return path.reverse();
}
export function routeSeconds(from, path) {
  let total = 0, at = from;
  for (const n of path) { const e = at.edges.find(e => e.to === n); total += e ? e.time : Math.hypot(at.x - n.x, at.y - n.y) * METRES / 10; at = n; }
  return total;
}
export const edgeBetween = (a, b) => a.edges.find(e => e.to === b) ?? null;
