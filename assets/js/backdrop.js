/* ============================================================================
   backdrop.js — the room the page sits in.

   A full-bleed field of marbled, variable-width lines behind everything.

     idle        time advances slowly and the colour drifts on its own
     scroll      scroll speed feeds a boost that accelerates the field and
                 briefly brightens the lines, then decays when you stop
     progress    each section pulls the palette to its own colour, via
                 setSection(); hovering a project bleeds that colour in
                 through setAura()

   Raw WebGL2 — no library for one full-screen triangle. If WebGL is missing
   or the user asked for reduced motion, it draws one still frame (or hands
   over to a 2D fallback) and stops.
   ========================================================================== */

const VS = `#version 300 es
in vec2 a;
void main() { gl_Position = vec4(a, 0.0, 1.0); }`;

const FS = `#version 300 es
precision highp float;

uniform vec2  uRes;
uniform float uT;       // field time
uniform float uBoost;   // 0 idle … ~12 scrolling hard
uniform float uProg;    // 0 top … 1 bottom
uniform float uDark;    // 1 during the dark hour
uniform float uSec;     // 0 title, 1 work, 2 status, 3 contact
uniform vec3  uAura;    // colour of the project being hovered
uniform float uAuraAmt; // 0 … 1

out vec4 o;

float hash(float n) { return fract(sin(n * 127.1) * 43758.5453); }

float band(vec2 p, float t) {
  // five warps of the plane — the marble comes out of this, not texture
  for (int i = 1; i < 6; i++) {
    float fi = float(i);
    p += vec2(
      sin(p.y * fi * 0.9 + t * 0.35 + fi),
      cos(p.x * fi * 0.8 - t * 0.28 + fi * 1.7)
    ) * (0.85 / fi);
  }
  return p.x * 0.5 + p.y * 0.32 + 0.7 * sin(p.x * 0.9) * cos(p.y * 0.8);
}

vec3 palette(float s) {
  vec3 cobalt = vec3(0.169, 0.286, 0.961);
  vec3 acid   = vec3(0.784, 1.000, 0.239);
  vec3 violet = vec3(0.537, 0.427, 1.000);
  vec3 deep   = vec3(0.145, 0.235, 0.620);

  vec3 c = mix(cobalt, acid, smoothstep(0.0, 1.0, s));
  c = mix(c, violet, smoothstep(1.0, 2.0, s));
  c = mix(c, deep, smoothstep(2.0, 3.0, s));
  return c;
}

void main() {
  vec2 p = (gl_FragCoord.xy - 0.5 * uRes) / min(uRes.x, uRes.y);
  p *= 2.4 - 0.35 * uProg;          // the field opens up as you go down
  p.y -= uProg * 0.9;

  float t = uT;
  float f = band(p, t);

  // quantize the field into bands and give each one its own width
  float x   = f * 7.6;
  float idx = floor(x);
  float d   = abs(fract(x) - 0.5);

  float wave = 0.5 + 0.5 * sin(p.x * 0.7 - p.y * 0.9 + t * 0.2 + hash(idx) * 6.283);
  float m    = mix(wave, hash(idx + 7.0), 0.45);
  float hw   = mix(0.018, 0.24, m * m);

  float aa   = fwidth(x) * 0.8 + 0.002;
  float line = 1.0 - smoothstep(hw - aa, hw + aa, d);

  // colour: the section's own colour, acid on the peaks, full acid at 0x hour
  float k = 0.5 + 0.5 * sin(uT * 0.09 + uProg * 2.4);
  vec3  c = palette(uSec);
  c = mix(c, vec3(0.784, 1.0, 0.239), smoothstep(0.82, 1.0, k) * 0.6);
  c = mix(c, vec3(0.784, 1.0, 0.239), uDark);

  // a hovered project bleeds its own colour into the field
  c = mix(c, uAura, uAuraAmt * 0.85);

  // scrolling lifts the linework for a beat
  float lift = 1.0 + min(uBoost, 6.0) * 0.07 + uAuraAmt * 0.25;

  // keep the middle calm so copy stays readable, let the edges breathe
  float v = 1.0 - smoothstep(0.10, 1.05, length(p * vec2(0.70, 1.0)));
  float al = line * (0.08 + 0.42 * v) * lift;

  o = vec4(c * al, al);
}`;

