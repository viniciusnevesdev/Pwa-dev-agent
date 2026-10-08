# Instruções permanentes do PWA Dev Agent

## Objetivo
Este repositório é uma ferramenta pessoal, mobile-first, para permitir ao usuário manter seus PWAs pelo iPhone com o mínimo possível de complexidade manual.

## Prioridades
1. Simplicidade de uso no iPhone.
2. Não publicar alterações em repositórios-alvo sem aprovação explícita do usuário.
3. Evitar regressões e mudanças não solicitadas.
4. Manter chaves e tokens fora do frontend e do GitHub.
5. Mostrar custos de forma compreensível e conservadora.

## Arquitetura
- Frontend estático/PWA: GitHub Pages.
- Backend: Cloudflare Worker `pwa-dev-agent-api`.
- IA: OpenAI Agents API com sandbox hospedado.
- Código-fonte alvo: GitHub API.

## Regras de implementação
- Mobile-first e compatível com Safari/PWA no iPhone.
- Não exigir computador, terminal local, Docker ou ferramentas desktop do usuário.
- Alterações devem primeiro ocorrer em sandbox isolado.
- Antes de publicar, confirmar que o HEAD do repositório continua igual ao commit base da tarefa.
- Se o HEAD mudou, recusar publicação e pedir nova execução.
- Nunca expor `OPENAI_API_KEY` ou `GITHUB_TOKEN` no frontend, logs ou respostas HTTP.
- Manter rede do sandbox restrita ao mínimo necessário.
- Não adicionar autenticação, banco ou infraestrutura complexa sem benefício prático claro.
- Preservar o fluxo: instrução → execução → revisão → publicar ou descartar.
- Ao mudar `app.js`, `styles.css` ou `index.html`, atualizar a versão de cache do Service Worker para evitar conteúdo antigo no PWA.

## Custos
- Modo automático deve priorizar o modelo econômico em alterações simples e subir para Sol em bugs, integrações ou mudanças complexas.
- Astra nunca deve ser escolhido automaticamente.
- O limite de custo por tarefa é estimado, pois a telemetria em tempo real não garante equivalência exata com a cobrança final.

## UX
- Linguagem simples; evitar termos técnicos quando não forem necessários.
- Ações destrutivas ou publicação exigem confirmação clara.
- Uma tarefa ativa deve poder ser retomada depois de fechar/reabrir o PWA.
