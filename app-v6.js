const API_BASE = 'https://pwa-dev-agent-api.viniciusnevez123.workers.dev';
const ACTIVE_KEY = 'dev-agent-active-session-v2';
const HISTORY_KEY = 'dev-agent-history';

let projects = ['Painel','Registro-mental-v1','cronometro-app','crono-app','Controle-financeiro','Html-e-css-creator','Menu','Simbolos'];
let activeSessionId = null;
let activeResult = null;
let activeMeta = null;
let pollTimer = null;
let idleWithoutResultPolls = 0;
let consecutiveStatusFailures = 0;
let remoteActivityConfirmed = false;
let pollInFlight = false;
let publishInFlight = false;
window.devAgentRemoteActivity = false;

const $ = selector => document.querySelector(selector);
const projectSelect = $('#projectSelect');
const defaultProject = $('#defaultProject');
const imageInput = $('#imageInput');
const attachmentCount = $('#attachmentCount');
const settingsButton = $('#settingsButton');
const closeSettings = $('#closeSettings');
const settingsDialog = $('#settingsDialog');
const runButton = $('#runButton');
const runHelper = $('#runHelper');
const statusCard = $('#statusCard');
const modelSelect = $('#modelSelect');
const budgetInput = $('#budgetInput');
const taskInput = $('#taskInput');

function modelLabel(value) {
  const map = {
    'gpt-6-luna': 'Luna',
    'gpt-5.6-terra': 'Terra',
    'gpt-6.1-sol': 'Sol',
    'gpt-6-astra': 'Astra',
    luna: 'Luna', terra: 'Terra', sol: 'Sol', astra: 'Astra'
  };
  return map[value] || value || 'Automático';
}

