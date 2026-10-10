/* ════════════════════════════════════════════════════════
   Zonas de paso de página + deslizar
   - Tocar el borde izquierdo o derecho de una página pasa página
   - NUNCA le roba el toque a un plato, enlace o botón:
     si el toque cae en una fila de la carta, se abre su ficha.
   - Deslizar el dedo en horizontal también pasa página
   ════════════════════════════════════════════════════════ */
(function () {
    'use strict';

    function q(sel) { return document.querySelector(sel); }
    function isRtl() {
        return (document.documentElement.getAttribute('dir') || '').toLowerCase() === 'rtl';
    }

    /* ── 0. Saber si el libro se está moviendo ────────────────
       turn.js no lo expone de forma fiable en el contenedor, así que
       apuntamos cuándo empieza y cuándo acaba cada giro. ── */
    var lastTurnCall = 0;   // último giro pedido
    var lastTurned = 0;     // último giro terminado

    if (window.jQuery && jQuery.fn && jQuery.fn.turn) {
        var turnOriginal = jQuery.fn.turn;
        jQuery.fn.turn = function () {
            var a = arguments[0];
            if (a === 'next' || a === 'previous' || typeof a === 'number') {
                lastTurnCall = Date.now();
            }
            return turnOriginal.apply(this, arguments);
        };
    }

    function moviendo() {
        return (Date.now() - lastTurnCall) < 460 || (Date.now() - lastTurned) < 160;
    }

    /* ── 1. Pista visual en los bordes (pointer-events: none) ── */
    function injectZones() {
        var pages = document.querySelectorAll('#flipbook .page');
        for (var i = 0; i < pages.length; i++) {
            var pg = pages[i];
            if (pg.querySelector('.turn-zone')) continue;
            // portada y contraportada (con foto) no llevan pista
            if (!pg.querySelector('.page-content.page-list')) continue;
            var prev = document.createElement('div');
            prev.className = 'turn-zone zone-prev';
            var next = document.createElement('div');
            next.className = 'turn-zone zone-next';
            pg.appendChild(prev);
            pg.appendChild(next);
        }
    }

    /* ── 2. Caras del libro: en doble página el lomo no lleva pista ── */
    function paintFaces() {
        var dbl = false;
        try { dbl = jQuery('.flipbook').turn('display') === 'double'; } catch (e) {}
        var pages = document.querySelectorAll('#flipbook .page');
        for (var i = 0; i < pages.length; i++) {
            var pg = pages[i];
            pg.classList.remove('face-left', 'face-right');
            if (!dbl || isRtl()) continue;
            var n = parseInt(pg.getAttribute('data-page'), 10) || 0;
            if (n === 1) continue;
            pg.classList.add(n % 2 === 0 ? 'face-left' : 'face-right');
        }
    }

    /* ── 3. Toque en el borde: reutiliza los botones ◀ ▶ (misma lógica) ── */
    function flip(forward) {
        if (moviendo()) return;
        if (window.resetMenuNav) window.resetMenuNav();   // sin saltos de sección pendientes
        var b = q(forward ? '#flipbookCtrlNext' : '#flipbookCtrlPrev');
        if (b) b.click();
    }

    var BLOCKERS = ['.list-item', 'a', 'button', '.island-btn', '.allerg-link',
        '.page-header', '.flipbook-controls', '.turn-zone', '.dish-modal', '#zoomOverlay'];

    function isInteractive(el) {
        for (var i = 0; i < BLOCKERS.length; i++) {
            if (el.closest && el.closest(BLOCKERS[i])) return true;
        }
        return false;
    }

    function faceOf(el) {
        while (el && el.nodeType === 1) {
            if (el.classList && el.classList.contains('page')) return el;
            el = el.parentNode;
        }
        return null;
    }

    function onTap(e) {
        if (window.isTourOpen && window.isTourOpen()) return;
        if (!e.target || !e.target.closest) return;
        if (isInteractive(e.target)) return;
        var face = faceOf(e.target);
        if (!face || !face.querySelector('.turn-zone')) return;
        var r = face.getBoundingClientRect();
        if (!r.width) return;
        var x = e.clientX - r.left;
        var band = Math.max(40, Math.min(r.width * 0.13, 92));
        var rtl = isRtl();
        if (x <= band) { flip(rtl); return; }          // borde izquierdo = atrás
        if (x >= r.width - band) { flip(!rtl); }       // borde derecho = adelante
    }

    /* ── 4. Deslizar (swipe) ── */
    var MIN = 55;            // px horizontales mínimos
    var sx = 0, sy = 0, tracking = false, swipedAt = 0;

    function start(x, y) { sx = x; sy = y; tracking = true; }

    function move(x, y) {
        if (!tracking) return;
        if (window.isTourOpen && window.isTourOpen()) { tracking = false; return; }
        var dx = x - sx, dy = y - sy;
        if (Math.abs(dx) < MIN) return;
        if (Math.abs(dy) > Math.abs(dx) * 0.8) return;   // gesto vertical: no es pasar página
        tracking = false;
        swipedAt = Date.now();
        var forward = dx < 0;                            // hacia la izquierda = adelante
        if (isRtl()) forward = !forward;
        flip(forward);
    }

    function end() { tracking = false; }

    /* ── Enganches ── */
    var bk = q('#flipbook');

    if (bk) {
        bk.addEventListener('click', onTap);
        bk.addEventListener('touchstart', function (e) {
            var t = e.touches[0];
            if (t) start(t.clientX, t.clientY);
        }, { passive: true });
        bk.addEventListener('touchmove', function (e) {
            var t = e.touches[0];
            if (t) move(t.clientX, t.clientY);
        }, { passive: true });
        bk.addEventListener('touchend', end, { passive: true });
        bk.addEventListener('touchcancel', end, { passive: true });
        bk.addEventListener('mousedown', function (e) { start(e.clientX, e.clientY); });
    }

    document.addEventListener('mousemove', function (e) { move(e.clientX, e.clientY); });
    document.addEventListener('mouseup', end);

    // Si el toque venía de deslizar, no debe abrir la ficha del plato
    document.addEventListener('click', function (e) {
        if (swipedAt && Date.now() - swipedAt < 420) {
            e.stopPropagation();
            e.preventDefault();
        }
    }, true);

    /* ── Arranque ── */
    injectZones();
    paintFaces();

    try {
        jQuery('.flipbook').on('turned', function () {
            lastTurned = Date.now();
            paintFaces();
        });
        jQuery(window).on('resize orientationchange', function () { setTimeout(paintFaces, 250); });
    } catch (e) {}

    // turn.js saca y vuelve a meter páginas en el DOM: nos aseguramos de que
    // todas mantienen su pista (el bucle es barato y solo actúa si falta).
    if (window.MutationObserver && bk) {
        var timer = null;
        new MutationObserver(function () {
            if (timer) return;
            timer = setTimeout(function () { timer = null; injectZones(); }, 150);
        }).observe(bk, { childList: true, subtree: true });
    }

    window.repaintTurnZones = paintFaces;
})();
