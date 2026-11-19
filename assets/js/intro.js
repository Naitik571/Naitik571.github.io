/* ============================================================================
   intro.js — the deck.

   Five cards drop from above into a pile, the pile bursts into a ring, the
   ring turns and sheds cards, one survivor lands in the hero plate slot.

   Runs once per session, skippable, skipped entirely under reduced motion.
   ========================================================================== */

const IMG = name => new URL(`../img/${name}`, import.meta.url).href;

/* sixteen distinct crops — JOJOVELLER, JOJO 6251, and the case plates */
const SOURCES = [
  'card-1.webp', 'card-2.webp', 'card-3.webp',
  'card-4.webp', 'card-5.webp', 'card-6.webp', 'card-7.webp',
  'card-8.webp', 'card-9.webp', 'card-10.webp', 'card-11.webp',
  'card-12.webp', 'card-13.webp',
  'case-hero.webp', 'case-fig.webp', 'plate-b.webp'
];

const WINDOWS = ['50% 18%', '30% 52%', '72% 34%', '50% 76%', '18% 28%',
                 '84% 58%', '44% 40%', '62% 22%', '50% 62%', '26% 70%', '70% 46%',
                 '38% 30%', '58% 50%', '50% 44%', '34% 66%', '66% 28%'];

const KEY = 'nk-intro';

