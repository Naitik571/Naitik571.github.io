/* ============================================================================
   scene.js — the opening.

   Particles start scattered and assemble into the name, hold, then blow
   apart while the page fades in underneath. CPU-updated points: ~6k
   particles is nothing, and it keeps the shader risk at zero.
   ========================================================================== */

import * as THREE from '../vendor/three.module.js';

const DUR      = 1.9;   // assemble time, seconds
const HOLD_END = 3.2;   // start scattering
const SCATTER  = 1.5;   // scatter time
const TOTAL    = HOLD_END + SCATTER;

const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ?freeze=<seconds> holds the intro on one frame — for screenshots only */
const FREEZE = (() => {
  const v = parseFloat(new URLSearchParams(location.search).get('freeze'));
  return Number.isFinite(v) ? v : null;
})();

/* ------------------------------------------------- sample the name as points */
function textPoints(text, { canvasW = 1600, canvasH = 520, step = 2 } = {}) {
  const c = document.createElement('canvas');
  c.width = canvasW;
  c.height = canvasH;
  const ctx = c.getContext('2d', { willReadFrequently: true });

  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, canvasW, canvasH);
  ctx.fillStyle = '#fff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  let size = 340;
  ctx.font = `400 ${size}px "Dela Gothic One", Anton, "Arial Black", Impact, sans-serif`;
  while (ctx.measureText(text).width > canvasW * 0.92 && size > 40) {
    size -= 4;
    ctx.font = `400 ${size}px "Dela Gothic One", Anton, "Arial Black", Impact, sans-serif`;
  }
  ctx.fillText(text, canvasW / 2, canvasH / 2);

  const data = ctx.getImageData(0, 0, canvasW, canvasH).data;
  const pts = [];
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  for (let y = 0; y < canvasH; y += step) {
    for (let x = 0; x < canvasW; x += step) {
      if (data[(y * canvasW + x) * 4] > 128) {
        pts.push([x, y]);
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }
  return { pts, minX, maxX, minY, maxY };
}

/* ------------------------------------------------------------------- intro */
export async function runIntro(onDone) {
  const host = document.getElementById('scene');
  if (!host) { onDone && onDone(); return; }

  if (reduced) {
    host.remove();
    document.body.classList.add('intro-done');
    onDone && onDone();
    return;
  }

  /* wait for the display face, or fall back to a system one */
  try {
    await Promise.race([
      document.fonts.ready,
      new Promise(r => setTimeout(r, 1200))
    ]);
  } catch {}

  const { pts, minX, maxX, minY, maxY } = textPoints('NAITIK');
  const COUNT = Math.min(pts.length, 18000);

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: FREEZE !== null });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  host.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 100);
  camera.position.set(0, 0, 6);

  /* fit the measured glyph box to ~72% of the visible width */
  const viewH = 2 * Math.tan((50 * Math.PI / 180) / 2) * camera.position.z;
  const viewW = viewH * camera.aspect;
  const scale = (viewW * 0.76) / (maxX - minX);
  const cx = (minX + maxX) / 2;
  const cy = (minY + maxY) / 2;

  const idx = [...Array(COUNT).keys()].sort(() => Math.random() - 0.5).slice(0, COUNT);

  const start = new Float32Array(COUNT * 3);
  const target = new Float32Array(COUNT * 3);
  const scatter = new Float32Array(COUNT * 3);
  const delay = new Float32Array(COUNT);

  for (let i = 0; i < COUNT; i++) {
    const p = pts[idx[i] % pts.length];

    target[i * 3]     = (p[0] - cx + (Math.random() - 0.5) * 2) * scale;
    target[i * 3 + 1] = -(p[1] - cy + (Math.random() - 0.5) * 2) * scale;
    target[i * 3 + 2] = (Math.random() - 0.5) * 0.06;

    /* start on a shell well outside the word */
    const r = 5.5 + Math.random() * 5;
    const th = Math.random() * Math.PI * 2;
    const ph = Math.acos(2 * Math.random() - 1);
    start[i * 3]     = r * Math.sin(ph) * Math.cos(th);
    start[i * 3 + 1] = r * Math.sin(ph) * Math.sin(th) * 0.6;
    start[i * 3 + 2] = r * Math.cos(ph) * 0.5 - 2;

    /* where each particle flies when the name breaks */
    scatter[i * 3]     = target[i * 3] * 2.4 + (Math.random() - 0.5) * 4;
    scatter[i * 3 + 1] = target[i * 3 + 1] * 2.4 + (Math.random() - 0.5) * 4 + 2.5;
    scatter[i * 3 + 2] = (Math.random() - 0.5) * 6;

    delay[i] = Math.random() * 0.55;
  }

  const geo = new THREE.BufferGeometry();
  const pos = new Float32Array(start);
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));

  const mat = new THREE.PointsMaterial({
    size: 0.05,
    color: 0xeef2ff,
    transparent: true,
    opacity: 1,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    sizeAttenuation: true
  });

  const points = new THREE.Points(geo, mat);
  scene.add(points);

  /* cheap bloom: same points, three times the size, barely there */
  const glowMat = mat.clone();
  glowMat.size = 0.11;
  glowMat.opacity = 0.22;
  glowMat.color = new THREE.Color(0x9fb4ff);
  scene.add(new THREE.Points(geo, glowMat));

  const t0 = performance.now();
  let raf = null;
  let done = false;
  let frames = 0;

  const easeOut = t => 1 - Math.pow(1 - t, 4);

  function frame(now) {
    frames++;
    const t = FREEZE !== null ? FREEZE : (now - t0) / 1000;

    for (let i = 0; i < COUNT; i++) {
      const i3 = i * 3;
      const d = delay[i];
      const p = Math.min(1, Math.max(0, (t - 0.15 - d) / DUR));
      const e = easeOut(p);

      /* idle shimmer once the word is formed */
      const wob = t > DUR ? Math.sin(t * 1.6 + i * 0.7) * 0.012 : 0;

      let x = start[i3]     + (target[i3]     - start[i3])     * e;
      let y = start[i3 + 1] + (target[i3 + 1] - start[i3 + 1]) * e;
      let z = start[i3 + 2] + (target[i3 + 2] - start[i3 + 2]) * e;

      x += wob;
      y += wob * 0.6;

      if (t > HOLD_END) {
        const s = Math.min(1, (t - HOLD_END - d * 0.4) / SCATTER);
        const es = s * s;
        x += (scatter[i3]     - x) * es;
        y += (scatter[i3 + 1] - y) * es;
        z += (scatter[i3 + 2] - z) * es;
      }

      pos[i3] = x;
      pos[i3 + 1] = y;
      pos[i3 + 2] = z;
    }

    geo.attributes.position.needsUpdate = true;

    /* fade out while scattering */
    if (t > HOLD_END) {
      const k = Math.max(0, 1 - (t - HOLD_END) / SCATTER);
      mat.opacity = k;
      glowMat.opacity = 0.22 * k;
    }

    camera.position.x = Math.sin(t * 0.22) * 0.35;
    camera.position.y = Math.cos(t * 0.19) * 0.16;
    camera.lookAt(0, 0, 0);

    renderer.render(scene, camera);

    if (FREEZE === null && t >= TOTAL - 0.1 && !done) {
      done = true;
      host.classList.add('is-out');
      setTimeout(() => { host.remove(); renderer.dispose(); }, 500);
    }

    if (FREEZE !== null ? frames < 24 : t < TOTAL) raf = requestAnimationFrame(frame);
    else cancelAnimationFrame(raf);
  }

  /* hand over to the page just before the particles are gone */
  if (FREEZE === null) setTimeout(() => {
    document.body.classList.add('intro-done');
    onDone && onDone();
  }, HOLD_END * 1000 + 150);
  else { document.body.classList.add('intro-done'); onDone && onDone(); }

  raf = requestAnimationFrame(frame);

  /* skip */
  const skip = () => {
    if (done) return;
    done = true;
    cancelAnimationFrame(raf);
    document.body.classList.add('intro-done');
    host.classList.add('is-out');
    setTimeout(() => { host.remove(); renderer.dispose(); }, 400);
    onDone && onDone();
  };

  host.addEventListener('click', skip);
  window.addEventListener('keydown', e => {
    if (e.key === 'Enter' || e.key === 'Escape' || e.key === ' ') skip();
  }, { once: true });
  window.addEventListener('wheel', skip, { once: true, passive: true });

  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });
}
