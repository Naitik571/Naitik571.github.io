/* ============================================================================
   main.js — no framework, no build step.
   content fill · project index · clock · reveal
   ========================================================================== */

import { CONTENT as C } from './content.js';
import { runIntro } from './scene.js';

const RM = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const $  = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

/* ---------------------------------------------------------------- text -- */
function fillContent() {
  $$('[data-name]').forEach(el => { el.textContent = C.name; });
  $$('[data-role]').forEach(el => { el.textContent = C.role; });
  $$('[data-bio]').forEach(el => { el.textContent = C.bio; });
  $$('[data-location]').forEach(el => { el.textContent = C.location; });
  $$('[data-availability]').forEach(el => { el.textContent = C.availability; });
  $$('[data-year]').forEach(el => { el.textContent = String(new Date().getFullYear()); });
  document.title = `${C.name} — Stand User`;
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

/* --------------------------------------------------------------- clock -- */
/* Local time. Between 00:00 and 01:00 it reads the Dark Hour: 25:xx.        */
function tickClock() {
  const now = new Date();
  const h = now.getHours();
  const m = String(now.getMinutes()).padStart(2, '0');
  const inDarkHour = h === 0;
  const shown = inDarkHour ? `25:${m}` : `${String(h).padStart(2, '0')}:${m}`;

  const small = $('#clock');
  const zone  = $('.hud-zone');

  if (small) {
    small.textContent = shown;
    small.classList.toggle('is-dark', inDarkHour);
  }
  if (zone) zone.textContent = inDarkHour ? 'dark hour' : 'local time';
}

/* -------------------------------------------------------------- reveal -- */
function initReveal() {
  const items = $$('[data-reveal]');
  items.forEach(el => {
    const d = el.dataset.revealDelay;
    if (d) el.style.setProperty('--d', `${d}ms`);
  });

  if (RM || !('IntersectionObserver' in window)) {
    items.forEach(el => el.classList.add('is-in'));
    return;
  }

  const io = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (!e.isIntersecting) return;
      e.target.classList.add('is-in');
      io.unobserve(e.target);
    });
  }, { threshold: 0.1, rootMargin: '0px 0px -6% 0px' });

  items.forEach(el => io.observe(el));
}

/* ---------------------------------------------------------------- boot -- */
function boot() {
  fillContent();
  initIndex();
  tickClock();
  setInterval(tickClock, 15_000);

  if (new URLSearchParams(location.search).has('nointro')) { initReveal(); return; }

  /* the page waits behind the intro; if anything in there fails, it doesn't */
  try {
    runIntro(initReveal);
  } catch (err) {
    console.warn('intro skipped:', err);
    document.getElementById('scene')?.remove();
    initReveal();
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot);
} else {
  boot();
}