export function startIntro() {
  const root = document.documentElement;
  const release = () => root.classList.remove('intro-on');

  const gsap = window.gsap;
  const plate = document.querySelector('.title-plate img');
  const RM = matchMedia('(prefers-reduced-motion: reduce)').matches;

  let seen = false;
  try { seen = sessionStorage.getItem(KEY) === '1'; } catch (e) { /* private mode */ }

  if (!gsap || !plate || RM || seen) {
    release();
    if (seen) { root.classList.remove('intro-on'); }
    return;
  }

  const W = () => innerWidth;
  const H = () => innerHeight;

  let cards = [];
  let tl = null;
  let done = false;
  let rot = { a: 0 };
  let N = 16;

  /* ------------------------------------------------------------ build -- */
  const overlay = document.createElement('div');
  overlay.className = 'ix';
  overlay.setAttribute('aria-hidden', 'true');
  overlay.innerHTML = '<div class="ix-glow"></div><div class="ix-marks"></div>' +
                      '<p class="ix-hint">click anywhere to skip</p>';
  document.body.appendChild(overlay);

  function geometry() {
    const cw = Math.max(74, Math.min(W() * 0.082, 128));
    return { cw, ch: cw * 4 / 3, radius: Math.min(W() * 0.36, H() * 0.30) };
  }

  function build() {
    cards.forEach(c => c.remove());
    cards = [];
    N = W() < 700 ? 12 : 16;

    const { cw, ch } = geometry();
    const s = root.style;
    s.setProperty('--ix-cw', cw + 'px');
    s.setProperty('--ix-ch', ch + 'px');

    for (let i = 0; i < N; i++) {
      const el = document.createElement('div');
      el.className = 'ix-card';
      /* the survivor is the hero plate, so the landing is a straight swap */
      el.innerHTML = i === N - 4
        ? `<img src="${IMG('plate-a.webp')}" style="object-position:50% 24%" alt="">`
        : `<img src="${IMG(SOURCES[i % SOURCES.length])}"
                style="object-position:${WINDOWS[i % WINDOWS.length]}" alt="">`;
      overlay.appendChild(el);
      cards.push(el);
    }
  }

  /* one source of truth for ring geometry — the burst and every spin frame
     read the same numbers, which is what keeps the handoff seamless */
  function ringSlot(i, a, cw, ch, radius) {
    const ang = (i / N) * Math.PI * 2 - Math.PI / 2 + a;
    const depth = (Math.sin(ang) + 1) / 2;
    return {
      x: W() / 2 + Math.cos(ang) * radius - cw / 2,
      y: H() / 2 + Math.sin(ang) * radius - ch / 2,
      scale: 0.88 + depth * 0.18,
      rotation: ang * 180 / Math.PI + 90 + (i % 3 - 1) * 2.5,
      zIndex: Math.round(depth * 100)
    };
  }

  function placeRing(a, keepZ) {
    const { cw, ch, radius } = geometry();
    cards.forEach((el, i) => {
      if (el.dataset.busy === '1') return;
      const slot = ringSlot(i, a, cw, ch, radius);
      if (keepZ) delete slot.zIndex;
      gsap.set(el, slot);
    });
  }

  /* ------------------------------------------------------------- run -- */
  function run() {
    if (tl) tl.kill();
    gsap.killTweensOf(cards);
    gsap.killTweensOf(rot);
    rot.a = 0;
    cards.forEach(el => {
      delete el.dataset.busy;
      gsap.set(el, { clearProps: 'all' });
      el.style.opacity = '';
    });

    const { cw, ch, radius } = geometry();
    const cx = W() / 2, cy = H() / 2;
    const PILE = 2.05;

    tl = gsap.timeline({
      onComplete: () => {
        overlay.remove();
        release();
        try { sessionStorage.setItem(KEY, '1'); } catch (e) { /* noop */ }
        done = true;
      }
    });

    /* everything waits at the pile, under the drop zone */
    cards.forEach((el, i) => {
      const k = i - (N - 1) / 2;
      gsap.set(el, {
        x: cx - cw / 2 + k * 4.5,
        y: cy - ch / 2 + k * 3.5,
        scale: PILE,
        rotation: k * 2.0,
        opacity: 0,
        zIndex: 10 + i
      });
    });

    /* 1 — five cards drop from above, each landing on the last */
    const DROPS = 5, DUR = .46, GAP = .16;

    cards.slice(0, DROPS).forEach((el, i) => {
      const k = i - (DROPS - 1) / 2;
      gsap.set(el, {
        x: cx - cw / 2 + k * 4.5,
        y: -H() * 1.05,
        rotation: k * 13 + 5,
        scale: PILE * 1.12,
        opacity: 1,
        zIndex: 10 + i
      });
      const t = .08 + i * GAP;
      tl.to(el, { y: cy - ch / 2 + k * 3.5, rotation: k * 2.0, duration: DUR, ease: 'power3.out' }, t);
      tl.to(el, { scale: PILE, duration: DUR * .85, ease: 'back.out(2.4)' }, t);
    });

    const DROP_END = .08 + (DROPS - 1) * GAP + DUR;

    /* 2 — the pile bursts and takes the ring */
    const EXPLODE = DROP_END + .18;
    tl.set(cards.slice(DROPS), { opacity: 1 }, EXPLODE);

    cards.forEach((el, i) => {
      tl.to(el, {
        ...ringSlot(i, 0, cw, ch, radius),
        opacity: 1,
        duration: .42,
        ease: 'back.out(1.35)'
      }, EXPLODE + i * .012);
    });

    const RING_END = EXPLODE + (N - 1) * .012 + .42;

    /* 3 — the ring turns; leaders peel off the edge */
    const TURN = RING_END + .24;
    const peel = cards.slice(0, 4);
    peel.forEach(el => { el.dataset.busy = '1'; });

    tl.to(rot, {
      a: Math.PI * .85,
      duration: .64,
      ease: 'power2.inOut',
      onUpdate: () => placeRing(rot.a, true)
    }, TURN);

    peel.forEach((el, i) => {
      tl.to(el, {
        x: `+=${W() * .52}`,
        y: `+=${i % 2 ? 90 : -90}`,
        rotation: '+=40',
        opacity: 0,
        duration: .32,
        ease: 'power2.in'
      }, TURN + .04 + i * .05);
    });

    /* 4 — the survivor lands in the plate slot, everything else blows out */
    const LAND = TURN + .64;
    const hero = cards[N - 4];
    const rest = cards.slice(4).filter(el => el !== hero);
    const r = plate.getBoundingClientRect();

    tl.to(rest, {
      x: (i, el) => gsap.getProperty(el, 'x') + (gsap.getProperty(el, 'x') - (cx - cw / 2)) * .7,
      y: (i, el) => gsap.getProperty(el, 'y') + (gsap.getProperty(el, 'y') - (cy - ch / 2)) * .7,
      scale: .40,
      opacity: 0,
      duration: .42,
      ease: 'power3.in',
      stagger: .012
    }, LAND);

    /* width/height are tweened alongside the transform so the card's box
       becomes the plate's box exactly — no aspect jump at the swap */
    tl.to(hero, {
      x: r.left,
      y: r.top,
      width: r.width,
      height: r.height,
      scale: 1,
      rotation: 0,
      duration: .58,
      ease: 'power3.inOut',
      onComplete: () => {
        root.classList.remove('intro-on');
        gsap.to(overlay, { opacity: 0, duration: .40, ease: 'power1.out' });
        gsap.to(hero, { opacity: 0, duration: .26, delay: .04 });
      }
    }, LAND + .05);
  }

  /* ------------------------------------------------------------ skip -- */
  function skip() {
    if (done || !tl) return;
    tl.progress(1);
  }

  overlay.addEventListener('click', skip);
  addEventListener('keydown', e => {
    if (['Escape', 'Enter', ' '].includes(e.key)) skip();
  });
  addEventListener('wheel', skip, { passive: true });

  let rt;
  addEventListener('resize', () => {
    clearTimeout(rt);
    rt = setTimeout(() => { if (!done) { build(); run(); } }, 240);
  });

  build();
  run();
}
