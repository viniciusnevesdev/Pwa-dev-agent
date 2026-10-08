# PWA Dev Agent

Agente pessoal para criar, corrigir, testar e publicar mudanças nos meus PWAs pelo iPhone.

## Estado atual

A V1 já possui a arquitetura principal implementada:

**PWA no GitHub Pages → Cloudflare Worker → OpenAI Agents API + GitHub API**

O objetivo é permitir trabalhar em vários repositórios sem precisar de computador, terminal ou edição manual de código.

## Fluxo de uma tarefa

1. Escolher um repositório.
2. Descrever a alteração em linguagem natural.
3. Opcionalmente anexar até 4 prints.
4. Escolher o modo de modelo ou deixar em Automático.
5. O backend captura o commit atual do repositório.
6. A OpenAI cria um sandbox hospedado e isolado.
7. O código do repositório é carregado no sandbox no commit exato da tarefa.
8. O agente analisa, altera e executa verificações localmente.
9. O app mostra resumo, testes, arquivos modificados, tokens e custo estimado.
10. Nenhuma mudança é publicada automaticamente.
11. O usuário escolhe entre **Publicar no GitHub** ou **Descartar alterações**.
12. Antes de publicar, o backend verifica se o repositório continua no mesmo commit inicial. Se outra alteração tiver ocorrido, a publicação é recusada para evitar sobrescrever trabalho recente.

Tarefas ativas ficam salvas localmente no PWA. Se o app for fechado e aberto novamente, ele tenta retomar o acompanhamento da sessão existente.

## Modelos

- **Automático:** escolhe Luna para alterações visuais/simples e Sol para tarefas mais complexas.
- **Econômico:** GPT-6 Luna.
- **Equilibrado:** GPT-6.1 Sol.
- **Máxima capacidade:** GPT-6 Astra.

O modo Automático não escolhe Astra sozinho para evitar custos altos inesperados.

## Custos e limite por tarefa

O app registra por tarefa:

- tokens utilizados;
- modelo utilizado;
- estimativa do custo de tokens;
- estimativa do sandbox hospedado;
- custo total estimado em reais;
- média e total mensal no histórico local.

O campo de orçamento funciona também como proteção: quando a estimativa disponível para a sessão ultrapassa o valor configurado, o backend envia cancelamento para o agente. Como a telemetria de uso da Agents API é de melhor esforço e a cobrança final pode incluir detalhes não expostos em tempo real, esse limite deve ser tratado como **limite estimado**, não como garantia contábil exata.

## Segurança

As chaves não ficam no repositório nem no JavaScript público do PWA.

O Cloudflare Worker recebe como Secrets:

- `OPENAI_API_KEY`
- `GITHUB_TOKEN`

Para o sandbox da OpenAI, o token do GitHub é disponibilizado por um Vault da OpenAI com rede limitada a `api.github.com`.

O agente não publica durante a etapa de edição. A publicação é feita pelo backend somente após aprovação explícita do usuário.

O backend também:

- aceita chamadas do fluxo do agente apenas com a origem esperada do GitHub Pages;
- recusa publicação se o repositório mudou desde o início da tarefa;
- recusa automaticamente publicações excessivamente grandes;
- permite cancelar ou descartar uma sessão sem publicar nada.

## Backend

Worker Cloudflare: `pwa-dev-agent-api`

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

O frontend é um PWA mobile-first hospedado pelo GitHub Pages. Ele lista automaticamente os repositórios disponíveis na conta configurada no backend.
