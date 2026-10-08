const API_BASE = 'https://pwa-dev-agent-api.viniciusnevez123.workers.dev';
const ACTIVE_KEY = 'dev-agent-active-session';
const HISTORY_KEY = 'dev-agent-history';

let projects = [
  'Painel',
  'Registro-mental-v1',
  'cronometro-app',
  'crono-app',
  'Controle-financeiro',
  'Html-e-css-creator',
  'Menu',
  'Simbolos'
];

const projectSelect = document.querySelector('#projectSelect');
const defaultProject = document.querySelector('#defaultProject');
const imageInput = document.querySelector('#imageInput');
const attachmentCount = document.querySelector('#attachmentCount');
const settingsButton = document.querySelector('#settingsButton');
const closeSettings = document.querySelector('#closeSettings');
const settingsDialog = document.querySelector('#settingsDialog');
const runButton = document.querySelector('#runButton');
const runHelper = document.querySelector('#runHelper');
const statusCard = document.querySelector('#statusCard');
const modelSelect = document.querySelector('#modelSelect');
const budgetInput = document.querySelector('#budgetInput');
const taskInput = document.querySelector('#taskInput');

let activeSessionId = null;
let activeResult = null;
let activeMeta = null;
let pollTimer = null;
let idleWithoutResultPolls = 0;

function fillProjects(select) {
  const oldValue = select.value;
  select.innerHTML = '';
  for (const name of projects) {
    const option = document.createElement('option');
    option.value = name;
    option.textContent = name;
    select.appendChild(option);
  }
  if (projects.includes(oldValue)) select.value = oldValue;
}

function applySavedDefault() {
  const saved = localStorage.getItem('dev-agent-default-project') || 'Painel';
  const value = projects.includes(saved) ? saved : (projects.includes('Painel') ? 'Painel' : projects[0]);
  projectSelect.value = value;
  defaultProject.value = value;
}

function setStatus(title, message, state = 'pending') {
  const dot = statusCard.querySelector('.status-dot');
  dot.className = `status-dot ${state}`;
  statusCard.querySelector('strong').textContent = title;
  statusCard.querySelector('p').textContent = message;
}

function setBusy(busy) {
  runButton.disabled = busy;
  runButton.textContent = busy ? 'Executando…' : 'Executar tarefa';
  projectSelect.disabled = busy;
  modelSelect.disabled = busy;
  budgetInput.disabled = busy;
}

