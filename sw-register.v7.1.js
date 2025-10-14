// sw-register.v7.1.js
(function () {
  if (!('serviceWorker' in navigator)) return;

  // Mata cualquier SW viejo que no sea el v7.1
  navigator.serviceWorker.getRegistrations().then(regs => {
    regs.forEach(reg => {
      const url = String(reg.active?.scriptURL || reg.installing?.scriptURL || reg.waiting?.scriptURL || '');
      if (!url.includes('sw.v7.1.js')) reg.unregister().catch(() => {});
    });
  });

  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.v7.1.js?v=7.1', { scope: './' }).catch(() => {});
  });
})();
