// --- app.js ---

const FINE_POINTER = window.matchMedia('(pointer: fine)').matches && window.innerWidth > 900;
const REDUCE_MOTION = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

document.addEventListener('DOMContentLoaded', () => {
    initLoader();
    initProjectPreview();
    initMobileMenu();
    initScrollReveal();
    if (FINE_POINTER) {
        initMagnetic();
    }
});

/* ===================================================================
   1. Signature loader (the "veil") — FIRST LOAD ONLY
   ------------------------------------------------------------------
   A full-screen panel covers the page on the very first visit of a
   session and slides away to reveal it. An inline <head> script tags
   later pages with `veil-skip` so the loader never reappears when
   navigating between pages.
   =================================================================== */
function initLoader() {
    const veil = document.querySelector('[data-veil]');
    if (!veil) return;

    // Disable the no-JS CSS fallback animation; JS controls the reveal.
    veil.style.animation = 'none';

    // Not the first page of the session -> remove the panel entirely.
    if (document.documentElement.classList.contains('veil-skip')) {
        veil.remove();
        return;
    }

    veil.classList.add('is-intro');
    const reveal = () => veil.classList.add('is-open');
    const delay = REDUCE_MOTION ? 0 : 720;

    // Reveal once the page is painted; cap the wait so we never hang.
    let revealed = false;
    const go = () => { if (!revealed) { revealed = true; setTimeout(reveal, delay); } };
    if (document.readyState === 'complete') go();
    else window.addEventListener('load', go, { once: true });
    setTimeout(go, 1600); // safety net
}

/* ===================================================================
   2. Homepage preview — WebGL liquid distortion (with DOM fallback)
   =================================================================== */
function initProjectPreview() {
    const links = [...document.querySelectorAll('.project-title-link')];
    const container = document.getElementById('media-preview');
    if (!links.length || !container) return;

    const urls = links.map((l) => l.dataset.image).filter(Boolean);

    // `preview` is mutable: if WebGL initialises but its textures can't be
    // uploaded (e.g. opened via file://), it calls back and we swap to the
    // plain DOM cross-fade so the images always show.
    let preview = null;
    const useDomFallback = () => {
        preview = createDomPreview(container);
        preview.show(urls[0]);
        container.classList.add('is-active');
    };

    preview = createWebGLPreview(container, useDomFallback);
    if (!preview) {
        useDomFallback();
    } else {
        // Default to the first project so the panel is never empty (key on mobile).
        preview.show(urls[0]);
        container.classList.add('is-active');
    }

    links.forEach((link) => {
        link.addEventListener('mouseenter', () => {
            preview.show(link.dataset.image);
            preview.setHover(true);
            container.classList.add('is-active');
        });
    });

    // Pointer drives ripple/parallax on desktop.
    if (FINE_POINTER && !REDUCE_MOTION) {
        const showcase = document.querySelector('.portfolio-showcase') || container;
        showcase.addEventListener('mousemove', (e) => {
            const r = container.getBoundingClientRect();
            preview.setPointer((e.clientX - r.left) / r.width, (e.clientY - r.top) / r.height);
            preview.setHover(true);
        });
        showcase.addEventListener('mouseleave', () => preview.setHover(false));
    }

    // On touch / mobile the sticky preview is driven by scroll position.
    if (!FINE_POINTER && 'IntersectionObserver' in window) {
        const io = new IntersectionObserver((entries) => {
            entries.forEach((entry) => {
                if (entry.isIntersecting) {
                    preview.show(entry.target.dataset.image);
                    container.classList.add('is-active');
                }
            });
        }, { rootMargin: '-50% 0px -42% 0px', threshold: 0 });
        links.forEach((link) => io.observe(link));
    }
}

/**
 * WebGL preview: a fullscreen-quad shader that cross-fades between
 * project images with a liquid ripple + chromatic split around the
 * cursor. Returns null if WebGL is unavailable so we can fall back.
 */
