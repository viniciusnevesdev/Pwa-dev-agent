# Instruções permanentes do PWA Dev Agent

## Objetivo
Este repositório é uma ferramenta pessoal, mobile-first, para permitir ao usuário manter seus PWAs pelo iPhone com o mínimo possível de complexidade manual.

## Prioridades
1. Simplicidade de uso no iPhone.
2. Execução remota: uma tarefa iniciada não pode depender de manter o PWA aberto.
3. Não publicar alterações em repositórios-alvo sem aprovação explícita do usuário.
4. Evitar regressões e mudanças não solicitadas.
5. Manter chaves e tokens fora do frontend e do GitHub.
6. Mostrar custos de forma compreensível e conservadora.
7. Usar validação visual automática quando ela puder revelar problemas que o código sozinho não mostra.

## Arquitetura
- Frontend estático/PWA: GitHub Pages.
- Backend: Cloudflare Worker `pwa-dev-agent-api`.
- Monitor em segundo plano: Cloudflare Workflow `pwa-dev-agent-monitor`.
- IA principal: OpenAI Agents API com sandbox hospedado.
- Validação visual: computer use em navegador/desktop hospedado pela OpenAI.
- Código-fonte alvo: GitHub API.

## Regras de implementação
- Mobile-first e compatível com Safari/PWA no iPhone.
- Não exigir computador, terminal local, Docker ou ferramentas desktop do usuário.
- Alterações devem primeiro ocorrer em sandbox isolado.
- A execução deve continuar remotamente se o usuário fechar o frontend.
- O frontend pode parar polling quando estiver oculto; isso nunca deve controlar a execução principal.
- O identificador da sessão deve ser preservado para recuperar a tarefa quando o PWA voltar ao primeiro plano.
- Antes de publicar, confirmar que o HEAD do repositório continua igual ao commit base da tarefa.
- Se o HEAD mudou, recusar publicação e pedir nova execução.
- Nunca expor `OPENAI_API_KEY` ou `GITHUB_TOKEN` no frontend, logs ou respostas HTTP.
- Manter rede do sandbox restrita ao mínimo necessário.
- Não adicionar infraestrutura complexa sem benefício prático claro.
- Preservar o fluxo: instrução → execução remota → revisão → publicar ou descartar.
- Ao alterar assets públicos, atualizar a versão de cache do Service Worker para evitar conteúdo antigo no PWA.

## Seleção de modelos
- O modo automático deve usar uma classificação barata antes da tarefa principal.
- O roteador automático pode escolher apenas Luna, Terra ou Sol.
- Luna: tarefas simples, localizadas e previsíveis.
- Terra: programação comum, bugs localizados e mudanças moderadas.
- Sol: debugging difícil, regressões, arquitetura, autenticação, estado, múltiplos subsistemas ou alta incerteza.
- Astra nunca deve ser escolhido automaticamente. Só pode ser usado por seleção manual explícita do usuário.
- O seletor manual deve continuar disponível e sempre prevalecer sobre o roteador.

## Validação visual
- Em mudanças de interface, layout, estilo ou interação, tentar observar a versão publicada antes de editar.
- Após a edição, testar a versão local alterada e comparar visualmente quando possível.
- Capturas automáticas devem ser mostradas na revisão antes da publicação quando estiverem disponíveis.
- O navegador hospedado serve para inspeção e testes, nunca para publicar código ou alterar configurações remotas.
- Aprovar automaticamente somente origens explicitamente permitidas do usuário e previews locais.
- Não tentar inserir credenciais do usuário automaticamente.
- Se a tela depender de login, dados locais exclusivos do iPhone ou estado impossível de reproduzir, aceitar print manual e registrar a limitação.

## Custos
- Mostrar modelo escolhido, tokens e estimativa total por tarefa.
- Considerar, quando disponíveis, modelo principal, roteador, sandbox e chamadas de navegação visual.
- O limite de custo por tarefa é estimado, não uma garantia contábil.
- O monitor remoto deve continuar fiscalizando o limite mesmo com o frontend fechado.

## UX
- Linguagem simples; evitar termos técnicos quando não forem necessários.
- Ações destrutivas ou publicação exigem confirmação clara.
- Deixar explícito que o usuário pode fechar o PWA depois de iniciar uma tarefa.
- Quando o usuário voltar, mostrar o estado remoto atual em vez de reiniciar a tarefa.
