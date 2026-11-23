/* =========================================================
   MADAM — Safe Space: the Freedom Wall
   1. Press the + button      -> a sticky note opens in a modal
   2. Write it, pick colors   -> "Ready to pin"
   3. Drag it anywhere on the board -> "Pin it here"
   Every note keeps the spot its writer chose, for everyone.
   ========================================================= */

(() => {
  const MAX = 300;
  const MAX_ON_BOARD = 80;          // most recent notes shown on the board
  const COOLDOWN_MS = 30 * 1000;    // one note every 30 seconds per browser

  // The board has its own coordinate system (1200 × 800 units) so a note
  // stays in the same spot on every screen size; it is scaled to fit.
  const BOARD_W = 1200, BOARD_H = 800;
  const NOTE_W = 190, NOTE_H = 215;
  const MIN_SCALE = 0.55;           // below this the board scrolls sideways (phones)

  /* Options the visitor can choose. Only these keys are saved, so nobody
     can inject their own colors or code into the board. */
  const FEELINGS = {
    happy:     { icon: 'ph-smiley',         label: 'Happy' },
    empowered: { icon: 'ph-hand-fist',      label: 'Empowered' },
    hopeful:   { icon: 'ph-plant',          label: 'Hopeful' },
    grateful:  { icon: 'ph-hand-heart',     label: 'Grateful' },
    sad:       { icon: 'ph-smiley-sad',     label: 'Sad' },
    angry:     { icon: 'ph-smiley-angry',   label: 'Angry' },
    anxious:   { icon: 'ph-smiley-nervous', label: 'Anxious' },
    tired:     { icon: 'ph-smiley-meh',     label: 'Tired' },
  };
  // soft pastel papers and muted pins (keys stay the same, so saved notes still work)
  const PAPERS = {
    yellow: '#FBE6A2', pink: '#F8CFC4', mint: '#CDE9DF', sky: '#D2E3F4',
    lavender: '#E7D6EE', peach: '#FAD8B6', white: '#FFFFFF',
  };
  const PINS = {
    red: '#D9694F', blue: '#4F78B8', green: '#2E8378',
    yellow: '#F4B942', purple: '#8B4C8C', black: '#3A2D27',
  };
  const REACTIONS = {
    feel:   { icon: 'ph-heart',     label: 'I feel you' },
    same:   { icon: 'ph-handshake', label: 'Same here' },
    strong: { icon: 'ph-plant',     label: 'Stay strong' },
  };
  const ic = name => `<i class="ph-light ${name}"></i>`;

  /* --- Basic safety filters (add more words as needed) --- */
  // offensive words are checked by MadamFilter (js/filter.js)
  const CRISIS_WORDS = [
    'suicide', 'kill myself', 'want to die', 'end my life', 'self harm', 'self-harm',
    'hurt myself', 'cutting', 'abuse', 'abused', 'rape', 'raped', 'assault',
    'beats me', 'hits me', 'hit me', 'magpakamatay', 'mamatay na lang',
  ];
  const PERSONAL_INFO = [
    /\b(\+?63|0)9\d{2}[\s-]?\d{3}[\s-]?\d{4}\b/,   // PH mobile numbers
    /\b\d{3}[\s-]?\d{3,4}[\s-]?\d{4}\b/,           // generic phone numbers
    /[\w.+-]+@[\w-]+\.[\w.]+/,                     // emails
    /(https?:\/\/|www\.)\S+/i,                     // links
    /@\w{3,}/,                                     // social handles
  ];

  const $ = id => document.getElementById(id);
  const wrap = $('board-wrap'), stage = $('board-stage'), canvas = $('board-canvas'), notesLayer = $('notes');
  const editorModal = $('editor-modal'), viewModal = $('view-modal');
  const textarea = $('note-text'), counter = $('counter'), msg = $('note-msg');
  const editorNote = $('editor-note'), editorFeel = $('editor-feel');
  const pinBar = $('pin-bar');

  const choice = { feeling: null, paper: 'yellow', pin: 'red' };
  let scale = 1;
  let notes = [];
  let activeFilter = 'all';
  let draft = null;                 // { el, x, y, data } while placing a note
  let pendingHighlight = null;
  let lastFocus = null;

  const lsGet = (k, fallback) => { try { return JSON.parse(localStorage.getItem(k)) ?? fallback; } catch { return fallback; } };
  const lsSet = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} };
  let myReactions = lsGet('madam_my_reactions', {});

  const hasAny = (text, list) => list.some(w => new RegExp(`\\b${w}\\b`, 'i').test(text));
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  const clampX = x => clamp(x, 8, BOARD_W - NOTE_W - 8);
  const clampY = y => clamp(y, 22, BOARD_H - NOTE_H - 8);

  const hash = id => { let h = 0; for (const ch of String(id)) h = (h * 31 + ch.charCodeAt(0)) | 0; return Math.abs(h); };
  const tiltFor = id => ((hash(id) % 9) - 4) * 0.9;
  // notes without a saved spot get a stable spot from their id
  const spotFor = n => ({
    x: Number.isFinite(n.x) ? clampX(n.x) : clampX(hash(n.id) % BOARD_W),
    y: Number.isFinite(n.y) ? clampY(n.y) : clampY((hash(n.id) >> 8) % BOARD_H),
  });

  /* =========================================================
     Board scaling
     ========================================================= */
  function layout() {
    scale = clamp(wrap.clientWidth / BOARD_W, MIN_SCALE, 1.25);   // grows a little on wide screens
    stage.style.width = `${BOARD_W * scale}px`;
    stage.style.height = `${BOARD_H * scale}px`;
    canvas.style.transform = `scale(${scale})`;
  }
  window.addEventListener('resize', layout);
  layout();

  /* =========================================================
     Note markup
     ========================================================= */
  function noteHTML(n, mode) {
    const f = FEELINGS[n.mood] || { icon: 'ph-chat-circle', label: 'A note' };
    const id = escapeHTML(n.id || 'draft');
    const style = `--paper:${PAPERS[n.paper] || PAPERS.yellow};--pin:${PINS[n.pin] || PINS.red};--tilt:${tiltFor(n.id || 'draft')}deg`;
    const reacts = n.reacts || {};
    const total = Object.values(reacts).reduce((a, b) => a + (b || 0), 0);

    if (mode === 'board') {
      const { x, y } = spotFor(n);
      const faded = activeFilter !== 'all' && n.mood !== activeFilter ? ' faded' : '';
      return `
        <article class="sticky${faded}" data-id="${id}" tabindex="0" role="button"
          aria-label="Read note: ${escapeHTML(f.label)}" style="${style};left:${x}px;top:${y}px">
          <span class="pin"></span>
          <div class="sticky__feel">${ic(f.icon)} ${f.label}</div>
          <p class="sticky__text">${escapeHTML(n.text)}</p>
          <div class="sticky__foot"><span>${timeAgo(n.createdAt)}</span><span>${total ? `${ic('ph-heart')} ${total}` : ''}</span></div>
        </article>`;
    }

    // full note in the reading modal
    const mine = myReactions[n.id] || [];
    return `
      <article class="sticky note-view" style="${style}">
        <span class="pin"></span>
        <div class="sticky__feel">${ic(f.icon)} ${f.label}</div>
        <p class="sticky__text">${escapeHTML(n.text)}</p>
        <div class="sticky__foot" style="margin-bottom:12px"><span>Anonymous · ${timeAgo(n.createdAt)}</span></div>
        <div class="reacts">
          ${Object.entries(REACTIONS).map(([k, r]) => {
            const done = mine.includes(k);
            return `<button class="react ${done ? 'done' : ''}" data-id="${id}" data-react="${k}"
              ${done ? 'disabled' : ''}>${ic(r.icon)} ${r.label} · <b>${reacts[k] || 0}</b></button>`;
          }).join('')}
        </div>
      </article>`;
  }

  /* =========================================================
     Render the board
     ========================================================= */
  function render() {
    $('note-count').textContent = notes.length.toLocaleString();
    $('note-word').textContent = notes.length === 1 ? 'note' : 'notes';
    $('empty').classList.toggle('hidden', notes.length > 0 || !!draft);

    // oldest first, so the newest notes sit on top
    // never show offensive notes, even if one got into the database some other way
    const onBoard = notes.filter(n => !MadamFilter.isOffensive(n.text)).slice(0, MAX_ON_BOARD).reverse();
    notesLayer.innerHTML = onBoard.map(n => noteHTML(n, 'board')).join('');
    highlight();
  }

  function highlight() {
    if (!pendingHighlight) return;
    const el = notesLayer.querySelector(`[data-id="${CSS.escape(pendingHighlight)}"]`);
    if (!el) return;
    pendingHighlight = null;
    el.classList.add('just-pinned');
    showToast('Your note is pinned. Thank you for sharing.', 'ph-push-pin');
  }

  /* =========================================================
     Modals
     ========================================================= */
  function openModal(modal, focusEl) {
    lastFocus = document.activeElement;
    modal.classList.remove('hidden');
    document.body.classList.add('modal-open');
    (focusEl || modal.querySelector('[data-close]')).focus();
  }
  function closeModal(modal) {
    modal.classList.add('hidden');
    if (editorModal.classList.contains('hidden') && viewModal.classList.contains('hidden')) {
      document.body.classList.remove('modal-open');
    }
    if (lastFocus) lastFocus.focus({ preventScroll: true });
  }
  [editorModal, viewModal].forEach(modal => {
    modal.addEventListener('click', e => {
      if (e.target === modal || e.target.closest('[data-close]')) closeModal(modal);
    });
  });
  document.addEventListener('keydown', e => {
    if (e.key !== 'Escape') return;
    if (!editorModal.classList.contains('hidden')) closeModal(editorModal);
    else if (!viewModal.classList.contains('hidden')) closeModal(viewModal);
  });

  /* =========================================================
     Step 1 — the note editor modal
     ========================================================= */
  $('feelings').innerHTML = Object.entries(FEELINGS).map(([k, f]) =>
    `<button type="button" class="chip" data-feeling="${k}" role="radio" aria-checked="false">${ic(f.icon)} ${f.label}</button>`).join('');
  $('papers').innerHTML = Object.entries(PAPERS).map(([k, c]) =>
    `<button type="button" class="swatch" data-paper="${k}" style="--c:${c}" role="radio" aria-label="${k} note" title="${k}"></button>`).join('');
  $('pins').innerHTML = Object.entries(PINS).map(([k, c]) =>
    `<button type="button" class="swatch swatch--pin" data-pin="${k}" style="--c:${c}" role="radio" aria-label="${k} pin" title="${k}"></button>`).join('');
  $('filters').innerHTML = `<button class="chip selected" data-filter="all">All</button>` +
    Object.entries(FEELINGS).map(([k, f]) => `<button class="chip" data-filter="${k}" title="${f.label}" aria-label="${f.label}">${ic(f.icon)}</button>`).join('');

  function selectIn(container, attr, value) {
    container.querySelectorAll(`[data-${attr}]`).forEach(b => {
      const on = b.dataset[attr] === value;
      b.classList.toggle('selected', on);
      b.setAttribute('aria-checked', on);
    });
  }

  function updateEditor() {
    const f = FEELINGS[choice.feeling];
    editorFeel.innerHTML = f ? `${ic(f.icon)} ${f.label}` : 'Pick a feeling';
    editorNote.style.setProperty('--paper', PAPERS[choice.paper]);
    editorNote.style.setProperty('--pin', PINS[choice.pin]);
    const len = textarea.value.length;
    counter.textContent = `${len} / ${MAX}`;
    counter.classList.toggle('warn', len > MAX - 30);
  }

  $('feelings').addEventListener('click', e => {
    const b = e.target.closest('[data-feeling]'); if (!b) return;
    choice.feeling = b.dataset.feeling; selectIn($('feelings'), 'feeling', choice.feeling); updateEditor();
  });
  $('papers').addEventListener('click', e => {
    const b = e.target.closest('[data-paper]'); if (!b) return;
    choice.paper = b.dataset.paper; selectIn($('papers'), 'paper', choice.paper); updateEditor();
  });
  $('pins').addEventListener('click', e => {
    const b = e.target.closest('[data-pin]'); if (!b) return;
    choice.pin = b.dataset.pin; selectIn($('pins'), 'pin', choice.pin); updateEditor();
  });
  textarea.addEventListener('input', updateEditor);

  function resetEditor() {
    textarea.value = '';
    choice.feeling = null;
    selectIn($('feelings'), 'feeling', null);
    msg.textContent = '';
    updateEditor();
  }

  $('add-note').addEventListener('click', () => {
    if (draft) { msg.textContent = ''; }
    openModal(editorModal, textarea);
  });

  selectIn($('papers'), 'paper', choice.paper);
  selectIn($('pins'), 'pin', choice.pin);
  updateEditor();

  // validate, then move on to placing the note
  $('ready').addEventListener('click', () => {
    const text = textarea.value.trim();
    msg.className = 'form__msg err';
    if (text.length < 3) { msg.textContent = 'Please write a little more first.'; return; }
    if (!choice.feeling) { msg.textContent = 'Please choose how you are feeling.'; return; }
    if (MadamFilter.isOffensive(text)) {
      msg.textContent = "Your note can't be pinned because it has offensive words. Please keep the wall kind and try rephrasing.";
      return;
    }
    if (PERSONAL_INFO.some(r => r.test(text))) {
      msg.textContent = 'For your safety, please remove phone numbers, emails, links, or @handles.';
      return;
    }
    const last = lsGet('madam_last_note', 0);
    if (Date.now() - last < COOLDOWN_MS) {
      msg.textContent = `Take a breath. You can pin another note in ${Math.ceil((COOLDOWN_MS - (Date.now() - last)) / 1000)} seconds.`;
      return;
    }
    msg.textContent = '';
    closeModal(editorModal);
    startDraft({ text: text.slice(0, MAX), mood: choice.feeling, paper: choice.paper, pin: choice.pin });
  });

  /* =========================================================
     Step 2 — drag the note to its spot
     ========================================================= */
  function placeDraft() {
    draft.el.style.left = `${draft.x}px`;
    draft.el.style.top = `${draft.y}px`;
  }

  function startDraft(data) {
    if (!draft) {
      const el = document.createElement('article');
      el.className = 'sticky draft';
      canvas.appendChild(el);

      // start in the middle of the part of the board you can see
      const visibleCenter = (wrap.scrollLeft + wrap.clientWidth / 2) / scale;
      draft = { el, x: clampX(visibleCenter - NOTE_W / 2), y: clampY(BOARD_H / 2 - NOTE_H / 2) };
      enableDrag(el);
    }
    draft.data = data;
    const f = FEELINGS[data.mood];
    draft.el.style.setProperty('--paper', PAPERS[data.paper]);
    draft.el.style.setProperty('--pin', PINS[data.pin]);
    draft.el.innerHTML = `
      <span class="pin"></span>
      <div class="sticky__feel">${ic(f.icon)} ${f.label}</div>
      <p class="sticky__text">${escapeHTML(data.text)}</p>
      <div class="sticky__foot"><span>not pinned yet</span></div>`;
    placeDraft();
    $('empty').classList.add('hidden');
    pinBar.classList.remove('hidden');
    wrap.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  function enableDrag(el) {
    let start = null;
    el.addEventListener('pointerdown', e => {
      e.preventDefault();
      try { el.setPointerCapture(e.pointerId); } catch { /* some browsers refuse; dragging still works */ }
      start = { px: e.clientX, py: e.clientY, x: draft.x, y: draft.y };
      el.classList.add('grabbing');
    });
    el.addEventListener('pointermove', e => {
      if (!start) return;
      draft.x = clampX(start.x + (e.clientX - start.px) / scale);
      draft.y = clampY(start.y + (e.clientY - start.py) / scale);
      placeDraft();
    });
    const stop = () => { start = null; el.classList.remove('grabbing'); };
    el.addEventListener('pointerup', stop);
    el.addEventListener('pointercancel', stop);

    // keyboard users can move the note with the arrow keys
    el.tabIndex = 0;
    el.setAttribute('aria-label', 'Your note. Use the arrow keys to move it, Enter to pin it.');
    el.addEventListener('keydown', e => {
      const step = e.shiftKey ? 50 : 15;
      const moves = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] };
      if (moves[e.key]) {
        e.preventDefault();
        draft.x = clampX(draft.x + moves[e.key][0]);
        draft.y = clampY(draft.y + moves[e.key][1]);
        placeDraft();
      } else if (e.key === 'Enter') {
        pinDraft();
      }
    });
  }

  function cancelDraft() {
    if (!draft) return;
    draft.el.remove();
    draft = null;
    pinBar.classList.add('hidden');
    render();
  }

  $('draft-edit').addEventListener('click', () => openModal(editorModal, textarea));
  $('draft-cancel').addEventListener('click', () => { cancelDraft(); resetEditor(); });
  $('draft-pin').addEventListener('click', () => pinDraft());

  /* =========================================================
     Step 3 — pin it!
     ========================================================= */
  async function pinDraft() {
    if (!draft) return;
    if (MadamFilter.isOffensive(draft.data.text)) {       // safety net: never pin offensive notes
      openModal(editorModal, textarea);
      msg.className = 'form__msg err';
      msg.textContent = "Your note can't be pinned because it has offensive words. Please keep the wall kind and try rephrasing.";
      return;
    }
    const btn = $('draft-pin');
    btn.disabled = true;
    const { data, x, y } = draft;
    try {
      const id = await Store.add('notes', {
        ...data,
        x: Math.round(x),
        y: Math.round(y),
        reacts: { feel: 0, same: 0, strong: 0 },
      });
      lsSet('madam_last_note', Date.now());
      $('crisis').classList.toggle('hidden', !hasAny(data.text, CRISIS_WORDS));
      draft.el.remove();
      draft = null;
      pinBar.classList.add('hidden');
      resetEditor();
      pendingHighlight = id;
      render();
    } catch (err) {
      console.error(err);
      alert('Something went wrong while pinning. Please try again.');
    } finally {
      btn.disabled = false;
    }
  }

  /* =========================================================
     Board clicks: read a note, or move your draft there
     ========================================================= */
  canvas.addEventListener('click', e => {
    if (draft) {
      if (draft.el.contains(e.target)) return;
      const r = canvas.getBoundingClientRect();
      draft.x = clampX((e.clientX - r.left) / scale - NOTE_W / 2);
      draft.y = clampY((e.clientY - r.top) / scale - 40);
      placeDraft();
      return;
    }
    const noteEl = e.target.closest('.sticky[data-id]');
    if (noteEl) openView(noteEl.dataset.id);
  });
  notesLayer.addEventListener('keydown', e => {
    if ((e.key === 'Enter' || e.key === ' ') && e.target.matches('.sticky[data-id]') && !draft) {
      e.preventDefault();
      openView(e.target.dataset.id);
    }
  });

  function openView(id) {
    const n = notes.find(x => x.id === id);
    if (!n) return;
    $('view-inner').innerHTML = noteHTML(n, 'view');
    openModal(viewModal);
  }

  viewModal.addEventListener('click', async e => {
    const btn = e.target.closest('.react');
    if (!btn || btn.disabled) return;
    const { id, react } = btn.dataset;
    myReactions[id] = [...(myReactions[id] || []), react];
    lsSet('madam_my_reactions', myReactions);
    btn.disabled = true;
    btn.classList.add('done');
    const b = btn.querySelector('b');
    b.textContent = Number(b.textContent) + 1;
    try { await Store.react('notes', id, react); } catch (err) { console.error(err); }
  });

  /* =========================================================
     Feeling filter: highlights matching notes, fades the rest
     ========================================================= */
  $('filters').addEventListener('click', e => {
    const b = e.target.closest('[data-filter]'); if (!b) return;
    activeFilter = b.dataset.filter;
    selectIn($('filters'), 'filter', activeFilter);
    render();
  });

  // refresh "x minutes ago" labels every minute
  setInterval(render, 60 * 1000);

  Store.subscribe('notes', items => { notes = items; render(); }, 300);
})();
