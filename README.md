# PWA Dev Agent

Agente pessoal para criar, corrigir, testar e publicar mudanças nos meus PWAs pelo iPhone.

## Objetivo da V1
- Trabalhar com vários repositórios GitHub.
- Painel como projeto padrão inicial.
- Receber instruções em linguagem natural.
- Executar mudanças com aprovação antes de publicar.
- Registrar custo por tarefa, modelo e projeto.
- Manter a interface simples e voltada para uso no iPhone.

## Arquitetura planejada
PWA → Cloudflare Worker → OpenAI + GitHub API

As chaves da OpenAI e do GitHub não ficam no código público do PWA.
