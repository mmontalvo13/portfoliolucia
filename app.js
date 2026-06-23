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
    initFloatingNav();
    initCarousel();
    markActiveNav();
    initNavInteraction();
    initArch();
    initMosaicParallax();
    initProjectReveal();
    initScrollReveal();
    initCursorTrail();
});

/* ===================================================================
   1. First-load veil — logo reveal on cream
   =================================================================== */
function initLoader() {
    const veil = document.querySelector('[data-veil]');
    if (!veil) return;

    if (document.documentElement.classList.contains('veil-skip')) {
        veil.remove();
        return;
    }

    requestAnimationFrame(() => veil.classList.add('is-intro'));

    const reveal = () => {
        veil.classList.add('is-open');
        setTimeout(() => veil.remove(), 950);
    };
    const delay = REDUCE_MOTION ? 120 : 1100;

    let revealed = false;
    const go = () => {
        if (revealed) return;
        revealed = true;
        setTimeout(reveal, delay);
    };

    if (document.readyState === 'complete') go();
    else window.addEventListener('load', go, { once: true });
    setTimeout(go, 2800);
}

/* ===================================================================
   2. Floating nav — pins to top while scrolling
   =================================================================== */
function initFloatingNav() {
    const header = document.querySelector('.site-header');
    const nav = document.querySelector('.nav-pill');
    if (!header || !nav) return;

    const hero = document.querySelector('.hero');

    const spacer = document.createElement('div');
    spacer.className = 'nav-spacer';
    spacer.setAttribute('aria-hidden', 'true');
    header.insertAdjacentElement('afterend', spacer);

    const FLOAT_THRESHOLD = 64;
    let floating = false;

    const collapseThreshold = () => {
        if (!hero) return Infinity;
        return hero.offsetTop + hero.offsetHeight - 48;
    };

    const syncSpacer = () => {
        spacer.style.height = floating ? `${header.offsetHeight}px` : '0';
    };

    const measure = () => {
        const wasFloating = floating;
        header.classList.remove('is-floating');
        nav.classList.remove('is-collapsed', 'is-expanded');
        spacer.style.height = '0';

        if (wasFloating) {
            header.classList.add('is-floating');
            if (window.scrollY > collapseThreshold()) nav.classList.add('is-collapsed');
        }

        syncSpacer();
    };

    const update = () => {
        const scrollY = window.scrollY;
        const shouldFloat = scrollY > FLOAT_THRESHOLD;
        const shouldCollapse = hero && scrollY > collapseThreshold();

        if (shouldFloat !== floating) {
            floating = shouldFloat;
            header.classList.toggle('is-floating', floating);
        }

        nav.classList.toggle('is-collapsed', floating && shouldCollapse);
        if (!nav.classList.contains('is-collapsed')) nav.classList.remove('is-expanded');

        syncSpacer();
    };

    if (!window.matchMedia('(hover: hover)').matches) {
        nav.addEventListener('click', (e) => {
            if (!nav.classList.contains('is-collapsed') || nav.classList.contains('is-expanded')) return;
            e.preventDefault();
            nav.classList.add('is-expanded');
            nav.scrollLeft = 0;
        });

        document.addEventListener('click', (e) => {
            if (!nav.contains(e.target)) nav.classList.remove('is-expanded');
        });
    } else {
        nav.addEventListener('mouseleave', () => nav.classList.remove('is-expanded'));
    }

    measure();
    window.addEventListener('resize', measure);
    window.addEventListener('scroll', update, { passive: true });
    update();
}

/* ===================================================================
   3. Project carousel (scroll-snap + arrow controls)
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
   6. Arch: typewriter the centre statement
   =================================================================== */