function brl(value) {
  const number = Number(value || 0);
  return number.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function parseBudget() {
  const normalized = budgetInput.value.replace(/\./g, '').replace(',', '.');
  const n = Number(normalized);
  return Number.isFinite(n) && n > 0 ? n : 5;
}

function getHistory() {
  try {
    const parsed = JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveHistoryItem(item) {
  const history = getHistory();
  const index = history.findIndex(row => row.sessionId === item.sessionId);
  if (index >= 0) history[index] = { ...history[index], ...item };
  else history.unshift(item);
  localStorage.setItem(HISTORY_KEY, JSON.stringify(history.slice(0, 200)));
  renderHistory();
}

function getSavedActive() {
  try {
    const parsed = JSON.parse(localStorage.getItem(ACTIVE_KEY) || 'null');
    return parsed && parsed.sessionId ? parsed : null;
  } catch {
    return null;
  }
}

function saveActive(meta) {
  activeMeta = meta;
  localStorage.setItem(ACTIVE_KEY, JSON.stringify(meta));
}

function clearActive() {
  activeSessionId = null;
  activeResult = null;
  activeMeta = null;
  idleWithoutResultPolls = 0;
  localStorage.removeItem(ACTIVE_KEY);
}

function renderHistory() {
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

  const card = document.querySelector('.history-card');
  let list = card.querySelector('.history-list');
  const empty = card.querySelector('.empty-state');
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
    const row = document.createElement('div');
    row.className = 'history-item';
    const text = document.createElement('div');
    const title = document.createElement('strong');
    title.textContent = item.project || 'Projeto';
    const desc = document.createElement('span');
    desc.textContent = item.task || '';
    text.append(title, desc);
    const cost = document.createElement('b');
    cost.textContent = brl(item.costBrl || 0);
    row.append(text, cost);
    list.appendChild(row);
  }
}

function ensureResultCard() {
  let card = document.querySelector('#resultCard');
  if (card) return card;

  card = document.createElement('section');
  card.id = 'resultCard';
  card.className = 'card result-card';
  card.hidden = true;

  const heading = document.createElement('div');
  heading.className = 'section-heading';
  const h2 = document.createElement('h2');
  h2.textContent = 'Resultado';
  const badge = document.createElement('span');
  badge.id = 'resultBadge';
  badge.textContent = 'Aguardando';
  heading.append(h2, badge);

  const summary = document.createElement('p');
  summary.id = 'resultSummary';
  summary.className = 'result-summary';

  const meta = document.createElement('div');
  meta.id = 'resultMeta';
  meta.className = 'result-meta';

  const files = document.createElement('div');
  files.id = 'resultFiles';
  files.className = 'result-files';

  const actions = document.createElement('div');
  actions.className = 'result-actions';

  const cancel = document.createElement('button');
  cancel.id = 'cancelButton';
  cancel.className = 'secondary-button';
  cancel.textContent = 'Cancelar tarefa';
  cancel.hidden = true;

  const discard = document.createElement('button');
  discard.id = 'discardButton';
  discard.className = 'secondary-button';
  discard.textContent = 'Descartar alterações';
  discard.hidden = true;

  const publish = document.createElement('button');
  publish.id = 'publishButton';
  publish.className = 'primary-button';
  publish.textContent = 'Publicar no GitHub';
  publish.hidden = true;

  actions.append(cancel, discard, publish);
  card.append(heading, summary, meta, files, actions);
  document.querySelector('.composer-card').insertAdjacentElement('afterend', card);

  publish.addEventListener('click', publishCurrent);
  discard.addEventListener('click', discardCurrent);
  cancel.addEventListener('click', cancelCurrent);
  return card;
}

function showResult({ badge, summary, meta = [], files = [], publish = false, discard = false, cancel = false }) {
  const card = ensureResultCard();
  card.hidden = false;
  document.querySelector('#resultBadge').textContent = badge || '';
  document.querySelector('#resultSummary').textContent = summary || '';

  const metaNode = document.querySelector('#resultMeta');
  metaNode.replaceChildren();
  for (const value of meta.filter(Boolean)) {
    const chip = document.createElement('span');
    chip.textContent = value;
    metaNode.appendChild(chip);
  }

  const filesNode = document.querySelector('#resultFiles');
  filesNode.replaceChildren();
  for (const file of files) {
    const row = document.createElement('div');
    row.textContent = `${file.action || 'alterado'} · ${file.path}`;
    filesNode.appendChild(row);
  }

  document.querySelector('#publishButton').hidden = !publish;
  document.querySelector('#discardButton').hidden = !discard;
  document.querySelector('#cancelButton').hidden = !cancel;
}

async function api(path, options = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    cache: 'no-store',
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {})
    }
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || data.ok === false) {
    const error = new Error(data.error || `Erro ${response.status}`);
    error.status = response.status;
    error.data = data;
    throw error;
  }
  return data;
}

async function connectBackend() {
  setStatus('Conectando', 'Verificando OpenAI, GitHub e backend…', 'pending');
  try {
    const [health, repos] = await Promise.all([
      api('/health'),
      api('/repos'),
      api('/setup-vault', { method: 'POST', body: '{}' })
    ]);
    if (!health.openaiKeyConfigured || !health.githubTokenConfigured) {
      throw new Error('Credenciais incompletas.');
    }
    if (Array.isArray(repos.repos) && repos.repos.length) {
      projects = repos.repos.map(repo => repo.name);
      fillProjects(projectSelect);
      fillProjects(defaultProject);
      applySavedDefault();
    }
    setStatus('Tudo conectado', 'OpenAI, GitHub e backend estão prontos.', 'ready');

    const saved = getSavedActive();
    if (saved) {
      await resumeSavedSession(saved);
    } else {
      runHelper.textContent = 'Descreva a mudança. O agente trabalha numa cópia e só publica depois da sua aprovação.';
    }
  } catch (error) {
    setStatus('Falha de conexão', error.message || 'Não foi possível falar com o backend.', 'error');
    runHelper.textContent = 'Recarregue o app e tente novamente.';
  }
}

