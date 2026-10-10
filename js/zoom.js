/* ════════════════════════════════════════════════════════
   LUPA — capa superpuesta; NO modifica el flipbook
   Integrada desde "El Maná v2 mana": mismos gestos, mismos
   límites (100%–500%), mismo auto-zoom y las mismas salidas.
   Entrare: pulsante 🔍 | Uscire: ✕, tasto Esc o riducendo lo zoom al minimo
   ════════════════════════════════════════════════════════ */

/* Tamaño natural (px de maquetación) del clon de la página visible */
var zoomContentW = 0, zoomContentH = 0;

function zoomIsOpen() {
    var overlay = document.getElementById('zoomOverlay');
    return !!(overlay && overlay.classList.contains('open'));
}

/* En la lupa el zoom es propio: se bloquea el nativo (pellizco/doble-tap)
   fuera de la capa, igual que en el modo Carta original. */
function lockNativeZoom(on) {
    var mv = document.querySelector('meta[name="viewport"]');
    if (!mv) return;
    mv.setAttribute('content', on
        ? 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover'
        : 'width=device-width, initial-scale=1.0, viewport-fit=cover');
}

function openPageZoom() {
    // Detectar la página que está realmente visible en la carta
    var el = getVisiblePageForZoom();
    if (el) { renderZoomPage(el); return; }
    // Respaldo por número de página
    var fb = window.cedroFlip;
    if (!fb || !fb.turn) return;
    var p = fb.turn('page') || 1;
    openPageZoomNumber(p);
}

function isZoomPageVisible(el) {
    if (!el) return false;
    var cs = window.getComputedStyle ? window.getComputedStyle(el) : null;
    if (cs && (cs.display === 'none' || cs.visibility === 'hidden')) return false;
    var r = el.getBoundingClientRect();
    if (!r || r.width <= 2 || r.height <= 2) return false;
    // Fuera del marco del libro no cuenta: turn.js deja páginas vecinas
    // posicionadas en el mismo sitio y se colarían en la detección.
    var book = document.getElementById('flipbook');
    if (book) {
        var br = book.getBoundingClientRect();
        if (r.right <= br.left + 1 || r.left >= br.right - 1 ||
            r.bottom <= br.top + 1 || r.top >= br.bottom - 1) return false;
        if (r.width < br.width * 0.25 || r.height < br.height * 0.5) return false;
    }
    return true;
}

function getVisiblePageForZoom() {
    var pages = document.querySelectorAll('#flipbook .page');
    var vis = [];
    for (var i = 0; i < pages.length; i++) {
        if (isZoomPageVisible(pages[i])) vis.push(pages[i]);
    }
    if (vis.length === 0) return null;

    // La página que reporta el flipbook manda (y su compañera de spread)
    var fb = window.cedroFlip;
    var cur = (fb && fb.turn) ? (parseInt(fb.turn('page'), 10) || 0) : 0;
    if (cur) {
        for (var k = 0; k < vis.length; k++) {
            if (parseInt(vis[k].getAttribute('data-page'), 10) === cur) return vis[k];
        }
        for (var m = 0; m < vis.length; m++) {
            if (parseInt(vis[m].getAttribute('data-page'), 10) === cur + 1) return vis[m];
        }
    }

    if (vis.length === 1) return vis[0];
    // Varias páginas visibles (vista doble en escritorio): elegir la más cercana al centro
    var cx = window.innerWidth / 2, cy = window.innerHeight / 2;
    var best = null, bestD = Infinity;
    for (var j = 0; j < vis.length; j++) {
        var rc = vis[j].getBoundingClientRect();
        var mcx = rc.left + rc.width / 2, mcy = rc.top + rc.height / 2;
        var d = Math.pow(mcx - cx, 2) + Math.pow(mcy - cy, 2);
        if (d < bestD - 0.001) { bestD = d; best = vis[j]; }
    }
    return best;
}

function openPageZoomNumber(p) {
    p = parseInt(p, 10) || 1;
    var maxP = document.querySelectorAll('#flipbook .page').length || 20;
    if (p < 1) p = 1;
    if (p > maxP) p = maxP;
    var pageEl = document.querySelector('#flipbook .page[data-page="' + p + '"]');
    if (pageEl) renderZoomPage(pageEl);
}

