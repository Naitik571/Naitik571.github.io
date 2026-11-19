/* ============================================================================
   main.js — no framework, no build step.

   content fill · project index · work deck · stand stats · clock · reveal
   ========================================================================== */

import { CONTENT as C } from './content.js';
import { startBackdrop } from './backdrop.js';
import { startIntro } from './intro.js';

const RM = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const $  = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

/* ---------------------------------------------------------------- text -- */
function fillContent() {
  $$('[data-name]').forEach(el => { el.textContent = C.name; });
  $$('[data-location]').forEach(el => { el.textContent = C.location; });
  $$('[data-availability]').forEach(el => { el.textContent = C.availability; });
  $$('[data-bio]').forEach(el => { el.textContent = C.bio; });
  $$('[data-year]').forEach(el => { el.textContent = String(new Date().getFullYear()); });

  const mail = $('#contact-mail');
  if (mail) {
    mail.textContent = C.email;
    mail.href = `mailto:${C.email}`;
  }

  const links = $('#contact-links');
  if (links) {
    links.innerHTML = C.links
      .map(l => `<li><a href="${l.href}"${l.href.startsWith('http') ? ' target="_blank" rel="noopener"' : ''}>${l.label} ↗</a></li>`)
      .join('');
  }

  document.title = `${C.name} — ${C.role.toLowerCase()}`;
}

/* --------------------------------------------------------- project index -- */
function initIndex() {
  const list = $('#index');
  if (!list) return;

  list.innerHTML = C.projects.map((p, i) => `
    <li>
      <a href="${p.href}" aria-label="${p.name} — ${p.desc}">
        <span class="idx-n">${String(i + 1).padStart(2, '0')}</span>
        <span class="idx-name">${p.name}</span>
        <span class="idx-desc">${p.desc}</span>
        <span class="idx-year">${p.year}</span>
      </a>
    </li>`).join('');
}

/* ------------------------------------------------------------- work deck -- */
const AURA = ['#2B49F5', '#C8FF3D', '#8B6DFF'];

function initDeck(onAura) {
  const deck = $('#deck');
  if (!deck) return;

  deck.innerHTML = C.projects.map((p, i) => `
    <a class="card" href="${p.href}" data-i="${i}" aria-label="${p.name} — ${p.desc}">
      <div class="card-shot">
        <img src="${p.card}" alt="" width="720" height="960" loading="lazy" decoding="async">
        <span class="card-n">${String(i + 1).padStart(2, '0')}</span>
        <span class="card-chip">${p.chip}</span>
        <div class="card-meta">
          <h3 class="card-name">${p.name}</h3>
          <p class="card-desc">${p.desc}</p>
          <div class="card-foot">
            <span class="card-tags">${p.tags.join(' · ')}</span>
            <span class="card-open">Open ↗</span>
          </div>
        </div>
      </div>
    </a>`).join('');

  if (RM) return;

  const cards = $$('.card', deck);

  cards.forEach(card => {
    card.addEventListener('pointermove', e => {
      const r = card.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width - 0.5;
      const y = (e.clientY - r.top) / r.height - 0.5;
      card.style.setProperty('--ry', `${(x * 14).toFixed(2)}deg`);
      card.style.setProperty('--rx', `${(-y * 12).toFixed(2)}deg`);
    });

    card.addEventListener('pointerleave', () => {
      card.style.setProperty('--ry', '0deg');
      card.style.setProperty('--rx', '0deg');
      onAura && onAura(null);
    });

    card.addEventListener('pointerenter', () => {
      onAura && onAura(AURA[+card.dataset.i] || null);
    });
  });
}

/* ------------------------------------------------------------- stand stats -- */
const GRADE = { A: 0.96, B: 0.76, C: 0.56, D: 0.4, E: 0.26 };

function initStatus() {
  const portrait = $('#portrait');
  if (portrait && C.status.portrait) {
    portrait.src = C.status.portrait;
    portrait.alt = `${C.name}`;
  }

  const note = $('#status-note');
  if (note) note.textContent = C.status.note;

  const rows = $('#status-rows');
  if (rows) {
    rows.innerHTML = C.status.rows
      .map(([k, v]) => `<div><dt>${k}</dt><dd>${v}</dd></div>`)
      .join('');
  }

  drawRadar();
}

