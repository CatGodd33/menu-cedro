(function() {
  'use strict';

  const preloader = document.getElementById('preloader');

  window.addEventListener('load', () => {
    setTimeout(() => preloader.classList.add('is-hidden'), 1400);
  });

  setTimeout(() => {
    if (!preloader.classList.contains('is-hidden')) preloader.classList.add('is-hidden');
  }, 4000);

})();
