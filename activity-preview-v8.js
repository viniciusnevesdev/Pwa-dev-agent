(() => {
  const UI_VERSION = '0.8.20';
  function setTextIfChanged(node, value) { if (node && node.textContent !== value) node.textContent = value; }
  function setHiddenIfChanged(node, hidden) { if (node && node.hidden !== hidden) node.hidden = hidden; }
  function ensureVersion() { setTextIfChanged(document.querySelector('#appVersion'), `v${UI_VERSION}`); }
  function ensurePreviewBox() {
    const card = document.querySelector('#resultCard'); if (!card) return null;
    let box = document.querySelector('#navigablePreview'); if (box) return box;
    box = document.createElement('div'); box.id = 'navigablePreview'; box.className = 'preview-helper preview-unavailable';
    box.innerHTML = `<button id="previewUnavailable" class="secondary-button preview-button" type="button" disabled>Abrir prévia navegável</button><a id="previewLink" class="secondary-button preview-button" target="_blank" rel="noopener" hidden>Abrir prévia navegável</a><p class="helper" id="previewHint">Toque neste botão para pré-visualizar uma tarefa recém-executada, antes de publicá-la.</p>`;
    card.querySelector('.result-actions')?.insertAdjacentElement('beforebegin', box); return box;
  }
  function updatePreview() {
    const box = ensurePreviewBox(); if (!box) return;
    const url = activeResult?.previewUrl || null;
    const publish = document.querySelector('#publishButton');
    const available = Boolean(url && publish && !publish.hidden);
    const unavailable = document.querySelector('#previewUnavailable');
    const link = document.querySelector('#previewLink');
    const hint = document.querySelector('#previewHint');
    setHiddenIfChanged(unavailable, available);
    setHiddenIfChanged(link, !available);
    box.classList.toggle('preview-unavailable', !available);
    if (available) {
      if (link && link.href !== url) link.href = url;
      setTextIfChanged(hint, 'Cópia temporária: navegue antes de publicar.');
    } else setTextIfChanged(hint, 'Toque neste botão para pré-visualizar uma tarefa recém-executada, antes de publicá-la.');
  }
  function updateActivity() {
    const indicator = document.querySelector('#activityIndicator'); if (!indicator) return;
    const state = window.devAgentActivityState || 'idle';
    const labels = {
      idle: 'Nenhuma tarefa em execução',
      preparing: 'Preparando tarefa',
      checking: 'Consultando tarefa',
      running: 'Executando remotamente',
      publishing: 'Publicando no GitHub',
      review: 'Pronto para publicar',
      completed: 'Tarefa concluída',
      published: 'Última tarefa publicada',
      discarded: 'Última tarefa descartada',
      cancelling: 'Cancelando tarefa',
      failed: 'Última tarefa falhou',
      missing: 'Sessão anterior encerrada'
    };
    setHiddenIfChanged(indicator, false);
    indicator.className = `activity-indicator activity-${state}`;
    setTextIfChanged(document.querySelector('#activityText'), labels[state] || labels.idle);
  }
  function refresh() { ensureVersion(); updateActivity(); updatePreview(); }
  document.addEventListener('devagent:state', refresh);
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') setTimeout(refresh, 80); });
  window.addEventListener('pageshow', refresh); window.addEventListener('focus', refresh); refresh();
})();