function brl(value) {
  return Number(value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function parseBudget() {
  const n = Number(String(budgetInput.value).replace(/\./g, '').replace(',', '.'));
  return Number.isFinite(n) && n > 0 ? n : 5;
}

function fillProjects(select) {
  const previous = select.value;
  select.replaceChildren();
  for (const name of projects) {
    const option = document.createElement('option');
    option.value = name;
    option.textContent = name;
    select.appendChild(option);
  }
  if (projects.includes(previous)) select.value = previous;
}

function applySavedDefault() {
  const saved = localStorage.getItem('dev-agent-default-project') || 'Painel';
  const selected = projects.includes(saved) ? saved : (projects.includes('Painel') ? 'Painel' : projects[0]);
  projectSelect.value = selected;
  defaultProject.value = selected;
}

function setStatus(title, message, state = 'pending') {
  statusCard.querySelector('.status-dot').className = `status-dot ${state}`;
  statusCard.querySelector('strong').textContent = title;
  statusCard.querySelector('p').textContent = message;
}

function setBusy(busy) {
  runButton.disabled = busy;
  runButton.textContent = busy ? 'Executando remotamente…' : 'Executar tarefa';
  projectSelect.disabled = busy;
  modelSelect.disabled = busy;
  budgetInput.disabled = busy;
}

function setRemoteActivity(active) {
  remoteActivityConfirmed = Boolean(active);
  window.devAgentRemoteActivity = remoteActivityConfirmed;
  document.dispatchEvent(new CustomEvent('devagent:state'));
}

function isTerminalStatus(status) {
  return ['idle', 'completed', 'complete', 'succeeded', 'finished', 'cancelled', 'canceled', 'expired', 'deleted', 'not_found', 'failed', 'error'].includes(String(status || '').toLowerCase());
}

function isSuccessfulTerminalStatus(status) {
  return ['idle', 'completed', 'complete', 'succeeded', 'finished'].includes(String(status || '').toLowerCase());
}

function getHistory() {
  try {
    const data = JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]');
    return Array.isArray(data) ? data : [];
  } catch { return []; }
}

function saveHistoryItem(item) {
  const history = getHistory();
  const index = history.findIndex(row => row.sessionId === item.sessionId);
  if (index >= 0) history[index] = { ...history[index], ...item };
  else history.unshift(item);
  localStorage.setItem(HISTORY_KEY, JSON.stringify(history.slice(0, 200)));
  renderHistory();
}

function renderHistory() {
  ensureHistoryDialog();
  const history = getHistory();
  const now = new Date();
  const monthly = history.filter(item => {
    const d = new Date(item.date);
    return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
  });
  const total = monthly.reduce((sum, item) => sum + Number(item.costBrl || 0), 0);
  const stats = document.querySelectorAll('.stats-grid strong');
  if (stats.length >= 3) {
    stats[0].textContent = brl(total);
    stats[1].textContent = String(monthly.length);
    stats[2].textContent = brl(monthly.length ? total / monthly.length : 0);
  }

  const card = $('.history-card');
  const empty = card.querySelector('.empty-state');
  let list = card.querySelector('.history-list');
  if (!history.length) {
    if (list) list.remove();
    if (empty) empty.hidden = false;
    return;
  }
  if (empty) empty.hidden = true;
  if (!list) {
    list = document.createElement('div');
    list.className = 'history-list';
    card.appendChild(list);
  }
  list.replaceChildren();
  for (const item of history.slice(0, 10)) {
    const row = document.createElement('button');
    row.type = 'button';
    row.className = 'history-item history-item-button';
    row.addEventListener('click', () => openHistoryDetails(item));
    const left = document.createElement('div');
    const title = document.createElement('strong');
    title.textContent = item.project || 'Projeto';
    const desc = document.createElement('span');
    desc.textContent = `${item.status || ''}${item.task ? ' · ' + item.task : ''}`;
    left.append(title, desc);
    const cost = document.createElement('b');
    cost.textContent = Number(item.costBrl) > 0 ? brl(item.costBrl) : (item.costPending ? 'calculando' : '—');
    row.append(left, cost);
    list.appendChild(row);
  }
}

function ensureHistoryDialog() {
  let dialog = $('#historyDetailsDialog');
  if (dialog) return dialog;
  dialog = document.createElement('dialog');
  dialog.id = 'historyDetailsDialog';
  dialog.className = 'history-details-dialog';
  dialog.innerHTML = '<div class="dialog-head"><h2>Detalhes da execução</h2><button class="icon-button" id="closeHistoryDetails" aria-label="Fechar">×</button></div><dl class="history-details" id="historyDetailsBody"></dl>';
  document.body.appendChild(dialog);
  dialog.querySelector('#closeHistoryDetails').addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', event => { if (event.target === dialog) dialog.close(); });
  return dialog;
}

function openHistoryDetails(item) {
  const dialog = ensureHistoryDialog();
  const body = dialog.querySelector('#historyDetailsBody');
  body.replaceChildren();
  const details = [
    ['Projeto', item.project || '—'],
    ['Status', item.status || '—'],
    ['Tarefa', item.task || '—'],
    ['Modelo', modelLabel(item.model || item.selectedModel || item.modelMode)],
    ['Custo estimado', Number(item.costBrl) > 0 ? brl(item.costBrl) : (item.costPending ? 'calculando' : '—')],
    ['Data', item.date ? new Date(item.date).toLocaleString('pt-BR') : '—'],
    ['Commit', item.commitSha ? item.commitSha.slice(0, 7) : '—'],
    ['Sessão', item.sessionId || '—']
  ];
  for (const [label, value] of details) {
    const term = document.createElement('dt');
    term.textContent = label;
    const description = document.createElement('dd');
    description.textContent = value;
    const row = document.createElement('div');
    row.append(term, description);
    body.appendChild(row);
  }
  dialog.showModal();
}

function getSavedActive() {
  try {
    const value = JSON.parse(localStorage.getItem(ACTIVE_KEY) || 'null');
    return value?.sessionId ? value : null;
  } catch { return null; }
}

function saveActive(meta) {
  activeMeta = meta;
  localStorage.setItem(ACTIVE_KEY, JSON.stringify(meta));
}

function clearActive() {
  clearTimeout(pollTimer);
  activeSessionId = null;
  activeResult = null;
  activeMeta = null;
  idleWithoutResultPolls = 0;
  consecutiveStatusFailures = 0;
  setRemoteActivity(false);
  localStorage.removeItem(ACTIVE_KEY);
}

function ensureResultCard() {
  let card = $('#resultCard');
  if (card) return card;
  card = document.createElement('section');
  card.id = 'resultCard';
  card.className = 'card result-card';
  card.hidden = true;
  card.innerHTML = `
    <div class="section-heading"><h2>Resultado</h2><span id="resultBadge">Aguardando</span></div>
    <p class="result-summary" id="resultSummary"></p>
    <div class="result-meta" id="resultMeta"></div>
    <div class="visual-review" id="visualReview" hidden></div>
    <div class="result-files" id="resultFiles"></div>
    <div class="result-actions">
      <button class="secondary-button" id="cancelButton" hidden>Cancelar tarefa</button>
      <button class="secondary-button" id="discardButton" hidden>Descartar alterações</button>
      <button class="primary-button" id="publishButton" hidden>Publicar no GitHub</button>
    </div>`;
  $('.composer-card').insertAdjacentElement('afterend', card);
  $('#publishButton').addEventListener('click', publishCurrent);
  $('#discardButton').addEventListener('click', discardCurrent);
  $('#cancelButton').addEventListener('click', cancelCurrent);
  return card;
}

function routingMeta(routing, fallbackModel) {
  if (!routing) return [modelLabel(fallbackModel)];
  const chosen = routing.selectedTier || routing.suggestedTier;
  const confidence = Number(routing.confidence || 0);
  const first = routing.automatic
    ? `IA escolheu ${modelLabel(chosen)}`
    : `Modelo manual: ${modelLabel(chosen || fallbackModel)}`;
  const result = [first];
  if (routing.automatic && confidence) result.push(`confiança ${Math.round(confidence * 100)}%`);
  if (routing.visualCheck) result.push('validação visual');
  return result;
}

function renderVisuals(visuals) {
  const node = $('#visualReview');
  node.replaceChildren();
  if (!visuals || (!visuals.before && !visuals.after)) {
    node.hidden = true;
    return;
  }
  node.hidden = false;
  const heading = document.createElement('div');
  heading.className = 'visual-review-heading';
  heading.innerHTML = '<strong>Conferência visual automática</strong><span>capturas do navegador do agente</span>';
  node.appendChild(heading);
  const grid = document.createElement('div');
  grid.className = 'visual-grid';
  const entries = [];
  if (visuals.before?.imageUrl) entries.push(['Antes / inicial', visuals.before]);
  if (visuals.after?.imageUrl) entries.push(['Depois / final', visuals.after]);
  for (const [label, shot] of entries) {
    const figure = document.createElement('figure');
    const img = document.createElement('img');
    img.src = shot.imageUrl;
    img.alt = label;
    img.loading = 'lazy';
    const caption = document.createElement('figcaption');
    caption.textContent = label;
    figure.append(img, caption);
    grid.appendChild(figure);
  }
  node.appendChild(grid);
}

function showResult({ badge, summary, meta = [], files = [], visuals = null, publish = false, discard = false, cancel = false, published = false }) {
  const card = ensureResultCard();
  card.hidden = false;
  $('#resultBadge').textContent = badge || '';
  $('#resultSummary').textContent = summary || '';
  const metaNode = $('#resultMeta');
  metaNode.replaceChildren();
  for (const text of meta.filter(Boolean)) {
    const chip = document.createElement('span');
    chip.textContent = text;
    metaNode.appendChild(chip);
  }
  renderVisuals(visuals);
  const filesNode = $('#resultFiles');
  filesNode.replaceChildren();
  for (const file of files) {
    const row = document.createElement('div');
    row.textContent = `${file.action || 'alterado'} · ${file.path}`;
    filesNode.appendChild(row);
  }
  const publishButton = $('#publishButton');
  publishButton.hidden = !publish && !published;
  publishButton.disabled = published;
  publishButton.textContent = published ? '✓ Publicado' : 'Publicar no GitHub';
  publishButton.classList.toggle('is-published', published);
  $('#discardButton').hidden = !discard;
  $('#cancelButton').hidden = !cancel;
  document.dispatchEvent(new CustomEvent('devagent:state'));
}

async function api(path, options = {}) {
  const controller = new AbortController();
  const timeoutMs = options.timeoutMs || (path.startsWith('/agent/status') ? 12_000 : 15_000);
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  let response;
  try {
    response = await fetch(`${API_BASE}${path}`, {
    cache: 'no-store',
    ...options,
    signal: controller.signal,
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) }
  });
  } catch (cause) {
    const error = new Error(cause?.name === 'AbortError' ? 'A consulta ao backend demorou demais.' : (cause?.message || 'Não foi possível conectar ao backend.'));
    error.cause = cause;
    throw error;
  } finally {
    clearTimeout(timeout);
  }
  const data = await response.json().catch(() => ({}));
  if (!response.ok || data.ok === false) {
    const error = new Error(data.error || `Erro ${response.status}`);
    error.status = response.status;
    error.data = data;
    throw error;
  }
  return data;
}

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

