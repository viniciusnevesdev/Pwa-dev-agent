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

  // Impede que o código legado volte a registrar sw.js depois que acabamos de limpá-lo.
  // O Dev Agent depende pouco de uso offline e, neste momento, estabilidade no Safari
  // é mais importante do que cache persistente.
  if ('serviceWorker' in navigator) {
    try {
      navigator.serviceWorker.register = async () => ({ active: null, installing: null, waiting: null, scope: location.href });
    } catch {}
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
    setTimeout(purgeLegacyPwaState, 150);
    setTimeout(purgeLegacyPwaState, 1200);
  }, { once: true });
  window.addEventListener('pageshow', () => setTimeout(purgeLegacyPwaState, 80));
})();
