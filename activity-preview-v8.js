(() => {
  const UI_VERSION = '0.8.0';

  function ensureVersion() {
    const target = document.querySelector('#appVersion');
    if (target) target.textContent = `v${UI_VERSION}`;
  }

  function ensurePreviewBox() {
    const card = document.querySelector('#resultCard');
    if (!card) return null;
    let box = document.querySelector('#navigablePreview');
    if (box) return box;
    box = document.createElement('div');
    box.id = 'navigablePreview';
    box.className = 'preview-helper';
    box.hidden = true;
    box.innerHTML = `
      <a id="previewLink" class="secondary-button preview-button" target="_blank" rel="noopener">Abrir prévia navegável</a>
      <p class="helper">Cópia temporária da tarefa. Navegue por ela antes de publicar; o link deixa de funcionar quando a sessão é publicada ou descartada.</p>`;
    const actions = card.querySelector('.result-actions');
    actions?.insertAdjacentElement('beforebegin', box);
    return box;
  }

  function currentPreviewUrl() {
    return activeResult?.previewUrl || null;
  }

  function updatePreview() {
    const box = ensurePreviewBox();
    if (!box) return;
    const url = currentPreviewUrl();
    const publish = document.querySelector('#publishButton');
    if (!url || !publish || publish.hidden) {
      box.hidden = true;
      return;
    }
    const link = document.querySelector('#previewLink');
    link.href = url;
    box.hidden = false;
  }

  function updateActivity() {
    const indicator = document.querySelector('#activityIndicator');
    if (!indicator) return;
    const running = Boolean(activeSessionId && runButton?.disabled);
    indicator.hidden = !running;
    const text = document.querySelector('#activityText');
    if (running && text) {
      const badge = document.querySelector('#resultBadge')?.textContent?.trim();
      text.textContent = badge || 'Tarefa em execução remotamente';
    }
  }

  function refresh() {
    ensureVersion();
    updateActivity();
    updatePreview();
  }

  const observer = new MutationObserver(refresh);
  observer.observe(document.documentElement, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ['hidden', 'disabled'] });
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') setTimeout(refresh, 100);
  });
  window.addEventListener('pageshow', refresh);
  setInterval(refresh, 1200);
  refresh();
})();