/* Clon fiel de la página visible: mismo HTML y mismos estilos en línea.
   (En el original se ampliaba img/libro/N.jpeg; aquí las páginas del menú
   son HTML vivo, así que se amplía su clon con las mismas proporciones.) */
function renderZoomPage(pageEl) {
    var host = document.getElementById('zoomImg');
    if (!host || !pageEl) return;

    var rect = pageEl.getBoundingClientRect();
    var w = Math.max(1, Math.round(rect.width));
    var h = Math.max(1, Math.round(rect.height));

    var clone = pageEl.cloneNode(true);
    var ids = clone.querySelectorAll('[id]');
    for (var i = 0; i < ids.length; i++) ids[i].removeAttribute('id');
    clone.removeAttribute('id');
    // Neutralizar el posicionamiento en línea que turn.js aplica a las páginas
    clone.style.position = 'relative';
    clone.style.top = '0';
    clone.style.left = '0';
    clone.style.right = 'auto';
    clone.style.bottom = 'auto';
    clone.style.margin = '0';
    clone.style.zIndex = 'auto';
    clone.style.transform = 'none';
    clone.style.display = 'block';
    clone.style.visibility = 'visible';
    clone.style.width = w + 'px';
    clone.style.height = h + 'px';

    host.innerHTML = '';
    host.appendChild(clone);
    host.style.width = w + 'px';
    host.style.height = h + 'px';
    host.style.pointerEvents = 'none'; // el libro no debe recibir clics dentro de la lupa

    zoomContentW = w;
    zoomContentH = h;

    lockNativeZoom(true);
    showZoomOverlay();
}

function closeZoomOverlay() {
    var overlay = document.getElementById('zoomOverlay');
    if (overlay) {
        overlay.classList.remove('open');
        overlay.setAttribute('aria-hidden', 'true');
    }
    var host = document.getElementById('zoomImg');
    if (host) {
        host.style.transform = 'none';
        host.innerHTML = '';
    }
    lockNativeZoom(false);
    if (typeof window.__zoomCtrl === 'object' && window.__zoomCtrl) {
        window.__zoomCtrl.cleanup && window.__zoomCtrl.cleanup();
    }
}

function showZoomOverlay() {
    var overlay = document.getElementById('zoomOverlay');
    if (!overlay) return;
    overlay.classList.add('open');
    overlay.setAttribute('aria-hidden', 'false');
    if (typeof window.__zoomCtrl === 'object' && window.__zoomCtrl) {
        window.__zoomCtrl.onReady && window.__zoomCtrl.onReady();
    }
}

function maybeShowCartaZoomHint() {
    var supportsTouch = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);
    if (!supportsTouch) return;
    try {
        if (sessionStorage.getItem('elmana_zoom_hint')) return;
        sessionStorage.setItem('elmana_zoom_hint', '1');
    } catch (e) { /* sin almacenamiento */ }
    var hint = document.getElementById('zoomHint');
    if (!hint) return;
    hint.classList.add('show');
    setTimeout(function () { hint.classList.remove('show'); }, 3800);
}

// Aviso de la lupa una sola vez por sesión (tras el preloader)
window.addEventListener('load', function () {
    setTimeout(maybeShowCartaZoomHint, 2600);
});

document.addEventListener('gesturestart', function (e) {
    if (zoomIsOpen()) e.preventDefault();
});
document.addEventListener('touchmove', function (e) {
    var stage = document.getElementById('zoomStage');
    if (!zoomIsOpen()) return;
    if (e.touches.length > 1 && !(stage && stage.contains(e.target))) {
        e.preventDefault();
    }
}, { passive: false });