function hexToRgb(hex) {
  const h = hex.replace('#', '');
  const n = parseInt(h.length === 3 ? h.split('').map(c => c + c).join('') : h, 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}

export function startBackdrop(canvas) {
  if (!canvas) return null;

  /* ?still draws one frame and stops — handy for screenshots */
  const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    || new URLSearchParams(location.search).has('still');

  let gl = null;
  try {
    gl = canvas.getContext('webgl2', { alpha: true, premultipliedAlpha: true, antialias: false });
  } catch { gl = null; }

  if (!gl) return linesFallback(canvas, still);

  const shader = (type, src) => {
    const s = gl.createShader(type);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
    return s;
  };

  let prog;
  try {
    prog = gl.createProgram();
    gl.attachShader(prog, shader(gl.VERTEX_SHADER, VS));
    gl.attachShader(prog, shader(gl.FRAGMENT_SHADER, FS));
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error('link failed');
  } catch (err) {
    return linesFallback(canvas, still);
  }

  gl.useProgram(prog);

  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(prog, 'a');
  gl.enableVertexAttribArray(loc);
  gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

  const u = {
    res:  gl.getUniformLocation(prog, 'uRes'),
    t:    gl.getUniformLocation(prog, 'uT'),
    boost: gl.getUniformLocation(prog, 'uBoost'),
    prog: gl.getUniformLocation(prog, 'uProg'),
    dark: gl.getUniformLocation(prog, 'uDark'),
    sec:  gl.getUniformLocation(prog, 'uSec'),
    aura: gl.getUniformLocation(prog, 'uAura'),
    auraAmt: gl.getUniformLocation(prog, 'uAuraAmt')
  };

  let t = 3;
  let boost = 0;
  let lastY = window.scrollY;
  let last = performance.now();
  let raf = null;
  let running = true;

  /* eased values */
  let secNow = 0, secTo = 0;
  let auraNow = [0, 0, 0], auraTo = [0, 0, 0];
  let auraAmt = 0, auraAmtTo = 0;

  function size() {
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    const w = Math.round(window.innerWidth * dpr);
    const h = Math.round(window.innerHeight * dpr);
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
    }
  }

  function progress() {
    const max = document.documentElement.scrollHeight - window.innerHeight;
    return max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0;
  }

  function draw(dt) {
    const y = window.scrollY;
    const dy = Math.abs(y - lastY);
    lastY = y;

    /* scroll speed → boost. quick to rise, slow to fall, like a flywheel */
    const target = dt > 0 ? Math.min((dy / dt) / 250, 12) : 0;
    boost += (target - boost) * (1 - Math.exp(-dt * (target > boost ? 7 : 1.6)));

    /* section and aura ease toward their targets */
    const ease = 1 - Math.exp(-dt * 3.2);
    secNow += (secTo - secNow) * ease;
    auraAmt += (auraAmtTo - auraAmt) * ease;
    for (let i = 0; i < 3; i++) auraNow[i] += (auraTo[i] - auraNow[i]) * ease;

    const speed = 1 + boost;
    t += dt * 0.5 * speed;

    const dark = new Date().getHours() === 0 ? 1 : 0;

    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.uniform2f(u.res, canvas.width, canvas.height);
    gl.uniform1f(u.t, t);
    gl.uniform1f(u.boost, boost);
    gl.uniform1f(u.prog, progress());
    gl.uniform1f(u.dark, dark);
    gl.uniform1f(u.sec, secNow);
    gl.uniform3f(u.aura, auraNow[0], auraNow[1], auraNow[2]);
    gl.uniform1f(u.auraAmt, auraAmt);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }

  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    draw(dt);
    if (running && !still) raf = requestAnimationFrame(frame);
  }

  size();
  if (still) draw(0);
  else raf = requestAnimationFrame(frame);

  window.addEventListener('resize', () => {
    size();
    if (still) draw(0);
  });

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      running = false;
      cancelAnimationFrame(raf);
    } else if (!running && !still) {
      running = true;
      last = performance.now();
      raf = requestAnimationFrame(frame);
    }
  });

  window.__backdrop = { mode: 'webgl2' };

  return {
    setSection(i) { secTo = Math.max(0, Math.min(3, i)); },
    setAura(hex) {
      if (hex) {
        auraTo = hexToRgb(hex);
        auraAmtTo = 1;
      } else {
        auraAmtTo = 0;
      }
    }
  };
}

