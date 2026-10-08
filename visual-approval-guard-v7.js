(() => {
  const visualTaskPattern = /(visual|layout|design|cor|fonte|texto|t[ií]tulo|[ií]cone|bot[aã]o|tela|interface|posi[cç][aã]o|borda|fundo|background|alinh|tamanho|altura|largura|padding|margin|glow|sombra|css|estilo|apar[eê]ncia|print|imagem|menu|barra|cart[aã]o|timeline)/i;

  function isVisualTask() {
    return Boolean(
      activeResult?.routing?.visualCheck ||
      activeMeta?.routing?.visualCheck ||
      visualTaskPattern.test(activeMeta?.task || taskInput?.value || '')
    );
  }

  function hasAfterPreview() {
    return Boolean(activeResult?.visuals?.after?.imageUrl);
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

    if (hasAfterPreview()) {
      notice.textContent = 'Prévia visual disponível. Confira a captura final antes de publicar.';
      publish.dataset.visualGuard = 'ready';
    } else {
      notice.textContent = 'A alteração é visual, mas a prévia automática final não foi gerada. Publicar sem conferir a tela pode introduzir regressões.';
      publish.dataset.visualGuard = 'missing';
    }
  }

  document.addEventListener('click', event => {
    const button = event.target.closest?.('#publishButton');
    if (!button || !isVisualTask() || hasAfterPreview()) return;

    const proceed = window.confirm(
      'A prévia visual final não foi gerada. Isso significa que o agente não conseguiu confirmar como a tela ficou.\n\nPublicar mesmo assim?'
    );
    if (!proceed) {
      event.preventDefault();
      event.stopImmediatePropagation();
    }
  }, true);

  const observer = new MutationObserver(updateVisualGate);
  observer.observe(document.documentElement, { subtree: true, childList: true, attributes: true, attributeFilter: ['hidden'] });
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') setTimeout(updateVisualGate, 100);
  });
  setInterval(updateVisualGate, 1500);
})();