(function initZoomStageController() {
    var overlay = document.getElementById('zoomOverlay');
    var stage = document.getElementById('zoomStage');
    var img = document.getElementById('zoomImg');
    var inBtn = document.getElementById('zoomInBtn');
    var outBtn = document.getElementById('zoomOutBtn');
    var level = document.getElementById('zoomLevel');
    if (!overlay || !stage || !img) return;

    var scale = 1, tx = 0, ty = 0, baseW = 0, baseH = 0, fit = 1;
    var MIN_S = 1, MAX_S = 5, needAutoZoom = false;

    function rel(cx, cy) {
        var r = stage.getBoundingClientRect();
        return { x: cx - r.left, y: cy - r.top };
    }
    function clampPos() {
        var sw = stage.clientWidth, sh = stage.clientHeight;
        var vw = baseW * scale, vh = baseH * scale;
        if (vw <= sw) tx = Math.round((sw - vw) / 2);
        else tx = Math.max(sw - vw, Math.min(0, tx));
        if (vh <= sh) ty = Math.round((sh - vh) / 2);
        else ty = Math.max(sh - vh, Math.min(0, ty));
    }
    function apply() {
        img.style.transform = 'translate(' + tx + 'px,' + ty + 'px) scale(' + (scale * fit) + ')';
        if (level) level.textContent = Math.round(scale * 100) + '%';
        if (scale > 1) stage.classList.add('zoomed'); else stage.classList.remove('zoomed');
    }
    function setScaleAt(px, py, ns) {
        // Si el cliente aleja hasta el mínimo → se sale de la lupa automáticamente
        if (ns <= MIN_S) { closeZoomOverlay(); return; }
        ns = Math.min(MAX_S, ns);
        if (ns === scale) return;
        var k = ns / scale;
        tx = px - (px - tx) * k;
        ty = py - (py - ty) * k;
        scale = ns;
        clampPos();
        apply();
    }
    function zoomAt(px, py, factor) { setScaleAt(px, py, scale * factor); }

    function initZoomStage() {
        if (!zoomContentW || !zoomContentH) return;
        var sw = stage.clientWidth, sh = stage.clientHeight;
        if (!sw || !sh) return;
        var nw = zoomContentW, nh = zoomContentH;
        fit = Math.min(sw / nw, sh / nh);
        baseW = Math.round(nw * fit);
        baseH = Math.round(nh * fit);
        scale = 1;
        clampPos();
        apply();
        // Auto-zoom inicial suave (~1.4x) empezando por la parte superior de la página
        if (needAutoZoom) {
            needAutoZoom = false;
            setTimeout(function () {
                scale = 1.4;
                ty = 0;
                clampPos();
                img.style.transition = 'transform .28s ease';
                apply();
                setTimeout(function () { img.style.transition = 'none'; }, 320);
            }, 30);
        }
    }

    window.__zoomCtrl = {
        onReady: function () {
            needAutoZoom = true;
            initZoomStage();
        },
        cleanup: function () {
            scale = 1; tx = 0; ty = 0; fit = 1; needAutoZoom = false;
            img.style.transition = 'none';
            img.style.transform = 'none';
            // Limpiar gestos/dedos fantasma para que la lupa funcione al reabrir
            pts.length = 0; pinch = null; drag = null; mDown = null;
            lastT = 0; lastTX = 0; lastTY = 0;
        }
    };

    if (inBtn) inBtn.addEventListener('click', function () {
        zoomAt(stage.clientWidth / 2, stage.clientHeight / 2, 1.5);
    });
    if (outBtn) outBtn.addEventListener('click', function () {
        zoomAt(stage.clientWidth / 2, stage.clientHeight / 2, 1 / 1.5);
    });

    // ── Mouse (escritorio) ──
    var mDown = null, lastMD = 0, lastMX = 0, lastMY = 0;
    stage.addEventListener('mousedown', function (e) {
        if (e.button !== 0) return;
        mDown = { x: e.clientX, y: e.clientY, tx0: tx, ty0: ty, moved: false };
        var now = Date.now();
        if (now - lastMD < 300 && Math.abs(e.clientX - lastMX) < 40 && Math.abs(e.clientY - lastMY) < 40) {
            var c = rel(e.clientX, e.clientY);
            if (scale > 1) setScaleAt(c.x, c.y, 1); else zoomAt(c.x, c.y, 2);
            lastMD = 0;
        } else {
            lastMD = now; lastMX = e.clientX; lastMY = e.clientY;
        }
    });
    document.addEventListener('mousemove', function (e) {
        if (!mDown) return;
        var dx = e.clientX - mDown.x, dy = e.clientY - mDown.y;
        if (Math.abs(dx) > 3 || Math.abs(dy) > 3) mDown.moved = true;
        if (scale > 1) {
            tx = mDown.tx0 + dx;
            ty = mDown.ty0 + dy;
            clampPos();
            apply();
        }
    });
    document.addEventListener('mouseup', function () { mDown = null; });
    stage.addEventListener('wheel', function (e) {
        e.preventDefault();
        var c = rel(e.clientX, e.clientY);
        zoomAt(c.x, c.y, e.deltaY < 0 ? 1.25 : 0.8);
    }, { passive: false });

    // ── Táctil (pinch / arrastre / doble-tap) ──
    var pts = [], pinch = null, drag = null, lastT = 0, lastTX = 0, lastTY = 0;

    function findPt(id) {
        for (var i = 0; i < pts.length; i++) if (pts[i].id === id) return pts[i];
        return null;
    }
    function dist(a, b) { return Math.sqrt(Math.pow(b.x - a.x, 2) + Math.pow(b.y - a.y, 2)); }

    stage.addEventListener('touchstart', function (e) {
        if (!overlay.classList.contains('open')) return;
        e.preventDefault();
        for (var i = 0; i < e.changedTouches.length; i++) {
            var t = e.changedTouches[i];
            pts.push({ id: t.identifier, x: t.clientX, y: t.clientY });
        }
        if (pts.length === 1) {
            var p0 = pts[0];
            drag = { x: p0.x, y: p0.y, tx0: tx, ty0: ty, moved: false };
            var now = Date.now();
            if (now - lastT < 300 && Math.abs(p0.x - lastTX) < 40 && Math.abs(p0.y - lastTY) < 40) {
                var c = rel(p0.x, p0.y);
                if (scale > 1) setScaleAt(c.x, c.y, 1); else zoomAt(c.x, c.y, 2);
                lastT = 0;
            } else {
                lastT = now; lastTX = p0.x; lastTY = p0.y;
            }
        } else if (pts.length === 2) {
            drag = null;
            pinch = { d0: dist(pts[0], pts[1]), s0: scale };
        }
    }, { passive: false });

    stage.addEventListener('touchmove', function (e) {
        if (!overlay.classList.contains('open')) return;
        e.preventDefault();
        for (var i = 0; i < e.changedTouches.length; i++) {
            var t = e.changedTouches[i];
            var f = findPt(t.identifier);
            if (f) { f.x = t.clientX; f.y = t.clientY; }
        }
        if (pts.length === 2 && pinch) {
            var mid = rel((pts[0].x + pts[1].x) / 2, (pts[0].y + pts[1].y) / 2);
            var d = dist(pts[0], pts[1]);
            if (pinch.d0 > 0) setScaleAt(mid.x, mid.y, pinch.s0 * (d / pinch.d0));
        } else if (pts.length === 1 && drag) {
            var p1 = pts[0];
            var dx = p1.x - drag.x, dy = p1.y - drag.y;
            if (Math.abs(dx) > 4 || Math.abs(dy) > 4) drag.moved = true;
            if (scale > 1) {
                tx = drag.tx0 + dx;
                ty = drag.ty0 + dy;
                clampPos();
                apply();
            }
        }
    }, { passive: false });

    function endTouch(e) {
        if (!overlay.classList.contains('open')) return;
        for (var i = 0; i < e.changedTouches.length; i++) {
            var t = e.changedTouches[i];
            for (var j = pts.length - 1; j >= 0; j--) {
                if (pts[j].id === t.identifier) pts.splice(j, 1);
            }
        }
        if (pts.length < 2) pinch = null;
        if (pts.length === 0) drag = null;
    }
    stage.addEventListener('touchend', endTouch, { passive: true });
    stage.addEventListener('touchcancel', endTouch, { passive: true });

    // Chiudi con il tasto Esc
    document.addEventListener('keydown', function (e) {
        if ((e.key === 'Escape' || e.keyCode === 27) && overlay.classList.contains('open')) closeZoomOverlay();
    });

    // Reajustar al girar/redimensionar mientras está abierta
    window.addEventListener('resize', function () {
        if (overlay.classList.contains('open')) setTimeout(initZoomStage, 80);
    });
})();