async function selectedImages() {
  const files = Array.from(imageInput.files || []).slice(0, 4);
  const result = [];
  for (const file of files) {
    if (file.size > 3_000_000) throw new Error(`O print ${file.name} é maior que 3 MB.`);
    result.push(await fileToDataUrl(file));
  }
  return result;
}

async function connectBackend() {
  setStatus('Conectando', 'Verificando OpenAI, GitHub e execução remota…', 'pending');
  const saved = getSavedActive();
  if (saved) resumeSavedSession(saved);
  else runHelper.textContent = 'Descreva a mudança e pode fechar o app depois de iniciar. A execução continua no servidor; ao voltar, o resultado é recuperado.';

  api('/health').then(health => {
    if (!health.openaiKeyConfigured || !health.githubTokenConfigured) throw new Error('Credenciais incompletas.');
    setStatus('Tudo conectado', `Backend v${health.version || '?'} pronto. As tarefas continuam remotamente com o PWA fechado.`, 'ready');
  }).catch(error => {
    setStatus('Falha de conexão', error.message || 'Não foi possível falar com o backend.', 'error');
    if (!saved) runHelper.textContent = 'Recarregue o app e tente novamente.';
  });

  api('/repos').then(repos => {
    if (Array.isArray(repos.repos) && repos.repos.length) {
      projects = repos.repos.map(repo => repo.name);
      fillProjects(projectSelect);
      fillProjects(defaultProject);
      applySavedDefault();
    }
  }).catch(() => {
    // A lista pode falhar sem impedir a interface nem a recuperação de uma tarefa existente.
  });
}