function createWebGLPreview(container, onFail) {
    const canvas = document.createElement('canvas');
    canvas.className = 'media-canvas';
    const gl = canvas.getContext('webgl', { antialias: true, premultipliedAlpha: false })
            || canvas.getContext('experimental-webgl');
    if (!gl) return null;

    container.appendChild(canvas);

    const VERT = `
        attribute vec2 aPos;
        varying vec2 vUv;
        void main(){ vUv = aPos * 0.5 + 0.5; gl_Position = vec4(aPos, 0.0, 1.0); }`;

    const FRAG = `
        precision highp float;
        varying vec2 vUv;
        uniform sampler2D uTex0;
        uniform sampler2D uTex1;
        uniform float uProgress;
        uniform vec2 uMouse;
        uniform float uHover;
        uniform float uTime;
        uniform vec2 uRes;
        uniform float uA0;
        uniform float uA1;

        vec2 coverUv(vec2 uv, float ia, float ca){
            vec2 r = (ca < ia) ? vec2(ca / ia, 1.0) : vec2(1.0, ia / ca);
            return (uv - 0.5) * r + 0.5;
        }

        void main(){
            float ca = uRes.x / uRes.y;
            vec2 uv = vUv;

            // gentle parallax toward the cursor
            uv += (uMouse - 0.5) * -0.025 * (0.4 + 0.6 * uHover);

            // ripple radiating from the cursor + ambient drift
            vec2 toM = (uv - uMouse) * vec2(ca, 1.0);
            float d = length(toM);
            float ripple = sin(d * 26.0 - uTime * 3.2) * exp(-d * 6.0) * (0.18 + 0.55 * uHover) * 0.03;
            vec2 dir = normalize(toM + 1e-4);
            vec2 disp = dir * ripple;
            disp += vec2(sin(uv.y * 7.0 + uTime * 0.5), cos(uv.x * 7.0 + uTime * 0.45)) * 0.0022;

            // extra warp during the image swap for a liquid transition
            float swap = sin(uProgress * 3.14159);
            disp += dir * swap * 0.05;

            float ab = 0.0035 + abs(ripple) * 2.0 + swap * 0.01;

            vec2 b0 = coverUv(uv + disp, uA0, ca);
            vec3 c0 = vec3(
                texture2D(uTex0, coverUv(uv + disp + dir * ab, uA0, ca)).r,
                texture2D(uTex0, b0).g,
                texture2D(uTex0, coverUv(uv + disp - dir * ab, uA0, ca)).b
            );

            vec2 b1 = coverUv(uv + disp, uA1, ca);
            vec3 c1 = vec3(
                texture2D(uTex1, coverUv(uv + disp + dir * ab, uA1, ca)).r,
                texture2D(uTex1, b1).g,
                texture2D(uTex1, coverUv(uv + disp - dir * ab, uA1, ca)).b
            );

            gl_FragColor = vec4(mix(c0, c1, smoothstep(0.0, 1.0, uProgress)), 1.0);
        }`;

    const compile = (type, src) => {
        const s = gl.createShader(type);
        gl.shaderSource(s, src);
        gl.compileShader(s);
        if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) return null;
        return s;
    };
    const vs = compile(gl.VERTEX_SHADER, VERT);
    const fs = compile(gl.FRAGMENT_SHADER, FRAG);
    if (!vs || !fs) { container.removeChild(canvas); return null; }

    const prog = gl.createProgram();
    gl.attachShader(prog, vs);
    gl.attachShader(prog, fs);
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) { container.removeChild(canvas); return null; }
    gl.useProgram(prog);

    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const aPos = gl.getAttribLocation(prog, 'aPos');
    gl.enableVertexAttribArray(aPos);
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

    const U = (n) => gl.getUniformLocation(prog, n);
    const uTex0 = U('uTex0'), uTex1 = U('uTex1'), uProgress = U('uProgress'),
          uMouse = U('uMouse'), uHover = U('uHover'), uTime = U('uTime'),
          uRes = U('uRes'), uA0 = U('uA0'), uA1 = U('uA1');
    gl.uniform1i(uTex0, 0);
    gl.uniform1i(uTex1, 1);

    const makeTex = () => {
        const t = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, t);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([20, 19, 60, 255]));
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        return t;
    };

    let texCur = makeTex(), texNext = makeTex();
    let aspectCur = 1, aspectNext = 1;
    const cache = new Map(); // url -> { tex, aspect }

    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);

    // Same-origin images: do NOT set crossOrigin (it makes them fail to load
    // without CORS headers). texImage2D is wrapped in try/catch because some
    // browsers block uploading local (file://) images into WebGL.
    const loadTexture = (url) => new Promise((resolve) => {
        if (cache.has(url)) return resolve(cache.get(url));
        const img = new Image();
        img.onload = () => {
            try {
                const t = makeTex();
                gl.bindTexture(gl.TEXTURE_2D, t);
                gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
                const entry = { tex: t, aspect: (img.naturalWidth || 1) / (img.naturalHeight || 1) };
                cache.set(url, entry);
                resolve(entry);
            } catch (e) {
                resolve(null);
            }
        };
        img.onerror = () => resolve(null);
        img.src = url;
    });

    // smoothed state
    let dead = false;
    let progress = 1, transitioning = false;
    let mX = 0.5, mY = 0.5, tX = 0.5, tY = 0.5;
    let hover = 0, tHover = 0;
    let currentUrl = null, pendingUrl = null;
    let dpr = Math.min(window.devicePixelRatio || 1, 2);
    let raf = null;
    const start = performance.now();

    const resize = () => {
        dpr = Math.min(window.devicePixelRatio || 1, 2);
        const w = Math.max(1, container.clientWidth), h = Math.max(1, container.clientHeight);
        canvas.width = Math.round(w * dpr);
        canvas.height = Math.round(h * dpr);
        gl.viewport(0, 0, canvas.width, canvas.height);
    };
    resize();
    if ('ResizeObserver' in window) new ResizeObserver(resize).observe(container);
    else window.addEventListener('resize', resize);

    const draw = () => {
        const t = (performance.now() - start) / 1000;
        mX += (tX - mX) * 0.08; mY += (tY - mY) * 0.08;
        hover += (tHover - hover) * 0.06;
        if (transitioning) {
            progress += (1 - progress) * 0.06;
            if (progress > 0.985) {
                // Settle the new image into the "current" slot and reset.
                progress = 0; transitioning = false;
                texCur = texNext; aspectCur = aspectNext;
            }
        }

        gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, texCur);
        gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, texNext);
        gl.uniform1f(uProgress, progress);
        gl.uniform2f(uMouse, mX, 1.0 - mY);
        gl.uniform1f(uHover, hover);
        gl.uniform1f(uTime, t);
        gl.uniform2f(uRes, canvas.width, canvas.height);
        gl.uniform1f(uA0, aspectCur);
        gl.uniform1f(uA1, aspectNext);
        gl.drawArrays(gl.TRIANGLES, 0, 3);

        raf = requestAnimationFrame(draw);
    };

    const play = () => { if (raf == null) raf = requestAnimationFrame(draw); };
    const stop = () => { if (raf != null) { cancelAnimationFrame(raf); raf = null; } };

    document.addEventListener('visibilitychange', () => {
        if (document.hidden) stop(); else play();
    });

    if (REDUCE_MOTION) {
        // Static: draw a single frame whenever the image changes.
        var renderOnce = () => {
            gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, texCur);
            gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, texNext);
            gl.uniform1f(uProgress, progress);
            gl.uniform2f(uMouse, 0.5, 0.5);
            gl.uniform1f(uHover, 0); gl.uniform1f(uTime, 0);
            gl.uniform2f(uRes, canvas.width, canvas.height);
            gl.uniform1f(uA0, aspectCur); gl.uniform1f(uA1, aspectNext);
            gl.drawArrays(gl.TRIANGLES, 0, 3);
        };
    } else {
        play();
    }

    const applyPending = async () => {
        if (dead) return;
        const url = pendingUrl;
        const entry = await loadTexture(url);
        if (dead) return;
        if (!entry) {
            // First image couldn't be uploaded -> abandon WebGL and fall back.
            if (currentUrl === null) {
                dead = true;
                stop();
                if (canvas.parentNode) canvas.parentNode.removeChild(canvas);
                if (typeof onFail === 'function') onFail();
            }
            return;
        }
        if (url !== pendingUrl) return;
        if (currentUrl === null) {
            // First image: show it straight away (progress 0 == current slot).
            texCur = entry.tex; aspectCur = entry.aspect; currentUrl = url; progress = 0;
        } else {
            // Animate current (progress 0) -> next (progress 1).
            texNext = entry.tex; aspectNext = entry.aspect; currentUrl = url;
            progress = 0; transitioning = true;
        }
        if (REDUCE_MOTION) { progress = 0; transitioning = false; texCur = entry.tex; aspectCur = entry.aspect; renderOnce(); }
    };

    return {
        show(url) {
            if (!url || url === pendingUrl) return;
            pendingUrl = url;
            applyPending();
        },
        setPointer(x, y) { tX = Math.max(0, Math.min(1, x)); tY = Math.max(0, Math.min(1, y)); },
        setHover(on) { tHover = on ? 1 : 0; },
    };
}