async function resumeSavedSession(saved) {
  activeSessionId = saved.sessionId;
  activeMeta = saved;
  if (saved.project && projects.includes(saved.project)) projectSelect.value = saved.project;
  if (saved.task) taskInput.value = saved.task;
  if (saved.modelMode) modelSelect.value = saved.modelMode;
  if (saved.budgetBrl) budgetInput.value = Number(saved.budgetBrl).toFixed(2).replace('.', ',');
  setBusy(true);
  showResult({
    badge: 'Retomando',
    summary: `Recuperando a tarefa em ${saved.project || 'seu projeto'}…`,
    cancel: true
  });
  runHelper.textContent = 'Encontrei uma tarefa em andamento e vou continuar acompanhando daqui.';
  await pollStatus();
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
  const output = [];
  for (const file of files) {
    if (file.size > 3_000_000) {
      throw new Error(`O print ${file.name} é maior que 3 MB.`);
    }
    output.push(await fileToDataUrl(file));
  }
  return output;
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
  runHelper.textContent = 'Preparando o ambiente e carregando o repositório…';
  showResult({
    badge: 'Iniciando',
    summary: 'O agente está preparando uma cópia segura do projeto.'
  });

  try {
    const images = await selectedImages();
    const budgetBrl = parseBudget();
    const started = await api('/agent/start', {
      method: 'POST',
      body: JSON.stringify({
        project: projectSelect.value,
        task,
        model: modelSelect.value,
        budgetBrl,
        images
      })
    });
    activeSessionId = started.sessionId;
    activeResult = null;
    idleWithoutResultPolls = 0;
    saveActive({
      sessionId: started.sessionId,
      project: started.project,
      branch: started.branch,
      task,
      modelMode: modelSelect.value,
      selectedModel: started.model,
      budgetBrl,
      startedAt: new Date().toISOString()
    });

    showResult({
      badge: 'Executando',
      summary: `Agente trabalhando em ${started.project}.`,
      meta: [started.model, `orçamento de referência ${brl(budgetBrl)}`],
      cancel: true
    });
    runHelper.textContent = 'Pode levar alguns minutos. Você pode sair do app; a tarefa será retomada quando voltar.';
    pollStatus();
  } catch (error) {
    setBusy(false);
    clearActive();
    showResult({ badge: 'Erro', summary: error.message || 'Não foi possível iniciar a tarefa.' });
    runHelper.textContent = 'A tarefa não foi iniciada.';
  }
}

async function pollStatus() {
  if (!activeSessionId) return;
  clearTimeout(pollTimer);

  try {
    const data = await api(`/agent/status?session_id=${encodeURIComponent(activeSessionId)}`);
    const cost = data.cost?.minimumTotalBrl;
    const meta = [data.model || activeMeta?.selectedModel || 'modelo automático'];
    if (Number.isFinite(cost)) meta.push(`custo estimado ≥ ${brl(cost)}`);
    if (data.usage?.total_tokens) meta.push(`${Number(data.usage.total_tokens).toLocaleString('pt-BR')} tokens`);

    if (data.status === 'failed') {
      setBusy(false);
      saveHistoryItem({
        sessionId: activeSessionId,
        date: new Date().toISOString(),
        project: data.project || activeMeta?.project,
        task: activeMeta?.task || taskInput.value.trim(),
        model: data.model,
        costBrl: Number(cost || 0),
        status: 'falhou'
      });
      showResult({
        badge: 'Falhou',
        summary: data.error || data.finalText || 'O agente não conseguiu concluir a tarefa.',
        meta,
        discard: true
      });
      runHelper.textContent = 'A sessão pode ser descartada. Nenhuma alteração foi publicada.';
      return;
    }

    if (data.status === 'idle' && data.resultReady) {
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
        sessionId: activeSessionId,
        date: new Date().toISOString(),
        project: data.project || activeMeta?.project,
        task: activeMeta?.task || taskInput.value.trim(),
        model: data.model,
        costBrl: Number(cost || 0),
        status: changes.length ? 'aguardando publicação' : 'concluída'
      });

      showResult({
        badge: changes.length ? 'Pronto para revisar' : 'Concluído',
        summary,
        meta: [...meta, `${changes.length} arquivo${changes.length === 1 ? '' : 's'} alterado${changes.length === 1 ? '' : 's'}`],
        files: changes.slice(0, 50),
        publish: changes.length > 0,
        discard: true
      });
      runHelper.textContent = changes.length
        ? 'Nada foi publicado ainda. Você pode publicar ou descartar as alterações.'
        : 'O agente terminou. Você pode descartar a sessão para liberar o ambiente.';
      return;
    }

    if (data.status === 'idle' && !data.resultReady) {
      idleWithoutResultPolls += 1;
      if (idleWithoutResultPolls >= 8) {
        setBusy(false);
        showResult({
          badge: 'Finalização incompleta',
          summary: data.finalText || 'O agente terminou, mas não gerou o pacote de alterações esperado.',
          meta,
          discard: true
        });
        runHelper.textContent = 'Nada foi publicado. Descarte esta sessão e tente novamente com uma instrução mais específica.';
        return;
      }
    } else {
      idleWithoutResultPolls = 0;
    }

    showResult({
      badge: data.status === 'idle' ? 'Finalizando' : 'Executando',
      summary: data.finalText || 'O agente está analisando, editando e testando o projeto.',
      meta,
      cancel: data.status !== 'idle'
    });
    pollTimer = setTimeout(pollStatus, 3000);
  } catch (error) {
    if (error.status === 404) {
      clearTimeout(pollTimer);
      setBusy(false);
      clearActive();
      showResult({ badge: 'Sessão encerrada', summary: 'A tarefa anterior não existe mais no servidor.' });
      runHelper.textContent = 'Você pode iniciar uma nova tarefa.';
      return;
    }
    pollTimer = setTimeout(pollStatus, 5000);
    runHelper.textContent = `Aguardando resposta do agente… ${error.message || ''}`;
  }
}