async function resumeSavedSession(saved) {
  activeSessionId = saved.sessionId;
  activeMeta = saved;
  if (saved.project && projects.includes(saved.project)) projectSelect.value = saved.project;
  if (saved.task) taskInput.value = saved.task;
  if (saved.modelMode) modelSelect.value = saved.modelMode;
  if (saved.budgetBrl) budgetInput.value = Number(saved.budgetBrl).toFixed(2).replace('.', ',');
  setBusy(true);
  setRemoteActivity(false);
  showResult({
    badge: 'Recuperando',
    summary: `A tarefa em ${saved.project || 'seu projeto'} continuou remotamente. Consultando o estado atual…`,
    meta: routingMeta(saved.routing, saved.selectedModel),
    cancel: true
  });
  await pollStatus(true);
}

async function runTask() {
  const task = taskInput.value.trim();
  if (!task) {
    runHelper.textContent = 'Escreva o que você quer que o agente faça.';
    taskInput.focus();
    return;
  }
  if (activeSessionId) {
    runHelper.textContent = 'Já existe uma tarefa ativa. Conclua, cancele ou descarte antes de iniciar outra.';
    return;
  }

  setBusy(true);
  showResult({ badge: 'Classificando', summary: 'Luna está avaliando a complexidade e preparando a execução remota.' });
  runHelper.textContent = 'Preparando agente, repositório e ambiente de teste…';

  try {
    const images = await selectedImages();
    const budgetBrl = parseBudget();
    const started = await api('/agent/start', {
      method: 'POST',
      body: JSON.stringify({ project: projectSelect.value, task, model: modelSelect.value, budgetBrl, images })
    });
    activeSessionId = started.sessionId;
    activeResult = null;
    idleWithoutResultPolls = 0;
    const meta = {
      sessionId: started.sessionId,
      project: started.project,
      branch: started.branch,
      task,
      modelMode: modelSelect.value,
      selectedModel: started.model,
      reasoningEffort: started.reasoningEffort,
      routing: started.routing,
      workflowId: started.workflowId,
      budgetBrl,
      startedAt: new Date().toISOString()
    };
    saveActive(meta);
    showResult({
      badge: 'Executando remotamente',
      summary: `O agente está trabalhando em ${started.project}. Você pode fechar este PWA e usar o iPhone normalmente.`,
      meta: [...routingMeta(started.routing, started.model), started.reasoningEffort ? `raciocínio ${started.reasoningEffort}` : '', `limite ${brl(budgetBrl)}`],
      cancel: true
    });
    runHelper.textContent = 'A tarefa não depende desta tela. Um monitor remoto acompanha aprovações do navegador e o limite de custo.';
    pollStatus();
  } catch (error) {
    setBusy(false);
    clearActive();
    showResult({ badge: 'Erro', summary: error.message || 'Não foi possível iniciar a tarefa.' });
    runHelper.textContent = 'A tarefa não foi iniciada.';
  }
}

