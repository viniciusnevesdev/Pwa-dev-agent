const projects = [
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

function fillProjects(select) {
  select.innerHTML = '';
  for (const name of projects) {
    const option = document.createElement('option');
    option.value = name;
    option.textContent = name;
    select.appendChild(option);
  }
}

fillProjects(projectSelect);
fillProjects(defaultProject);

const savedDefault = localStorage.getItem('dev-agent-default-project') || 'Painel';
projectSelect.value = projects.includes(savedDefault) ? savedDefault : 'Painel';
defaultProject.value = projectSelect.value;

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

runButton.addEventListener('click', () => {
  const task = document.querySelector('#taskInput').value.trim();
  if (!task) {
    runHelper.textContent = 'Escreva o que você quer que o agente faça.';
    document.querySelector('#taskInput').focus();
    return;
  }
  runHelper.textContent = 'Backend criado. A execução automática está sendo conectada.';
});

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => navigator.serviceWorker.register('./sw.js').catch(() => {}));
}
