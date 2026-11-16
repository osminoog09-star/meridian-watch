// 3D-движок Mercury Response: WebGL (three.js). Город из контуров OSM, RTS-камера, смена дня и ночи,
// тени, светящиеся окна, фонари, фары, маяки, свечение, дым, дождь, пешеходы и трафик.
import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {EffectComposer} from 'three/addons/postprocessing/EffectComposer.js';
import {RenderPass} from 'three/addons/postprocessing/RenderPass.js';
import {UnrealBloomPass} from 'three/addons/postprocessing/UnrealBloomPass.js';
import {OutputPass} from 'three/addons/postprocessing/OutputPass.js';
import {FXAAPass} from 'three/addons/postprocessing/FXAAPass.js';
import {ShaderPass} from 'three/addons/postprocessing/ShaderPass.js';
import {BOUNDS, METRES, STATION, DISTRICTS, roads, buildings, areas, nearestNode} from './world.js';
import {VEHICLES} from './content.js';
import {callType} from './sim.js';
import {AREA, poly} from './basemap.js';

const M = METRES, SEV = ['#ffffff', '#ffd166', '#ff9f43', '#ff4d5e'];
const STATUS_COLOR = {patrol: '#5fd3c4', hold: '#9fb3bf', enroute: '#ffb347', onscene: '#ffe08a', pursuit: '#ff4d5e', transport: '#c59bff', booking: '#c59bff', returning: '#8fa4b0', resting: '#6f8792', injured: '#ff8a94'};
const lin = hex => new THREE.Color(hex);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const smooth = (a, b, v) => { const t = clamp((v - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };

export function nightFactor(t) {
  const h = (t / 3600) % 24;
  if (h >= 21.5 || h < 4.5) return 1;
  if (h >= 18.5) return (h - 18.5) / 3;
  if (h < 7) return 1 - (h - 4.5) / 2.5;
  return 0;
}

// ---------- текстуры, нарисованные кодом ----------
function radialTexture(stops) {
  const c = document.createElement('canvas'); c.width = c.height = 128;
  const g = c.getContext('2d'), grad = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  for (const [at, color] of stops) grad.addColorStop(at, color);
  g.fillStyle = grad; g.fillRect(0, 0, 128, 128);
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; return tex;
}
const GLOW = radialTexture([[0, 'rgba(255,255,255,1)'], [0.35, 'rgba(255,255,255,0.45)'], [1, 'rgba(255,255,255,0)']]);
const SOFT = radialTexture([[0, 'rgba(255,255,255,0.9)'], [0.6, 'rgba(255,255,255,0.35)'], [1, 'rgba(255,255,255,0)']]);
function beamTexture() {
  const c = document.createElement('canvas'); c.width = 4; c.height = 128;
  const g = c.getContext('2d'), grad = g.createLinearGradient(0, 128, 0, 0);
  grad.addColorStop(0, 'rgba(255,255,255,0.9)'); grad.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grad; g.fillRect(0, 0, 4, 128);
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; return tex;
}

// ---------- построитель геометрии ----------
class Builder {
  constructor(extra = {}) { this.cur = {}; this.p = []; this.n = []; this.c = []; this.extra = Object.fromEntries(Object.entries(extra).map(([k, size]) => [k, {size, data: []}])); }
  vert(x, y, z, nx, ny, nz, col, extra = {}) {
    this.p.push(x, y, z); this.n.push(nx, ny, nz); this.c.push(col.r, col.g, col.b);
    for (const [k, a] of Object.entries(this.extra)) { const v = extra[k] ?? this.cur[k] ?? 0; if (a.size === 1) a.data.push(v); else a.data.push(...v); }
  }
  get count() { return this.p.length / 3; }
  geometry() {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.p, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(this.n, 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(this.c, 3));
    for (const [k, a] of Object.entries(this.extra)) g.setAttribute(k, new THREE.Float32BufferAttribute(a.data, a.size));
    g.computeBoundingSphere(); return g;
  }
}
function flatPolygon(builder, pts, y, col, extra) { // pts в метрах: [x0,z0,x1,z1...]
  const contour = []; for (let i = 0; i < pts.length; i += 2) contour.push(new THREE.Vector2(pts[i], pts[i + 1]));
  if (contour.length > 2 && contour[0].equals(contour.at(-1))) contour.pop();
  if (contour.length < 3) return;
  let tris; try { tris = THREE.ShapeUtils.triangulateShape(contour, []); } catch { return; }
  for (const t of tris) for (const k of [t[0], t[2], t[1]]) builder.vert(contour[k].x, y, contour[k].y, 0, 1, 0, col, extra);
}
const toMetres = pts => { const out = new Float32Array(pts.length); for (let i = 0; i < pts.length; i++) out[i] = pts[i] * M; return out; };

// ---------- окна: встраиваем в стандартный материал ----------
// фактура поверхностей: шум по мировым координатам ломает однотонные плоскости; вода рябит
const NOISE_GLSL = `
  float hash2(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float vnoise(vec2 p) { vec2 i = floor(p), f = fract(p); vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash2(i), hash2(i + vec2(1, 0)), u.x), mix(hash2(i + vec2(0, 1)), hash2(i + vec2(1, 1)), u.x), u.y); }
  float cloudShade(vec2 p, float t) {
    float c = vnoise(p * 0.0016 + vec2(t * 0.011, t * 0.004)) * 0.65 + vnoise(p * 0.0047 + vec2(t * 0.018, -t * 0.006)) * 0.35;
    return smoothstep(0.5, 0.74, c);
  }`;
function textured(mat, kind, uniforms) {
  mat.onBeforeCompile = shader => {
    shader.uniforms.uTime = uniforms.uTime; shader.uniforms.uNight = uniforms.uNight; shader.uniforms.uWet = uniforms.uWet; shader.uniforms.uCloud = uniforms.uCloud;
    shader.vertexShader = 'varying vec2 vGW;\n' + shader.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\n vGW = (modelMatrix * vec4(transformed, 1.0)).xz;');
    const body = kind === 'water' ? `
        float w1 = vnoise(vGW * 0.045 + vec2(uTime * 0.25, uTime * 0.11)), w2 = vnoise(vGW * 0.11 - vec2(uTime * 0.18, -uTime * 0.07));
        float wave = w1 * 0.6 + w2 * 0.4;
        diffuseColor.rgb *= 0.86 + 0.26 * wave;
        diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.75, 0.86, 0.95), smoothstep(0.78, 0.95, wave) * 0.35 * (1.0 - uNight));`
      : kind === 'road' ? `
        float n = vnoise(vGW * 0.35) * 0.5 + vnoise(vGW * 0.04) * 0.5;
        diffuseColor.rgb *= 0.9 + 0.16 * n;
        float pud = smoothstep(0.6, 0.72, vnoise(vGW * 0.07 + 3.1));
        diffuseColor.rgb *= 1.0 - uWet * (0.2 + 0.25 * pud);`
      : `
        float n = vnoise(vGW * 0.11) * 0.45 + vnoise(vGW * 0.023) * 0.35 + vnoise(vGW * 0.9) * 0.2;
        diffuseColor.rgb *= 0.84 + 0.3 * n;`;
    let frag = shader.fragmentShader.replace('#include <color_fragment>', '#include <color_fragment>' + body + '\n diffuseColor.rgb *= 1.0 - 0.24 * uCloud * (1.0 - uNight) * cloudShade(vGW, uTime);');
    if (kind === 'road') frag = frag.replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\n roughnessFactor = mix(roughnessFactor, 0.12, uWet * (0.35 + 0.65 * pud));');
    shader.fragmentShader = 'uniform float uTime;\nuniform float uNight;\nuniform float uWet;\nuniform float uCloud;\nvarying vec2 vGW;\n' + NOISE_GLSL + '\n' + frag;
  };
  mat.customProgramCacheKey = () => 'tex-' + kind;
  return mat;
}
function windowMaterial(uniforms) {
  const mat = new THREE.MeshStandardMaterial({vertexColors: true, roughness: 0.86, metalness: 0.02, flatShading: true});
  mat.onBeforeCompile = shader => {
    shader.uniforms.uNight = uniforms.uNight; shader.uniforms.uHeat = uniforms.uHeat; shader.uniforms.uHeatOn = uniforms.uHeatOn; shader.uniforms.uTime = uniforms.uTime; shader.uniforms.uCloud = uniforms.uCloud;
    shader.vertexShader = 'attribute vec3 aMeta;\nattribute float aU;\nattribute float aDist;\nvarying vec3 vMeta;\nvarying float vU;\nvarying float vY;\nvarying float vDist;\nvarying vec2 vGW;\n' + shader.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\n vMeta = aMeta; vU = aU; vY = transformed.y; vDist = aDist; vGW = (modelMatrix * vec4(transformed, 1.0)).xz;');
    shader.fragmentShader = 'uniform float uNight;\nuniform float uTime;\nuniform float uCloud;\nuniform float uHeat[16];\nuniform float uHeatOn;\nvarying vec3 vMeta;\nvarying float vU;\nvarying float vY;\nvarying float vDist;\nvarying vec2 vGW;\n' + NOISE_GLSL + '\n' + shader.fragmentShader
      .replace('#include <color_fragment>', `#include <color_fragment>
        float winMask = 0.0, winLit = 0.0, winGlow = 1.0;
        float style = floor(vMeta.x - 0.5); // 0 жильё, 1 общественное, 2 торговля, 3 промышленность
        if (vMeta.x > 0.5 && vMeta.z > 2.5) {
          float bh0 = fract(sin(vMeta.y * 311.7 + vMeta.z * 17.3) * 9137.1);
          vec2 sz = vec2(2.9 + bh0 * 1.0, 3.0); vec4 box = vec4(0.22 + bh0 * 0.06, 0.78 - bh0 * 0.06, 0.3, 0.78);
          if (style > 0.5 && style < 1.5) { sz = vec2(2.9, 3.7); box = vec4(0.28, 0.72, 0.18, 0.86); } // высокие окна
          if (style > 2.5) { sz = vec2(7.0, 4.2); box = vec4(0.06, 0.94, 0.62, 0.86); } // ленточное остекление цехов
          vec2 cell = vec2(vU / sz.x, (vY - (vMeta.z < 4.0 ? 0.0 : 0.7)) / sz.y);
          vec2 f = fract(cell);
          winMask = step(box.x, f.x) * step(f.x, box.y) * step(box.z, f.y) * step(f.y, box.w) * step(0.9, vY) * step(vY, vMeta.z - 0.7);
          float h = fract(sin(dot(vec3(floor(cell), vMeta.y * 91.7), vec3(12.9898, 78.233, 37.719))) * 43758.5453);
          float bh = fract(sin(vMeta.y * 311.7 + vMeta.z * 17.3) * 9137.1);
          // витрины первого этажа у магазинов и части жилых домов на главных улицах
          float shopFront = style > 1.5 && style < 2.5 ? 1.0 : 0.0;
          float top = min(3.6, vMeta.z - 0.1);
          if (shopFront > 0.5 && vY < top) {
            float fu = fract(vU / 4.6);
            winMask = step(0.45, vY) * step(vY, top - 0.75) * step(0.07, fu) * step(fu, 0.93);
            h = h * 0.6; winGlow = 0.45;
            float awning = step(top - 0.62, vY) * step(vY, top - 0.14);
            vec3 awn = mix(vec3(0.62, 0.16, 0.12), vec3(0.12, 0.36, 0.3), step(0.5, bh));
            awn = mix(awn, vec3(0.86, 0.84, 0.8), step(0.5, fract(vU / 1.15)) * step(bh, 0.85));
            diffuseColor.rgb = mix(diffuseColor.rgb, awn, awning);
          }
          if (style < 0.5 && vMeta.z > 9.0 && bh < 0.45 && vY > 3.2) { // балконы у многоэтажек
            float balc = step(0.14, f.x) * step(f.x, 0.86) * step(0.0, f.y) * step(f.y, 0.3);
            diffuseColor.rgb = mix(diffuseColor.rgb, diffuseColor.rgb * 1.12 + 0.04, balc);
            diffuseColor.rgb *= 1.0 - 0.35 * balc * step(f.y, 0.06);
          }
          winLit = winMask * step(h, 0.3 + 0.35 * vMeta.y);
          float sky = smoothstep(0.0, 1.0, f.y) * 0.5 + 0.12 * step(0.5, fract(f.x * 2.0 + f.y));
          vec3 glass = mix(vec3(0.11, 0.15, 0.2), vec3(0.42, 0.52, 0.62), sky * (1.0 - uNight));
          diffuseColor.rgb = mix(diffuseColor.rgb, glass, winMask * 0.78);
        }
        if (vMeta.x > 0.5) {
          diffuseColor.rgb *= mix(0.55, 1.0, smoothstep(0.0, 4.5, vY)); // контактная тень у земли
          float floorLine = step(3.8, vMeta.z) * step(0.93, fract((vY - 0.25) / 3.1)) * step(1.0, vY);
          diffuseColor.rgb *= 1.0 - 0.1 * floorLine; // междуэтажные карнизы
          diffuseColor.rgb *= 1.0 + 0.12 * step(vMeta.z - 0.45, vY); // парапет
        }
        if (vMeta.x < 0.5) diffuseColor.rgb *= 1.0 - 0.22 * uCloud * (1.0 - uNight) * cloudShade(vGW, uTime); // только крыши
        if (uHeatOn > 0.001) {
          float heat = uHeat[int(vDist + 0.5)];
          if (heat >= 0.0) {
            vec3 hc = heat < 0.5 ? mix(vec3(0.22, 0.78, 0.38), vec3(0.98, 0.82, 0.25), heat * 2.0) : mix(vec3(0.98, 0.82, 0.25), vec3(0.95, 0.2, 0.18), heat * 2.0 - 1.0);
            diffuseColor.rgb = mix(diffuseColor.rgb, hc * (0.75 + 0.25 * step(0.5, vMeta.x)), uHeatOn * 0.62);
          }
        }`)
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
        totalEmissiveRadiance += vec3(1.0, 0.7, 0.38) * winLit * winGlow * uNight * 1.35;`);
  };
  return mat;
}

const STYLE_ID = {home: 0, civic: 1, shop: 2, ind: 3};
const WALL = {home: ['#e8dfcf', '#dcd2c0', '#f1e9da', '#d2cabb'], civic: ['#f2efe7', '#e9e5dc', '#f6f3ec', '#e3dfd6'], shop: ['#eadfcb', '#e2d5bf', '#f0e6d4', '#ddd0bb'], ind: ['#b9bcbc', '#aaaeae', '#c5c7c5', '#a0a4a5']};
const ROOF = {home: ['#b5573c', '#6d7680', '#c9764b', '#8a6a5a'], civic: ['#6a7a90', '#71819a', '#63738a', '#7788a0'], shop: ['#8a7f76', '#7d746d', '#958a80', '#6f6862'], ind: ['#7c8487', '#858d90', '#737b7e', '#8b9295']};
const GROUND = {land: '#93a383', residential: '#aeb5a3', industrial: '#b3afa8', commercial: '#bdb6ad', grass: '#86ad6a', scrub: '#7ea263', park: '#77b062', forest: '#558f4d', pitch: '#79bd67', beach: '#e5d6a4', water: '#3f80b2'};
const ROAD_COLOR = ['#7b7f82', '#696e72', '#62676b', '#585d62', '#53585d', '#4d5257'];

export function createRenderer(canvas, minimap) {
  // ---------- рендерер и сцена ----------
  const renderer = new THREE.WebGLRenderer({canvas, antialias: false, powerPreference: 'high-performance'});
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.0;
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFShadowMap;
  const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera(38, 1, 2, 60000);
  scene.fog = new THREE.Fog(0xa9c3d6, 3000, 20000);
  const uniforms = {uTime: {value: 0}, uWet: {value: 0}, uCloud: {value: 0.5}, uNight: {value: 0}, uHeat: {value: new Array(16).fill(-1)}, uHeatOn: {value: 0}};
  // качество: auto выбирает по видеокарте; поверх — динамическое разрешение
  const PRESETS = {
    high: {msaa: 4, fxaa: false, shadow: 4096, shadowEvery: 1, bloom: true, treeShadow: true, maxScale: 1.5},
    medium: {msaa: 0, fxaa: true, shadow: 2048, shadowEvery: 2, bloom: true, treeShadow: false, maxScale: 1},
    low: {msaa: 0, fxaa: false, shadow: 0, shadowEvery: 0, bloom: false, treeShadow: false, maxScale: 0.85},
  };
  let quality = 'auto';
  try { quality = localStorage.getItem('mercury-graphics') || 'auto'; } catch {}
  const gpu = (() => { try { const gl = renderer.getContext(), e = gl.getExtension('WEBGL_debug_renderer_info'); return e ? gl.getParameter(e.UNMASKED_RENDERER_WEBGL) : ''; } catch { return ''; } })();
  const weakGpu = /intel|uhd|iris|mesa|llvmpipe|swiftshader|microsoft basic|mali|adreno/i.test(gpu);
  const effective = () => quality === 'auto' ? (weakGpu ? 'medium' : 'high') : quality;
  let renderScale = 1, frameEma = 16.7, goodSeconds = 0, scaleClock = 0, frameNo = 0;

  // свет
  const hemi = new THREE.HemisphereLight(0xdfeaf5, 0x6a6250, 1.0);
  const sun = new THREE.DirectionalLight(0xfff3e0, 2.6);
  sun.castShadow = true; sun.shadow.mapSize.set(4096, 4096); sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.6;
  scene.add(hemi, sun, sun.target);

  // ---------- небо ----------
  const skyUni = {uTop: {value: new THREE.Color()}, uHorizon: {value: new THREE.Color()}, uSun: {value: new THREE.Vector3(0, 1, 0)}, uSunCol: {value: new THREE.Color()}, uNight: {value: 0}, uTime: uniforms.uTime};
  const skyDome = new THREE.Mesh(new THREE.SphereGeometry(30000, 32, 16), new THREE.ShaderMaterial({
    uniforms: skyUni, side: THREE.BackSide, depthWrite: false, fog: false,
    vertexShader: 'varying vec3 vDir; void main() { vDir = normalize((modelMatrix * vec4(position, 1.0)).xyz - cameraPosition); gl_Position = projectionMatrix * viewMatrix * modelMatrix * vec4(position, 1.0); gl_Position.z = gl_Position.w; }',
    fragmentShader: `uniform vec3 uTop; uniform vec3 uHorizon; uniform vec3 uSun; uniform vec3 uSunCol; uniform float uNight; uniform float uTime; varying vec3 vDir;
      float h3(vec3 p) { return fract(sin(dot(p, vec3(12.9898, 78.233, 45.164))) * 43758.5453); }
      void main() {
        vec3 d = normalize(vDir); float h = max(d.y, 0.0);
        vec3 col = mix(uHorizon, uTop, pow(h, 0.55));
        float s = max(dot(d, normalize(uSun)), 0.0);
        col += uSunCol * (pow(s, 900.0) * 6.0 + pow(s, 12.0) * 0.18) * (1.0 - uNight * 0.75);
        vec3 cell = floor(d * 260.0); float st = step(0.9965, h3(cell)) * (0.6 + 0.4 * sin(uTime * 2.0 + h3(cell + 1.0) * 30.0));
        col += vec3(0.9, 0.95, 1.0) * st * uNight * smoothstep(0.05, 0.35, h);
        gl_FragColor = vec4(col, 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
  }));
  skyDome.renderOrder = -100; skyDome.frustumCulled = false; scene.add(skyDome);
  const cloudLayer = new THREE.Mesh(new THREE.PlaneGeometry(60000, 60000).rotateX(-Math.PI / 2), new THREE.ShaderMaterial({
    uniforms: {uTime: uniforms.uTime, uAlpha: {value: 0}, uTint: {value: new THREE.Color(1, 1, 1)}}, transparent: true, depthWrite: false, fog: false,
    vertexShader: 'varying vec2 vGW; void main() { vGW = (modelMatrix * vec4(position, 1.0)).xz; gl_Position = projectionMatrix * viewMatrix * modelMatrix * vec4(position, 1.0); }',
    fragmentShader: `uniform float uTime; uniform float uAlpha; uniform vec3 uTint; varying vec2 vGW;` + NOISE_GLSL + `
      void main() { float c = cloudShade(vGW, uTime); gl_FragColor = vec4(uTint, c * uAlpha); }`,
  }));
  cloudLayer.position.y = 900; cloudLayer.renderOrder = 40; cloudLayer.frustumCulled = false; scene.add(cloudLayer);

  // ---------- статичный город ----------
  const city = new THREE.Group(); scene.add(city);
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(BOUNDS.maxX * M * 3, BOUNDS.maxY * M * 3).rotateX(-Math.PI / 2), textured(new THREE.MeshStandardMaterial({color: GROUND.land, roughness: 1, depthWrite: false}), 'ground', uniforms));
  ground.position.set(BOUNDS.maxX * M / 2, -0.5, BOUNDS.maxY * M / 2); ground.receiveShadow = true; ground.renderOrder = -20; city.add(ground);

  const AREA_ORDER = ['residential', 'industrial', 'commercial', 'grass', 'scrub', 'beach', 'park', 'forest', 'pitch', 'water'];
  const areaBuilders = Object.fromEntries(AREA_ORDER.map(k => [k, new Builder()]));
  for (const a of areas) flatPolygon(areaBuilders[a.style], toMetres(a.pts), 0, lin(GROUND[a.style]));
  AREA_ORDER.forEach((k, i) => {
    const b = areaBuilders[k]; if (!b.count) return;
    const mat = textured(new THREE.MeshStandardMaterial({vertexColors: true, roughness: k === 'water' ? 0.18 : 1, metalness: k === 'water' ? 0.15 : 0, depthWrite: false}), k === 'water' ? 'water' : 'ground', uniforms);
    const mesh = new THREE.Mesh(b.geometry(), mat); mesh.receiveShadow = true; mesh.renderOrder = -19 + i * 0.1; city.add(mesh);
  });

  // дороги: лента + скруглённые стыки, слоями по классу
  const roadLayers = [[-1], [0], [1, 2], [3], [4, 5]], roadBuilders = roadLayers.map(() => new Builder()), marks = new Builder(), walk = new Builder(), walkCol = lin('#c9c6be');
  const lampSpots = [], mainCells = new Set(), parkSpots = [];
  for (const r of roads) {
    const layer = roadLayers.findIndex(l => l.includes(r.rank)), b = roadBuilders[layer];
    const pts = toMetres(r.pts), half = (r.rank < 0 ? 1.4 : r.w * 0.55), col = lin(r.rank < 0 ? '#c3b79c' : ROAD_COLOR[r.rank]);
    let along = 0, nextLamp = 20;
    if (r.rank >= 3) { const pm = toMetres(r.pts); for (let i = 0; i + 3 < pm.length; i += 2) { const dx = pm[i + 2] - pm[i], dz = pm[i + 3] - pm[i + 1], k = Math.ceil(Math.hypot(dx, dz) / 8); for (let s = 0; s <= k; s++) { const cx = Math.floor((pm[i] + dx * s / k) / 20), cz = Math.floor((pm[i + 1] + dz * s / k) / 20); for (let a = -1; a <= 1; a++) for (let b2 = -1; b2 <= 1; b2++) mainCells.add((cx + a) * 100000 + cz + b2); } } }
    for (let i = 0; i < pts.length; i += 2) {
      const x = pts[i], z = pts[i + 1];
      const sw = half + 2.3;
      if (r.rank >= 2) for (let k = 0; k < 6; k++) { const a0 = k / 6 * Math.PI * 2, a1 = (k + 1) / 6 * Math.PI * 2; walk.vert(x, 0, z, 0, 1, 0, walkCol); walk.vert(x + Math.cos(a1) * sw, 0, z + Math.sin(a1) * sw, 0, 1, 0, walkCol); walk.vert(x + Math.cos(a0) * sw, 0, z + Math.sin(a0) * sw, 0, 1, 0, walkCol); }
      for (let k = 0; k < 6; k++) { const a0 = k / 6 * Math.PI * 2, a1 = (k + 1) / 6 * Math.PI * 2; b.vert(x, 0, z, 0, 1, 0, col); b.vert(x + Math.cos(a1) * half, 0, z + Math.sin(a1) * half, 0, 1, 0, col); b.vert(x + Math.cos(a0) * half, 0, z + Math.sin(a0) * half, 0, 1, 0, col); }
      if (i + 3 >= pts.length) continue;
      const x2 = pts[i + 2], z2 = pts[i + 3], dx = x2 - x, dz = z2 - z, len = Math.hypot(dx, dz) || 1, nx = -dz / len * half, nz = dx / len * half;
      if (r.rank >= 2) { const sx = nx / half * sw, sz = nz / half * sw; walk.vert(x + sx, 0, z + sz, 0, 1, 0, walkCol); walk.vert(x2 + sx, 0, z2 + sz, 0, 1, 0, walkCol); walk.vert(x2 - sx, 0, z2 - sz, 0, 1, 0, walkCol); walk.vert(x + sx, 0, z + sz, 0, 1, 0, walkCol); walk.vert(x2 - sx, 0, z2 - sz, 0, 1, 0, walkCol); walk.vert(x - sx, 0, z - sz, 0, 1, 0, walkCol); }
      b.vert(x + nx, 0, z + nz, 0, 1, 0, col); b.vert(x2 + nx, 0, z2 + nz, 0, 1, 0, col); b.vert(x2 - nx, 0, z2 - nz, 0, 1, 0, col);
      b.vert(x + nx, 0, z + nz, 0, 1, 0, col); b.vert(x2 - nx, 0, z2 - nz, 0, 1, 0, col); b.vert(x - nx, 0, z - nz, 0, 1, 0, col);
      if (r.rank >= 3) { // пунктир разметки
        const ux = dx / len, uz = dz / len, wx = -uz * 0.12, wz = ux * 0.12, mc = lin('#ece6cf');
        for (let s = (3 - along % 9 + 9) % 9; s < len; s += 9) {
          const e = Math.min(len, s + 3), ax = x + ux * s, az = z + uz * s, bx = x + ux * e, bz = z + uz * e;
          marks.vert(ax + wx, 0, az + wz, 0, 1, 0, mc); marks.vert(bx + wx, 0, bz + wz, 0, 1, 0, mc); marks.vert(bx - wx, 0, bz - wz, 0, 1, 0, mc);
          marks.vert(ax + wx, 0, az + wz, 0, 1, 0, mc); marks.vert(bx - wx, 0, bz - wz, 0, 1, 0, mc); marks.vert(ax - wx, 0, az - wz, 0, 1, 0, mc);
        }
      }
      if (r.rank >= 1 && r.rank <= 3 && len > 26) { // припаркованные машины у бордюра
        const ux = dx / len, uz = dz / len, yaw = Math.atan2(-uz, ux);
        for (let s = 11; s < len - 11 && parkSpots.length < 4 * 12000; s += 6.2) {
          const hh = Math.abs(Math.sin((x + s) * 12.9898 + (z - s) * 78.233) * 43758.5453) % 1; if (hh > 0.3) continue;
          const side = hh < 0.15 ? 1 : -1, off = (half - 1.05) * side;
          parkSpots.push(x + ux * s - uz * off, z + uz * s + ux * off, yaw + (side < 0 ? Math.PI : 0), hh * 97);
        }
      }
      if (r.rank >= 2) { while (nextLamp < along + len) { const t = (nextLamp - along) / len, side = (lampSpots.length % 2 ? 1 : -1) * (half + 1.2); lampSpots.push(x + dx * t - dz / len * side, z + dz * t + dx / len * side); nextLamp += 42; } }
      along += len;
    }
  }
  if (walk.count) { const mesh = new THREE.Mesh(walk.geometry(), textured(new THREE.MeshStandardMaterial({vertexColors: true, roughness: 0.95, depthWrite: false}), 'road', uniforms)); mesh.receiveShadow = true; mesh.renderOrder = -15.5; city.add(mesh); }
  const roadMat = textured(new THREE.MeshStandardMaterial({vertexColors: true, roughness: 0.92, depthWrite: false}), 'road', uniforms);
  roadBuilders.forEach((b, i) => { if (!b.count) return; const mesh = new THREE.Mesh(b.geometry(), roadMat); mesh.receiveShadow = true; mesh.renderOrder = -15 + i; city.add(mesh); });
  { const mesh = new THREE.Mesh(marks.geometry(), new THREE.MeshStandardMaterial({vertexColors: true, roughness: 0.7, depthWrite: false})); mesh.renderOrder = -9; mesh.receiveShadow = true; city.add(mesh); }

  // здания по участкам 700 м для отсечения
  const TILE = 700, tiles = new Map(), bmat = windowMaterial(uniforms), roofUnits = [];
  for (const bd of buildings) {
    const pts = toMetres(bd.pts), n = pts.length / 2, key = Math.floor(pts[0] / TILE) + ':' + Math.floor(pts[1] / TILE);
    let b = tiles.get(key); if (!b) { b = new Builder({aMeta: 3, aU: 1, aDist: 1}); tiles.set(key, b); }
    b.cur.aDist = nearestNode(bd.pts[0], bd.pts[1])?.district ?? 15;
    let a2 = 0; for (let i = 0; i < n; i++) { const j = (i + 1) % n; a2 += pts[i * 2] * pts[j * 2 + 1] - pts[j * 2] * pts[i * 2 + 1]; }
    const onMain = bd.style === 'home' && (Math.floor(Math.abs(pts[0]) * 3.7) % 5) < 3 && mainCells.has(Math.floor(pts[0] / 20) * 100000 + Math.floor(pts[1] / 20)), styleId = onMain ? 2 : STYLE_ID[bd.style];
    const ccw = a2 > 0, wall = lin(WALL[bd.style][bd.tone]), roof = lin(ROOF[bd.style][bd.tone]), h = bd.h, seed = bd.lit ? 0.9 : 0.25 + (bd.tone * 0.13);
    const walls = wall.clone().multiplyScalar(0.92);
    let u = 0;
    for (let k = 0; k < n; k++) {
      let i = k, j = (k + 1) % n; if (ccw) [i, j] = [j, i];
      const x1 = pts[i * 2], z1 = pts[i * 2 + 1], x2 = pts[j * 2], z2 = pts[j * 2 + 1], len = Math.hypot(x2 - x1, z2 - z1);
      if (len < 0.05) continue;
      const nx = -(z2 - z1) / len, nz = (x2 - x1) / len, meta = {aMeta: [1 + styleId, seed, h]};
      const v = (x, y, z, uu) => b.vert(x, y, z, nx, 0, nz, walls, {...meta, aU: uu});
      v(x1, 0, z1, u); v(x2, 0, z2, u + len); v(x2, h, z2, u + len);
      v(x1, 0, z1, u); v(x2, h, z2, u + len); v(x1, h, z1, u);
      u += len;
    }
    if (!gableRoof(b, pts, h, roof, walls, seed)) {
      flatPolygon(b, pts, h, roof, {aMeta: [0, seed, h], aU: 0});
      const area = Math.abs(a2) / 2;
      if (area > 160 && h > 5) {
        let cx = 0, cz = 0; for (let k = 0; k < n; k++) { cx += pts[k * 2]; cz += pts[k * 2 + 1]; } cx /= n; cz /= n;
        const r = Math.sqrt(area) * 0.22, count = 1 + (area > 600 ? 2 : area > 300 ? 1 : 0);
        for (let k = 0; k < count; k++) { const a = (seed * 13 + k * 2.1) % 6.28, d = r * (0.3 + ((k * 0.37 + seed) % 0.7)); roofUnits.push(cx + Math.cos(a) * d, h, cz + Math.sin(a) * d, 1.4 + (k % 2) * 1.2); }
      }
    }
  }
  const buildingMeshes = [];
  // двускатная крыша: 4 угла, небольшая площадь, невысокий дом
  function gableRoof(b, pts, h, roof, wall, seed) {
    let n = pts.length / 2; if (n === 5 && Math.hypot(pts[0] - pts[8], pts[1] - pts[9]) < 0.05) n = 4;
    if (n !== 4 || h > 11) return false;
    const P = [0, 1, 2, 3].map(k => ({x: pts[k * 2], z: pts[k * 2 + 1]})), L = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
    const e0 = L(P[0], P[1]), e1 = L(P[1], P[2]); if (e0 * e1 > 420 || Math.min(e0, e1) < 3) return false;
    const [a, bb, c, d] = e0 >= e1 ? P : [P[1], P[2], P[3], P[0]], short = Math.min(e0, e1), rise = Math.min(4.5, short * 0.42);
    const mid = (p, q) => ({x: (p.x + q.x) / 2, z: (p.z + q.z) / 2}), r1 = mid(d, a), r2 = mid(bb, c), top = h + rise;
    const meta = {aMeta: [0, seed, h], aU: 0}, slope = roof.clone(), dark = roof.clone().multiplyScalar(0.78);
    const tri = (p, q, s, col) => {
      const ux = q.x - p.x, uy = q.y - p.y, uz = q.z - p.z, vx = s.x - p.x, vy = s.y - p.y, vz = s.z - p.z;
      let nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx; if (ny < 0) { [q, s] = [s, q]; nx = -nx; ny = -ny; nz = -nz; }
      const l = Math.hypot(nx, ny, nz) || 1; for (const v of [p, q, s]) b.vert(v.x, v.y, v.z, nx / l, ny / l, nz / l, col, meta);
    };
    const v = (p, y) => ({x: p.x, y, z: p.z});
    tri(v(a, h), v(bb, h), v(r2, top), slope); tri(v(a, h), v(r2, top), v(r1, top), slope);
    tri(v(c, h), v(d, h), v(r1, top), dark); tri(v(c, h), v(r1, top), v(r2, top), dark);
    const gable = (p, q, r) => { const g = wall.clone(); tri(v(p, h), v(q, h), v(r, top), g); };
    gable(d, a, r1); gable(bb, c, r2);
    return true;
  }
  for (const b of tiles.values()) { const mesh = new THREE.Mesh(b.geometry(), bmat); mesh.castShadow = mesh.receiveShadow = true; city.add(mesh); buildingMeshes.push(mesh); }
  if (roofUnits.length) { // крышные установки — один инстанс-меш на весь город
    const units = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1).translate(0, 0.5, 0), new THREE.MeshStandardMaterial({color: '#a7adb0', roughness: 0.6, metalness: 0.3}), roofUnits.length / 4), m4 = new THREE.Matrix4();
    for (let i = 0; i < roofUnits.length / 4; i++) { const [x, y, z, s] = roofUnits.slice(i * 4, i * 4 + 4); m4.makeScale(s * 1.6, s * 0.8, s); m4.setPosition(x, y, z); units.setMatrixAt(i, m4); }
    units.castShadow = true; units.receiveShadow = true; city.add(units);
  }

  // деревья в парках и лесах + во дворах
  const treeSpots = [];
  {
    const CELL = 4, GW = Math.ceil(BOUNDS.maxX * M / CELL) + 1, GH = Math.ceil(BOUNDS.maxY * M / CELL) + 1, busy = new Uint8Array(GW * GH);
    const mark = (x, z, r) => { const c0 = Math.max(0, Math.floor((x - r) / CELL)), c1 = Math.min(GW - 1, Math.floor((x + r) / CELL)), r0 = Math.max(0, Math.floor((z - r) / CELL)), r1 = Math.min(GH - 1, Math.floor((z + r) / CELL)); for (let rz = r0; rz <= r1; rz++) busy.fill(1, rz * GW + c0, rz * GW + c1 + 1); };
    for (const r of roads) { const p = toMetres(r.pts), half = (r.rank < 0 ? 1.4 : r.w * 0.55) + (r.rank >= 2 ? 4.5 : 2.5); for (let i = 0; i + 3 < p.length; i += 2) { const dx = p[i + 2] - p[i], dz = p[i + 3] - p[i + 1], len = Math.hypot(dx, dz), k = Math.ceil(len / 2.5); for (let s = 0; s <= k; s++) mark(p[i] + dx * s / k, p[i + 1] + dz * s / k, half); } }
    for (const bd of buildings) { const p = toMetres(bd.pts); let x0 = Infinity, z0 = Infinity, x1 = -Infinity, z1 = -Infinity; for (let i = 0; i < p.length; i += 2) { x0 = Math.min(x0, p[i]); x1 = Math.max(x1, p[i]); z0 = Math.min(z0, p[i + 1]); z1 = Math.max(z1, p[i + 1]); } const pad = 3.5; for (let x = x0 - pad; x <= x1 + pad; x += CELL) for (let z = z0 - pad; z <= z1 + pad; z += CELL) mark(x, z, 0.1); }
    const yard = new Set(['residential', 'grass', 'commercial']), frac = v => v - Math.floor(v);
    for (const a of areas) {
      if (!yard.has(a.style)) continue;
      const step = a.style === 'commercial' ? 30 : 19, p = toMetres(a.pts), n = p.length;
      const x0 = Math.max(a.box[0] * M, 0), z0 = Math.max(a.box[1] * M, 0), x1 = Math.min(a.box[2] * M, BOUNDS.maxX * M), z1 = Math.min(a.box[3] * M, BOUNDS.maxY * M);
      for (let iz = Math.ceil(z0 / step); iz * step <= z1; iz++) for (let ix = Math.ceil(x0 / step); ix * step <= x1; ix++) {
        if (treeSpots.length > 3 * 22000) break;
        const h = frac(Math.sin(ix * 91.3 + iz * 47.9) * 24634.6345); if (h < 0.35) continue;
        const px = (ix + (h - 0.5) * 0.9) * step, pz = (iz + (frac(h * 5.71) - 0.5) * 0.9) * step;
        const c = Math.floor(px / CELL), rr = Math.floor(pz / CELL); if (c < 1 || rr < 1 || c >= GW - 1 || rr >= GH - 1) continue;
        if (busy[rr * GW + c] || busy[rr * GW + c - 1] || busy[rr * GW + c + 1] || busy[(rr - 1) * GW + c] || busy[(rr + 1) * GW + c]) continue;
        let inside = false;
        for (let i = 0, j = n - 2; i < n; j = i, i += 2) if ((p[i + 1] > pz) !== (p[j + 1] > pz) && px < (p[j] - p[i]) * (pz - p[i + 1]) / (p[j + 1] - p[i + 1]) + p[i]) inside = !inside;
        if (inside) treeSpots.push(px, pz, 0.6 + h * 0.5);
      }
    }
  }
  {
    const frac = v => v - Math.floor(v);
    for (const a of areas) {
      if ((a.style !== 'park' && a.style !== 'forest') || treeSpots.length > 3 * 52000) continue;
      const step = a.style === 'forest' ? 11 : 17, p = toMetres(a.pts), n = p.length;
      const x0 = Math.max(a.box[0] * M, 0), z0 = Math.max(a.box[1] * M, 0), x1 = Math.min(a.box[2] * M, BOUNDS.maxX * M), z1 = Math.min(a.box[3] * M, BOUNDS.maxY * M);
      for (let iz = Math.ceil(z0 / step); iz * step <= z1; iz++) for (let ix = Math.ceil(x0 / step); ix * step <= x1; ix++) {
        const h = frac(Math.sin(ix * 127.1 + iz * 311.7) * 43758.5453), px = (ix + (h - 0.5) * 0.8) * step, pz = (iz + (frac(h * 7.13) - 0.5) * 0.8) * step;
        let inside = false;
        for (let i = 0, j = n - 2; i < n; j = i, i += 2) if ((p[i + 1] > pz) !== (p[j + 1] > pz) && px < (p[j] - p[i]) * (pz - p[i + 1]) / (p[j + 1] - p[i + 1]) + p[i]) inside = !inside;
        if (inside) treeSpots.push(px, pz, 0.75 + h * 0.7);
      }
    }
  }
  const treeGeo = (() => {
    const crown = new THREE.IcosahedronGeometry(2.6, 0).translate(0, 5.2, 0), trunk = new THREE.CylinderGeometry(0.28, 0.36, 3, 5).translate(0, 1.5, 0);
    const paint = (g, hex) => { const c = lin(hex), arr = []; for (let i = 0; i < g.attributes.position.count; i++) arr.push(c.r, c.g, c.b); g.setAttribute('color', new THREE.Float32BufferAttribute(arr, 3)); return g.index ? g.toNonIndexed() : g; };
    return mergeGeometries([paint(crown, '#ffffff'), paint(trunk, '#5b4636')]);
  })();
  const TREE_TILE = 900, treeTiles = new Map(), treeMat = new THREE.MeshStandardMaterial({vertexColors: true, roughness: 0.9, flatShading: true});
  for (let i = 0; i < treeSpots.length; i += 3) { const key = Math.floor(treeSpots[i] / TREE_TILE) + ':' + Math.floor(treeSpots[i + 1] / TREE_TILE); (treeTiles.get(key) ?? treeTiles.set(key, []).get(key)).push(i); }
  const treeMeshes = [];
  {
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), c = new THREE.Color(), axis = new THREE.Vector3(0, 1, 0), pos = new THREE.Vector3(), sc = new THREE.Vector3();
    for (const list of treeTiles.values()) {
      const mesh = new THREE.InstancedMesh(treeGeo, treeMat, list.length);
      list.forEach((i, k) => {
        const s = treeSpots[i + 2]; q.setFromAxisAngle(axis, (i * 2.3) % 6.28); m.compose(pos.set(treeSpots[i], 0, treeSpots[i + 1]), q, sc.set(s, s, s)); mesh.setMatrixAt(k, m);
        c.setHSL(0.26 + (i % 7) * 0.013, 0.45, 0.33 + (i % 5) * 0.035, THREE.SRGBColorSpace); mesh.setColorAt(k, c);
      });
      mesh.receiveShadow = true; mesh.computeBoundingSphere(); mesh.computeBoundingBox(); city.add(mesh); treeMeshes.push(mesh);
    }
  }
  const trees = {count: treeSpots.length / 3, set castShadow(v) { for (const x of treeMeshes) x.castShadow = v; }, set visible(v) { for (const x of treeMeshes) x.visible = v; }};

  // фонари: опора + светящаяся голова + пятно света на асфальте
  const lampCount = lampSpots.length / 2, LAMP_TILE = 900, lampTiles = new Map();
  for (let i = 0; i < lampCount; i++) { const key = Math.floor(lampSpots[i * 2] / LAMP_TILE) + ':' + Math.floor(lampSpots[i * 2 + 1] / LAMP_TILE); (lampTiles.get(key) ?? lampTiles.set(key, []).get(key)).push(i); }
  const postGeo = new THREE.CylinderGeometry(0.09, 0.12, 7, 3).translate(0, 3.5, 0), headGeo = new THREE.OctahedronGeometry(0.4).translate(0, 7.1, 0), poolGeo = new THREE.PlaneGeometry(11, 11).rotateX(-Math.PI / 2);
  const postMat = new THREE.MeshStandardMaterial({color: '#3d4247', roughness: 0.6}), lampHeadMat = new THREE.MeshBasicMaterial({color: new THREE.Color(1, 0.85, 0.6)});
  const poolMat = new THREE.MeshBasicMaterial({map: GLOW, color: new THREE.Color(1, 0.72, 0.42), transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false});
  const lampGroups = [];
  {
    const m = new THREE.Matrix4();
    for (const list of lampTiles.values()) {
      const post = new THREE.InstancedMesh(postGeo, postMat, list.length), head = new THREE.InstancedMesh(headGeo, lampHeadMat, list.length), pool = new THREE.InstancedMesh(poolGeo, poolMat, list.length);
      list.forEach((i, k) => { m.makeTranslation(lampSpots[i * 2], 0, lampSpots[i * 2 + 1]); post.setMatrixAt(k, m); head.setMatrixAt(k, m); m.makeTranslation(lampSpots[i * 2], 0.05, lampSpots[i * 2 + 1]); pool.setMatrixAt(k, m); });
      pool.renderOrder = -8;
      for (const x of [post, head, pool]) { x.computeBoundingSphere(); city.add(x); }
      lampGroups.push({post, head, pool});
    }
  }
  const setLamps = (detail, pools) => { for (const g of lampGroups) { g.post.visible = g.head.visible = detail; g.pool.visible = pools; } };
  const lampPost = {set visible(v) { for (const g of lampGroups) g.post.visible = v; }}, lampHead = {set visible(v) { for (const g of lampGroups) g.head.visible = v; }}, lampPool = {set visible(v) { for (const g of lampGroups) g.pool.visible = v; }};

  // участок
  const station = new THREE.Group(); {
    const base = new THREE.Mesh(new THREE.CylinderGeometry(16, 16, 0.4, 24), new THREE.MeshStandardMaterial({color: '#2a5d9f', roughness: 0.5}));
    const ring = new THREE.Mesh(new THREE.RingGeometry(18, 22, 40).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({color: new THREE.Color(0.4, 0.75, 2.2), transparent: true, opacity: 0.85, depthWrite: false}));
    ring.position.y = 0.3; station.add(base, ring); station.userData.ring = ring;
    station.position.set(STATION.x * M, 0.2, STATION.y * M); scene.add(station);
  }

  // ---------- транспорт ----------
  const carGeo = (() => {
    const body = new THREE.BoxGeometry(4.4, 1.0, 1.85).translate(0, 0.75, 0), cabin = new THREE.BoxGeometry(2.3, 0.72, 1.62).translate(-0.25, 1.6, 0);
    const paint = (g, v) => { const arr = []; for (let i = 0; i < g.attributes.position.count; i++) arr.push(v, v, v); g.setAttribute('color', new THREE.Float32BufferAttribute(arr, 3)); return g.toNonIndexed(); };
    return mergeGeometries([paint(body, 1), paint(cabin, 0.32)]);
  })();
  const carMat = new THREE.MeshStandardMaterial({vertexColors: true, roughness: 0.45, metalness: 0.3});
  const MAX_TRAFFIC = 160;
  const lightGeo = (() => {
    const box = (x, z, hex) => { const g = new THREE.BoxGeometry(0.08, 0.2, 0.34).translate(x, 0.88, z), c = lin(hex), arr = []; for (let i = 0; i < g.attributes.position.count; i++) arr.push(c.r, c.g, c.b); g.setAttribute('color', new THREE.Float32BufferAttribute(arr, 3)); return g.toNonIndexed(); };
    return mergeGeometries([box(2.22, 0.62, '#fff6dc'), box(2.22, -0.62, '#fff6dc'), box(-2.22, 0.66, '#ff1c10'), box(-2.22, -0.66, '#ff1c10')]);
  })();
  const lightMat = new THREE.MeshBasicMaterial({vertexColors: true, toneMapped: false});
  const traffic = new THREE.InstancedMesh(carGeo, carMat, MAX_TRAFFIC); traffic.castShadow = true; traffic.frustumCulled = false; scene.add(traffic);
  const parkedCars = new THREE.InstancedMesh(carGeo, carMat, Math.max(1, parkSpots.length / 4));
  {
    const pc = ['#9aa7ad', '#c9c2b2', '#7d8f9b', '#a38f86', '#8b9a8c', '#d8dcde', '#5d6b78', '#b33a3a', '#2f4f8f', '#e0c27a', '#3c3f44', '#efefef', '#1d2228'].map(lin), m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), up = new THREE.Vector3(0, 1, 0), pos = new THREE.Vector3(), one = new THREE.Vector3(0.96, 0.96, 0.96);
    for (let i = 0; i < parkSpots.length / 4; i++) { const [x, z, yaw, h] = parkSpots.slice(i * 4, i * 4 + 4); q.setFromAxisAngle(up, yaw); m4.compose(pos.set(x, 0, z), q, one); parkedCars.setMatrixAt(i, m4); parkedCars.setColorAt(i, pc[Math.floor(h) % pc.length]); }
    parkedCars.count = parkSpots.length / 4; parkedCars.castShadow = false; parkedCars.receiveShadow = true; scene.add(parkedCars);
  }
  const trafficLights = new THREE.InstancedMesh(lightGeo, lightMat, MAX_TRAFFIC); trafficLights.frustumCulled = false; trafficLights.count = 0; scene.add(trafficLights);
  const beamMat = new THREE.MeshBasicMaterial({map: SOFT, color: new THREE.Color(1, 0.92, 0.72), transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false});
  const beamGeo = new THREE.PlaneGeometry(16, 7).rotateX(-Math.PI / 2).translate(10, 0.08, 0);
  const trafficBeams = new THREE.InstancedMesh(beamGeo, beamMat, MAX_TRAFFIC); trafficBeams.frustumCulled = false; trafficBeams.renderOrder = -7; scene.add(trafficBeams);

  // пешеходы
  const footways = roads.filter(r => r.rank < 0 && r.pts.length >= 4);
  const WALKERS = 900, walkers = [];
  for (let i = 0; i < WALKERS && footways.length; i++) { const r = footways[(i * 7919) % footways.length]; walkers.push({r, seg: (i * 3) % (r.pts.length / 2 - 1), t: (i % 10) / 10, dir: i % 2 ? 1 : -1, v: 1.1 + (i % 7) * 0.08}); }
  const people = new THREE.InstancedMesh(new THREE.CapsuleGeometry(0.27, 0.85, 3, 6).translate(0, 0.72, 0), new THREE.MeshStandardMaterial({roughness: 0.8}), walkers.length);
  const heads = new THREE.InstancedMesh(new THREE.SphereGeometry(0.21, 8, 6).translate(0, 1.62, 0), new THREE.MeshStandardMaterial({roughness: 0.7}), walkers.length);
  { const c = new THREE.Color(), skin = ['#f1c9a5', '#e0ac85', '#c68863', '#8d5a3b', '#f5d7bd']; for (let i = 0; i < walkers.length; i++) heads.setColorAt(i, c.set(skin[(i * 7) % skin.length])); }
  heads.castShadow = false; heads.frustumCulled = false; scene.add(heads);
  { const c = new THREE.Color(); const palette = ['#c0392b', '#2c3e50', '#27ae60', '#8e44ad', '#f39c12', '#16a085', '#d35400', '#34495e', '#e8e3d9']; for (let i = 0; i < walkers.length; i++) people.setColorAt(i, c.set(palette[i % palette.length])); }
  people.castShadow = true; people.frustumCulled = false; scene.add(people);

  // люди на месте: офицеры у машин и подозреваемые
  const MAX_FIG = 160, figGeo = new THREE.CapsuleGeometry(0.3, 0.9, 3, 6).translate(0, 0.75, 0);
  const tint = (g, hex) => { const c = lin(hex), n = g.attributes.position.count, a = new Float32Array(n * 3); for (let i = 0; i < n; i++) a.set([c.r, c.g, c.b], i * 3); g.setAttribute('color', new THREE.BufferAttribute(a, 3)); return g; };
  const copHeadGeo = mergeGeometries([tint(new THREE.SphereGeometry(0.24, 10, 8).translate(0, 1.72, 0), '#e8b996'), tint(new THREE.CylinderGeometry(0.25, 0.27, 0.14, 12).translate(0, 1.9, 0), '#101c33'), tint(new THREE.CylinderGeometry(0.33, 0.33, 0.03, 12).translate(0.08, 1.84, 0), '#0b1426')]);
  const copHeads = new THREE.InstancedMesh(copHeadGeo, new THREE.MeshStandardMaterial({vertexColors: true, roughness: 0.6}), MAX_FIG);
  const perpHeads = new THREE.InstancedMesh(new THREE.SphereGeometry(0.24, 10, 8).translate(0, 1.72, 0), new THREE.MeshStandardMaterial({color: '#d9a07c', roughness: 0.7}), 60);
  const MAX_CONES = 320, cones = new THREE.InstancedMesh(mergeGeometries([tint(new THREE.ConeGeometry(0.3, 0.8, 10).translate(0, 0.4, 0), '#ff6a1a'), tint(new THREE.CylinderGeometry(0.17, 0.21, 0.12, 10).translate(0, 0.48, 0), '#f4f4f4'), tint(new THREE.BoxGeometry(0.7, 0.05, 0.7).translate(0, 0.025, 0), '#1b1b1b')]), new THREE.MeshStandardMaterial({vertexColors: true, roughness: 0.5, emissive: '#3a1400'}), MAX_CONES);
  for (const m of [copHeads, perpHeads, cones]) { m.castShadow = true; m.frustumCulled = false; m.count = 0; scene.add(m); }
  const officers = new THREE.InstancedMesh(figGeo, new THREE.MeshStandardMaterial({color: '#2d63c8', roughness: 0.55, emissive: '#10285a'}), MAX_FIG);
  const perps = new THREE.InstancedMesh(figGeo, new THREE.MeshStandardMaterial({color: '#e76f51', roughness: 0.7, emissive: '#3a1208'}), 60);
  for (const m of [officers, perps]) { m.castShadow = true; m.frustumCulled = false; m.count = 0; scene.add(m); }
  const figM = new THREE.Matrix4(), figQ = new THREE.Quaternion(), figS = new THREE.Vector3(), figP = new THREE.Vector3(), figUp = new THREE.Vector3(0, 1, 0);
  function figure(mesh, n, x, z, yaw, s, sy = 1, head = null) { figQ.setFromAxisAngle(figUp, yaw); figS.set(s, s * sy, s); figP.set(x, 0, z); figM.compose(figP, figQ, figS); mesh.setMatrixAt(n, figM); if (head) head.setMatrixAt(n, figM); }
  function drawFigures(state, boost, dt = 0) {
    let no = 0, np = 0;
    if (boost <= 4) {
      const s = Math.min(boost, 2.2) * 1.25, lead = new Map(), spot = new Map();
      for (const u of state.units) if (u.status === 'onscene' && !u.fly && u.callId != null && !lead.has(u.callId)) lead.set(u.callId, u);
      // подозреваемые: стоят, мечутся на переговорах, на коленях при сдаче, идут к машине под конвоем
      for (const c of state.calls) {
        if (!['choice', 'standoff', 'active'].includes(c.state) || c.suspectId || !callType(c).suspect || c.reaction === 'flee') continue;
        const a = callType(c).approaches[c.approach], p = c.state === 'active' ? clamp(c.progress / Math.max(1, c.work), 0, 1) : 0;
        const fight = c.reaction === 'fight' && c.state === 'active', escort = c.state === 'active' && a?.arrest && !fight && p > 0.5, car = lead.get(c.id);
        let x = c.x * M + 7 * s, z = c.y * M + 3 * s;
        if (c.state === 'standoff') x += Math.sin(time * (1 + (100 - c.standoff.stability) / 40) + c.id) * 2.2 * s;
        if (escort && car) { const k = smooth(0.5, 1, p); x += (car.x * M + 2.2 * s - x) * k; z += (car.y * M + 2.2 * s - z) * k; }
        const kneel = c.state === 'active' && !fight && !escort && (c.reaction === 'surrender' || (a?.arrest && p > 0.25));
        spot.set(c.id, {x, z, p, fight, escort, arrest: !!a?.arrest});
        if (np < 60) figure(perps, np++, x, z, fight ? Math.atan2((car?.x ?? c.x) * M - x, (car?.y ?? c.y) * M - z) : time * (c.state === 'standoff' ? 0.6 : 0) + c.id, s, kneel ? 0.55 : 1, perpHeads);
        if (fight && Math.random() < dt * 2.5) emit(x, z, 'spark');
      }
      // офицеры: подходят, надевают наручники, ведут к машине; в перестрелке укрываются за машиной
      for (const u of state.units) {
        if (u.status !== 'onscene' || u.fly) continue;
        const c = state.calls.find(c => c.id === u.callId); if (!c) continue;
        const sp = spot.get(c.id), ux = u.x * M, uz = u.y * M, px = sp?.x ?? c.x * M + 7 * s, pz = sp?.z ?? c.y * M + 3 * s;
        const dx = px - ux, dz = pz - uz, d = Math.hypot(dx, dz) || 1, fx = dx / d, fz = dz / d, n = u.crew?.length ?? 2;
        for (let i = 0; i < n && no < MAX_FIG; i++) {
          const side = (i - (n - 1) / 2) * 1.8 * s, sway = Math.sin(time * 2 + u.id + i) * 0.12 * s;
          let reach = Math.min(d * 0.55, 5 * s), sy = 1;
          if (sp?.fight) { reach = -2.4 * s; sy = 0.72; if (Math.random() < dt * 3) emit(ux - fx * 2 * s - fz * side, uz - fz * 2 * s + fx * side, 'spark'); } // укрытие за машиной
          else if (sp?.escort) reach = d - 1.4 * s; // конвой рядом с задержанным
          else if (sp?.arrest && c.state === 'active') reach = Math.min(d - 1.5 * s, reach + (d - 1.5 * s - reach) * smooth(0, 0.35, sp.p)); // подходят к подозреваемому
          figure(officers, no++, ux + fx * reach - fz * side + sway, uz + fz * reach + fx * side, Math.atan2(fx, fz), s, sy, copHeads);
        }
      }
    }
    // оцепление: конусы вокруг места, где работает полиция
    let nc = 0;
    if (boost <= 4) {
      const s = Math.min(boost, 2.2) * 1.25;
      for (const c of state.calls) {
        if (!['choice', 'standoff', 'active'].includes(c.state) || c.suspectId || nc + 10 > MAX_CONES) continue;
        if (!state.units.some(u => u.callId === c.id && u.status === 'onscene')) continue;
        const cx = c.x * M + 3.5 * s, cz = c.y * M + 1.5 * s, r = (c.state === 'standoff' ? 15 : 11) * s, k = c.state === 'standoff' ? 12 : 8;
        for (let i = 0; i < k; i++) { const a = i / k * Math.PI * 2 + c.id; figQ.setFromAxisAngle(figUp, a); figS.setScalar(s); figP.set(cx + Math.cos(a) * r, 0, cz + Math.sin(a) * r); figM.compose(figP, figQ, figS); cones.setMatrixAt(nc++, figM); }
      }
    }
    cones.count = nc; cones.instanceMatrix.needsUpdate = true;
    officers.count = copHeads.count = no; perps.count = perpHeads.count = np;
    for (const m of [officers, perps, copHeads, perpHeads]) m.instanceMatrix.needsUpdate = true;
  }

  // след погони
  const TRAIL_MAX = 3000, trailHist = new Map(), trailPos = new Float32Array(TRAIL_MAX * 3), trailCol = new Float32Array(TRAIL_MAX * 3);
  const trailGeo = new THREE.BufferGeometry(); trailGeo.setAttribute('position', new THREE.BufferAttribute(trailPos, 3)); trailGeo.setAttribute('color', new THREE.BufferAttribute(trailCol, 3));
  const trailMat = new THREE.PointsMaterial({size: 5, map: GLOW, vertexColors: true, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, sizeAttenuation: true});
  const trail = new THREE.Points(trailGeo, trailMat); trail.frustumCulled = false; trail.renderOrder = -4; scene.add(trail);
  function trailPush(key, x, z) { let h = trailHist.get(key); if (!h) trailHist.set(key, h = []); const last = h[h.length - 1]; if (!last || Math.hypot(last[0] - x, last[1] - z) > 4) { h.push([x, z]); if (h.length > 45) h.shift(); } h.seen = true; }
  function drawTrails(boost) {
    let n = 0;
    for (const [key, h] of trailHist) {
      if (!h.seen) { h.splice(0, Math.max(1, Math.ceil(h.length * 0.08))); if (!h.length) { trailHist.delete(key); continue; } } // след тает
      h.seen = false;
      const red = key[0] === 's', len = h.length;
      for (let i = 0; i < len && n < TRAIL_MAX; i++, n++) {
        const k = (i + 1) / len, f = k * k;
        trailPos.set([h[i][0], 0.6, h[i][1]], n * 3);
        trailCol.set(red ? [1.6 * f, 0.25 * f, 0.15 * f] : [0.2 * f, 0.5 * f, 1.6 * f], n * 3);
      }
    }
    trailGeo.setDrawRange(0, n); trailGeo.attributes.position.needsUpdate = true; trailGeo.attributes.color.needsUpdate = true;
    trailMat.size = 4.5 * Math.min(boost, 10);
  }

  // полицейские машины и вертолёты — по объекту на экипаж
  const unitObjs = new Map();
  function makePoliceObj(u) {
    const v = VEHICLES[u.type] ?? VEHICLES.sedan, g = new THREE.Group();
    const heli = v.role === 'heli';
    if (heli) {
      const body = new THREE.Mesh(new THREE.SphereGeometry(1.6, 12, 8).scale(1.7, 1, 1), new THREE.MeshStandardMaterial({color: v.color, roughness: 0.4, metalness: 0.4}));
      const tail = new THREE.Mesh(new THREE.BoxGeometry(5, 0.4, 0.4).translate(-4.5, 0.3, 0), body.material);
      const rotor = new THREE.Mesh(new THREE.CircleGeometry(6.5, 24).rotateX(-Math.PI / 2).translate(0, 1.8, 0), new THREE.MeshBasicMaterial({color: '#20262b', transparent: true, opacity: 0.35, depthWrite: false}));
      const spot = new THREE.Mesh(new THREE.PlaneGeometry(40, 40).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({map: GLOW, color: new THREE.Color(1.4, 1.35, 1.2), transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false}));
      body.castShadow = tail.castShadow = true; g.add(body, tail, rotor); g.userData.rotor = rotor; g.userData.spot = spot; spot.renderOrder = -6; scene.add(spot);
    } else {
      const body = new THREE.Mesh(carGeo, new THREE.MeshStandardMaterial({color: v.color, vertexColors: true, roughness: 0.38, metalness: 0.35}));
      body.castShadow = true;
      const red = new THREE.MeshBasicMaterial({color: new THREE.Color(1, 0.05, 0.05)}), blue = new THREE.MeshBasicMaterial({color: new THREE.Color(0.05, 0.15, 1)});
      const l1 = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.22, 0.7).translate(-0.25, 2.07, -0.4), red), l2 = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.22, 0.7).translate(-0.25, 2.07, 0.4), blue);
      const stripe = new THREE.Mesh(new THREE.BoxGeometry(4.42, 0.22, 1.87).translate(0, 0.7, 0), new THREE.MeshStandardMaterial({color: v.stripe ?? '#1d4fa3', roughness: 0.5}));
      const glow = new THREE.Mesh(new THREE.PlaneGeometry(26, 26).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({map: GLOW, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false}));
      const beam = new THREE.Mesh(beamGeo, new THREE.MeshBasicMaterial({map: SOFT, color: new THREE.Color(1, 0.95, 0.8), transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false}));
      glow.renderOrder = beam.renderOrder = -6; g.add(body, stripe, l1, l2, beam, new THREE.Mesh(lightGeo, lightMat)); scene.add(glow);
      Object.assign(g.userData, {red, blue, glow, beam});
    }
    const ring = new THREE.Mesh(new THREE.RingGeometry(4.2, 5, 32).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({color: '#7ef0e0', transparent: true, opacity: 0, depthWrite: false}));
    ring.renderOrder = -5; scene.add(ring); g.userData.ring = ring; g.userData.heli = heli;
    scene.add(g); return g;
  }
  const suspectObjs = new Map();
  function makeSuspectObj() {
    const g = new THREE.Group(), body = new THREE.Mesh(carGeo, new THREE.MeshStandardMaterial({color: '#ff6a2b', vertexColors: true, roughness: 0.4, metalness: 0.3}));
    body.castShadow = true; g.add(body);
    const mark = new THREE.Mesh(new THREE.RingGeometry(6, 7.5, 32).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({color: new THREE.Color(2, 0.2, 0.2), transparent: true, opacity: 0.9, depthWrite: false}));
    mark.renderOrder = -5; scene.add(mark); g.userData.mark = mark; scene.add(g); return g;
  }

  // ---------- метки вызовов ----------
  const BEAM = beamTexture(), callObjs = new Map();
  function makeCallObj(c) {
    const color = new THREE.Color(SEV[callType(c).sev]), g = new THREE.Group();
    const beam = new THREE.Mesh(new THREE.CylinderGeometry(2.2, 2.2, 160, 16, 1, true).translate(0, 80, 0), new THREE.MeshBasicMaterial({map: BEAM, color: color.clone().multiplyScalar(1.6), transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide}));
    const ring = new THREE.Mesh(new THREE.RingGeometry(9, 11, 48).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({color: color.clone().multiplyScalar(1.8), transparent: true, opacity: 0.9, depthWrite: false}));
    const pad = new THREE.Mesh(new THREE.PlaneGeometry(60, 60).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({map: GLOW, color, transparent: true, opacity: 0.45, blending: THREE.AdditiveBlending, depthWrite: false}));
    ring.renderOrder = pad.renderOrder = -5; ring.position.y = pad.position.y = 0.15;
    g.add(beam, ring, pad); Object.assign(g.userData, {beam, ring, pad, born: time}); scene.add(g); return g;
  }

  // ---------- частицы: дым и искры ----------
  const MAX_P = 900, pPos = new Float32Array(MAX_P * 3), pData = new Float32Array(MAX_P * 4), pAlpha = new Float32Array(MAX_P), pSize = new Float32Array(MAX_P), pColor = new Float32Array(MAX_P * 3);
  const pGeo = new THREE.BufferGeometry();
  pGeo.setAttribute('position', new THREE.BufferAttribute(pPos, 3)); pGeo.setAttribute('alpha', new THREE.BufferAttribute(pAlpha, 1)); pGeo.setAttribute('size', new THREE.BufferAttribute(pSize, 1)); pGeo.setAttribute('pcolor', new THREE.BufferAttribute(pColor, 3));
  const pMat = new THREE.ShaderMaterial({transparent: true, depthWrite: false, uniforms: {map: {value: SOFT}, scale: {value: 600}},
    vertexShader: 'attribute float alpha; attribute float size; attribute vec3 pcolor; varying float vA; varying vec3 vC; uniform float scale; void main(){ vA = alpha; vC = pcolor; vec4 mv = modelViewMatrix * vec4(position,1.0); gl_PointSize = size * scale / -mv.z; gl_Position = projectionMatrix * mv; }',
    fragmentShader: 'uniform sampler2D map; varying float vA; varying vec3 vC; void main(){ vec4 t = texture2D(map, gl_PointCoord); gl_FragColor = vec4(vC, t.a * vA); }'});
  const particles = new THREE.Points(pGeo, pMat); particles.frustumCulled = false; scene.add(particles);
  let pNext = 0;
  function emit(x, z, kind) {
    const i = pNext; pNext = (pNext + 1) % MAX_P;
    const fire = kind === 'fire', spark = kind === 'spark';
    pPos.set([x + (Math.random() - 0.5) * 6, spark ? 1 : 1.5, z + (Math.random() - 0.5) * 6], i * 3);
    pData.set([(Math.random() - 0.5) * (spark ? 6 : 0.8), spark ? 5 + Math.random() * 5 : 2 + Math.random() * 1.5, (Math.random() - 0.5) * (spark ? 6 : 0.8), fire ? 1.2 : spark ? 0.7 : 4 + Math.random() * 2], i * 4);
    pAlpha[i] = fire ? 1 : spark ? 1 : 0.55; pSize[i] = fire ? 5 : spark ? 1.1 : 6;
    const col = fire ? [3, 1.2, 0.3] : spark ? [3, 2.2, 0.8] : [0.36, 0.36, 0.38]; pColor.set(col, i * 3);
  }
  function stepParticles(dt) {
    for (let i = 0; i < MAX_P; i++) {
      if (pAlpha[i] <= 0) continue;
      const life = pData[i * 4 + 3];
      pPos[i * 3] += pData[i * 4] * dt; pPos[i * 3 + 1] += pData[i * 4 + 1] * dt; pPos[i * 3 + 2] += pData[i * 4 + 2] * dt;
      if (pSize[i] < 3) pData[i * 4 + 1] -= 9.8 * dt; else pSize[i] += dt * 2.2;
      pAlpha[i] -= dt / life * (pSize[i] < 3 ? 1.4 : 0.55); if (pAlpha[i] < 0) pAlpha[i] = 0;
    }
    pGeo.attributes.position.needsUpdate = pGeo.attributes.alpha.needsUpdate = pGeo.attributes.size.needsUpdate = pGeo.attributes.pcolor.needsUpdate = true;
  }

  // ---------- дождь ----------
  const RAIN = 5000, rainPos = new Float32Array(RAIN * 6);
  const rainGeo = new THREE.BufferGeometry(); rainGeo.setAttribute('position', new THREE.BufferAttribute(rainPos, 3));
  const rain = new THREE.LineSegments(rainGeo, new THREE.LineBasicMaterial({color: '#b9cbe0', transparent: true, opacity: 0.35, depthWrite: false})); rain.frustumCulled = false; rain.visible = false; scene.add(rain);
  let rainBox = 400;
  function resetDrop(i, cx, cz, top = false) { const x = cx + (Math.random() - 0.5) * rainBox * 2, z = cz + (Math.random() - 0.5) * rainBox * 2, y = top ? rainBox * 0.9 : Math.random() * rainBox * 0.9; rainPos.set([x, y, z, x - 0.4, y - 3.2, z + 0.3], i * 6); }

  // ---------- районы (тепловая карта) ----------
  const districtDiscs = DISTRICTS.map(d => { const m = new THREE.Mesh(new THREE.CircleGeometry(700, 48).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({map: GLOW, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false})); m.position.set(d.x * M, 0.4, d.y * M); m.renderOrder = -4; scene.add(m); return m; });
  // маршруты экипажей
  const routeLines = new Map();
  // зоны поиска по делам: фиолетовый купол
  const zoneObjs = new Map();
  function makeZone() {
    const g = new THREE.Group();
    const dome = new THREE.Mesh(new THREE.SphereGeometry(1, 32, 12, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshBasicMaterial({color: new THREE.Color(0.55, 0.35, 1.2), transparent: true, opacity: 0.05, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending}));
    const wire = new THREE.Mesh(new THREE.SphereGeometry(1, 24, 8, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshBasicMaterial({color: new THREE.Color(0.7, 0.5, 1.6), wireframe: true, transparent: true, opacity: 0.07, depthWrite: false}));
    const ring = new THREE.Mesh(new THREE.RingGeometry(0.97, 1, 64).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({color: new THREE.Color(0.8, 0.55, 1.8), transparent: true, opacity: 0.6, depthWrite: false}));
    ring.position.y = 0.3; g.add(dome, ring); g.userData = {dome, ring}; scene.add(g); return g;
  }
  // шипы на дороге
  const spikeObjs = new Map();
  function makeSpike() {
    const m = new THREE.Mesh(new THREE.BoxGeometry(9, 0.4, 1.2), new THREE.MeshStandardMaterial({color: '#d9d9d9', emissive: new THREE.Color(1.2, 0.9, 0.2), emissiveIntensity: 0.6, roughness: 0.4}));
    m.position.y = 0.25; scene.add(m); return m;
  }

  // ---------- пост-обработка ----------
  const target = new THREE.WebGLRenderTarget(1, 1, {type: THREE.HalfFloatType, samples: 4});
  const composer = new EffectComposer(renderer, target), bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), 0.6, 0.55, 0.82), fxaa = new FXAAPass();
  const grade = new ShaderPass({
    uniforms: {tDiffuse: {value: null}, uVig: {value: 0.32}, uSat: {value: 1.05}, uWarm: {value: 0}, uTexel: {value: new THREE.Vector2(1, 1)}, uSharp: {value: 0}},
    vertexShader: 'varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: `uniform sampler2D tDiffuse; uniform float uVig; uniform float uSat; uniform float uWarm; uniform vec2 uTexel; uniform float uSharp; varying vec2 vUv;
      void main() {
        vec4 c = texture2D(tDiffuse, vUv);
        if (uSharp > 0.001) { // повышение резкости при пониженном разрешении
          vec3 n = texture2D(tDiffuse, vUv + vec2(uTexel.x, 0.0)).rgb + texture2D(tDiffuse, vUv - vec2(uTexel.x, 0.0)).rgb + texture2D(tDiffuse, vUv + vec2(0.0, uTexel.y)).rgb + texture2D(tDiffuse, vUv - vec2(0.0, uTexel.y)).rgb;
          c.rgb = clamp(c.rgb + (c.rgb - n * 0.25) * uSharp, 0.0, 1.0);
        }
        float l = dot(c.rgb, vec3(0.299, 0.587, 0.114));
        c.rgb = mix(vec3(l), c.rgb, uSat);
        c.rgb = (c.rgb - 0.5) * 1.05 + 0.5;
        c.rgb *= mix(vec3(1.0), vec3(1.06, 1.0, 0.92), uWarm);
        vec2 d = vUv - 0.5; c.rgb *= 1.0 - uVig * dot(d, d) * 1.7;
        gl_FragColor = c;
      }`,
  });
  composer.addPass(new RenderPass(scene, camera)); composer.addPass(bloom); composer.addPass(new OutputPass()); composer.addPass(grade); composer.addPass(fxaa);

  // ---------- камера ----------
  const cam = {tx: STATION.x * M, tz: STATION.y * M, dist: 1600, goal: 1600, yaw: 0, tilt: 0, follow: null, anchor: null};
  const MIN_D = 45, MAX_D = 16000;
  let W = 1, H = 1, dpr = 1;
  function applyQuality() {
    const q = PRESETS[effective()];
    renderScale = Math.min(window.devicePixelRatio || 1, q.maxScale);
    renderer.shadowMap.enabled = q.shadow > 0; renderer.shadowMap.autoUpdate = false; renderer.shadowMap.needsUpdate = true;
    if (q.shadow) sun.shadow.mapSize.set(q.shadow, q.shadow);
    if (sun.shadow.map) { sun.shadow.map.dispose(); sun.shadow.map = null; }
    target.samples = q.msaa; target.dispose(); bloom.enabled = q.bloom; fxaa.enabled = q.fxaa; trees.castShadow = q.treeShadow;
    resize(); bmat.needsUpdate = true;
  }
  // держим плавность: снижаем внутреннее разрешение при тормозах и возвращаем, когда запас есть
  function governResolution(dt) {
    frameEma += (dt * 1000 - frameEma) * 0.08; scaleClock += dt;
    if (scaleClock < 1) return; scaleClock = 0;
    const max = Math.min(window.devicePixelRatio || 1, PRESETS[effective()].maxScale);
    if (frameEma > 23 && renderScale > 0.55) { renderScale = Math.max(0.55, renderScale * 0.93); goodSeconds = 0; resize(); }
    else if (frameEma < 18.5 && renderScale < max) { if (++goodSeconds >= 4) { renderScale = Math.min(max, renderScale * 1.07); goodSeconds = 0; resize(); } }
    else goodSeconds = 0;
  }
  function resize() {
    W = canvas.clientWidth || 1; H = canvas.clientHeight || 1; dpr = renderScale;
    renderer.setPixelRatio(dpr); renderer.setSize(W, H, false); composer.setPixelRatio(dpr); composer.setSize(W, H); grade.uniforms.uTexel.value.set(1 / (W * dpr), 1 / (H * dpr)); grade.uniforms.uSharp.value = clamp((1 - dpr) * 1.4, 0, 0.55);
    camera.aspect = W / H; camera.updateProjectionMatrix(); pMat.uniforms.scale.value = H * dpr * 0.9;
  }
  new ResizeObserver(resize).observe(canvas);
  const pitchFor = d => 0.78 + 0.6 * smooth(250, 9000, d) + cam.tilt;
  function placeCamera() {
    const p = clamp(pitchFor(cam.dist), 0.35, 1.5);
    camera.position.set(cam.tx + cam.dist * Math.cos(p) * Math.sin(cam.yaw), cam.dist * Math.sin(p), cam.tz + cam.dist * Math.cos(p) * Math.cos(cam.yaw));
    camera.lookAt(cam.tx, 0, cam.tz); camera.updateMatrixWorld();
  }
  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2(), plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), hitPoint = new THREE.Vector3();
  function groundAt(px, py) {
    ndc.set(px / W * 2 - 1, -(py / H) * 2 + 1); ray.setFromCamera(ndc, camera);
    return ray.ray.intersectPlane(plane, hitPoint) ? {x: hitPoint.x, z: hitPoint.z} : null;
  }
  const clampTarget = () => { cam.tx = clamp(cam.tx, 0, BOUNDS.maxX * M); cam.tz = clamp(cam.tz, 0, BOUNDS.maxY * M); };
  const proj = new THREE.Vector3();
  function toScreen(x, y, z) { proj.set(x, y, z).project(camera); return {x: (proj.x + 1) / 2 * W, y: (1 - proj.y) / 2 * H, visible: proj.z < 1 && proj.z > -1}; }

  // ---------- подписи (DOM поверх WebGL) ----------
  const layer = document.getElementById('labels'), labels = new Map(), popups = [];
  function label(key, cls, html) {
    let el = labels.get(key);
    if (!el) { el = document.createElement('div'); el.className = 'lbl ' + cls; layer.append(el); labels.set(key, el); el.dataset.html = ''; }
    if (el.dataset.html !== html) { el.innerHTML = html; el.dataset.html = html; }
    el.dataset.seen = '1'; return el;
  }
  function place(el, s, dy = 0) { if (!s.visible || s.x < -80 || s.y < -60 || s.x > W + 80 || s.y > H + 60) { el.style.display = 'none'; return false; } el.style.display = ''; el.style.transform = `translate(${s.x}px, ${s.y + dy}px) translate(-50%, -50%)`; return true; }

  // ---------- кадр ----------
  let time = 0, hits = [], weather = 'clear', lastNight = -1;
  const tmpM = new THREE.Matrix4(), tmpQ = new THREE.Quaternion(), up = new THREE.Vector3(0, 1, 0), one = new THREE.Vector3(1, 1, 1), tmpV = new THREE.Vector3(), tmpScale = new THREE.Vector3(1, 1, 1);
  const carColors = ['#9aa7ad', '#c9c2b2', '#7d8f9b', '#a38f86', '#8b9a8c', '#d8dcde', '#5d6b78', '#b33a3a', '#2f4f8f', '#e0c27a', '#3c3f44'].map(lin);
  traffic.count = 0;

  function draw(state, view, dt) {
    time += dt;
    // камера: слежение, плавный зум к курсору
    if (cam.follow != null) { const u = state.units.find(u => u.id === cam.follow); if (u) { const k = Math.min(1, dt * 4); cam.tx += (u.x * M - cam.tx) * k; cam.tz += (u.y * M - cam.tz) * k; } else cam.follow = null; }
    if (Math.abs(cam.goal - cam.dist) > cam.dist * 0.001) {
      placeCamera(); const before = cam.anchor ? groundAt(cam.anchor.x, cam.anchor.y) : null;
      cam.dist += (cam.goal - cam.dist) * Math.min(1, dt * 9); placeCamera();
      if (before && cam.follow == null) { const after = groundAt(cam.anchor.x, cam.anchor.y); if (after) { cam.tx += before.x - after.x; cam.tz += before.z - after.z; } }
    }
    clampTarget(); placeCamera();

    // время суток и погода
    const night = nightFactor(state.t), hour = (state.t / 3600) % 24;
    weather = state.weather ?? 'clear';
    const wet = weather === 'rain' ? 1 : weather === 'cloudy' ? 0.5 : 0;
    const dayAngle = (hour - 6) / 12 * Math.PI, elev = Math.sin(dayAngle), dusk = clamp(1 - Math.abs(elev) * 3, 0, 1) * (1 - night * 0.6);
    const skyDay = lin('#a9c6dc').lerp(lin('#8a96a3'), wet * 0.8), skyDusk = lin('#d99a6c'), skyNight = lin('#0a1222');
    const sky = skyDay.clone().lerp(skyDusk, dusk * 0.7).lerp(skyNight, night);
    renderer.setClearColor(sky); scene.fog.color.copy(sky);
    skyUni.uHorizon.value.copy(sky); skyUni.uTop.value.copy(lin('#4f86c2').lerp(lin('#6f7a86'), wet * 0.8).lerp(lin('#5d5a86'), dusk * 0.5).lerp(lin('#02040b'), night)); skyUni.uNight.value = night;
    skyDome.position.copy(camera.position);
    uniforms.uCloud.value += ((weather === 'cloudy' ? 1 : weather === 'rain' ? 0.7 : 0.45) - uniforms.uCloud.value) * Math.min(1, dt * 0.3);
    cloudLayer.material.uniforms.uAlpha.value = smooth(4500, 11000, cam.dist) * (weather === 'clear' ? 0.2 : 0.34) * (1 - night * 0.7);
    cloudLayer.material.uniforms.uTint.value.copy(lin('#ffffff').lerp(lin('#ffd2b0'), dusk * 0.6).lerp(lin('#3a4252'), night));
    scene.fog.near = cam.dist * (weather === 'rain' ? 0.9 : 1.6); scene.fog.far = cam.dist * (weather === 'rain' ? 3 : 5.5) + 2500;
    hemi.color.copy(lin('#dfeaf5').lerp(lin('#3a4c74'), night)); hemi.groundColor.copy(lin('#6a6250').lerp(lin('#14181f'), night));
    hemi.intensity = (1.05 - 0.5 * night) * (1 - wet * 0.15);
    const sunDir = night > 0.5 ? new THREE.Vector3(-0.4, 1, 0.5) : new THREE.Vector3(-Math.cos(dayAngle) * 0.8, Math.max(0.25, elev), 0.45);
    sun.color.copy(lin('#fff1dc').lerp(lin('#ffb27a'), dusk).lerp(lin('#8ea6ff'), night));
    sun.intensity = (2.7 * (1 - night) + 0.35 * night) * (1 - wet * 0.55);
    const shadowSize = clamp(cam.dist * 0.95, 220, 2600);
    sun.position.set(cam.tx + sunDir.x * 3000, sunDir.y * 3000, cam.tz + sunDir.z * 3000); skyUni.uSun.value.copy(sunDir); skyUni.uSunCol.value.copy(night > 0.5 ? lin('#c9d6ff') : lin('#fff0d0').lerp(lin('#ff9a50'), dusk)); sun.target.position.set(cam.tx, 0, cam.tz);
    Object.assign(sun.shadow.camera, {left: -shadowSize, right: shadowSize, top: shadowSize, bottom: -shadowSize, near: 100, far: 7000}); sun.shadow.camera.updateProjectionMatrix();
    const preset = PRESETS[effective()]; sun.castShadow = preset.shadow > 0 && cam.dist < 6000;
    if (preset.shadowEvery && frameNo++ % preset.shadowEvery === 0) renderer.shadowMap.needsUpdate = true;
    uniforms.uNight.value = night;
    if (Math.abs(lastNight - night) > 0.01) { lastNight = night; poolMat.opacity = night * 0.2; lampHeadMat.color.setRGB(1 + night * 3, 0.85 + night * 2.4, 0.6 + night * 1.6); beamMat.opacity = night * 0.32; }
    grade.uniforms.uVig.value = 0.3 + night * 0.3; grade.uniforms.uWarm.value = dusk * (1 - night); grade.uniforms.uSat.value = 1.05 - night * 0.08 - wet * 0.12; uniforms.uTime.value = time; uniforms.uWet.value += ((weather === 'rain' ? 1 : 0) - uniforms.uWet.value) * Math.min(1, dt * 0.5);
    bloom.strength = 0.25 + night * 0.65; renderer.toneMappingExposure = 1.0 + night * 0.25;
    station.userData.ring.material.opacity = 0.55 + Math.sin(time * 2.5) * 0.3;

    const ppm = H / (2 * cam.dist * Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2)), carBoost = clamp(16 / (4.4 * ppm), 1, 45), trafficBoost = clamp(9 / (4.4 * ppm), 1, 3);
    trees.visible = cam.dist < 6500; setLamps(cam.dist < 2600, night > 0.02 && cam.dist < 5000);
    traffic.visible = trafficBeams.visible = trafficLights.visible = cam.dist < 5000; parkedCars.visible = cam.dist < 2600;
    lightMat.color.setScalar(0.45 + night * 2.6);
    // фоновый трафик
    if (view.traffic) {
      traffic.count = trafficLights.count = Math.min(MAX_TRAFFIC, view.traffic.length); trafficBeams.count = night > 0.05 ? traffic.count : 0;
      for (let i = 0; i < traffic.count; i++) {
        const c = view.traffic[i]; tmpQ.setFromAxisAngle(up, -c.heading); tmpM.compose(tmpV.set(c.x * M, 0, c.y * M), tmpQ, tmpScale.setScalar(trafficBoost));
        traffic.setMatrixAt(i, tmpM); traffic.setColorAt(i, carColors[i % carColors.length]); trafficLights.setMatrixAt(i, tmpM); if (trafficBeams.count) trafficBeams.setMatrixAt(i, tmpM);
      }
      traffic.instanceMatrix.needsUpdate = true; trafficLights.instanceMatrix.needsUpdate = true; if (traffic.instanceColor) traffic.instanceColor.needsUpdate = true; trafficBeams.instanceMatrix.needsUpdate = true;
    }
    // пешеходы — только вблизи
    people.visible = heads.visible = cam.dist < 1800;
    if (people.visible) {
      for (let i = 0; i < walkers.length; i++) {
        const w = walkers[i], p = w.r.pts, segs = p.length / 2 - 1;
        const ax = p[w.seg * 2] * M, az = p[w.seg * 2 + 1] * M, bx = p[w.seg * 2 + 2] * M, bz = p[w.seg * 2 + 3] * M, len = Math.hypot(bx - ax, bz - az) || 1;
        w.t += w.dir * w.v * dt * 20 / len * (state.speedFactor ?? 1) * 0.05;
        if (w.t > 1) { w.t = 0; w.seg++; if (w.seg >= segs) { w.seg = segs - 1; w.t = 1; w.dir = -1; } }
        if (w.t < 0) { w.t = 1; w.seg--; if (w.seg < 0) { w.seg = 0; w.t = 0; w.dir = 1; } }
        const side = (i % 2 ? 1 : -1) * 0.7, nx = -(bz - az) / len * side, nz = (bx - ax) / len * side;
        const bob = Math.abs(Math.sin(time * 7 * w.v + i)) * 0.06; tmpM.makeRotationY(Math.atan2((bx - ax) * w.dir, (bz - az) * w.dir)); tmpM.setPosition(ax + (bx - ax) * w.t + nx, bob, az + (bz - az) * w.t + nz); people.setMatrixAt(i, tmpM); heads.setMatrixAt(i, tmpM);
      }
      people.instanceMatrix.needsUpdate = true; heads.instanceMatrix.needsUpdate = true;
    }

    hits = [];
    for (const el of labels.values()) el.dataset.seen = '';
    const flash = Math.floor(time * 6) % 2;

    // экипажи
    const seenUnits = new Set();
    for (const u of state.units) {
      seenUnits.add(u.id);
      let o = unitObjs.get(u.id); if (!o || o.userData.type !== u.type) { if (o) removeUnit(u.id); o = makePoliceObj(u); o.userData.type = u.type; unitObjs.set(u.id, o); }
      const parked = u.speed === 0 && !u.path.length, ux = u.x * M, uz = u.y * M, heli = o.userData.heli;
      o.position.set(ux, heli ? 70 + 20 * (carBoost - 1) : 0, uz); o.rotation.y = -u.heading; o.scale.setScalar(carBoost);
      const sel = u.id === view.unit, ring = o.userData.ring;
      ring.position.set(ux, 0.2, uz); ring.material.opacity = sel ? 0.95 : u.player ? 0.7 : 0; ring.material.color.set(u.player && !sel ? '#ffd166' : '#7ef0e0'); ring.scale.setScalar(carBoost * (sel ? 1 + Math.sin(time * 4) * 0.08 : 1));
      if (heli) { o.userData.rotor.rotation.y += dt * 40; o.userData.spot.position.set(ux, 0.3, uz); o.userData.spot.material.opacity = 0.25 + night * 0.6; }
      else {
        const urgent = ['enroute', 'pursuit', 'onscene'].includes(u.status);
        o.userData.red.color.setRGB(urgent && flash ? 6 : 0.5, 0.1, 0.1); o.userData.blue.color.setRGB(0.1, 0.25, urgent && !flash ? 7 : 0.6);
        const glow = o.userData.glow; glow.position.set(ux, 0.25, uz); glow.material.opacity = urgent ? 0.5 + night * 0.4 : 0; glow.material.color.setRGB(flash ? 1.6 : 0.2, 0.15, flash ? 0.2 : 1.8);
        o.userData.beam.material.opacity = night * (parked ? 0.12 : 0.34);
      }
      const s = toScreen(ux, heli ? 74 : 4, uz);
      const tag = u.player ? 'ВЫ · ' + u.callsign.replace('Экипаж ', '') : u.callsign.replace('Экипаж ', '');
      const role = VEHICLES[u.type]?.role, rl = role && role !== 'patrol' ? ` <span class="rl">${VEHICLES[u.type].short}</span>` : '';
      const el = label('u' + u.id, 'unit' + (u.player ? ' me' : '') + (sel ? ' sel' : ''), `<i style="--c:${STATUS_COLOR[u.status] ?? '#9fb3bf'}"></i>${tag}${rl}${u.status === 'injured' ? ' ✚' : ''}`);
      if (place(el, s, -18)) hits.push({kind: 'unit', id: u.id, x: s.x, y: s.y, r: 26});
      // маршрут
      const show = (sel || u.player) && u.path.length && ['enroute', 'pursuit', 'hold', 'transport', 'returning'].includes(u.status);
      let line = routeLines.get(u.id);
      if (show) {
        const pts = [new THREE.Vector3(ux, 1.2, uz), ...u.path.slice(0, 400).map(n => new THREE.Vector3(n.x * M, 1.2, n.y * M))];
        if (!line) { line = new THREE.Line(new THREE.BufferGeometry(), new THREE.LineDashedMaterial({color: sel ? '#7ef0e0' : '#ffd166', dashSize: 8, gapSize: 6, transparent: true, opacity: 0.95, depthWrite: false})); line.renderOrder = -3; routeLines.set(u.id, line); scene.add(line); }
        if (line.userData.len !== pts.length || line.userData.head !== u.path[0]) { line.geometry.setFromPoints(pts); line.computeLineDistances(); line.userData.len = pts.length; line.userData.head = u.path[0]; }
        else { line.geometry.attributes.position.setXYZ(0, ux, 1.2, uz); line.geometry.attributes.position.needsUpdate = true; }
        line.material.color.set(sel ? '#7ef0e0' : '#ffd166'); line.visible = true;
      } else if (line) line.visible = false;
      // ручной маршрут патруля
      if (u.waypoints?.length && sel) for (let k = 0; k < u.waypoints.length; k++) { const w = u.waypoints[k], ws = toScreen(w.x * M, 2, w.y * M); place(label('w' + u.id + ':' + k, 'wp', String(k + 1)), ws); }
    }
    for (const id of [...unitObjs.keys()]) if (!seenUnits.has(id)) removeUnit(id);

    drawFigures(state, carBoost, dt);
    // подозреваемые
    const seenSus = new Set();
    for (const x of state.suspects) {
      seenSus.add(x.id); let o = suspectObjs.get(x.id); if (!o) { o = makeSuspectObj(); suspectObjs.set(x.id, o); }
      o.position.set(x.x * M, 0, x.y * M); o.rotation.y = -x.heading; o.scale.setScalar(carBoost); o.userData.mark.position.set(x.x * M, 0.25, x.y * M); o.userData.mark.scale.setScalar(1 + Math.sin(time * 8) * 0.15);
      if (Math.random() < dt * 8) emit(x.x * M - Math.cos(x.heading) * 3, x.y * M - Math.sin(x.heading) * 3, 'smoke');
      trailPush('s' + x.id, x.x * M, x.y * M);
      for (const sp of state.spikes ?? []) if (Math.hypot(sp.x - x.x, sp.y - x.y) * M < 18 && Math.random() < dt * 30) emit(x.x * M, x.y * M, 'spark'); // шипы рвут шины
    }
    for (const u of state.units) if (u.status === 'pursuit' && !u.fly) trailPush('u' + u.id, u.x * M, u.y * M);
    drawTrails(carBoost);
    for (const [id, o] of suspectObjs) if (!seenSus.has(id)) { scene.remove(o, o.userData.mark); suspectObjs.delete(id); }

    // вызовы
    const seenCalls = new Set();
    for (const c of state.calls) {
      if (c.state === 'done' || c.state === 'hidden') continue;
      seenCalls.add(c.id);
      let o = callObjs.get(c.id); if (!o) { o = makeCallObj(c); callObjs.set(c.id, o); }
      const t = callType(c), sus = c.suspectId ? state.suspects.find(x => x.id === c.suspectId) : null;
      const cx = (sus ? sus.x : c.x) * M, cz = (sus ? sus.y : c.y) * M, k = (time * (t.sev === 3 ? 1.4 : 0.8) + c.id * 0.37) % 1;
      o.position.set(cx, 0, cz);
      const scale = clamp(cam.dist / 900, 0.6, 9);
      o.userData.ring.scale.setScalar(scale * (0.6 + k * 1.6)); o.userData.ring.material.opacity = (1 - k) * 0.9;
      o.userData.pad.scale.setScalar(scale); o.userData.beam.scale.set(scale * 0.8, Math.max(1, scale * 0.9), scale * 0.8);
      o.userData.beam.visible = !sus; { const far = smooth(120, 700, cam.dist); o.userData.beam.material.opacity = 0.08 + 0.47 * far; o.userData.pad.material.opacity = 0.18 + 0.27 * far; }
      // дым и огонь на месте
      if (!sus && t.fx && Math.random() < dt * (t.fx === 'fire' ? 22 : 10)) { emit(cx, cz, t.fx === 'fire' ? (Math.random() < 0.5 ? 'fire' : 'smoke') : t.fx === 'spark' ? 'spark' : 'smoke'); }
      const s = toScreen(cx, sus ? 6 : 12, cz), sel = c.id === view.call;
      const active = c.state === 'active', part = active ? c.progress / Math.max(1, c.work) : Math.max(0, (c.deadline - state.t) / c.wait);
      const decide = c.state === 'choice' && view.decides?.(c);
      const so = c.standoff, bars = so ? `<s class="sb"><u style="width:${Math.round(so.compliance)}%;background:#5aa8ff"></u></s><s class="sb"><u style="width:${Math.round(so.stability)}%;background:hsl(${Math.round(so.stability * 1.2)},80%,55%)"></u></s>` : `<s><u style="width:${Math.round(clamp(part, 0, 1) * 100)}%;background:${active ? '#6ee7d8' : SEV[t.sev]}"></u></s>`;
      const html = `<b style="--c:${SEV[t.sev]}">${t.icon}</b>${sel || cam.dist < 900 ? `<span>${t.name}</span>` : ''}${bars}${so ? '<em class="neg">ПЕРЕГОВОРЫ</em>' : decide ? '<em>ЖДЁТ РЕШЕНИЯ</em>' : sus ? '<em class="red">ПОГОНЯ</em>' : ''}`;
      const el = label('c' + c.id, 'call' + (sel ? ' sel' : '') + (decide ? ' decide' : ''), html);
      if (place(el, s, -22)) hits.push({kind: 'call', id: c.id, x: s.x, y: s.y, r: 28});
    }
    for (const [id, o] of callObjs) if (!seenCalls.has(id)) { scene.remove(o); callObjs.delete(id); }

    // шипы
    const seenSpikes = new Set();
    for (const sp of state.spikes ?? []) { seenSpikes.add(sp.id); let o = spikeObjs.get(sp.id); if (!o) { o = makeSpike(); spikeObjs.set(sp.id, o); } o.position.x = sp.x * M; o.position.z = sp.y * M; o.rotation.y = sp.id; const s = toScreen(sp.x * M, 1, sp.y * M); place(label('sp' + sp.id, 'spike', '▲▲▲ шипы'), s, -14); }
    for (const [id, o] of spikeObjs) if (!seenSpikes.has(id)) { scene.remove(o); spikeObjs.delete(id); }
    // зоны поиска по открытым делам
    const seenZones = new Set();
    for (const k of state.cases ?? []) {
      if (k.state !== 'open' || !k.search) continue;
      seenZones.add(k.id); let o = zoneObjs.get(k.id); if (!o) { o = makeZone(); zoneObjs.set(k.id, o); }
      const r = k.search.r, pulse = 1 + Math.sin(time * 1.5 + k.id) * 0.015; o.position.set(k.search.x * M, 0, k.search.y * M); o.scale.set(r * pulse, r * 0.22, r * pulse); const near = smooth(r * 0.8, r * 3, Math.hypot(camera.position.x - k.search.x * M, camera.position.z - k.search.y * M) + cam.dist * 0.4); o.userData.dome.material.opacity = 0.05 * near; o.userData.ring.material.opacity = 0.35 + 0.3 * near;
      const s = toScreen(k.search.x * M, r * 0.4, k.search.y * M); place(label('case' + k.id, 'casezone', `⌕ Дело №${k.id} · улики ${Math.round(k.evidence)}%`), s);
    }
    for (const [id, o] of zoneObjs) if (!seenZones.has(id)) { scene.remove(o); zoneObjs.delete(id); }

    // районы
    const showDistricts = view.heat || cam.dist > 5200;
    uniforms.uHeatOn.value += ((view.heat ? 1 : 0) - uniforms.uHeatOn.value) * Math.min(1, dt * 5);
    for (let k = 0; k < 16; k++) { const cr = state.districts?.[k]?.crime ?? -1; uniforms.uHeat.value[k] = cr < 0 ? -1 : Math.min(1, cr / 80); }
    DISTRICTS.forEach((d, k) => {
      const crime = state.districts?.[k]?.crime ?? -1, disc = districtDiscs[k];
      if (crime < 0) { disc.material.opacity = 0; return; }
      const hue = (130 - Math.min(100, crime) * 1.3) / 360; disc.material.color.setHSL(hue, 0.85, 0.5, THREE.SRGBColorSpace); disc.material.opacity = view.heat ? 0.12 + crime / 500 : 0;
      if (showDistricts) { const s = toScreen(d.x * M, 0, d.y * M); place(label('d' + k, 'district', `<i style="background:hsl(${hue * 360},80%,58%)"></i>${d.name} <b>${Math.round(crime)}%</b>${state.informants?.[k] ? ' · <span>информатор</span>' : ''}${state.undercover?.[k] ? ' · <span>агент</span>' : ''}`), s); }
    });
    { const s = toScreen(STATION.x * M, 8, STATION.y * M); if (cam.dist < 4000) place(label('station', 'station', '★ УЧАСТОК'), s, -20); }

    // всплывающие сообщения
    for (let i = popups.length - 1; i >= 0; i--) {
      const p = popups[i], age = time - p.at; if (age > 2.6) { p.el.remove(); popups.splice(i, 1); continue; }
      const s = toScreen(p.x, 10 + age * 18, p.z); p.el.style.opacity = String(1 - (age / 2.6) ** 2); place(p.el, s, -40);
    }
    for (const [key, el] of labels) if (!el.dataset.seen) { el.remove(); labels.delete(key); }

    // частицы и дождь
    stepParticles(dt);
    rain.visible = weather === 'rain' && cam.dist < 3000;
    if (rain.visible) {
      rainBox = clamp(cam.dist * 0.6, 120, 1200);
      if (!rain.userData.init) { for (let i = 0; i < RAIN; i++) resetDrop(i, cam.tx, cam.tz); rain.userData.init = true; }
      const fall = dt * 260;
      for (let i = 0; i < RAIN; i++) { const o = i * 6; rainPos[o + 1] -= fall; rainPos[o + 4] -= fall; rainPos[o] -= fall * 0.12; rainPos[o + 3] -= fall * 0.12; if (rainPos[o + 4] < 0 || Math.abs(rainPos[o] - cam.tx) > rainBox || Math.abs(rainPos[o + 2] - cam.tz) > rainBox) resetDrop(i, cam.tx, cam.tz, true); }
      rainGeo.attributes.position.needsUpdate = true;
    }

    composer.render(dt); governResolution(dt);
    drawMinimap(state);
  }
  function removeUnit(id) { const o = unitObjs.get(id); if (!o) return; scene.remove(o, o.userData.ring); if (o.userData.glow) scene.remove(o.userData.glow); if (o.userData.spot) scene.remove(o.userData.spot); unitObjs.delete(id); const line = routeLines.get(id); if (line) { scene.remove(line); routeLines.delete(id); } }

  // ---------- миникарта ----------
  const mini = minimap.getContext('2d'), miniBase = document.createElement('canvas');
  let mk = 1, off = {x: 0, y: 0, d: 1};
  function buildMinimap() {
    const w = minimap.clientWidth || 200, h = minimap.clientHeight || 190, d = Math.min(2, window.devicePixelRatio || 1);
    minimap.width = miniBase.width = w * d; minimap.height = miniBase.height = h * d; mk = Math.min(w / BOUNDS.maxX, h / BOUNDS.maxY);
    off = {x: (w - BOUNDS.maxX * mk) / 2, y: (h - BOUNDS.maxY * mk) / 2, d};
    const c = miniBase.getContext('2d'); c.setTransform(d * mk, 0, 0, d * mk, d * off.x, d * off.y);
    c.fillStyle = '#2c3a35'; c.fillRect(-1, -1, 9, 9);
    for (const a of areas) { if (a.style !== 'water' && a.style !== 'park' && a.style !== 'forest') continue; c.beginPath(); poly(c, a.pts); c.fillStyle = AREA[a.style]; c.fill('evenodd'); }
    c.beginPath(); for (const r of roads) if (r.rank >= 3) poly(c, r.pts); c.strokeStyle = '#c9d0d3'; c.lineWidth = 1 / mk; c.stroke();
  }
  buildMinimap();
  function drawMinimap(state) {
    mini.setTransform(1, 0, 0, 1, 0, 0); mini.drawImage(miniBase, 0, 0); mini.setTransform(off.d, 0, 0, off.d, 0, 0);
    const mx = x => off.x + x * mk, my = y => off.y + y * mk;
    for (const c of state.calls) { if (c.state === 'done' || c.state === 'hidden') continue; const sus = c.suspectId ? state.suspects.find(s => s.id === c.suspectId) : null; mini.fillStyle = SEV[callType(c).sev]; mini.beginPath(); mini.arc(mx(sus ? sus.x : c.x), my(sus ? sus.y : c.y), 3 + (Math.floor(time * 3) % 2), 0, 7); mini.fill(); }
    for (const u of state.units) { mini.fillStyle = u.player ? '#ffd166' : STATUS_COLOR[u.status] ?? '#9fb3bf'; mini.fillRect(mx(u.x) - 2, my(u.y) - 2, 4, 4); }
    const corners = [[0, 0], [W, 0], [W, H], [0, H]].map(([x, y]) => groundAt(x, y) ?? groundAt(x, Math.max(y, H * 0.35)));
    if (corners.every(Boolean)) { mini.strokeStyle = '#ffffffcc'; mini.lineWidth = 1; mini.beginPath(); corners.forEach((p, i) => (i ? mini.lineTo : mini.moveTo).call(mini, mx(p.x / M), my(p.z / M))); mini.closePath(); mini.stroke(); }
  }

  applyQuality(); placeCamera();
  const pixelsToDist = scale => H * M / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2) * scale);
  return {
    draw,
    worldAt(px, py) { const g = groundAt(px, py) ?? {x: cam.tx, z: cam.tz}; return {x: g.x / M, y: g.z / M}; },
    minimapJump(px, py) { cam.follow = null; cam.tx = (px - off.x) / mk * M; cam.tz = (py - off.y) / mk * M; clampTarget(); },
    pick(px, py) { let best = null, bestD = Infinity; for (const h of hits) { const d = Math.hypot(h.x - px, h.y - py); if (d < h.r && (d < bestD || (h.kind === 'unit' && best?.kind !== 'unit'))) { best = h; bestD = d; } } return best; },
    pan(dx, dy, px = W / 2, py = H / 2) {
      cam.follow = null; const a = groundAt(px, py), b = groundAt(px + dx, py + dy);
      if (a && b) { cam.tx -= b.x - a.x; cam.tz -= b.z - a.z; } clampTarget(); placeCamera();
    },
    rotate(dyaw, dtilt = 0) { cam.yaw += dyaw; cam.tilt = clamp(cam.tilt + dtilt, -0.45, 0.4); placeCamera(); },
    zoom(factor, px = W / 2, py = H / 2) { cam.anchor = {x: px, y: py}; cam.goal = clamp(cam.goal / factor, MIN_D, MAX_D); },
    focus(p, scale = null) { if (!p) return; cam.follow = null; cam.tx = p.x * M; cam.tz = p.y * M; if (scale) { cam.goal = clamp(pixelsToDist(scale), MIN_D, MAX_D); cam.anchor = null; } clampTarget(); },
    follow(id) { cam.follow = id; if (id != null) { cam.goal = Math.min(cam.goal, 700); cam.anchor = null; } }, following: () => cam.follow,
    overview() { cam.follow = null; cam.anchor = null; cam.tx = BOUNDS.maxX * M / 2; cam.tz = BOUNDS.maxY * M / 2; cam.goal = 9500; cam.yaw = 0; cam.tilt = 0; },
    popup(x, y, text, good) { const el = document.createElement('div'); el.className = 'lbl pop ' + (good ? 'good' : 'bad'); el.textContent = text; layer.append(el); popups.push({x: x * M, z: y * M, el, at: time}); },
    quality(value) { if (!['auto', 'high', 'medium', 'low'].includes(value)) return quality; quality = value; try { localStorage.setItem('mercury-graphics', value); } catch {} applyQuality(); return quality; },
    camera: () => ({...cam}), _debug: {scene, renderer, composer, bloom, target, trees, people, lampPost, lampHead, lampPool, traffic, sun, buildingMeshes, applyQuality},
    stats: () => ({calls: renderer.info.render.calls, triangles: renderer.info.render.triangles, buildings: buildings.length, trees: trees.count, lamps: lampCount, walkers: walkers.length, parked: parkedCars.count, trail: trailGeo.drawRange.count, quality, effective: effective(), gpu, renderScale: Math.round(renderScale * 100) / 100, frameMs: Math.round(frameEma * 10) / 10}),
  };
}