async function pollStatus(immediate = false) {
  if (!activeSessionId) return;
  if (pollInFlight) return;
  clearTimeout(pollTimer);
  if (!immediate && document.visibilityState === 'hidden') return;
  pollInFlight = true;

  try {
    const data = await api(`/agent/status?session_id=${encodeURIComponent(activeSessionId)}`);
    consecutiveStatusFailures = 0;
    const normalizedStatus = String(data.status || '').toLowerCase();
    const resultReady = Boolean(data.resultReady || data.result?.changes || data.result?.summary || data.previewUrl);
    const remotelyActive = !isTerminalStatus(normalizedStatus);
    setRemoteActivity(remotelyActive);
    const cost = data.cost?.minimumTotalBrl;
    const meta = [...routingMeta(data.routing || activeMeta?.routing, data.model || activeMeta?.selectedModel)];
    if (activeMeta?.reasoningEffort) meta.push(`raciocínio ${activeMeta.reasoningEffort}`);
    if (Number.isFinite(cost)) meta.push(`estimado ${brl(cost)}`);
    if (data.usage?.total_tokens) meta.push(`${Number(data.usage.total_tokens).toLocaleString('pt-BR')} tokens`);
    if (data.visuals?.computerToolCalls) meta.push(`${data.visuals.computerToolCalls} ações visuais`);

    if (normalizedStatus === 'failed' || normalizedStatus === 'error') {
      setBusy(false);
      saveHistoryItem({
        sessionId: activeSessionId, date: new Date().toISOString(), project: data.project || activeMeta?.project,
        task: activeMeta?.task || taskInput.value.trim(), model: data.model, costBrl: Number(cost) > 0 ? Number(cost) : null, costPending: Number(cost) <= 0, status: 'falhou'
      });
      showResult({ badge: data.budgetExceeded ? 'Limite atingido' : 'Falhou', summary: data.error || data.finalText || 'O agente não conseguiu concluir a tarefa.', meta, visuals: data.visuals, discard: true });
      runHelper.textContent = 'Nada foi publicado. Você pode descartar a sessão.';
      return;
    }

    if (isSuccessfulTerminalStatus(normalizedStatus) && resultReady) {
      setBusy(false);
      idleWithoutResultPolls = 0;
      activeResult = data;
      const changes = data.result?.changes || [];
      const tests = Array.isArray(data.result?.tests) ? data.result.tests : [];
      const warnings = Array.isArray(data.result?.warnings) ? data.result.warnings : [];
      let summary = data.result?.summary || data.finalText || 'Tarefa concluída.';
      if (tests.length) summary += ` Testes: ${tests.join('; ')}.`;
      if (warnings.length) summary += ` Atenção: ${warnings.join('; ')}.`;
      saveHistoryItem({
        sessionId: activeSessionId, date: new Date().toISOString(), project: data.project || activeMeta?.project,
        task: activeMeta?.task || taskInput.value.trim(), model: data.model, costBrl: Number(cost) > 0 ? Number(cost) : null, costPending: Number(cost) <= 0,
        status: changes.length ? 'aguardando publicação' : 'concluída'
      });
      showResult({
        badge: changes.length ? 'Pronto para revisar' : 'Concluído', summary, meta,
        files: changes.slice(0, 50), visuals: data.visuals, publish: changes.length > 0, discard: true
      });
      runHelper.textContent = changes.length
        ? 'Nada foi publicado. Confira o resumo e, quando houver, compare as capturas inicial e final antes de aprovar.'
        : 'O agente terminou sem alterações para publicar.';
      return;
    }

    if (isSuccessfulTerminalStatus(normalizedStatus) && !resultReady) {
      idleWithoutResultPolls += 1;
      if (idleWithoutResultPolls >= 3) {
        setBusy(false);
        saveHistoryItem({ sessionId: activeSessionId, date: new Date().toISOString(), project: data.project || activeMeta?.project, task: activeMeta?.task || taskInput.value.trim(), model: data.model, costBrl: Number(cost) > 0 ? Number(cost) : null, costPending: Number(cost) <= 0, status: 'sessão concluída sem resultado' });
        showResult({ badge: 'Sessão concluída', summary: data.finalText || 'A sessão remota terminou sem devolver um pacote publicável. Nada foi publicado.', meta, visuals: data.visuals });
        clearActive();
        runHelper.textContent = 'A sessão antiga foi removida deste aparelho. Você pode iniciar outra tarefa.';
        return;
      }
    } else idleWithoutResultPolls = 0;

    showResult({
      badge: normalizedStatus === 'requires_action' ? 'Liberando navegador' : (isTerminalStatus(normalizedStatus) ? 'Finalizando' : 'Executando remotamente'),
      summary: data.finalText || 'O agente está analisando, editando, testando e, quando útil, conferindo a interface visualmente.',
      meta, visuals: data.visuals, cancel: !isTerminalStatus(normalizedStatus)
    });
    runHelper.textContent = 'Você pode fechar o PWA. O servidor e o Workflow continuam acompanhando a tarefa.';
    pollTimer = setTimeout(pollStatus, 4000);
  } catch (error) {
    if (error.status === 404) {
      setBusy(false);
      clearActive();
      showResult({ badge: 'Sessão encerrada', summary: 'A tarefa anterior não existe mais no servidor.' });
      runHelper.textContent = 'Você pode iniciar outra tarefa.';
      return;
    }
    consecutiveStatusFailures += 1;
    setRemoteActivity(false);
    if (consecutiveStatusFailures >= 3) {
      setBusy(false);
      showResult({ badge: 'Não foi possível confirmar', summary: 'Não consegui confirmar se a sessão antiga ainda existe. O indicador de atividade foi desligado para não mostrar trabalho que talvez já tenha terminado.', discard: true });
      runHelper.textContent = 'Tente recuperar novamente ou descarte esta referência local para iniciar outra tarefa.';
      return;
    }
    pollTimer = setTimeout(pollStatus, 7000);
    runHelper.textContent = `A tarefa continua remotamente. Não consegui atualizar a tela agora: ${error.message || 'erro de conexão'}.`;
  } finally {
    pollInFlight = false;
  }
}

