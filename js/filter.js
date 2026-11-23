/* =========================================================
   MADAM — offensive word filter for the Freedom Wall
   isOffensive(text) -> true if the note contains swear words,
   slurs or sexual insults (English and Filipino).

   It also catches common tricks people use to sneak words in:
     f*ck, sh1t, $hit, b!tch      (symbols / numbers for letters)
     fuuuuck, shiiit               (stretched letters)
     f u c k, f.u.c.k              (spaced-out letters)
     tang ina, putang ina          (split words)
   To add more words, put them in one of the lists below
   (lowercase, letters only).

   Deliberately NOT blocked: words people use to describe themselves (e.g. bakla,
   tomboy) and words someone may need to describe what happened to them (e.g. rape)
   — this is a safe space, and the crisis message watches for those instead.
   ========================================================= */

const MadamFilter = (() => {
  // A word is blocked if it matches exactly, or with a common ending (s, es, ed, er, ing, in, y)
  const WORDS = [
    // English swear words and insults
    'fuck', 'fuk', 'fck', 'fuq', 'shit', 'sht', 'bitch', 'biatch', 'bastard', 'asshole', 'ass',
    'arsehole', 'dick', 'dickhead', 'cock', 'cunt', 'pussy', 'prick', 'twat', 'wanker', 'bollocks',
    'slut', 'whore', 'hoe', 'skank', 'douche', 'douchebag', 'jackass', 'dumbass', 'bullshit',
    'motherfucker', 'mf', 'wtf', 'stfu', 'boobs', 'tits', 'retard', 'retarded',
    // slurs (blocked so no one is targeted on the wall)
    'fag', 'faggot', 'dyke', 'tranny', 'shemale', 'nigger', 'nigga', 'chink', 'spic', 'kike',
    // Filipino / Tagalog
    'putangina', 'putanginamo', 'tangina', 'tanginamo', 'tanginaka', 'puta', 'putang', 'pota',
    'potangina', 'gago', 'gaga', 'gagu', 'bobo', 'boba', 'tanga', 'ulol', 'olol', 'tarantado',
    'tarantada', 'leche', 'letse', 'lintik', 'punyeta', 'pakyu', 'pakshet', 'kupal', 'inutil',
    'siraulo', 'hinayupak', 'kantot', 'kantutan', 'jakol', 'chupa',
    'titi', 'tite', 'puke', 'pekpek', 'burat', 'pokpok', 'malandi', 'shunga', 'engot', 'pakingshet',
  ];
  // Roots that are offensive anywhere inside a word (safe to match as a prefix)
  const ROOTS = ['fuck', 'motherfuck', 'shit', 'bitch', 'cunt', 'faggot', 'nigg', 'putangin', 'tangin', 'kantot'];
  // more compound swears
  WORDS.push('dipshit', 'batshit', 'apeshit', 'horseshit', 'clusterfuck', 'shithead', 'shitty');

  const ENDINGS = ['', 's', 'es', 'ed', 'er', 'ers', 'ing', 'in', 'y'];
  const LEET = { '@': 'a', '4': 'a', '8': 'b', '(': 'c', '3': 'e', '6': 'g', '1': 'i', '!': 'i', '|': 'i', '0': 'o', '5': 's', '$': 's', '7': 't', '+': 't', '2': 'z' };
  // ordinary words that happen to contain a blocked word
  const ALLOW = new Set(['shitake', 'shiitake', 'scunthorpe', 'cocktail', 'cockpit', 'peacock', 'hancock', 'dickens', 'assess', 'assist', 'assume', 'class', 'pass', 'grass', 'bass', 'mass', 'glass', 'brass', 'potato', 'putative']);

  // collapse stretched letters: "fuuuuck" -> "fuck" (3+ repeats), or every double letter (for roots)
  const squash3 = s => s.replace(/(.)\1{2,}/g, '$1');
  const squash2 = s => s.replace(/(.)\1+/g, '$1');

  const wordSet = new Set();
  WORDS.forEach(w => ENDINGS.forEach(e => wordSet.add(w + e)));
  const roots = ROOTS.map(squash2);

  function normalizeToken(t) {
    let s = t.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
    s = s.replace(/!+$/, '');                    // "shit!" -> "shit" (but "b!tch" keeps its !)
    s = s.replace(/[@4813!|0$5762+(]/g, ch => LEET[ch] || ch);
    s = s.replace(/[*#%^&]/g, '*');            // masks like f*ck / sh*t
    return s;
  }

  // exact = only whole known words (used when joining two words, to avoid false alarms)
  function isBadToken(raw, exact = false) {
    if (!raw) return false;
    const letters = squash3(normalizeToken(raw).replace(/[^a-z*]/g, ''));
    if (!letters || ALLOW.has(letters)) return false;
    if (letters.includes('*')) {                 // f*ck, sh*t, b*tch …
      const re = new RegExp('^' + letters.replace(/\*/g, '[a-z]?') + '$');
      return [...wordSet].some(w => w.length > 2 && re.test(w));
    }
    if (wordSet.has(letters)) return true;
    if (exact) return false;
    const tight = squash2(letters);            // "fuuck", "shiit"
    if (wordSet.has(tight) && tight.length >= 4) return true;
    return roots.some(r => tight.startsWith(r) || (r.length >= 5 && tight.includes(r)));
  }

  function isOffensive(text) {
    if (!text) return false;
    const str = String(text);
    const tokens = str.split(/[\s,.;:?"'()\[\]{}\/\-]+/).filter(Boolean);

    // 1) each word on its own
    if (tokens.some(t => isBadToken(t))) return true;

    // 2) spaced-out letters: "f u c k", "f.u.c.k"
    let run = '';
    for (const t of str.split(/[\s.\-_]+/)) {
      if (t.length === 1) { run += t; continue; }
      if (run.length >= 3 && isBadToken(run)) return true;
      run = '';
    }
    if (run.length >= 3 && isBadToken(run)) return true;

    // 3) words split in two: "tang ina", "putang ina", "pak shet"
    for (let i = 0; i < tokens.length - 1; i++) {
      if (isBadToken(tokens[i] + tokens[i + 1], true)) return true;
    }
    return false;
  }

  return { isOffensive };
})();
