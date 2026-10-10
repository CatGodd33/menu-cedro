/* ════════════════════════════════════════════════════════
   Tutorial del comensal — «Come si usa il menù»
   - Sale solo la primera vez (localStorage: cedro_tour_v1)
   - Se puede volver a abrir con el botón «?» junto a la lupa
   - ?tour=1 lo fuerza y ?notour=1 lo desactiva (para pruebas)
   ════════════════════════════════════════════════════════ */
(function () {
    'use strict';

    var KEY = 'cedro_tour_v1';
    var overlay = document.getElementById('tourOverlay');
    if (!overlay) return;

    // localStorage con reserva en sessionStorage (modo privado)
    var store = (function () {
        try {
            localStorage.setItem('__cedro_t', '1');
            localStorage.removeItem('__cedro_t');
            return localStorage;
        } catch (e) {
            try { return sessionStorage; } catch (e2) { return null; }
        }
    })();

    var isOpen = false;

    // El tutorial se quita solo a los pocos segundos (con barra de progreso)
    var AUTO_MS = 7000;
    var autoTimer = null;
    var barra = document.getElementById('tourBar');

    function reiniciarBarra() {
        if (!barra) return;
        barra.classList.remove('is-run');
        void barra.offsetWidth;          // fuerza a que la animación empiece de cero
        barra.classList.add('is-run');
    }

    function lang() { return window.currentMenuLang || 'it'; }

    function txt(key, fallback) {
        var U = window.UI_I18N;
        try { if (U && U[key] && U[key][lang()]) return U[key][lang()]; } catch (e) {}
        return fallback;
    }

    // Nombres accesibles del botón «?» y de las zonas de paso
    function syncLabels() {
        var btn = document.getElementById('btnTour');
        var name = txt('ui_tour_btn', 'Come si usa il menù');
        if (btn) {
            btn.setAttribute('title', name);
            btn.setAttribute('aria-label', name);
        }
        var prev = document.querySelector('.turn-zone.zone-prev');
        var next = document.querySelector('.turn-zone.zone-next');
        if (prev) prev.setAttribute('aria-label', txt('ui_turn_prev', 'Pagina precedente'));
        if (next) next.setAttribute('aria-label', txt('ui_turn_next', 'Pagina successiva'));
    }

    function openTour() {
        if (isOpen) return;
        isOpen = true;
        overlay.classList.add('open');
        document.body.classList.add('tour-open');
        reiniciarBarra();
        clearTimeout(autoTimer);
        autoTimer = setTimeout(function () { closeTour(); }, AUTO_MS);
        var ok = document.getElementById('tourOk');
        if (ok) { try { ok.focus(); } catch (e) {} }
    }

    function closeTour() {
        clearTimeout(autoTimer);
        autoTimer = null;
        if (barra) barra.classList.remove('is-run');
        if (isOpen) {
            isOpen = false;
            if (store) { try { store.setItem(KEY, '1'); } catch (e) {} }
        }
        overlay.classList.remove('open');
        document.body.classList.remove('tour-open');
    }

    window.openTour = openTour;
    window.closeTour = closeTour;
    window.isTourOpen = function () { return isOpen; };

    ['tourOk', 'tourSkip', 'tourClose', 'tourBackdrop'].forEach(function (id) {
        var el = document.getElementById(id);
        if (el) el.addEventListener('click', closeTour);
    });

    document.addEventListener('keydown', function (e) {
        if (e.keyCode === 27 && isOpen) closeTour();
    });

    // Al cambiar de idioma se renombran el botón «?» y las zonas
    document.addEventListener('click', function (e) {
        var t = e.target;
        while (t && t !== document) {
            if (t.classList && t.classList.contains('lang-btn')) {
                setTimeout(syncLabels, 80);
                return;
            }
            t = t.parentNode;
        }
    });

    syncLabels();

    var search = location.search || '';
    if (/[?&]notour=1/.test(search)) return;

    var seen = false;
    if (store) { try { seen = store.getItem(KEY) === '1'; } catch (e) {} }
    if (/[?&]tour=1/.test(search)) seen = false;
    if (seen) return;

    // El aviso de la lupa ya no hace falta: lo explica el tutorial
    try { sessionStorage.setItem('elmana_zoom_hint', '1'); } catch (e) {}

    if (document.readyState === 'complete') {
        setTimeout(openTour, 700);
    } else {
        window.addEventListener('load', function () { setTimeout(openTour, 700); });
    }
})();
