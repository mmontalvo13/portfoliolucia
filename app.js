// --- app.js ---

const FINE_POINTER = window.matchMedia('(pointer: fine)').matches && window.innerWidth > 900;
const REDUCE_MOTION = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

document.addEventListener('DOMContentLoaded', () => {
    initProjectPreview();
    initMobileMenu();
    initScrollReveal();
    if (FINE_POINTER) {
        initMagnetic();
    }
});

/**
 * Homepage hover preview. Two stacked layers cross-fade between project
 * images, and the image gently parallaxes with the cursor for depth.
 */
function initProjectPreview() {
    const links = [...document.querySelectorAll('.project-title-link')];
    const container = document.getElementById('media-preview');
    if (!links.length || !container) return;

    // Preload every preview image so the cross-fade never flickers.
    links.forEach((link) => {
        if (link.dataset.image) new Image().src = link.dataset.image;
    });

    const layerA = document.createElement('div');
    const layerB = document.createElement('div');
    layerA.className = 'media-layer';
    layerB.className = 'media-layer';
    container.append(layerA, layerB);

    let front = layerA;
    let back = layerB;
    let current = null;

    const show = (url) => {
        if (!url || url === current) return;
        current = url;
        back.style.backgroundImage = `url('${url}')`;
        back.classList.add('is-visible');
        front.classList.remove('is-visible');
        [front, back] = [back, front];
    };

    // Default to the first project so the panel is never empty (key on mobile).
    show(links[0].dataset.image);
    container.classList.add('is-active');

    links.forEach((link) => {
        link.addEventListener('mouseenter', () => {
            show(link.dataset.image);
            container.classList.add('is-active');
        });
    });

    // On touch / mobile there is no hover, so the sticky preview image is
    // driven by scroll position: whichever project crosses the area just
    // below the image becomes the "selected" one.
    if (!FINE_POINTER && 'IntersectionObserver' in window) {
        const io = new IntersectionObserver((entries) => {
            entries.forEach((entry) => {
                if (entry.isIntersecting) {
                    show(entry.target.dataset.image);
                    container.classList.add('is-active');
                }
            });
        }, { rootMargin: '-50% 0px -42% 0px', threshold: 0 });

        links.forEach((link) => io.observe(link));
    }

    if (!FINE_POINTER || REDUCE_MOTION) return;

    // Cursor parallax over the whole showcase area.
    const showcase = document.querySelector('.portfolio-showcase') || container;
    let targetX = 0, targetY = 0, curX = 0, curY = 0, raf = null;

    const render = () => {
        curX += (targetX - curX) * 0.08;
        curY += (targetY - curY) * 0.08;
        const t = `translate(${curX.toFixed(2)}px, ${curY.toFixed(2)}px)`;
        layerA.style.transform = t;
        layerB.style.transform = t;
        if (Math.abs(targetX - curX) > 0.1 || Math.abs(targetY - curY) > 0.1) {
            raf = requestAnimationFrame(render);
        } else {
            raf = null;
        }
    };

    showcase.addEventListener('mousemove', (e) => {
        const r = container.getBoundingClientRect();
        targetX = ((e.clientX - r.left) / r.width - 0.5) * -36;
        targetY = ((e.clientY - r.top) / r.height - 0.5) * -36;
        if (!raf) raf = requestAnimationFrame(render);
    });
}

/**
 * Mobile navigation toggle (hamburger -> full-screen overlay).
 */
function initMobileMenu() {
    const menuToggle = document.querySelector('.mobile-menu-toggle');
    const mainNav = document.querySelector('.main-nav');
    if (!menuToggle || !mainNav) return;

    const close = () => {
        menuToggle.classList.remove('is-active');
        mainNav.classList.remove('is-open');
        document.body.style.overflow = '';
    };

    menuToggle.addEventListener('click', () => {
        const isOpen = mainNav.classList.toggle('is-open');
        menuToggle.classList.toggle('is-active', isOpen);
        document.body.style.overflow = isOpen ? 'hidden' : '';
    });

    mainNav.querySelectorAll('a').forEach((link) => link.addEventListener('click', close));
}

/**
 * Reveals content blocks as they scroll into view.
 */
function initScrollReveal() {
    if (REDUCE_MOTION || !('IntersectionObserver' in window)) return;

    const targets = document.querySelectorAll(
        '.project-gallery-area > *, .editorial-content-grid > *, ' +
        '.manifesto-grid > *, .contact-item, .project-intro-block, .project-pager, ' +
        '.project-context, .story-section, .pull-quote, .project-closing, .story-figure'
    );
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

/**
 * Magnetic effect: nav and pager links drift toward the cursor when hovered.
 */
function initMagnetic() {
    if (REDUCE_MOTION) return;

    const els = document.querySelectorAll('.main-nav a, .pager-link, .pager-home, .back-link, [data-magnetic]');
    els.forEach((el) => {
        el.addEventListener('mousemove', (e) => {
            const r = el.getBoundingClientRect();
            const x = e.clientX - (r.left + r.width / 2);
            const y = e.clientY - (r.top + r.height / 2);
            el.style.transform = `translate(${x * 0.3}px, ${y * 0.3}px)`;
        });
        el.addEventListener('mouseleave', () => { el.style.transform = ''; });
    });
}
