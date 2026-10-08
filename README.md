# PWA Dev Agent

Agente pessoal para criar, corrigir, testar e publicar mudanças nos meus PWAs pelo iPhone.

## Estado atual

Arquitetura da V1:

**PWA no GitHub Pages → Cloudflare Worker + Workflow → OpenAI Agents API → GitHub API**

A execução não depende de manter o PWA aberto. Depois que uma tarefa é iniciada, a sessão da OpenAI continua remotamente e um Cloudflare Workflow acompanha aprovações do navegador e o limite estimado de custo. Ao reabrir o PWA, a interface apenas recupera o estado atual da mesma tarefa.

## Fluxo de uma tarefa

1. Escolher um repositório.
2. Descrever a alteração em linguagem natural.
3. Opcionalmente anexar até 4 prints.
4. Escolher um modelo manualmente ou deixar em **Automático**.
5. No Automático, Luna classifica a tarefa e escolhe entre Luna, Terra e Sol. Astra nunca é escolhido automaticamente.
6. O backend captura o commit atual do repositório e cria uma sessão isolada na OpenAI.
7. O código é carregado no sandbox no commit exato da tarefa.
8. Para tarefas visuais, o agente pode abrir a versão publicada do PWA, observar a interface e registrar uma captura inicial.
9. O agente analisa e altera apenas a cópia local do código.
10. Uma versão local das alterações fica disponível para teste no ambiente hospedado.
11. Quando útil, o agente abre essa versão, faz nova captura e compara visualmente o antes e o depois.
12. O app mostra resumo, testes, avisos, arquivos modificados, modelo escolhido, tokens, custo estimado e capturas disponíveis.
13. Nenhuma mudança é publicada automaticamente.
14. O usuário escolhe **Publicar no GitHub** ou **Descartar alterações**.
15. Antes de publicar, o backend confirma que o repositório continua no mesmo commit inicial. Se ele mudou, a publicação é recusada para evitar sobrescrever trabalho recente.

## Modelos

O seletor oferece:

- **Automático:** uma chamada econômica do Luna classifica a tarefa e escolhe Luna, Terra ou Sol.
- **Luna:** tarefas simples e bem delimitadas.
- **Terra:** programação comum, bugs localizados e mudanças moderadas.
- **Sol:** debugging difícil, regressões, arquitetura, autenticação, estado ou mudanças em vários subsistemas.
- **Astra:** exclusivamente manual para casos excepcionais.

O roteador também informa se a tarefa se beneficia de validação visual. A escolha automática nunca pode selecionar Astra.

## Execução em segundo plano

A sessão principal roda nos servidores da OpenAI. Além disso, o Worker inicia o Workflow Cloudflare `pwa-dev-agent-monitor`, que continua ativo mesmo sem o PWA aberto. Ele verifica periodicamente:

- se a sessão ainda está executando;
- pedidos de autorização do navegador hospedado;
- o limite estimado de custo;
- conclusão ou falha da sessão.

O frontend para de fazer consultas quando fica em segundo plano para não desperdiçar bateria/rede do iPhone. Isso não pausa a tarefa. Ao voltar ao PWA, ele consulta a sessão remota novamente.

## Validação visual automática

Para tarefas de interface, layout e interação, o agente recebe ferramenta de computer use com screenshots habilitados.

Ele pode:

- abrir o GitHub Pages público do projeto antes da alteração;
- navegar pela interface para observar o defeito;
- editar o código no sandbox;
- abrir a versão local alterada;
- comparar visualmente o resultado;
- devolver capturas do estado inicial e final para revisão no Dev Agent.

O acesso automático do navegador é restrito ao GitHub Pages do usuário e ao preview local do sandbox. Pedidos de autenticação são cancelados automaticamente. Telas que dependam de login, dados exclusivos do iPhone, IndexedDB/localStorage específico ou um estado não reproduzível ainda podem exigir um print manual do usuário.

## Custos e limite por tarefa

O app estima por tarefa:

- tokens do modelo principal;
- custo do roteador Luna;
- sandbox hospedado;
- chamadas de computer use quando detectadas;
- total aproximado em reais;
- média e total mensal no histórico local.

O valor em reais é uma estimativa. O campo de limite funciona como proteção operacional: enquanto a sessão está rodando, o backend e o Workflow podem enviar cancelamento quando a estimativa disponível alcança o valor configurado. Isso não é uma garantia contábil exata da fatura final.

## Segurança

As chaves não ficam no repositório nem no JavaScript público do PWA.

O Cloudflare Worker recebe como Secrets:

- `OPENAI_API_KEY`
- `GITHUB_TOKEN`

Para o sandbox da OpenAI, o token do GitHub é disponibilizado por um Vault com rede limitada a `api.github.com`.

Outras proteções:

- o agente trabalha primeiro numa cópia isolada e não publica durante a edição;
- publicação exige aprovação explícita na interface;
- endpoints sensíveis aceitam apenas a origem esperada do GitHub Pages;
- publicação é recusada se o HEAD do repositório mudou desde o início da tarefa;
- publicações muito grandes são recusadas automaticamente;
- o navegador hospedado só recebe aprovação automática para origens previamente permitidas;
- cancelar ou descartar nunca publica as alterações.

## Backend

Worker Cloudflare: `pwa-dev-agent-api`

Workflow Cloudflare: `pwa-dev-agent-monitor`

Endpoints principais:

- `GET /health`
- `GET /repos`
- `POST /setup-vault`
- `POST /agent/start`
- `GET /agent/status`
- `POST /agent/publish`
- `POST /agent/discard`
- `POST /agent/cancel`

## Frontend

O frontend é mobile-first e hospedado pelo GitHub Pages. Ele lista automaticamente os repositórios disponíveis, mantém o identificador da tarefa ativa localmente para poder reconectá-la depois e mostra revisão visual e aprovação antes da publicação.
