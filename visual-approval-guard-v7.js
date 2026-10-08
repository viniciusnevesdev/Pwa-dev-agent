(() => {
  const visualTaskPattern = /(visual|layout|design|cor|fonte|texto|t[ií]tulo|[ií]cone|bot[aã]o|tela|interface|posi[cç][aã]o|borda|fundo|background|alinh|tamanho|altura|largura|padding|margin|glow|sombra|css|estilo|apar[eê]ncia|print|imagem|menu|barra|cart[aã]o|timeline)/i;

  function isVisualTask() {
    return Boolean(
      activeResult?.routing?.visualCheck ||
      activeMeta?.routing?.visualCheck ||
      visualTaskPattern.test(activeMeta?.task || taskInput?.value || '')
    );
  }

  function hasScreenshotPreview() {
    return Boolean(activeResult?.visuals?.after?.imageUrl);
  }

  function hasNavigablePreview() {
    return Boolean(activeResult?.previewUrl);
  }

  function updateVisualGate() {
    const card = document.querySelector('#resultCard');
    const publish = document.querySelector('#publishButton');
    if (!card || !publish || publish.hidden) return;

    let notice = document.querySelector('#visualApprovalNotice');
    if (!isVisualTask()) {
      if (notice) notice.remove();
      publish.dataset.visualGuard = 'not-required';
      return;
    }

    if (!notice) {
      notice = document.createElement('p');
      notice.id = 'visualApprovalNotice';
      notice.className = 'helper';
      const actions = card.querySelector('.result-actions');
      actions?.insertAdjacentElement('beforebegin', notice);
    }

    if (hasNavigablePreview()) {
      notice.textContent = 'Abra a prévia e revise antes de publicar.';
      publish.dataset.visualGuard = 'navigable';
    } else if (hasScreenshotPreview()) {
      notice.textContent = 'A prévia navegável não ficou disponível, mas existe uma captura visual final para conferência.';
      publish.dataset.visualGuard = 'screenshot';
    } else {
      notice.textContent = 'A alteração é visual, mas nenhuma prévia final foi gerada. Publicar sem conferir a interface pode introduzir regressões.';
      publish.dataset.visualGuard = 'missing';
    }
  }

  document.addEventListener('click', event => {
    const button = event.target.closest?.('#publishButton');
    if (!button || !isVisualTask()) return;
    // O próprio clique no botão com o rótulo explícito é a aprovação. Alertas nativos
    // podiam ficar invisíveis no Safari/PWA e davam a impressão de que nada aconteceu.
    // O aviso continua visível acima do botão para orientar a revisão antes do clique.
  }, true);

  document.addEventListener('devagent:state', updateVisualGate);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') setTimeout(updateVisualGate, 100);
  });
  window.addEventListener('pageshow', updateVisualGate);
})();