/**
 * Fallback preview for browsers without WebGL: two cross-fading layers
 * plus a light cursor parallax (the original behaviour).
 */
function createDomPreview(container) {
    const layerA = document.createElement('div');
    const layerB = document.createElement('div');
    layerA.className = 'media-layer';
    layerB.className = 'media-layer';
    container.append(layerA, layerB);

    let front = layerA, back = layerB, current = null;
    let curX = 0, curY = 0, tX = 0, tY = 0, raf = null;

    const render = () => {
        curX += (tX - curX) * 0.08; curY += (tY - curY) * 0.08;
        const t = `translate(${curX.toFixed(2)}px, ${curY.toFixed(2)}px)`;
        layerA.style.transform = t; layerB.style.transform = t;
        if (Math.abs(tX - curX) > 0.1 || Math.abs(tY - curY) > 0.1) raf = requestAnimationFrame(render);
        else raf = null;
    };

    return {
        show(url) {
            if (!url || url === current) return;
            current = url;
            new Image().src = url;
            back.style.backgroundImage = `url('${url}')`;
            back.classList.add('is-visible');
            front.classList.remove('is-visible');
            [front, back] = [back, front];
        },
        setPointer(x, y) {
            if (REDUCE_MOTION) return;
            tX = (x - 0.5) * -36; tY = (y - 0.5) * -36;
            if (!raf) raf = requestAnimationFrame(render);
        },
        setHover() {},
    };
}

/* ===================================================================
   3. Mobile navigation toggle (kept for safety; nav is inline on mobile)
   =================================================================== */
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

/* ===================================================================
   4. Reveal content blocks as they scroll into view
   =================================================================== */
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

/* ===================================================================
   5. Magnetic links: nav and pager drift toward the cursor on hover
   =================================================================== */
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
