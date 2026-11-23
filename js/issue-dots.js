/* =========================================================
   MADAM — "Out of every 100" dot chart (The Issue page header)
   100 dots; each fact lights up that many in its own colour and
   counts the number up. It cycles through the facts on its own;
   the tabs switch by hand, and hovering pauses it.
   Figures are the same UN figures used on this page.
   ========================================================= */

(() => {
  const box = document.querySelector('[data-dots]');
  if (!box) return;
  const grid = box.querySelector('[data-dots-grid]');
  const num = box.querySelector('[data-dots-num]');
  const caption = box.querySelector('[data-dots-caption]');
  const tabs = [...box.querySelectorAll('[data-fact]')];
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const FACTS = [
    { n: 27, text: 'seats in national parliaments are held by women.', tone: 'var(--berry)', tint: 'var(--berry-soft)' },
    { n: 30, text: 'women have faced physical or sexual violence in their lifetime.', tone: 'var(--coral)', tint: 'var(--coral-soft)' },
    { n: 20, text: 'pesos less: for every 100 a man earns, a woman earns about 80.', tone: '#C88B12', tint: 'var(--sun-soft)' },
    { n: 54, text: 'countries still lack laws covering every key area of gender equality.', tone: 'var(--teal)', tint: 'var(--teal-soft)' },
  ];
  const CYCLE = 5200;          // ms each fact stays before moving on

  // build the 100 dots
  grid.innerHTML = Array.from({ length: 100 }, () => '<span class="dots__dot"></span>').join('');
  const dots = [...grid.children];

  let current = -1, timer = null, hovering = false, holdUntil = 0, countRaf = null;

  function countTo(target) {
    cancelAnimationFrame(countRaf);
    if (reduceMotion) { num.textContent = target; return; }
    const from = parseInt(num.textContent, 10) || 0;
    const start = performance.now(), dur = 900;
    const tick = now => {
      const t = Math.min(1, (now - start) / dur);
      num.textContent = Math.round(from + (target - from) * (1 - Math.pow(1 - t, 3)));
      if (t < 1) countRaf = requestAnimationFrame(tick);
    };
    countRaf = requestAnimationFrame(tick);
  }

  function show(i) {
    if (i === current) return;
    current = i;
    const f = FACTS[i];
    box.style.setProperty('--tone', f.tone);
    box.style.setProperty('--tint', f.tint);
    caption.textContent = f.text;
    countTo(f.n);
    dots.forEach((d, k) => {
      d.style.transitionDelay = reduceMotion ? '0s' : `${(k % 100) * 7}ms`;   // fill in like ink spreading
      d.classList.toggle('is-on', k < f.n);
    });
    tabs.forEach((t, k) => {
      t.classList.toggle('is-active', k === i);
      t.setAttribute('aria-selected', k === i);
    });
  }

  function next() {
    if (!hovering && performance.now() >= holdUntil && !document.hidden) show((current + 1) % FACTS.length);
  }

  tabs.forEach((t, k) => t.addEventListener('click', () => { show(k); holdUntil = performance.now() + 12000; }));
  box.addEventListener('pointerenter', e => { if (e.pointerType === 'mouse') hovering = true; });
  box.addEventListener('pointerleave', e => { if (e.pointerType === 'mouse') hovering = false; });
  // keyboard users: pause while a tab has keyboard focus
  box.addEventListener('focusin', e => { if (e.target.matches(':focus-visible')) holdUntil = Infinity; });
  box.addEventListener('focusout', () => { if (holdUntil === Infinity) holdUntil = performance.now() + 4000; });

  show(0);
  if (!reduceMotion) timer = setInterval(next, CYCLE);
})();
