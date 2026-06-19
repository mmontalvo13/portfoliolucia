// --- app.js — Lucía Montalvo portfolio ---

/* ===================================================================
   Google Analytics 4 (gtag.js) — loaded once for every page
   =================================================================== */
(function () {
    const GA_ID = 'G-4B2E5CVK16';
    const s = document.createElement('script');
    s.async = true;
    s.src = 'https://www.googletagmanager.com/gtag/js?id=' + GA_ID;
    document.head.appendChild(s);

    window.dataLayer = window.dataLayer || [];
    window.gtag = function () { dataLayer.push(arguments); };
    gtag('js', new Date());
    gtag('config', GA_ID);
})();

const REDUCE_MOTION = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const FINE_POINTER = window.matchMedia('(pointer: fine)').matches;

document.addEventListener('DOMContentLoaded', () => {
    initLoader();
    initCarousel();
    initScrollReveal();
    markActiveNav();
    initNavInteraction();
    initArch();
    initHeroL();
    initCursorTrail();
});

/* ===================================================================
   Hero "hola!": draw the looping "l" once the intro has cleared
   =================================================================== */
function initHeroL() {
    const svg = document.querySelector('.hello-l');
    if (!svg) return;
    const path = svg.querySelector('path');
    if (REDUCE_MOTION) { if (path) path.style.strokeDashoffset = '0'; return; }

    const isIntro = document.querySelector('[data-veil]') &&
        !document.documentElement.classList.contains('veil-skip');
    const delay = isIntro ? 2350 : 380;
    setTimeout(() => svg.classList.add('draw'), delay);
}

/* ===================================================================
   1. First-load veil + animated "hola" intro
   =================================================================== */
function initLoader() {
    const veil = document.querySelector('[data-veil]');
    if (!veil) return;
    veil.style.animation = 'none';

    if (document.documentElement.classList.contains('veil-skip')) {
        veil.remove();
        return;
    }

    const rich = veil.querySelector('.intro-hola');
    veil.classList.add('is-intro');
    const reveal = () => veil.classList.add('is-open');
    // Give the drawn "l" time to be seen on the homepage intro.
    const delay = REDUCE_MOTION ? 0 : (rich ? 2100 : 680);

    let revealed = false;
    const go = () => { if (!revealed) { revealed = true; setTimeout(reveal, delay); } };
    if (document.readyState === 'complete') go();
    else window.addEventListener('load', go, { once: true });
    setTimeout(go, 2600);
}

/* ===================================================================
   2. Project carousel (scroll-snap + arrow controls)
   =================================================================== */
function initCarousel() {
    const track = document.querySelector('[data-carousel]');
    if (!track) return;

    const prev = document.querySelector('[data-carousel-prev]');
    const next = document.querySelector('[data-carousel-next]');

    const step = () => {
        const card = track.querySelector('.work-card');
        const gap = parseFloat(getComputedStyle(track).columnGap || '16') || 16;
        return card ? card.offsetWidth + gap : track.clientWidth * 0.8;
    };

    const update = () => {
        if (!prev || !next) return;
        const max = track.scrollWidth - track.clientWidth - 2;
        prev.disabled = track.scrollLeft <= 2;
        next.disabled = track.scrollLeft >= max;
    };

    prev && prev.addEventListener('click', () => track.scrollBy({ left: -step(), behavior: 'smooth' }));
    next && next.addEventListener('click', () => track.scrollBy({ left: step(), behavior: 'smooth' }));
    track.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    update();
}

/* ===================================================================
   3. Reveal blocks on scroll
   =================================================================== */
function initScrollReveal() {
    if (REDUCE_MOTION || !('IntersectionObserver' in window)) return;

    const targets = document.querySelectorAll('[data-reveal]');
    if (!targets.length) return;

    targets.forEach((el) => el.classList.add('reveal'));

    const io = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
            if (entry.isIntersecting) {
                entry.target.classList.add('in-view');
                io.unobserve(entry.target);
            }
        });
    }, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' });

    targets.forEach((el) => io.observe(el));
}

/* ===================================================================
   4. Highlight the current page in the nav
   =================================================================== */
function markActiveNav() {
    const here = location.pathname.split('/').pop() || 'index.html';
    document.querySelectorAll('.nav-pill a').forEach((a) => {
        const target = (a.getAttribute('href') || '').split('/').pop().split('#')[0];
        if (target === here && here !== '') a.classList.add('is-active');
    });
}

