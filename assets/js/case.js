/* ============================================================================
   case.js — the case-study page.

   Same backdrop, same clock, less machinery: no deck, no radar.
   ========================================================================== */

import { startBackdrop } from './backdrop.js';

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
const RM = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function tickClock() {
  const now = new Date();
  const h = now.getHours();
  const m = String(now.getMinutes()).padStart(2, '0');
  const darkHour = h === 0;

  const small = $('#clock');
  const zone = $('.hud-zone');
  if (small) {
    small.textContent = darkHour ? `25:${m}` : `${String(h).padStart(2, '0')}:${m}`;
    small.classList.toggle('is-dark', darkHour);
  }
  if (zone) zone.textContent = darkHour ? 'dark hour' : 'local time';
}

function initReveal() {
  const items = $$('[data-reveal]');
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
  }, { threshold: 0.12 });
  items.forEach(el => io.observe(el));
}

function boot() {
  $$('[data-year]').forEach(el => { el.textContent = String(new Date().getFullYear()); });
  const backdrop = startBackdrop($('#flow'));
  if (backdrop) backdrop.setSection(1);
  initReveal();
  tickClock();
  setInterval(tickClock, 15_000);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot);
} else {
  boot();
}