async function publishCurrent() {
  if (publishInFlight) return;
  if (!activeSessionId || !activeResult) {
    showResult({ badge: 'Publicação indisponível', summary: 'Não encontrei a revisão desta tarefa neste aparelho. Atualize a tela para consultar o estado remoto novamente.' });
    return;
  }
  const changes = activeResult.result?.changes || [];
  const button = $('#publishButton');
  publishInFlight = true;
  button.disabled = true;
  button.textContent = 'Publicando…';
  $('#discardButton').disabled = true;
  $('#cancelButton').disabled = true;
  showResult({
    badge: 'Publicando no GitHub',
    summary: `Criando o commit com ${changes.length} arquivo${changes.length === 1 ? '' : 's'} em ${activeResult.project}. Não feche esta tela até aparecer a confirmação.`,
    meta: [`${changes.length} arquivos`, 'confirmando commit e branch'],
    files: changes.slice(0, 50), visuals: activeResult.visuals
  });
  try {
    const published = await api('/agent/publish', { method: 'POST', body: JSON.stringify({ sessionId: activeSessionId }) });
    const costBrl = Number(activeResult.cost?.minimumTotalBrl || 0);
    saveHistoryItem({ sessionId: activeSessionId, date: new Date().toISOString(), project: activeResult.project || activeMeta?.project, task: activeMeta?.task, model: activeResult.model, costBrl, status: 'publicada', commitSha: published.commitSha || null });
    showResult({ badge: 'Publicado', summary: published.summary || 'Alterações publicadas no GitHub.', meta: [`${published.changedCount || changes.length} arquivos`, published.commitSha ? `commit ${published.commitSha.slice(0, 7)}` : '', costBrl ? brl(costBrl) : ''], visuals: activeResult.visuals, published: true });
    runHelper.textContent = 'Publicado com sucesso. O GitHub Pages pode levar alguns segundos para atualizar.';
    clearActive();
    setBusy(false);
    imageInput.value = '';
    attachmentCount.textContent = 'Nenhum anexo';
  } catch (error) {
    showResult({ badge: 'Não foi publicado', summary: error.message || 'Não foi possível publicar. Nenhuma alteração foi enviada ao GitHub.', files: changes.slice(0, 50), visuals: activeResult.visuals, publish: true, discard: true });
    button.disabled = false;
    button.textContent = 'Publicar no GitHub';
    runHelper.textContent = error.message || 'Não foi possível publicar.';
  } finally {
    publishInFlight = false;
    const retryButton = $('#publishButton');
    if (retryButton && !retryButton.hidden) retryButton.disabled = false;
    const discardButton = $('#discardButton');
    if (discardButton && !discardButton.hidden) discardButton.disabled = false;
  }
}