/* ===================================================================
   5. Nav bar: palette gradient follows the cursor (zoom handled in CSS)
   =================================================================== */
function initNavInteraction() {
    const nav = document.querySelector('.nav-pill');
    if (!nav || !FINE_POINTER) return;

    nav.addEventListener('pointermove', (e) => {
        const r = nav.getBoundingClientRect();
        const x = ((e.clientX - r.left) / r.width) * 100;
        nav.style.setProperty('--nav-x', `${Math.max(0, Math.min(100, x))}%`);
    });
}

/* ===================================================================
   6. Arch: draw the florals + typewriter the centre statement
   =================================================================== */
function initArch() {
    const arch = document.querySelector('.arch');
    if (!arch) return;
    const title = arch.querySelector('.arch-title');

    const segs = [
        { t: 'diseño ' },
        { t: 'creativo', b: true },
        { t: ', ' },
        { t: 'estratégico', b: true },
        { t: ' y ' },
        { t: 'personal', b: true },
    ];

    const setFinal = () => {
        title.innerHTML = '';
        segs.forEach((s) => {
            const n = document.createElement(s.b ? 'b' : 'span');
            n.textContent = s.t;
            title.appendChild(n);
        });
    };

    const typeOut = () => {
        if (!title || title.dataset.typed) return;
        title.dataset.typed = '1';

        if (REDUCE_MOTION) { setFinal(); return; }

        title.innerHTML = '';
        const nodes = segs.map((s) => {
            const n = document.createElement(s.b ? 'b' : 'span');
            title.appendChild(n);
            return n;
        });
        const caret = document.createElement('span');
        caret.className = 'caret';
        title.appendChild(caret);

        let si = 0, ci = 0;
        const tick = () => {
            if (si >= segs.length) {
                setTimeout(() => caret.classList.add('done'), 700);
                return;
            }
            nodes[si].textContent += segs[si].t[ci++];
            if (ci >= segs[si].t.length) { si++; ci = 0; }
            setTimeout(tick, 46);
        };
        setTimeout(tick, 350);
    };

    const activate = () => { arch.classList.add('is-drawn'); typeOut(); };

    if (REDUCE_MOTION || !('IntersectionObserver' in window)) { activate(); return; }

    const io = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
            if (entry.isIntersecting) { activate(); io.disconnect(); }
        });
    }, { threshold: 0.35 });
    io.observe(arch);
}

/* ===================================================================
   7. Cursor trail: tiny project photos scattered as the cursor moves
   =================================================================== */
function initCursorTrail() {
    if (REDUCE_MOTION || !FINE_POINTER) return;

    // Only active over the hero; once you scroll past it, no more photos.
    const hero = document.querySelector('.hero');
    if (!hero) return;

    const base = location.pathname.includes('/projects/') ? '../' : '';
    const sources = [
        'img/panetto/portada.jpg',
        'img/vinilo/manos.jpg',
        'img/ecos/ecos_1.jpg',
        'img/vinos/swiss.jpg',
        'img/swing/tapa.jpg',
        'img/salamanca/mockup_cuadernos.jpg',
        'img/ecos/ecos_5.jpg',
        'img/vinilo/poster.jpg',
        'img/vinos/talavera.jpg',
    ].map((s) => base + s);

    sources.forEach((s) => { const i = new Image(); i.src = s; });

    const layer = document.createElement('div');
    layer.className = 'trail-layer';
    layer.setAttribute('aria-hidden', 'true');
    document.body.appendChild(layer);

    let lastX = -999, lastY = -999, idx = 0;
    const MIN_DIST = 62 * 62;

    hero.addEventListener('pointermove', (e) => {
        if (e.pointerType && e.pointerType !== 'mouse') return;
        const dx = e.clientX - lastX, dy = e.clientY - lastY;
        if (dx * dx + dy * dy < MIN_DIST) return;
        lastX = e.clientX; lastY = e.clientY;

        const img = document.createElement('img');
        img.className = 'trail-img';
        img.src = sources[idx % sources.length];
        idx++;
        img.style.left = `${e.clientX}px`;
        img.style.top = `${e.clientY}px`;
        img.style.setProperty('--r', `${(Math.random() * 26 - 13).toFixed(1)}deg`);
        layer.appendChild(img);
        setTimeout(() => img.remove(), 780);

        // keep the layer from growing unbounded on fast moves
        if (layer.childElementCount > 26) layer.firstElementChild.remove();
    }, { passive: true });
}
