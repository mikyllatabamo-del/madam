/* =========================================================
   MADAM — tiny data layer
   Uses Firebase Firestore (shared with everyone) when
   js/firebase-config.js is filled in. Otherwise falls back
   to localStorage (only this browser sees the data).

   API
     await Store.ready
     Store.mode                       -> 'firebase' | 'local'
     Store.add(collection, data)      -> Promise<new id>
     Store.subscribe(collection, cb)  -> cb(items[]) live updates, newest first
     Store.react(collection, id, key) -> adds +1 to item.reacts[key]
   ========================================================= */

const FIREBASE_VERSION = '10.12.2';

const Store = (() => {
  const cfg = window.MADAM_FIREBASE_CONFIG || {};
  const configured = cfg.apiKey && cfg.apiKey !== 'PASTE_HERE' && cfg.projectId && cfg.projectId !== 'PASTE_HERE';

  let db = null;
  const api = { mode: configured ? 'firebase' : 'local' };

  const loadScript = src => new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = src;
    s.onload = resolve;
    s.onerror = () => reject(new Error('Could not load ' + src));
    document.head.appendChild(s);
  });

  /* ---------- Firebase mode ---------- */
  async function initFirebase() {
    const base = `https://www.gstatic.com/firebasejs/${FIREBASE_VERSION}`;
    await loadScript(`${base}/firebase-app-compat.js`);
    await loadScript(`${base}/firebase-firestore-compat.js`);
    firebase.initializeApp(cfg);
    db = firebase.firestore();
  }

  const toMillis = ts => (ts && typeof ts.toMillis === 'function') ? ts.toMillis() : Date.now();

  /* ---------- Local mode ---------- */
  const key = c => `madam_${c}`;
  const readLocal = c => {
    try { return JSON.parse(localStorage.getItem(key(c))) || []; } catch { return []; }
  };
  const writeLocal = (c, items) => {
    try { localStorage.setItem(key(c), JSON.stringify(items)); } catch { /* storage blocked */ }
    window.dispatchEvent(new CustomEvent('madam-store', { detail: c }));
  };

  /* Fresh start: when WALL_VERSION changes, every browser clears its saved notes
     (and reactions) once, so the wall looks good as new. To wipe the wall again
     later, just change this number. (This only clears notes saved in browsers;
     notes in Firebase are deleted from the Firebase console.) */
  const WALL_VERSION = '2';
  try {
    if (localStorage.getItem('madam_wall_version') !== WALL_VERSION) {
      ['madam_notes', 'madam_my_reactions', 'madam_last_note'].forEach(k => localStorage.removeItem(k));
      localStorage.setItem('madam_wall_version', WALL_VERSION);
    }
  } catch { /* storage blocked: nothing saved to clear */ }

  api.ready = (configured ? initFirebase() : Promise.resolve()).catch(err => {
    console.warn('[MADAM] Firebase unavailable, using local mode.', err);
    api.mode = 'local';
  });

  api.add = async (collection, data) => {
    await api.ready;
    if (api.mode === 'firebase') {
      const ref = await db.collection(collection).add({
        ...data,
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      });
      return ref.id;
    }
    const items = readLocal(collection);
    const id = 'l' + Date.now() + Math.random().toString(36).slice(2, 7);
    items.unshift({ id, ...data, createdAt: Date.now() });
    writeLocal(collection, items.slice(0, 500));
    return id;
  };

  api.subscribe = async (collection, cb, limit = 200) => {
    await api.ready;
    if (api.mode === 'firebase') {
      return db.collection(collection)
        .orderBy('createdAt', 'desc')
        .limit(limit)
        .onSnapshot(snap => {
          cb(snap.docs.map(d => ({ id: d.id, ...d.data(), createdAt: toMillis(d.data().createdAt) })));
        }, err => console.error('[MADAM] read failed', err));
    }
    const emit = () => cb(readLocal(collection).slice(0, limit));
    window.addEventListener('madam-store', e => { if (e.detail === collection) emit(); });
    window.addEventListener('storage', e => { if (e.key === key(collection)) emit(); });
    emit();
  };

  api.react = async (collection, id, reactKey) => {
    await api.ready;
    if (api.mode === 'firebase') {
      return db.collection(collection).doc(id).update({
        [`reacts.${reactKey}`]: firebase.firestore.FieldValue.increment(1),
      });
    }
    const items = readLocal(collection);
    const item = items.find(i => i.id === id);
    if (!item) return;
    item.reacts = item.reacts || {};
    item.reacts[reactKey] = (item.reacts[reactKey] || 0) + 1;
    writeLocal(collection, items);
  };

  return api;
})();