async function discardCurrent() {
  if (!activeSessionId) return;
  if (!window.confirm('Descartar esta sessão? Nada será publicado.')) return;
  const button = $('#discardButton');
  button.disabled = true;
  button.textContent = 'Descartando…';
  try {
    await api('/agent/discard', { method: 'POST', body: JSON.stringify({ sessionId: activeSessionId }) });
    const existing = getHistory().find(item => item.sessionId === activeSessionId);
    if (existing) saveHistoryItem({ ...existing, status: 'descartada' });
    showResult({ badge: 'Descartado', summary: 'A sessão foi encerrada e nada foi publicado.' });
    clearActive();
    setBusy(false);
    imageInput.value = '';
    attachmentCount.textContent = 'Nenhum anexo';
    runHelper.textContent = 'Você pode executar outra tarefa.';
  } catch (error) {
    button.disabled = false;
    button.textContent = 'Descartar alterações';
    runHelper.textContent = error.message || 'Não foi possível descartar a sessão.';
  }
}

async function cancelCurrent() {
  if (!activeSessionId || !window.confirm('Cancelar a tarefa atual? Nenhuma alteração será publicada.')) return;
  try { await api('/agent/cancel', { method: 'POST', body: JSON.stringify({ sessionId: activeSessionId }) }); } catch {}
  showResult({ badge: 'Cancelando', summary: 'O pedido de cancelamento foi enviado ao agente remoto.', discard: true });
  setRemoteActivity(false);
  runHelper.textContent = 'O monitor remoto continuará acompanhando até a sessão parar.';
  pollTimer = setTimeout(() => pollStatus(true), 2500);
}

fillProjects(projectSelect);
fillProjects(defaultProject);
applySavedDefault();
renderHistory();
ensureResultCard();

defaultProject.addEventListener('change', () => {
  localStorage.setItem('dev-agent-default-project', defaultProject.value);
  projectSelect.value = defaultProject.value;
});
imageInput.addEventListener('change', () => {
  const count = imageInput.files?.length || 0;
  attachmentCount.textContent = count ? `${count} ${count === 1 ? 'anexo' : 'anexos'}` : 'Nenhum anexo';
});
settingsButton.addEventListener('click', () => settingsDialog.showModal());
closeSettings.addEventListener('click', () => settingsDialog.close());
runButton.addEventListener('click', runTask);
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible' && activeSessionId) pollStatus(true);
});

connectBackend();

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => navigator.serviceWorker.register('./sw.js').catch(() => {}));
}