function drawRadar() {
  const svg = $('#radar');
  if (!svg) return;

  const cx = 160;
  const cy = 160;
  const R = 108;
  const stats = C.status.stats;
  const n = stats.length;

  const pt = (i, r) => {
    const a = (-Math.PI / 2) + (i / n) * Math.PI * 2;
    return [cx + Math.cos(a) * r, cy + Math.sin(a) * r];
  };

  const hex = r => Array.from({ length: n }, (_, i) => pt(i, r).join(',')).join(' ');

  let out = '';

  /* rings */
  [0.25, 0.5, 0.75, 1].forEach(k => {
    out += `<polygon class="rg-grid" points="${hex(R * k)}" />`;
  });

  /* axes */
  for (let i = 0; i < n; i++) {
    const [x, y] = pt(i, R);
    out += `<line class="rg-axis" x1="${cx}" y1="${cy}" x2="${x.toFixed(1)}" y2="${y.toFixed(1)}" />`;
  }

  /* value shape */
  const val = stats.map((s, i) => pt(i, R * (GRADE[s.grade] || 0.4)));
  out += `<polygon class="rg-shape" points="${val.map(p => p.map(v => v.toFixed(1)).join(',')).join(' ')}" />`;

  /* dots */
  val.forEach(([x, y]) => {
    out += `<circle class="rg-dot" cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="2.6" />`;
  });

  /* labels */
  stats.forEach((s, i) => {
    const a = (-Math.PI / 2) + (i / n) * Math.PI * 2;
    const lx = cx + Math.cos(a) * (R + 26);
    const ly = cy + Math.sin(a) * (R + 26);
    const anchor = Math.cos(a) > 0.3 ? 'start' : Math.cos(a) < -0.3 ? 'end' : 'middle';
    const dy = Math.sin(a) > 0.6 ? 10 : 0;
    out += `<text class="rg-label" x="${lx.toFixed(1)}" y="${(ly + dy).toFixed(1)}" text-anchor="${anchor}">${s.key}</text>`;
    out += `<text class="rg-grade" x="${lx.toFixed(1)}" y="${(ly + dy + 12).toFixed(1)}" text-anchor="${anchor}">${s.grade}</text>`;
  });

  svg.innerHTML = out;
}

/* --------------------------------------------------------------- clock -- */
/* Local time. Between 00:00 and 01:00 it reads the Dark Hour: 25:xx.        */
function tickClock() {
  const now = new Date();
  const h = now.getHours();
  const m = String(now.getMinutes()).padStart(2, '0');
  const darkHour = h === 0;
  const shown = darkHour ? `25:${m}` : `${String(h).padStart(2, '0')}:${m}`;

  const small = $('#clock');
  const zone = $('.hud-zone');

  if (small) {
    small.textContent = shown;
    small.classList.toggle('is-dark', darkHour);
  }
  if (zone) zone.textContent = darkHour ? 'dark hour' : 'local time';
}

/* -------------------------------------------------------------- reveal -- */
function initReveal() {
  const items = $$('[data-reveal]');
  items.forEach(el => {
    const d = el.dataset.revealDelay;
    if (d) el.style.setProperty('--d', `${d}ms`);
  });

  const radar = $('.radar');

  if (RM || !('IntersectionObserver' in window)) {
    items.forEach(el => el.classList.add('is-in'));
    radar && radar.classList.add('is-in');
    return;
  }

  const io = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (!e.isIntersecting) return;
      e.target.classList.add('is-in');
      io.unobserve(e.target);
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });

  items.forEach(el => io.observe(el));
  if (radar) io.observe(radar);
}

/* ----------------------------------------------------------- backdrop -- */
function initSections(backdrop) {
  const sections = $$('[data-section]');
  if (!sections.length || !backdrop) return;

  let current = -1;

  const pick = () => {
    const mid = window.scrollY + window.innerHeight * 0.5;
    let best = 0;
    let bestD = Infinity;
    sections.forEach(el => {
      const r = el.getBoundingClientRect();
      const c = window.scrollY + r.top + r.height * 0.5;
      const d = Math.abs(c - mid);
      if (d < bestD) { bestD = d; best = +el.dataset.section; }
    });
    if (best !== current) {
      current = best;
      backdrop.setSection(best);
    }
  };

  pick();
  window.addEventListener('scroll', pick, { passive: true });
  window.addEventListener('resize', pick);
}

/* ---------------------------------------------------------------- boot -- */
function boot() {
  fillContent();
  initIndex();
  initStatus();

  const backdrop = startBackdrop(document.getElementById('flow'));

  initDeck(color => backdrop && backdrop.setAura(color));
  initSections(backdrop);
  initReveal();

  tickClock();
  setInterval(tickClock, 15_000);

  /* the deck runs over everything, once per session */
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(startIntro);
  else startIntro();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot);
} else {
  boot();
}
