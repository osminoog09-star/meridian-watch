// Отрисовка: кэш статичного города (земля, дороги, объёмные здания, подписи), ночной свет и живые объекты поверх.
import {BOUNDS, METRES, STATION, DISTRICTS, query, roads} from './world.js';
import {paintBase, poly, AREA} from './basemap.js';
import {VEHICLES} from './content.js';
import {callType, isNight} from './sim.js';

const SEV = ['', '#ffd166', '#ff9f43', '#ff4d5e'];
const STATUS_COLOR = {patrol: '#5fd3c4', hold: '#9fb3bf', enroute: '#ffb347', onscene: '#ffe08a', pursuit: '#ff4d5e', transport: '#c59bff', booking: '#c59bff', returning: '#8fa4b0', resting: '#6f8792'};
const PAD = 420;

export function nightFactor(t) {
  const h = (t / 3600) % 24;
  if (h >= 22 || h < 4.5) return 1;
  if (h >= 19) return (h - 19) / 3;
  if (h < 7) return 1 - (h - 4.5) / 2.5;
  return 0;
}

export function createRenderer(canvas, minimap) {
  const ctx = canvas.getContext('2d'), base = document.createElement('canvas'), light = document.createElement('canvas');
  const bctx = base.getContext('2d'), lctx = light.getContext('2d'); // запасной путь без фонового потока
  const cam = {x: STATION.x, y: STATION.y, scale: 1100, target: 1100, anchor: null, follow: null};
  let W = 1, H = 1, dpr = 1, cache = null, lastBase = 0, time = 0, hits = [], popups = [], baseMs = 0, baseMax = 0, phases = [];
  const minScale = () => Math.min(W / BOUNDS.maxX, H / BOUNDS.maxY) * 0.95, MAX_SCALE = 9000;

  function resize() {
    dpr = Math.min(2, window.devicePixelRatio || 1);
    W = canvas.clientWidth || 1; H = canvas.clientHeight || 1;
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
 cam.target = Math.max(minScale(), cam.target); cam.scale = Math.max(minScale(), cam.scale);
  }
  new ResizeObserver(resize).observe(canvas); resize();

  const sx = x => (x - cam.x) * cam.scale + W / 2, sy = y => (y - cam.y) * cam.scale + H / 2;
  const worldAt = (px, py) => ({x: cam.x + (px - W / 2) / cam.scale, y: cam.y + (py - H / 2) / cam.scale});
  function clampCam() {
    cam.x = Math.max(BOUNDS.minX, Math.min(BOUNDS.maxX, cam.x)); cam.y = Math.max(BOUNDS.minY, Math.min(BOUNDS.maxY, cam.y));
  }

  // ---------- статичный слой: рисуется в фоновом потоке ----------
  let worker = null, pending = false, requested = 0;
  try {
    worker = new Worker(new URL('./base-worker.js', import.meta.url), {type: 'module'});
    worker.onmessage = e => { pending = false; if (cache?.base?.close) { cache.base.close(); cache.light.close(); } cache = e.data; baseMs = performance.now() - requested; baseMax = Math.max(baseMax, baseMs); };
    worker.onerror = () => { worker = null; pending = false; };
  } catch { worker = null; }
  function requestBase() {
    const view = {x: cam.x, y: cam.y, scale: cam.scale, cw: W + PAD * 2, ch: H + PAD * 2, dpr};
    lastBase = requested = performance.now();
    if (worker) { pending = true; worker.postMessage(view); return; }
    if (base.width !== Math.round(view.cw * dpr) || base.height !== Math.round(view.ch * dpr)) { base.width = light.width = Math.round(view.cw * dpr); base.height = light.height = Math.round(view.ch * dpr); }
    paintBase(bctx, lctx, view); cache = {...view, base, light};
  }
  function blitBase(night) {
    const zooming = Math.abs(cam.target - cam.scale) / cam.scale > 0.004;
    let ratio = 1, left = 0, top = 0;
    const place = () => { ratio = cam.scale / cache.scale; left = (cache.x - cam.x) * cam.scale + W / 2 - cache.cw / 2 * ratio; top = (cache.y - cam.y) * cam.scale + H / 2 - cache.ch / 2 * ratio; };
    if (cache) place();
    const margin = cache ? Math.min(-left, -top, left + cache.cw * ratio - W, top + cache.ch * ratio - H) : -1;
    const stale = !cache || Math.abs(ratio - 1) > 0.002;
    if (!pending && (margin < PAD * 0.45 || (stale && (!zooming || performance.now() - lastBase > 220)))) { requestBase(); if (cache) place(); }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = '#56645a'; ctx.fillRect(0, 0, W, H);
    if (!cache) return;
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(cache.base, left, top, cache.cw * ratio, cache.ch * ratio);
    if (night > 0.01) {
      ctx.globalCompositeOperation = 'multiply';
      const mix = (a, b) => Math.round(a + (b - a) * night);
      ctx.fillStyle = `rgb(${mix(255, 70)},${mix(255, 88)},${mix(255, 150)})`; ctx.fillRect(0, 0, W, H);
      ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = night * 0.62;
      ctx.drawImage(cache.light, left, top, cache.cw * ratio, cache.ch * ratio);
      ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
    }
  }

  // ---------- живые объекты ----------
  function glow(x, y, radius, color, alpha) {
    const g = ctx.createRadialGradient(x, y, 0, x, y, radius);
    g.addColorStop(0, color); g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.globalAlpha = alpha; ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, radius, 0, 7); ctx.fill(); ctx.globalAlpha = 1;
  }
  function car(x, y, heading, length, color, night, opts = {}) {
    const w = length * 0.46;
    ctx.save(); ctx.translate(x, y); ctx.rotate(heading);
    if (night > 0.2 && opts.lights !== false) {
      const beam = ctx.createLinearGradient(length / 2, 0, length * 2.6, 0);
      beam.addColorStop(0, `rgba(255,240,200,${0.34 * night})`); beam.addColorStop(1, 'rgba(255,240,200,0)');
      ctx.fillStyle = beam; ctx.beginPath(); ctx.moveTo(length / 2, -w * 0.35); ctx.lineTo(length * 2.6, -w * 1.5); ctx.lineTo(length * 2.6, w * 1.5); ctx.lineTo(length / 2, w * 0.35); ctx.fill();
    }
    ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.beginPath(); ctx.roundRect(-length / 2 + 1.5, -w / 2 + 2, length, w, w * 0.3); ctx.fill();
    ctx.fillStyle = color; ctx.strokeStyle = 'rgba(8,14,18,0.9)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.roundRect(-length / 2, -w / 2, length, w, w * 0.3); ctx.fill(); ctx.stroke();
    ctx.fillStyle = 'rgba(20,34,44,0.85)'; ctx.beginPath(); ctx.roundRect(length * 0.08, -w * 0.38, length * 0.2, w * 0.76, 1.5); ctx.fill();
    ctx.beginPath(); ctx.roundRect(-length * 0.34, -w * 0.36, length * 0.14, w * 0.72, 1.5); ctx.fill();
    if (opts.police) {
      ctx.fillStyle = '#1c3f73'; ctx.fillRect(-length * 0.16, -w / 2 + 0.5, length * 0.2, w - 1);
      const on = opts.flash, phase = Math.floor(time * 6) % 2;
      ctx.fillStyle = on ? (phase ? '#ff3b4e' : '#5a1820') : '#8a2630'; ctx.fillRect(-length * 0.1, -w * 0.42, length * 0.09, w * 0.4);
      ctx.fillStyle = on ? (phase ? '#152a66' : '#4d8bff') : '#2a4a99'; ctx.fillRect(-length * 0.1, w * 0.02, length * 0.09, w * 0.4);
    }
    ctx.restore();
    if (opts.police && opts.flash) { const phase = Math.floor(time * 6) % 2; ctx.globalCompositeOperation = 'lighter'; glow(x, y, length * 2.2 + 14, phase ? 'rgba(255,50,70,0.9)' : 'rgba(70,130,255,0.9)', 0.42); ctx.globalCompositeOperation = 'source-over'; }
  }
  function label(x, y, text, color, bg = 'rgba(12,20,26,0.86)') {
    ctx.font = '700 11px "Segoe UI",system-ui,sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    const w = ctx.measureText(text).width + 12;
    ctx.fillStyle = bg; ctx.beginPath(); ctx.roundRect(x - w / 2, y - 8, w, 16, 8); ctx.fill();
    ctx.fillStyle = color; ctx.fillText(text, x, y + 0.5);
  }

  function draw(state, view, dt) {
    time += dt;
    // камера
    if (cam.follow != null) { const u = state.units.find(u => u.id === cam.follow); if (u) { const k = Math.min(1, dt * 5); cam.x += (u.x - cam.x) * k; cam.y += (u.y - cam.y) * k; } else cam.follow = null; }
    cam.target = Math.max(minScale(), Math.min(MAX_SCALE, cam.target));
    if (Math.abs(cam.target - cam.scale) > cam.scale * 0.0005) {
      const before = cam.anchor ? worldAt(cam.anchor.x, cam.anchor.y) : null;
      cam.scale += (cam.target - cam.scale) * Math.min(1, dt * 11);
      if (before && cam.follow == null) { const after = worldAt(cam.anchor.x, cam.anchor.y); cam.x += before.x - after.x; cam.y += before.y - after.y; }
    } else cam.scale = cam.target;
    clampCam();

    const night = nightFactor(state.t), ppm = cam.scale / METRES;
    blitBase(night);
    hits = [];

    // районы: уровень преступности (всегда на общем плане, по кнопке — на любом)
    if (state.districts && (view.heat || cam.scale < 560)) {
      const chosen = state.units.find(u => u.id === view.unit)?.zone ?? -1;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      DISTRICTS.forEach((d, k) => {
        const crime = state.districts[k]?.crime ?? -1; if (crime < 0) return;
        const x = sx(d.x), y = sy(d.y), hue = Math.round(130 - Math.min(100, crime) * 1.3), radius = 0.42 * cam.scale;
        if (x < -radius || y < -radius || x > W + radius || y > H + radius) return;
        if (view.heat) { const g = ctx.createRadialGradient(x, y, 0, x, y, radius); g.addColorStop(0, `hsla(${hue},85%,55%,${0.16 + crime / 400})`); g.addColorStop(1, `hsla(${hue},85%,55%,0)`); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, radius, 0, 7); ctx.fill(); }
        if (k === chosen) { ctx.strokeStyle = 'rgba(126,240,224,0.8)'; ctx.lineWidth = 2; ctx.setLineDash([10, 8]); ctx.beginPath(); ctx.arc(x, y, radius * 0.8, 0, 7); ctx.stroke(); ctx.setLineDash([]); }
        ctx.font = '800 12px "Segoe UI",system-ui,sans-serif';
        const text = d.name.toUpperCase() + '  ' + Math.round(crime) + '%', w = ctx.measureText(text).width + 22;
        ctx.fillStyle = 'rgba(12,20,26,0.82)'; ctx.beginPath(); ctx.roundRect(x - w / 2, y - 11, w, 22, 11); ctx.fill();
        ctx.fillStyle = `hsl(${hue},80%,62%)`; ctx.beginPath(); ctx.arc(x - w / 2 + 11, y, 4, 0, 7); ctx.fill();
        ctx.fillStyle = '#e6eef2'; ctx.fillText(text, x + 5, y + 0.5);
      });
    }

    // участок
    { const x = sx(STATION.x), y = sy(STATION.y);
      ctx.globalCompositeOperation = 'lighter'; glow(x, y, 46, 'rgba(90,170,255,0.8)', 0.25 + 0.1 * Math.sin(time * 2)); ctx.globalCompositeOperation = 'source-over';
      ctx.fillStyle = '#16314f'; ctx.strokeStyle = '#7fb8ff'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x, y - 15); ctx.lineTo(x + 12, y - 9); ctx.lineTo(x + 12, y + 2); ctx.quadraticCurveTo(x + 10, y + 11, x, y + 16); ctx.quadraticCurveTo(x - 10, y + 11, x - 12, y + 2); ctx.lineTo(x - 12, y - 9); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#cfe6ff'; ctx.font = '800 12px "Segoe UI",sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('★', x, y);
      if (cam.scale > 500) label(x, y + 28, 'УЧАСТОК', '#9fd0ff'); }

    // маршруты
    for (const u of state.units) {
      if (!u.path.length || !['enroute', 'pursuit', 'hold', 'transport', 'returning'].includes(u.status)) continue;
      const selected = u.id === view.unit;
      ctx.beginPath(); ctx.moveTo(sx(u.x), sy(u.y)); for (const n of u.path) ctx.lineTo(sx(n.x), sy(n.y));
      ctx.lineJoin = 'round'; ctx.lineCap = 'round';
      ctx.strokeStyle = selected ? 'rgba(120,235,220,0.95)' : u.status === 'pursuit' ? 'rgba(255,90,100,0.4)' : 'rgba(120,235,220,0.28)';
      ctx.lineWidth = selected ? 3.5 : 2; ctx.setLineDash(selected ? [10, 8] : [5, 9]); ctx.lineDashOffset = -time * 40; ctx.stroke(); ctx.setLineDash([]);
    }

    // гражданский транспорт
    if (ppm > 0.16 && view.traffic) {
      const length = Math.max(7, 4.3 * ppm);
      for (const c of view.traffic) { const x = sx(c.x), y = sy(c.y); if (x < -40 || y < -40 || x > W + 40 || y > H + 40) continue; car(x, y, c.heading, length, c.color, night); }
    }

    // вызовы
    for (const c of state.calls) {
      if (c.state === 'done') continue;
      const type = callType(c), color = SEV[type.sev], sus = c.suspectId ? state.suspects.find(s => s.id === c.suspectId) : null;
      const x = sx(sus ? sus.x : c.x), y = sy(sus ? sus.y : c.y), selected = c.id === view.call;
      if (x < -60 || y < -60 || x > W + 60 || y > H + 60) continue;
      const pulse = (time * (type.sev === 3 ? 1.5 : 0.9) + c.id * 0.37) % 1;
      ctx.strokeStyle = color; ctx.globalAlpha = (1 - pulse) * 0.8; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.arc(x, y, 15 + pulse * 26, 0, 7); ctx.stroke(); ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'lighter'; glow(x, y, 44, color, 0.22); ctx.globalCompositeOperation = 'source-over';
      if (sus) { car(x, y, sus.heading, Math.max(15, 4.6 * ppm), '#ff7a3d', night); }
      else {
        ctx.fillStyle = 'rgba(14,22,28,0.94)'; ctx.beginPath(); ctx.arc(x, y, 14, 0, 7); ctx.fill();
        ctx.strokeStyle = 'rgba(255,255,255,0.12)'; ctx.lineWidth = 3.5; ctx.beginPath(); ctx.arc(x, y, 14, 0, 7); ctx.stroke();
        const active = c.state === 'active', part = active ? c.progress / Math.max(1, c.work) : Math.max(0, (c.deadline - state.t) / c.wait);
        ctx.strokeStyle = active ? '#6ee7d8' : color; ctx.beginPath(); ctx.arc(x, y, 14, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * Math.min(1, part)); ctx.stroke();
        ctx.fillStyle = color; ctx.font = '700 14px "Segoe UI Symbol","Segoe UI",sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(type.icon, x, y + 1);
      }
      if (c.state === 'choice' && Math.floor(time * 2.5) % 2) label(x, y - 27, 'ЖДЁТ РЕШЕНИЯ', '#10202a', '#ffe08a');
      else if (sus) { const w = 46; ctx.fillStyle = 'rgba(12,20,26,0.86)'; ctx.fillRect(x - w / 2, y - 30, w, 6); ctx.fillStyle = '#ff4d5e'; ctx.fillRect(x - w / 2, y - 30, w * Math.min(1, sus.meter / 40), 6); label(x, y - 42, 'ПОГОНЯ', '#ffb0b6'); }
      if (selected) { ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1.5; ctx.setLineDash([4, 5]); ctx.lineDashOffset = time * 20; ctx.beginPath(); ctx.arc(x, y, 21, 0, 7); ctx.stroke(); ctx.setLineDash([]); }
      hits.push({kind: 'call', id: c.id, x, y, r: 22});
    }

    // экипажи
    const parked = new Map();
    state.units.forEach(u => {
      let x = sx(u.x), y = sy(u.y);
      if (u.speed === 0 && !u.path.length) { const key = Math.round(x / 6) + ':' + Math.round(y / 6), k = parked.get(key) ?? 0; parked.set(key, k + 1); x += 16 + k * 20; y += 18 + (u.status === 'onscene' ? 0 : 6); }
      const length = Math.max(17, 4.8 * ppm), v = VEHICLES[u.type], selected = u.id === view.unit, flash = ['enroute', 'pursuit', 'onscene'].includes(u.status);
      if (selected) { ctx.strokeStyle = '#7ef0e0'; ctx.lineWidth = 2; ctx.setLineDash([7, 6]); ctx.lineDashOffset = -time * 24; ctx.beginPath(); ctx.arc(x, y, length * 0.9 + 8, 0, 7); ctx.stroke(); ctx.setLineDash([]); }
      if (u.player) { ctx.strokeStyle = 'rgba(255,209,102,0.9)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(x, y, length * 0.9 + 4, 0, 7); ctx.stroke(); }
      car(x, y, u.heading, length, v.color, night, {police: true, flash, lights: u.speed > 0});
      if (u.player) label(x, y + length * 0.6 + 14, 'ВЫ · ' + u.callsign.replace('Экипаж ', ''), '#2a1f00', '#ffd166'); else label(x, y + length * 0.6 + 14, u.callsign.replace('Экипаж ', ''), STATUS_COLOR[u.status]);
      hits.push({kind: 'unit', id: u.id, x, y, r: Math.max(20, length * 0.8)});
    });

    // всплывающие подписи
    popups = popups.filter(p => time - p.at < 2.6);
    for (const p of popups) { const k = (time - p.at) / 2.6; ctx.globalAlpha = 1 - k * k; label(sx(p.x), sy(p.y) - 34 - k * 38, p.text, p.good ? '#0d2a22' : '#fff', p.good ? '#6ee7b0' : '#d8455a'); ctx.globalAlpha = 1; }

    // виньетка
    const vg = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.45, W / 2, H / 2, Math.max(W, H) * 0.75);
    vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(4,8,12,0.55)'); ctx.fillStyle = vg; ctx.fillRect(0, 0, W, H);

    drawMinimap(state);
  }

  // ---------- миникарта ----------
  const mini = minimap.getContext('2d'), miniBase = document.createElement('canvas');
  let mk = 1;
  function buildMinimap() {
    const w = minimap.clientWidth || 200, h = minimap.clientHeight || 190, d = Math.min(2, window.devicePixelRatio || 1);
    minimap.width = miniBase.width = w * d; minimap.height = miniBase.height = h * d; mk = Math.min(w / BOUNDS.maxX, h / BOUNDS.maxY);
    const c = miniBase.getContext('2d'); c.setTransform(d * mk, 0, 0, d * mk, d * (w - BOUNDS.maxX * mk) / 2, d * (h - BOUNDS.maxY * mk) / 2);
    c.fillStyle = '#2c3a35'; c.fillRect(-1, -1, 9, 9);
    for (const a of query('areas', 0, 0, BOUNDS.maxX, BOUNDS.maxY)) { if (a.style !== 'water' && a.style !== 'park' && a.style !== 'forest') continue; c.beginPath(); poly(c, a.pts); c.fillStyle = AREA[a.style]; c.fill('evenodd'); }
    c.beginPath(); for (const r of roads) if (r.rank >= 3) poly(c, r.pts); c.strokeStyle = '#c9d0d3'; c.lineWidth = 1 / mk; c.stroke();
    minimap._off = {x: (w - BOUNDS.maxX * mk) / 2, y: (h - BOUNDS.maxY * mk) / 2, d};
  }
  buildMinimap();
  function drawMinimap(state) {
    const o = minimap._off; mini.setTransform(1, 0, 0, 1, 0, 0); mini.drawImage(miniBase, 0, 0);
    mini.setTransform(o.d, 0, 0, o.d, 0, 0);
    const mx = x => o.x + x * mk, my = y => o.y + y * mk;
    for (const c of state.calls) { if (c.state === 'done') continue; const sus = c.suspectId ? state.suspects.find(s => s.id === c.suspectId) : null; mini.fillStyle = SEV[callType(c).sev]; mini.beginPath(); mini.arc(mx(sus ? sus.x : c.x), my(sus ? sus.y : c.y), 3 + (Math.floor(time * 3) % 2), 0, 7); mini.fill(); }
    for (const u of state.units) { mini.fillStyle = STATUS_COLOR[u.status]; mini.fillRect(mx(u.x) - 2, my(u.y) - 2, 4, 4); }
    mini.strokeStyle = '#ffffffcc'; mini.lineWidth = 1; mini.strokeRect(mx(cam.x - W / 2 / cam.scale), my(cam.y - H / 2 / cam.scale), W / cam.scale * mk, H / cam.scale * mk);
  }
  function minimapJump(px, py) { const o = minimap._off; cam.follow = null; cam.x = (px - o.x) / mk; cam.y = (py - o.y) / mk; clampCam(); }

  return {
    draw, worldAt, minimapJump,
    pick(px, py) { let best = null, bestD = Infinity; for (const h of hits) { const d = Math.hypot(h.x - px, h.y - py); if (d < h.r && (d < bestD || (h.kind === 'unit' && best?.kind !== 'unit'))) { best = h; bestD = d; } } return best; },
    pan(dx, dy) { cam.follow = null; cam.x -= dx / cam.scale; cam.y -= dy / cam.scale; clampCam(); },
    zoom(factor, px = W / 2, py = H / 2) { cam.anchor = {x: px, y: py}; cam.target = Math.max(minScale(), Math.min(MAX_SCALE, cam.target * factor)); },
    focus(p, scale = null) { if (!p) return; cam.follow = null; cam.x = p.x; cam.y = p.y; if (scale) { cam.target = scale; cam.anchor = null; } clampCam(); },
    follow(id) { cam.follow = id; }, following: () => cam.follow,
    overview() { cam.follow = null; cam.anchor = null; cam.x = BOUNDS.maxX / 2; cam.y = BOUNDS.maxY / 2; cam.target = minScale(); },
    popup(x, y, text, good) { popups.push({x, y, text, good, at: time}); },
    camera: () => ({...cam}), stats: () => { const r = {baseMs: Math.round(baseMs), baseMax: Math.round(baseMax), worker: !!worker}; baseMax = 0; return r; },
  };
}
