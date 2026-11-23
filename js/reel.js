/* =========================================================
   MADAM — "In our own words" film strip (About page)
   - The five member cards drift slowly right to left, forever.
     The set is repeated once so the loop is seamless.
   - Drag the strip (mouse or finger) to move it by hand; a flick
     keeps it gliding for a moment.
   - The ‹ › buttons (and the ← → keys) move it one card at a time.
   - Hover, drag, or the buttons pause the drift; it eases back in
     smoothly a moment after you stop.
   - Hover / keyboard focus / tap brings a card forward.
   - With "reduce motion" on, it never drifts by itself, and the
     arrows jump instead of gliding.
   ========================================================= */

(() => {
  const reel = document.querySelector('[data-reel]');
  if (!reel) return;
  const track = reel.querySelector('.reel__track');
  const prevBtn = document.querySelector('[data-reel-prev]');
  const nextBtn = document.querySelector('[data-reel-next]');
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const canHover = window.matchMedia('(hover: hover)').matches;

  const SPEED = reduceMotion ? 0 : 32;   // drift speed, pixels per second (slow and calm)
  const RESUME_AFTER = 1800;             // ms to wait after you stop before drifting again

  // repeat the set so the strip can loop without a visible jump
  [...track.children].forEach(card => {
    const copy = card.cloneNode(true);
    copy.setAttribute('aria-hidden', 'true');
    copy.removeAttribute('tabindex');
    copy.querySelectorAll('img').forEach(img => { img.alt = ''; });
    track.appendChild(copy);
  });

  let x = 0;            // current offset of the strip (px, negative = moved left)
  let loopW = 1;        // width of one full set of five cards
  let step = 300;       // width of one card plus its gap
  let v = 0;            // current drift speed (eases up and down)
  let hovering = false, dragging = false, holdUntil = 0, focused = false;
  let fling = 0;        // leftover speed after a flick
  let tween = null;     // smooth glide started by the arrows

  function measure() {
    const cards = track.children;
    loopW = track.scrollWidth / 2 || 1;
    step = (cards[1].offsetLeft - cards[0].offsetLeft) || 300;
  }
  measure();
  window.addEventListener('resize', measure);

  // fit each highlight into at most 3 lines by easing its size down (never cutting words)
  const MAX_HL = 22.4, MIN_HL = 15, MAX_LINES = 3;   // below 15px gets hard to read, so a very long highlight may use a 4th line on narrow cards
  function fitHighlights() {
    track.querySelectorAll('.mcard__hl-quote').forEach(q => {
      let size = MAX_HL;
      q.style.setProperty('--hl-size', `${size}px`);
      while (size > MIN_HL && q.offsetHeight / (size * 1.3) > MAX_LINES + 0.2) {
        size -= 0.5;
        q.style.setProperty('--hl-size', `${size}px`);
      }
    });
    measure();
  }
  fitHighlights();
  if (document.fonts) document.fonts.ready.then(fitHighlights);
  let fitTimer;
  window.addEventListener('resize', () => { clearTimeout(fitTimer); fitTimer = setTimeout(fitHighlights, 150); });
  track.querySelectorAll('img').forEach(img => img.addEventListener('load', measure, { once: true }));

  const wrap = n => ((n % loopW) - loopW) % loopW;          // keep x within one loop, always ≤ 0
  const render = () => { track.style.transform = `translate3d(${wrap(x).toFixed(2)}px, 0, 0)`; };
  const hold = (ms = RESUME_AFTER) => { holdUntil = performance.now() + ms; };
  const paused = now => hovering || dragging || focused || tween || now < holdUntil || reel.classList.contains('has-active');

  /* ---------- the animation loop ---------- */
  let last = performance.now();
  let visible = true;
  function frame(now) {
    const dt = Math.min((now - last) / 1000, 0.05);
    last = now;
    if (tween) {
      const t = Math.min(1, (now - tween.start) / tween.dur);
      const e = 1 - Math.pow(1 - t, 3);                       // ease out
      x = tween.from + (tween.to - tween.from) * e;
      if (t >= 1) { tween = null; x = wrap(x); hold(); }
    } else if (!dragging) {
      const goal = paused(now) ? 0 : SPEED;
      v += (goal - v) * Math.min(1, dt * 2.2);               // smooth start and stop
      x -= v * dt;
      if (Math.abs(fling) > 5) { x += fling * dt; fling *= Math.exp(-dt * 3.5); } else fling = 0;
    }
    render();
    if (visible) requestAnimationFrame(frame);
  }
  // only run while the strip is on screen
  new IntersectionObserver(([entry]) => {
    const was = visible;
    visible = entry.isIntersecting;
    if (visible && !was) { last = performance.now(); requestAnimationFrame(frame); }
  }).observe(reel);
  reel.classList.add('is-moving');
  requestAnimationFrame(frame);

  /* ---------- arrows ---------- */
  function go(dir) {
    measure();
    const from = tween ? tween.to : x;
    // snap to the nearest card edge, then move one card
    const snapped = Math.round(from / step) * step;
    const to = snapped - dir * step;
    fling = 0;
    if (reduceMotion) { x = wrap(to); hold(); return; }
    tween = { from: x, to, start: performance.now(), dur: 650 };
  }
  prevBtn?.addEventListener('click', () => go(-1));
  nextBtn?.addEventListener('click', () => go(1));
  reel.addEventListener('keydown', e => {
    if (e.key === 'ArrowLeft') { e.preventDefault(); go(-1); }
    if (e.key === 'ArrowRight') { e.preventDefault(); go(1); }
  });

  /* ---------- hover pause (mouse) ---------- */
  reel.addEventListener('pointerenter', e => { if (e.pointerType === 'mouse') hovering = true; });
  reel.addEventListener('pointerleave', e => { if (e.pointerType === 'mouse') { hovering = false; hold(600); } });
  reel.addEventListener('focusin', () => { focused = true; });
  reel.addEventListener('focusout', () => { focused = false; hold(600); });

  /* ---------- drag ---------- */
  let startX = 0, lastX = 0, lastT = 0, moved = false, pointerId = null, vel = 0;
  reel.addEventListener('pointerdown', e => {
    if (e.button !== 0 || e.target.closest('button')) return;
    pointerId = e.pointerId;
    startX = lastX = e.clientX; lastT = performance.now();
    moved = false; vel = 0; fling = 0; tween = null;
  });
  reel.addEventListener('pointermove', e => {
    if (e.pointerId !== pointerId) return;
    const dx = e.clientX - lastX;
    if (!moved && Math.abs(e.clientX - startX) > 5) {
      moved = true; dragging = true;
      reel.classList.add('is-dragging');
      try { reel.setPointerCapture(pointerId); } catch {}
    }
    if (!moved) return;
    const now = performance.now();
    x += dx;
    vel = 0.8 * vel + 0.2 * (dx / Math.max(1, now - lastT)) * 1000;   // px per second, smoothed
    lastX = e.clientX; lastT = now;
  });
  const endDrag = e => {
    if (e.pointerId !== pointerId) return;
    pointerId = null;
    if (!moved) return;
    dragging = false;
    reel.classList.remove('is-dragging');
    if (!reduceMotion) fling = Math.max(-2400, Math.min(2400, vel));  // a flick keeps gliding briefly
    hold();
    // a drag should never count as a click on a card
    reel.addEventListener('click', ev => { ev.stopPropagation(); ev.preventDefault(); }, { capture: true, once: true });
  };
  reel.addEventListener('pointerup', endDrag);
  reel.addEventListener('pointercancel', endDrag);

  /* ---------- tap a card (touch screens) ----------
     Tap the photo: bring the card forward (full-colour photo).
     Tap the text:  also open the full testimony.
     Tap the same part again (or anywhere else) to close. */
  const clear = () => {
    reel.classList.remove('has-active');
    track.querySelectorAll('.mcard.is-active, .mcard.is-open').forEach(c => c.classList.remove('is-active', 'is-open'));
  };
  reel.addEventListener('click', e => {
    const card = e.target.closest('.mcard');
    if (!card || canHover) return;
    const onText = !!e.target.closest('.mcard__body');
    const wasActive = card.classList.contains('is-active');
    const wasOpen = card.classList.contains('is-open');
    clear();
    if (onText && !wasOpen) {
      card.classList.add('is-active', 'is-open'); reel.classList.add('has-active'); hold(4000);
    } else if (!onText && !wasActive) {
      card.classList.add('is-active'); reel.classList.add('has-active'); hold(4000);
    } else {
      hold(800);
    }
  });
  document.addEventListener('click', e => { if (!reel.contains(e.target)) clear(); });
})();
