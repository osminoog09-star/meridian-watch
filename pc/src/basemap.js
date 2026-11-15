// Общие для миникарты палитра земли и обход контура.
export const AREA = {residential: '#59665c', industrial: '#666b68', commercial: '#6a6c70', grass: '#5f8a5c', scrub: '#587f58', park: '#63a05f', forest: '#4a8452', pitch: '#74b56c', beach: '#d8c592', water: '#4b8fbd'};
export function poly(c, pts) { c.moveTo(pts[0], pts[1]); for (let i = 2; i < pts.length; i += 2) c.lineTo(pts[i], pts[i + 1]); }