function initArch() {
    const arch = document.querySelector('.arch');
    if (!arch) return;
    const title = arch.querySelector('.arch-title');

    const segs = [
        { t: 'creatividad', b: true },
        { t: ', ' },
        { t: 'estrategia', b: true },
        { t: ' y ' },
        { t: 'personalidad', b: true },
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

        // Lock height to the fully wrapped lines so florals don't shift while typing.
        title.style.minHeight = `${title.offsetHeight}px`;

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
   7. Mosaic gallery — 3-column parallax on scroll
   =================================================================== */
function initMosaicParallax() {
    const section = document.querySelector('[data-mosaic]');
    if (!section) return;

    const cols = {
        left: section.querySelector('[data-mosaic-col="left"]'),
        center: section.querySelector('[data-mosaic-col="center"]'),
        right: section.querySelector('[data-mosaic-col="right"]'),
    };
    if (!cols.left || !cols.center || !cols.right) return;

    if (REDUCE_MOTION || window.matchMedia('(max-width: 768px)').matches) return;

    let ticking = false;

    const maxOffset = () => Math.min(160, Math.max(72, window.innerHeight * 0.14));

    const update = () => {
        ticking = false;
        const rect = section.getBoundingClientRect();
        const vh = window.innerHeight;
        const total = rect.height + vh;
        const progress = Math.max(0, Math.min(1, (vh - rect.top) / total));
        const drift = Math.sin(progress * Math.PI) * maxOffset();

        cols.left.style.transform = `translate3d(0, ${-drift}px, 0)`;
        cols.right.style.transform = `translate3d(0, ${-drift}px, 0)`;
        cols.center.style.transform = `translate3d(0, ${drift}px, 0)`;
    };

    const onScroll = () => {
        if (!ticking) {
            ticking = true;
            requestAnimationFrame(update);
        }
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', update);
    update();
}

/* ===================================================================
   8. Project pages — 3D scroll reveal
   =================================================================== */
function initProjectReveal() {
    const project = document.querySelector('.project');
    if (!project) return;

    const header = project.querySelector('.project-header');
    const hero = project.querySelector('.project-hero');
    if (!header || !hero) return;

    const cinematic = !REDUCE_MOTION && !window.matchMedia('(max-width: 768px)').matches;

    if (!cinematic) {
        project.querySelectorAll('.project-context, .story-section, .pull-quote, .project-closing')
            .forEach((el) => el.setAttribute('data-reveal', ''));
        return;
    }

    document.body.classList.add('has-project-cinematic');

    const stage = document.createElement('div');
    stage.className = 'project-stage';
    stage.setAttribute('data-project-stage', '');

    const pin = document.createElement('div');
    pin.className = 'project-stage__pin';

    const scene = document.createElement('div');
    scene.className = 'project-stage__scene';

    const hint = document.createElement('span');
    hint.className = 'project-stage__hint';
    hint.setAttribute('aria-hidden', 'true');
    hint.textContent = 'scroll';

    project.insertBefore(stage, header);
    pin.appendChild(scene);
    stage.appendChild(pin);
    scene.appendChild(header);
    scene.appendChild(hero);
    pin.appendChild(hint);

    const scroll = document.createElement('div');
    scroll.className = 'project-scroll is-locked';
    scroll.setAttribute('data-project-scroll', '');

    let node = stage.nextSibling;
    while (node) {
        const next = node.nextSibling;
        scroll.appendChild(node);
        node = next;
    }
    project.appendChild(scroll);

    scroll.querySelectorAll('.project-context, .story-section, .pull-quote, .project-closing')
        .forEach((el) => el.classList.add('project-panel'));

    const pinSpacer = document.createElement('div');
    pinSpacer.className = 'project-stage__spacer';
    pinSpacer.setAttribute('aria-hidden', 'true');
    stage.insertBefore(pinSpacer, pin);

    let ticking = false;
    let stageTop = 0;
    let scrollRange = 1;
    let pinHeight = 0;

    const smoothstep = (t) => t * t * (3 - 2 * t);
    const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
    const lerp = (a, b, t) => a + (b - a) * t;

    const measureStage = () => {
        stageTop = stage.offsetTop;
        scrollRange = Math.max(1, stage.offsetHeight - window.innerHeight);
    };

    const measurePin = () => {
        const wasPinned = pin.classList.contains('is-pinned');
        pin.classList.remove('is-pinned');
        pinSpacer.style.height = '0';
        pinHeight = pin.offsetHeight;
        pin.classList.toggle('is-pinned', wasPinned);
        if (wasPinned) pinSpacer.style.height = `${pinHeight}px`;
    };

    const resetIntro = () => {
        header.style.removeProperty('transform');
        header.style.removeProperty('opacity');
        hero.style.removeProperty('transform');
        hero.style.removeProperty('opacity');
    };

    const settlePanel = (panel) => {
        panel.classList.add('is-settled');
        panel.style.removeProperty('transform');
        panel.style.removeProperty('opacity');
    };

    const animatePanels = (progress) => {
        scroll.querySelectorAll('.project-panel').forEach((panel) => {
            if (panel.classList.contains('is-settled')) return;

            const r = panel.getBoundingClientRect();
            const vh = window.innerHeight;

            if (r.top > vh * 0.92) {
                panel.style.removeProperty('transform');
                panel.style.removeProperty('opacity');
                return;
            }

            if (r.bottom < vh * 0.05) {
                settlePanel(panel);
                return;
            }

            const enterStart = vh * 0.95;
            const enterEnd = vh * 0.5;
            const release = clamp((progress - 0.48) / 0.4, 0, 1);
            const p = clamp((enterStart - r.top) / (enterStart - enterEnd), 0, 1);
            const e = smoothstep(Math.max(p, release * 0.6));

            panel.style.transform = `translate3d(0, ${20 * (1 - e)}px, 0)`;
            panel.style.opacity = String(lerp(0.4, 1, e));

            if (e >= 0.98) settlePanel(panel);
        });
    };

    const update = () => {
        ticking = false;
        measureStage();

        const scrollY = window.scrollY;
        const end = stageTop + scrollRange;
        let progress;

        if (scrollY < stageTop) {
            pin.classList.remove('is-pinned', 'is-ended');
            pinSpacer.style.height = '0';
            progress = 0;
            resetIntro();
        } else if (scrollY >= end) {
            pin.classList.remove('is-pinned');
            pin.classList.add('is-ended');
            pinSpacer.style.height = '0';
            progress = 1;
            resetIntro();
        } else {
            pin.classList.remove('is-ended');
            pin.classList.add('is-pinned');
            pinSpacer.style.height = `${pinHeight}px`;
            progress = (scrollY - stageTop) / scrollRange;
        }

        scroll.classList.toggle('is-locked', progress < 0.5);
        scroll.classList.toggle('is-releasing', progress >= 0.5 && progress < 1);
        hint.style.opacity = progress >= 1 ? '0' : String(clamp(0.7 - progress * 1.8, 0, 0.7));

        if (progress <= 0 || progress >= 1) {
            animatePanels(progress);
            return;
        }

        const titlePhase = clamp(progress / 0.55, 0, 1);
        const titleEase = smoothstep(titlePhase);
        const heroPhase = clamp((progress - 0.45) / 0.55, 0, 1);
        const heroEase = smoothstep(heroPhase);

        header.style.transform = `translate3d(0, ${-36 * titleEase}px, 0)`;
        header.style.opacity = String(clamp(1 - titleEase * 1.1, 0, 1));

        hero.style.transform = `translate3d(0, ${-16 * heroEase}px, 0) scale(${lerp(1, 0.94, heroEase)})`;
        hero.style.opacity = String(clamp(1 - heroEase * 1.15, 0, 1));

        animatePanels(progress);
    };

    const onScroll = () => {
        if (!ticking) {
            ticking = true;
            requestAnimationFrame(update);
        }
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', () => {
        measureStage();
        measurePin();
        update();
    });
    requestAnimationFrame(() => {
        measureStage();
        measurePin();
        update();
    });
}

/* ===================================================================
   9. Cursor trail: tiny project photos scattered as the cursor moves
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
