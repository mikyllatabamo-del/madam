/* =========================================================
   MADAM — shared behaviour for every page
   - injects the navigation bar and footer (so they live in one place)
   - mobile menu toggle
   - scroll-reveal animations
   - animated number counters
   ========================================================= */

const PAGES = [
  { href: 'index.html',     label: 'Home' },
  { href: 'about.html',     label: 'About' },
  { href: 'issue.html',     label: 'The Issue' },
  { href: 'index.html#safe-space', label: 'Safe Space' },
  { href: 'resources.html', label: 'Resources' },
];

function currentPage() {
  const file = location.pathname.split('/').pop();
  return file === '' ? 'index.html' : file;
}

function buildNav() {
  const holder = document.getElementById('nav');
  if (!holder) return;
  const here = currentPage();
  const solid = holder.dataset.solid === 'true' ? ' nav--solid' : '';

  // the wall gets its own button on the right, so it's left out of the centered links
  const navPages = PAGES.filter(p => !p.href.includes('#safe-space'));
  const WALL = 'index.html#safe-space';

  holder.outerHTML = `
    <header class="nav${solid}" id="site-nav">
      <div class="container nav__inner">
        <a class="logo" href="index.html" aria-label="MADAM home"><img class="logo__mark" src="assets/logo.svg" alt="" width="46" height="30"><span class="logo__word">MAD<span>A</span>M</span></a>
        <ul class="nav__links">
          ${navPages.map(p => `<li><a href="${p.href}" class="${p.href === here ? 'active' : ''}">${p.label}</a></li>`).join('')}
          <li class="nav__menu-cta"><a href="${WALL}">Write on the wall</a></li>
        </ul>
        <div class="nav__end">
          <a class="btn btn--solid nav__cta" href="${WALL}">Write on the wall</a>
          <button class="nav__toggle" aria-label="Open menu" aria-expanded="false"><i class="ph-light ph-list"></i></button>
        </div>
      </div>
    </header>`;

  const nav = document.getElementById('site-nav');
  const toggle = nav.querySelector('.nav__toggle');
  const links = nav.querySelector('.nav__links');

  toggle.addEventListener('click', () => {
    const open = links.classList.toggle('is-open');
    nav.classList.toggle('menu-open', open);
    toggle.setAttribute('aria-expanded', open);
    toggle.innerHTML = `<i class="ph-light ${open ? 'ph-x' : 'ph-list'}"></i>`;
    toggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
  });

  // close the mobile menu after picking a link (e.g. jumping to the wall on the same page)
  links.addEventListener('click', e => {
    if (!e.target.closest('a')) return;
    links.classList.remove('is-open');
    nav.classList.remove('menu-open');
    toggle.setAttribute('aria-expanded', false);
    toggle.innerHTML = '<i class="ph-light ph-list"></i>';
  });

  const onScroll = () => nav.classList.toggle('is-scrolled', window.scrollY > 8);
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();
}

function buildFooter() {
  const holder = document.getElementById('footer');
  if (!holder) return;
  holder.outerHTML = `
    <footer class="footer">
      <div class="container">
        <div class="footer__grid">
          <div>
            <a class="logo" href="index.html"><img class="logo__mark" src="assets/logo-light.svg" alt="" width="46" height="30"><span class="logo__word">MAD<span>A</span>M</span></a>
            <p style="margin-top:14px;max-width:24em">Making A Difference, Always Magnificent.
            A student project on gender equality.</p>
          </div>
          <div>
            <h4>Explore</h4>
            <ul>
              ${PAGES.slice(1, 3).map(p => `<li><a href="${p.href}">${p.label}</a></li>`).join('')}
            </ul>
          </div>
          <div>
            <h4>More</h4>
            <ul>
              ${PAGES.slice(3).map(p => `<li><a href="${p.href}">${p.label}</a></li>`).join('')}
            </ul>
          </div>
        </div>
      </div>
    </footer>`;
}

function initReveal() {
  const items = document.querySelectorAll('.reveal');
  if (!('IntersectionObserver' in window)) {
    items.forEach(el => el.classList.add('is-visible'));
    return;
  }
  const io = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        io.unobserve(entry.target);
      }
    });
  }, { threshold: 0.15 });
  items.forEach(el => io.observe(el));
}

/* Counts a number up when it scrolls into view.
   Usage: <span data-count="27" data-suffix="%"></span> */
function initCounters() {
  const els = document.querySelectorAll('[data-count]');
  const run = el => {
    const target = parseFloat(el.dataset.count);
    const suffix = el.dataset.suffix || '';
    const prefix = el.dataset.prefix || '';
    const duration = 1600;
    const start = performance.now();
    const step = now => {
      const t = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      el.textContent = prefix + Math.round(target * eased).toLocaleString() + suffix;
      if (t < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  };
  const io = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (e.isIntersecting) { run(e.target); io.unobserve(e.target); }
    });
  }, { threshold: 0.5 });
  els.forEach(el => io.observe(el));
}

/* Escape user text before putting it into HTML (prevents code injection). */
function escapeHTML(str) {
  return String(str).replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c]));
}

/* "2h ago" style timestamps */
function timeAgo(ms) {
  const s = Math.floor((Date.now() - ms) / 1000);
  if (s < 60) return 'just now';
  const m = Math.floor(s / 60); if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60); if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24); if (d < 30) return `${d}d ago`;
  return new Date(ms).toLocaleDateString();
}

/* =========================================================
   A small, calm confirmation message: showToast('Saved')
   ========================================================= */
let toastTimer;
function showToast(message, icon = 'ph-check') {
  let t = document.getElementById('toast');
  if (!t) {
    t = document.createElement('div');
    t.id = 'toast';
    t.className = 'toast';
    t.setAttribute('role', 'status');
    document.body.appendChild(t);
  }
  t.innerHTML = `<i class="ph-light ${icon}"></i><span>${escapeHTML(message)}</span>`;
  requestAnimationFrame(() => t.classList.add('show'));
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), 3200);
}

document.addEventListener('DOMContentLoaded', () => {
  buildNav();
  buildFooter();
  initReveal();
  initCounters();
});