async function publishCurrent() {
  if (!activeSessionId || !activeResult) return;
  const changes = activeResult.result?.changes || [];
  const ok = window.confirm(
    `Publicar ${changes.length} arquivo${changes.length === 1 ? '' : 's'} alterado${changes.length === 1 ? '' : 's'} em ${activeResult.project}?`
  );
  if (!ok) return;

  const button = document.querySelector('#publishButton');
  button.disabled = true;
  button.textContent = 'Publicando…';

  try {
    const published = await api('/agent/publish', {
      method: 'POST',
      body: JSON.stringify({ sessionId: activeSessionId })
    });
    const costBrl = Number(activeResult.cost?.minimumTotalBrl || 0);

    saveHistoryItem({
      sessionId: activeSessionId,
      date: new Date().toISOString(),
      project: activeResult.project || activeMeta?.project,
      task: activeMeta?.task || taskInput.value.trim(),
      model: activeResult.model,
      costBrl,
      status: 'publicada',
      commitSha: published.commitSha || null
    });

    showResult({
      badge: 'Publicado',
      summary: published.summary || 'Alterações publicadas no GitHub.',
      meta: [
        `${published.changedCount || changes.length} arquivos`,
        published.commitSha ? `commit ${published.commitSha.slice(0, 7)}` : '',
        costBrl ? `custo estimado ≥ ${brl(costBrl)}` : ''
      ]
    });
    runHelper.textContent = 'Publicado com sucesso. O GitHub Pages pode levar alguns segundos para atualizar.';
    clearActive();
    imageInput.value = '';
    attachmentCount.textContent = 'Nenhum anexo';
  } catch (error) {
    button.disabled = false;
    button.textContent = 'Publicar no GitHub';
    runHelper.textContent = error.message || 'Não foi possível publicar.';
  }
}

async function discardCurrent() {
  if (!activeSessionId) return;
  const changes = activeResult?.result?.changes || [];
  const message = changes.length
    ? `Descartar ${changes.length} arquivo${changes.length === 1 ? '' : 's'} alterado${changes.length === 1 ? '' : 's'}? Nada será publicado.`
    : 'Descartar esta sessão? Nada será publicado.';
  if (!window.confirm(message)) return;

  const button = document.querySelector('#discardButton');
  button.disabled = true;
  button.textContent = 'Descartando…';

  try {
    await api('/agent/discard', {
      method: 'POST',
      body: JSON.stringify({ sessionId: activeSessionId })
    });
    const history = getHistory();
    const existing = history.find(item => item.sessionId === activeSessionId);
    if (existing) saveHistoryItem({ ...existing, status: 'descartada' });
    showResult({
      badge: 'Descartado',
      summary: 'A sessão foi encerrada e nada foi publicado no GitHub.'
    });
    runHelper.textContent = 'Você pode executar outra tarefa.';
    clearActive();
    setBusy(false);
    imageInput.value = '';
    attachmentCount.textContent = 'Nenhum anexo';
  } catch (error) {
    button.disabled = false;
    button.textContent = 'Descartar alterações';
    runHelper.textContent = error.message || 'Não foi possível descartar a sessão.';
  }
}

async function cancelCurrent() {
  if (!activeSessionId) return;
  if (!window.confirm('Cancelar a tarefa atual? Nenhuma alteração será publicada.')) return;

  try {
    await api('/agent/cancel', {
      method: 'POST',
      body: JSON.stringify({ sessionId: activeSessionId })
    });
  } catch {}

  clearTimeout(pollTimer);
  setBusy(false);
  showResult({
    badge: 'Cancelando',
    summary: 'O pedido de cancelamento foi enviado. Você pode descartar a sessão quando ela parar.',
    discard: true
  });
  runHelper.textContent = 'Aguardando o agente parar…';
  setTimeout(pollStatus, 2000);
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
  attachmentCount.textContent = count === 0 ? 'Nenhum anexo' : `${count} ${count === 1 ? 'anexo' : 'anexos'}`;
});

settingsButton.addEventListener('click', () => settingsDialog.showModal());
closeSettings.addEventListener('click', () => settingsDialog.close());
runButton.addEventListener('click', runTask);

connectBackend();

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => navigator.serviceWorker.register('./sw.js').catch(() => {}));
}