/* ---------------------------------------------------- no-WebGL fallback -- */
function linesFallback(canvas, still) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  let t = 0;
  let scale = 1;
  let auraAmtTo = 0, auraAmt = 0;
  let auraTo = [0, 0, 0];
  let secTo = 0, secNow = 0;

  function size() {
    scale = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(window.innerWidth * scale);
    canvas.height = Math.round(window.innerHeight * scale);
  }

  function col() {
    const stops = [[0.169, 0.286, 0.961], [0.784, 1, 0.239], [0.537, 0.427, 1], [0.145, 0.235, 0.62]];
    const i = Math.min(2, Math.floor(secNow));
    const f = secNow - i;
    const a = stops[i], b = stops[i + 1];
    let c = [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f, a[2] + (b[2] - a[2]) * f];
    if (auraAmt > 0) {
      c = [
        c[0] + (auraTo[0] - c[0]) * auraAmt * 0.85,
        c[1] + (auraTo[1] - c[1]) * auraAmt * 0.85,
        c[2] + (auraTo[2] - c[2]) * auraAmt * 0.85
      ];
    }
    return c.map(v => Math.round(v * 255));
  }

  function draw() {
    const W = canvas.width / scale;
    const H = canvas.height / scale;
    ctx.setTransform(scale, 0, 0, scale, 0, 0);
    ctx.clearRect(0, 0, W, H);

    const [r, g, b] = col();
    const n = 34;
    const step = Math.max(10, W / 80);
    ctx.lineJoin = 'round';

    for (let i = 0; i < n; i++) {
      const y0 = -H * 0.1 + (i / (n - 1)) * H * 1.2;
      ctx.strokeStyle = `rgba(${r},${g},${b},0.22)`;
      ctx.lineWidth = 1 + 4 * Math.pow(Math.abs(Math.sin(i * 1.9 + t * 0.2)), 2);
      ctx.beginPath();
      for (let x = -step; x <= W + step; x += step) {
        const yv = y0 + 36 * Math.sin(x * 0.005 + y0 * 0.006 + t * 0.6)
                      + 22 * Math.sin(x * 0.012 - y0 * 0.005 + t * 0.9 + i * 0.05);
        if (x === -step) ctx.moveTo(x, yv);
        else ctx.lineTo(x, yv);
      }
      ctx.stroke();
    }
  }

  function frame() {
    t += 0.016;
    auraAmt += (auraAmtTo - auraAmt) * 0.05;
    secNow += (secTo - secNow) * 0.05;
    draw();
    requestAnimationFrame(frame);
  }

  size();
  draw();
  window.addEventListener('resize', () => { size(); draw(); });
  if (!still) frame();

  return {
    setSection(i) { secTo = Math.max(0, Math.min(3, i)); },
    setAura(hex) {
      if (hex) { auraTo = hexToRgb(hex); auraAmtTo = 1; }
      else auraAmtTo = 0;
    }
  };
}
