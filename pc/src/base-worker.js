// Фоновый поток: рисует статичный слой города и отдаёт готовые картинки основному потоку.
import {paintBase} from './basemap.js';
let base = null, light = null;
self.onmessage = e => {
  const view = e.data, w = Math.round(view.cw * view.dpr), h = Math.round(view.ch * view.dpr);
  if (!base || base.width !== w || base.height !== h) { base = new OffscreenCanvas(w, h); light = new OffscreenCanvas(w, h); }
  paintBase(base.getContext('2d', {willReadFrequently: true}), light.getContext('2d', {willReadFrequently: true}), view);
  const a = base.transferToImageBitmap(), b = light.transferToImageBitmap();
  self.postMessage({...view, base: a, light: b}, [a, b]);
};
