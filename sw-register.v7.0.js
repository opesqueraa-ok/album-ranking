// SW register v7.0 — mata SW y caches viejos y registra el nuevo
(function () {
  if (!('serviceWorker' in navigator)) return;

  // 1) Desregistrar SW antiguos (v6.* o cualquier otro que no sea el v7.0)
  navigator.serviceWorker.getRegistrations().then((regs) => {
    regs.forEach((reg) => {
      const url =
        reg.active?.scriptURL ||
        reg installing?.scriptURL ||
        reg.waiting?.scriptURL ||
        '';
      if (!/sw\.v7\.0\.js(\?v=7\.0)?$/.test(url)) {
        reg.unregister();
      }
    });
  });

  // 2) Borrar caches antiguos (v6.*)
  if (window.caches) {
    caches.keys().then((keys) => {
      keys
        .filter(
          (k) =>
            k === 'albumrater-v6.5' ||
            /^albumrater-v6(\.|$)/.test(k) ||
            /^albumrater-v[0-6]\./.test(k)
        )
        .forEach((k) => caches.delete(k));
    });
  }

  // 3) Registrar el nuevo SW v7.0 y refrescar cuando tome control
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('./sw.v7.0.js?v=7.0', { scope: './' })
      .then(() => {
        let reloaded = false;
        navigator.serviceWorker.addEventListener('controllerchange', () => {
          if (reloaded) return;
          reloaded = true;
          // recarga para que tome el HTML/JS v7
          location.reload();
        });
      })
      .catch(console.error);
  });
})();
