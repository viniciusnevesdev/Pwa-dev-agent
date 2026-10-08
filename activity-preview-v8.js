(() => {
  const UI_VERSION = '0.8.2';

  function setTextIfChanged(node, value) {
    if (node && node.textContent !== value) node.textContent = value;
  }

  function setHiddenIfChanged(node, hidden) {
    if (node && node.hidden !== hidden) node.hidden = hidden;
  }

  function ensureVersion() {
    setTextIfChanged(document.querySelector('#appVersion'), `v${UI_VERSION}`);
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
    const shouldShow = Boolean(url && publish && !publish.hidden);
    setHiddenIfChanged(box, !shouldShow);
    if (!shouldShow) return;
    const link = document.querySelector('#previewLink');
    if (link && link.href !== url) link.href = url;
  }

  function updateActivity() {
    const indicator = document.querySelector('#activityIndicator');
    if (!indicator) return;
    const running = Boolean(activeSessionId && runButton?.disabled);
    setHiddenIfChanged(indicator, !running);
    if (!running) return;
    const badge = document.querySelector('#resultBadge')?.textContent?.trim();
    setTextIfChanged(document.querySelector('#activityText'), badge || 'Tarefa em execução remotamente');
  }

  function refresh() {
    ensureVersion();
    updateActivity();
    updatePreview();
  }

  // Não observa a árvore inteira do documento. A versão anterior reagia às próprias
  // alterações de texto/DOM e podia criar um ciclo contínuo de repintura no Safari iOS.
  // Uma atualização leve e espaçada é suficiente para esses elementos auxiliares.
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') setTimeout(refresh, 80);
  });
  window.addEventListener('pageshow', refresh);
  window.addEventListener('focus', refresh);
  setInterval(refresh, 1800);
  refresh();
})();
