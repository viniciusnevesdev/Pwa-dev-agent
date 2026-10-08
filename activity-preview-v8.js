(() => {
  const UI_VERSION = '0.8.6';
  function setTextIfChanged(node, value) { if (node && node.textContent !== value) node.textContent = value; }
  function setHiddenIfChanged(node, hidden) { if (node && node.hidden !== hidden) node.hidden = hidden; }
  function ensureVersion() { setTextIfChanged(document.querySelector('#appVersion'), `v${UI_VERSION}`); }
  function ensurePreviewBox() {
    const card = document.querySelector('#resultCard'); if (!card) return null;
    let box = document.querySelector('#navigablePreview'); if (box) return box;
    box = document.createElement('div'); box.id = 'navigablePreview'; box.className = 'preview-helper'; box.hidden = true;
    box.innerHTML = `<a id="previewLink" class="secondary-button preview-button" target="_blank" rel="noopener">Abrir prévia navegável</a><p class="helper">Cópia temporária da tarefa. Navegue por ela antes de publicar; o link deixa de funcionar quando a sessão é publicada ou descartada.</p>`;
    card.querySelector('.result-actions')?.insertAdjacentElement('beforebegin', box); return box;
  }
  function updatePreview() { const box = ensurePreviewBox(); if (!box) return; const url = activeResult?.previewUrl || null; const publish = document.querySelector('#publishButton'); const show = Boolean(url && publish && !publish.hidden); setHiddenIfChanged(box, !show); if (show) { const link = document.querySelector('#previewLink'); if (link && link.href !== url) link.href = url; } }
  function updateActivity() { const indicator = document.querySelector('#activityIndicator'); if (!indicator) return; const running = Boolean(activeSessionId && window.devAgentRemoteActivity); setHiddenIfChanged(indicator, !running); if (running) setTextIfChanged(document.querySelector('#activityText'), document.querySelector('#resultBadge')?.textContent?.trim() || 'Tarefa em execução remotamente'); }
  function refresh() { ensureVersion(); updateActivity(); updatePreview(); }
  document.addEventListener('devagent:state', refresh);
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') setTimeout(refresh, 80); });
  window.addEventListener('pageshow', refresh); window.addEventListener('focus', refresh); refresh();
})();
