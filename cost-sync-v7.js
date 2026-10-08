(() => {
  const settledSessions = new Set();
  let syncing = false;

  function updateVisibleCost(costBrl) {
    const meta = document.querySelector('#resultMeta');
    if (!meta || !Number.isFinite(costBrl) || costBrl <= 0) return;
    let chip = Array.from(meta.querySelectorAll('span')).find(el => el.textContent?.startsWith('estimado '));
    if (!chip) {
      chip = document.createElement('span');
      meta.appendChild(chip);
    }
    chip.textContent = `estimado ${brl(costBrl)}`;
  }

  async function syncFinalCost() {
    if (syncing || !activeSessionId || settledSessions.has(activeSessionId)) return;
    if (!activeResult || activeResult.status !== 'idle' || !activeResult.resultReady) return;

    const sessionId = activeSessionId;
    syncing = true;
    try {
      const data = await api(`/agent/status?session_id=${encodeURIComponent(sessionId)}`);
      if (sessionId !== activeSessionId || data.status !== 'idle' || !data.resultReady) return;

      const costBrl = Number(data.cost?.minimumTotalBrl || 0);
      const totalTokens = Number(data.usage?.total_tokens || 0);

      if (costBrl > 0) {
        activeResult = data;
        const existing = getHistory().find(item => item.sessionId === sessionId);
        saveHistoryItem({
          ...(existing || {}),
          sessionId,
          date: existing?.date || new Date().toISOString(),
          project: data.project || activeMeta?.project || existing?.project,
          task: activeMeta?.task || existing?.task || taskInput.value.trim(),
          model: data.model || existing?.model,
          costBrl: Math.max(Number(existing?.costBrl || 0), costBrl),
          costPending: false,
          status: existing?.status || ((data.result?.changes || []).length ? 'aguardando publicação' : 'concluída')
        });
        updateVisibleCost(costBrl);
      } else {
        const existing = getHistory().find(item => item.sessionId === sessionId);
        if (existing) saveHistoryItem({ ...existing, costBrl: Number(existing.costBrl) > 0 ? existing.costBrl : null, costPending: true });
      }

      // Em uma sessão já encerrada, usage.total_tokens indica que a telemetria final chegou.
      if (costBrl > 0 && totalTokens > 0) settledSessions.add(sessionId);
    } catch {
      // A sincronização é complementar; falhas temporárias não devem afetar a tarefa.
    } finally {
      syncing = false;
    }
  }

  // A Agents API pode disponibilizar o resultado alguns segundos antes da telemetria final de custo.
  // Fazemos uma segunda sincronização leve enquanto a tarefa aguarda aprovação.
  setInterval(syncFinalCost, 4000);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') syncFinalCost();
  });
  window.addEventListener('pageshow', syncFinalCost);
})();
