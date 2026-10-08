(() => {
  const nativeFetch = window.fetch.bind(window);

  async function purgeLegacyPwaState() {
    if ('serviceWorker' in navigator) {
      try {
        const registrations = await navigator.serviceWorker.getRegistrations();
        await Promise.all(registrations.map(registration => registration.unregister()));
      } catch {}
    }
    if ('caches' in window) {
      try {
        const keys = await caches.keys();
        await Promise.all(keys.map(key => caches.delete(key)));
      } catch {}
    }
  }

  // /setup-vault era executado em toda abertura apesar de o backend já garantir o
  // Vault ao iniciar uma tarefa. Evitar essa chamada deixa a abertura muito mais leve.
  window.fetch = (input, init) => {
    const url = typeof input === 'string' ? input : (input && input.url) || '';
    if (/\/setup-vault(?:\?|$)/.test(url)) {
      return Promise.resolve(new Response(JSON.stringify({ ok: true, skipped: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }));
    }
    return nativeFetch(input, init);
  };

  purgeLegacyPwaState();
  window.addEventListener('load', () => {
    // O app antigo ainda pode tentar registrar sw.js no evento load. Limpamos novamente
    // logo depois para impedir que um worker antigo volte a controlar o Safari.
    setTimeout(purgeLegacyPwaState, 250);
    setTimeout(purgeLegacyPwaState, 1500);
  }, { once: true });
  window.addEventListener('pageshow', () => setTimeout(purgeLegacyPwaState, 100));
})();
