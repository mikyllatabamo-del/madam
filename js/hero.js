/* =========================================================
   MADAM — "Hands In" (home page)
   Eight people with different identities stand in a circle.
   Hover (or tap) and everyone reaches in until their hands
   meet in the middle, and their faces light up. Click while
   they're together: everyone hops and pops a heart and a rainbow.
   ========================================================= */

(() => {
  const stage = document.getElementById('circle');
  if (!stage) return;
  const svg = stage.querySelector('svg');
  const note = stage.querySelector('.circle__note');
  const NS = 'http://www.w3.org/2000/svg';
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const INK = '#3A2D27';
  const C = { x: 300, y: 262 };                 // the middle, where hands meet
  const RING = { rx: 214, ry: 176 };
  const SIZE = 1.15;                            // how big each person is drawn

  // Different people, different identities
  const PEOPLE = [
    { skin: '#8D5524', hair: 'hijab', hairColor: '#2E8378', shirt: '#F4B942' },
    { skin: '#F1C27D', hair: 'short', hairColor: '#4A3426', shirt: '#2E8378', glasses: true },
    { skin: '#5C3A21', hair: 'afro',  hairColor: '#1E1A17', shirt: '#D9694F' },
    { skin: '#E0AC69', hair: 'bun',   hairColor: '#2A1E17', shirt: '#8B4C8C' },
    { skin: '#C68642', hair: 'bald',  hairColor: '#3B2A20', shirt: '#4F78B8', beard: true },
    { skin: '#FFDBAC', hair: 'long',  hairColor: '#C98A3A', shirt: '#F4B942' },
    { skin: '#A86B3C', hair: 'curly', hairColor: '#2A1E17', shirt: '#2E8378' },
    { skin: '#F3CFA4', hair: 'ponytail', hairColor: '#8B4C8C', shirt: '#D9694F' },
  ];

  const el = (tag, attrs = {}, parent) => {
    const n = document.createElementNS(NS, tag);
    for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, v);
    if (parent) parent.appendChild(n);
    return n;
  };

  /* ---------- the warm glow where hands meet ---------- */
  const glow = el('circle', { cx: C.x, cy: C.y, r: 0, fill: '#F9D98A', opacity: .7, class: 'circle__glow' }, svg);
  const glow2 = el('circle', { cx: C.x, cy: C.y, r: 0, fill: '#F4B942', opacity: .55 }, svg);

  /* ---------- build each person ---------- */
  const people = PEOPLE.map((p, i) => {
    const angle = -Math.PI / 2 + (i / PEOPLE.length) * Math.PI * 2;
    const x = C.x + Math.cos(angle) * RING.rx;
    const y = C.y + Math.sin(angle) * RING.ry;
    return { ...p, i, angle, x, y };
  }).sort((a, b) => a.y - b.y);                 // people further back are drawn first

  const layer = el('g', {}, svg);
  people.forEach(p => {
    const g = el('g', { class: 'person', transform: `translate(${p.x.toFixed(1)} ${p.y.toFixed(1)}) scale(${SIZE})` }, layer);
    p.hop = el('g', { class: 'person__hop' }, g);
    const bob = el('g', { class: 'person__bob', style: `animation-delay:${(-p.i * 0.37).toFixed(2)}s` }, p.hop);
    p.bob = bob;

    // hair behind the head
    if (p.hair === 'long') el('path', { d: 'M-30 0 Q-32 -33 0 -33 Q32 -33 30 0 L33 46 Q0 54 -33 46 Z', fill: p.hairColor }, bob);
    if (p.hair === 'afro') el('circle', { cx: 0, cy: -6, r: 41, fill: p.hairColor }, bob);
    if (p.hair === 'bun') el('circle', { cx: 0, cy: -34, r: 12, fill: p.hairColor }, bob);
    if (p.hair === 'ponytail') el('ellipse', { cx: 31, cy: 6, rx: 9, ry: 20, fill: p.hairColor }, bob);
    if (p.hair === 'hijab') el('path', { d: 'M-37 8 Q-39 -39 0 -39 Q39 -39 37 8 L42 62 Q0 72 -42 62 Z', fill: p.hairColor }, bob);

    // shoulders
    el('path', { d: 'M-38 74 Q-38 37 0 35 Q38 37 38 74 Z', fill: p.shirt }, bob);

    // head (or face inside a hijab)
    if (p.hair === 'hijab') el('ellipse', { cx: 0, cy: 2, rx: 21, ry: 24, fill: p.skin }, bob);
    else el('circle', { cx: 0, cy: 0, r: 28, fill: p.skin }, bob);

    // hair in front
    const cap = 'M-28 -2 Q-28 -31 0 -31 Q28 -31 28 -2 Q20 -18 0 -18 Q-20 -18 -28 -2 Z';
    if (['short', 'long', 'bun', 'ponytail'].includes(p.hair)) el('path', { d: cap, fill: p.hairColor }, bob);
    if (p.hair === 'curly') [[-22, -12], [-13, -24], [0, -29], [13, -24], [22, -12]]
      .forEach(([cx, cy]) => el('circle', { cx, cy, r: 10, fill: p.hairColor }, bob));
    if (p.beard) el('path', { d: 'M-23 3 Q-21 29 0 31 Q21 29 23 3 Q15 17 0 17 Q-15 17 -23 3 Z', fill: p.hairColor }, bob);

    // two faces: calm, and happy (we fade between them)
    const calm = el('g', { class: 'face face--calm' }, bob);
    el('circle', { cx: -9, cy: 2, r: 2.8, fill: INK }, calm);
    el('circle', { cx: 9, cy: 2, r: 2.8, fill: INK }, calm);
    el('path', { d: 'M-6 12 Q0 15 6 12', stroke: INK, 'stroke-width': 2.2, fill: 'none', 'stroke-linecap': 'round' }, calm);

    const happy = el('g', { class: 'face face--happy' }, bob);
    el('circle', { cx: -16, cy: 10, r: 5.5, fill: '#E8826A', opacity: .45 }, happy);
    el('circle', { cx: 16, cy: 10, r: 5.5, fill: '#E8826A', opacity: .45 }, happy);
    el('path', { d: 'M-13 4 Q-9 -3 -5 4 M5 4 Q9 -3 13 4', stroke: INK, 'stroke-width': 2.4, fill: 'none', 'stroke-linecap': 'round' }, happy);
    el('path', { d: 'M-10 10 Q0 24 10 10 Z', fill: INK }, happy);
    el('path', { d: 'M-5 17 Q0 21 5 17 Q0 15 -5 17 Z', fill: '#E8826A' }, happy);

    if (p.glasses) {
      const gl = el('g', { stroke: INK, 'stroke-width': 1.8, fill: 'none' }, bob);
      el('circle', { cx: -9, cy: 2, r: 7.5 }, gl);
      el('circle', { cx: 9, cy: 2, r: 7.5 }, gl);
      el('path', { d: 'M-1.5 2 H1.5' }, gl);
    }

    // the arm that reaches in (drawn on top of the shoulders)
    const toCenterX = C.x - p.x;
    p.side = Math.abs(toCenterX) < 20 ? (p.i % 2 ? 1 : -1) : Math.sign(toCenterX);
    p.shoulder = { x: p.side * 27, y: 46 };
    p.rest = { x: p.side * 31, y: 66 };
    const meet = Math.atan2(p.y - C.y, p.x - C.x);          // hands form a tight ring in the middle
    p.reach = { x: (C.x + Math.cos(meet) * 19 - p.x) / SIZE, y: (C.y + Math.sin(meet) * 17 - p.y) / SIZE };
    p.arm = el('path', { stroke: p.shirt, 'stroke-width': 12, fill: 'none', 'stroke-linecap': 'round' }, bob);
    p.hand = el('circle', { r: 7.5, fill: p.skin }, bob);
    p.t = 0;
    p.speed = 0.07 + (p.i % 4) * 0.012;                       // each person moves at their own pace
    p.g = g;
  });

  /* ---------- drawing ---------- */
  function placeArm(p) {
    const e = 1 - Math.pow(1 - p.t, 3);                       // ease out
    const hx = p.rest.x + (p.reach.x - p.rest.x) * e;
    const hy = p.rest.y + (p.reach.y - p.rest.y) * e;
    const sx = p.shoulder.x, sy = p.shoulder.y;
    // a soft elbow bend that straightens as the arm reaches
    const mx = (sx + hx) / 2, my = (sy + hy) / 2;
    const len = Math.hypot(hx - sx, hy - sy) || 1;
    const bend = 14 * (1 - e * 0.7);
    const cx = mx + (-(hy - sy) / len) * bend * p.side;
    const cy = my + ((hx - sx) / len) * bend * p.side;
    p.arm.setAttribute('d', `M${sx} ${sy} Q${cx.toFixed(1)} ${cy.toFixed(1)} ${hx.toFixed(1)} ${hy.toFixed(1)}`);
    p.hand.setAttribute('cx', hx.toFixed(1));
    p.hand.setAttribute('cy', hy.toFixed(1));
    p.g.classList.toggle('is-happy', p.t > 0.55);
  }

  let together = false;
  let shown = null;
  function frame(dt) {
    let sum = 0;
    for (const p of people) {
      const goal = together ? 1 : 0;
      p.t += (goal - p.t) * (1 - Math.pow(1 - p.speed, dt / 16.7));
      if (Math.abs(goal - p.t) < 0.001) p.t = goal;
      placeArm(p);
      sum += p.t;
    }
    const avg = sum / people.length;
    const e = avg * avg;
    glow.setAttribute('r', (e * 86).toFixed(1));
    glow2.setAttribute('r', (e * 42).toFixed(1));
    if (note && shown !== (avg > 0.85)) {
      shown = avg > 0.85;
      note.innerHTML = shown ? '<b>Together.</b> Click for a little cheer.' : note.dataset.idle;
    }
  }

  /* ---------- interaction ---------- */
  const isTouch = window.matchMedia('(hover: none)').matches;
  if (note) {
    note.dataset.idle = isTouch ? 'Tap to bring everyone together.' : 'Hover here to bring everyone together.';
    note.textContent = note.dataset.idle;
  }

  stage.addEventListener('pointerenter', e => { if (e.pointerType === 'mouse') together = true; });
  stage.addEventListener('pointerleave', e => { if (e.pointerType === 'mouse') together = false; });
  stage.addEventListener('click', e => {
    if (e.pointerType && e.pointerType !== 'mouse' && !together) { together = true; return; }
    if (!together) { together = true; return; }
    cheer();
  });
  stage.addEventListener('keydown', e => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      if (together) cheer(); else together = true;
    }
  });
  // on touch screens, tapping anywhere else lets everyone step back
  document.addEventListener('click', e => { if (isTouch && !stage.contains(e.target)) together = false; });
  stage.addEventListener('blur', () => { if (isTouch) return; together = stage.matches(':hover'); });
  stage.addEventListener('focus', () => { together = true; });

  /* ---------- the cheer: everyone hops, and hearts and rainbows pop out at random ---------- */
  const HEART = 'M0 8 C-12 0 -10 -10 -4 -10 C-1.5 -10 0 -8 0 -6 C0 -8 1.5 -10 4 -10 C10 -10 12 0 0 8 Z';
  const RAINBOW = [['#D9694F', 15], ['#F4B942', 11.5], ['#2E8378', 8], ['#8B4C8C', 4.5]];
  const HEART_COLORS = ['#D9694F', '#8B4C8C', '#E8826A', '#2E8378', '#F4B942'];
  const popLayer = el('g', { class: 'pops' }, svg);     // drawn above everyone
  const rand = (min, max) => min + Math.random() * (max - min);
  const pick = arr => arr[Math.floor(Math.random() * arr.length)];

  // one heart or rainbow, at a random spot above a person's head
  function popOne(p, kind, delay) {
    const headTop = p.y - 34 * SIZE;
    const x = p.x + rand(-26, 26);
    const y = headTop + rand(-16, 4);
    const scale = rand(0.8, 1.25);
    const drift = rand(-28, 28).toFixed(0);
    const tilt = rand(-14, 14).toFixed(0);

    const pos = el('g', { transform: `translate(${x.toFixed(1)} ${y.toFixed(1)})` }, popLayer);
    const pop = el('g', { class: 'pop', style: `animation-delay:${delay.toFixed(2)}s; --drift:${drift}px` }, pos);
    const shape = el('g', { transform: `rotate(${tilt}) scale(${scale.toFixed(2)})` }, pop);

    if (kind === 'heart') {
      el('path', { d: HEART, fill: pick(HEART_COLORS), transform: 'scale(1.3)' }, shape);
    } else {
      RAINBOW.forEach(([color, radius]) => el('path', {
        d: `M${-radius} 0 A${radius} ${radius} 0 0 1 ${radius} 0`,
        fill: 'none', stroke: color, 'stroke-width': 3.4, 'stroke-linecap': 'round',
      }, shape));
      el('circle', { cx: -15, cy: 1, r: 3.4, fill: '#FFFFFF' }, shape);   // little clouds at the ends
      el('circle', { cx: 15, cy: 1, r: 3.4, fill: '#FFFFFF' }, shape);
    }
    setTimeout(() => pos.remove(), 2400 + delay * 1000);
  }

  function cheer() {
    if (reduceMotion) return;
    people.forEach(p => {
      const delay = p.i * 0.07;                         // the hop still travels around the circle
      p.hop.classList.remove('is-cheering');
      void p.hop.getBoundingClientRect();
      p.hop.style.animationDelay = `${delay.toFixed(2)}s`;
      p.hop.classList.add('is-cheering');

      // 1 to 3 pops each, randomly hearts or rainbows, at random moments
      const count = 1 + Math.floor(Math.random() * 3);
      for (let k = 0; k < count; k++) {
        popOne(p, Math.random() < 0.55 ? 'heart' : 'rainbow', delay + rand(0, 0.55));
      }
    });
  }

  /* ---------- loop ---------- */
  let last = 0;
  function loop(t) {
    const dt = Math.min(last ? t - last : 16.7, 1000);
    last = t;
    frame(reduceMotion ? 1000 : dt);
    requestAnimationFrame(loop);
  }
  people.forEach(placeArm);
  requestAnimationFrame(loop);
})();
