# Zenith Support Hub — três ambientes

## Nolyp, playbook e protocolo

- [x] Importar o ZIP explicitamente indicado pela equipe: Markdown e imagens locais, origem rastreável, importação idempotente, nenhuma execução de arquivos anexados. Conteúdo privado em `data/`, sem envio externo ou commit. Revisar/redigir possíveis credenciais sem reproduzi-las.
- [x] Agente: buscar artigos ativos relevantes, gerar resposta sugerida com fontes para revisão humana e enviar somente por ação do atendente. Preservar triagem interna sem resposta automática ao cliente.
- [x] Requerente: formulário em `/requerente/processos/[id]`, com suporte contextual dentro da página. Separar catálogo disponível e processos protocolados; salvar rascunho e protocolar explicitamente no SQLite, com protocolo único/idempotente.
- [x] Tema claro/escuro em todos os ambientes, controles acessíveis e preferência persistida. Substituir marca visível Zenith por Nolyp, preservando os arquivos/banco existentes.
- [x] Validar importação real, respostas fundamentadas, página de formulário, chat contextual, protocolo, tema/mobile, lint/tipos/build/testes. Documentar limites e contagens reais.

Critério de aceite: artigos consultáveis no suporte; resposta sugerida cita fontes; protocolo muda a seção de listagem após recarga; tema acompanha navegação; banco e artigos já existentes preservados. Sem pagamentos, integrações reais ou publicação.

---

## Ajuste de navegação e apresentação dos processos

- [x] Remover ícones de troca de ambiente da sidebar, mantendo hiperlinks de requerente/prefeitura no header.
- [x] Remover dos portais as colunas, filtros, contadores, badges e textos que apresentam status de processo. Preservar o banco e as funcionalidades de suporte existentes.
- [x] Validar navegação, preenchimento e persistência das cinco seções do modelo de alvará, conforme esclarecimento da equipe: requerente, tipo de solicitação, imóvel, documentos e taxas. Formulário editável nos dois portais, sem upload ou pagamentos. Modelo local; não alegar equivalência com o formulário autenticado da referência.

Alvo de referência: https://montesclaros.aprova.com.br/processo/criar/65f2ece727ba3d00088ee443. Somente consulta pública; nenhum envio ou acesso autenticado realizado.

---

## Incremento: persistência e conhecimento

Escolhas confirmadas pela equipe: SQLite local e aba interna de Chamados no suporte. Sem Supabase ou escrita remota.

- [x] Repositório SQLite no servidor: schema versionado, chamados/mensagens/processos/artigos, transações e validação. Banco em `data/zenith.sqlite`, fora de `public` e ignorado no Git. Testar reabertura do arquivo e rejeição de entradas inválidas.
- [x] APIs locais e Context: confirmar gravação antes de navegar/avisar sucesso, persistir respostas/status/prioridade/ações, recuperar triagens pendentes, atualizar outras abas por polling. Falhas de banco devem ficar visíveis, sem fingir salvamento em memória.
- [x] Navegação do suporte: Visão geral, Chamados com prioridade/e-mail/data/ambiente/canal/processo, Base de conhecimento com criação/edição/ativação. Histórico municipal lê dados persistidos.
- [x] IA: consultar artigos ativos por similaridade, citar orientação na nota e sidebar, mantendo execução somente por comando explícito. Validar recarga, origem municipal, falhas de gravação, conhecimento, mobile e checks existentes.

Aceite: solicitação municipal e detalhes sobrevivem à recarga; resposta, prioridade e processo continuam consistentes; artigo salvo orienta novos chamados; testes usam banco isolado. Servidor restrito a loopback, sem autenticação de produção, somente dados fictícios.

---

## Incremento de separação dos portais

Objetivo: requerente com chat exclusivo, prefeitura com formulário/histórico e edição de processos, Zenith com triagem e ações. A solicitação atual da equipe substitui o formato anterior de nota e remove o campo de classificação de conta.

- [x] Contratos/contexto: origem e canal explícitos nos tickets; informações editáveis nos processos; validação e mutações imutáveis. Testar cinco seções, canais, omissão do campo removido e preservação de status.
- [x] Portais: `/requerente`, `/prefeitura`, `/prefeitura/suporte`, `/prefeitura/suporte/novo`; widget exclusivo no requerente; modal editável somente na prefeitura. Manter `/approve` como redirecionamento de compatibilidade.
- [x] Suporte: preservar três colunas; exibir canal/processo relacionado; adaptar triagem sem responder ao solicitante ou alterar status.
- [x] Validação: regressão de cidadão, fluxo municipal com edição, separação de históricos, estados vazios, CSV, mobile/teclado, lint, tipos, testes e build. Atualizar README/validações.

Aceite: duas origens criam tickets investigados em background; histórico municipal mostra somente tickets municipais; edição salva os dados e conserva status; comando no Zenith atualiza o mesmo processo nos dois portais. Notas internas nunca aparecem nos portais. Sem persistência, autenticação, APIs externas, deploy ou push.

---

## Registro do incremento anterior

Objetivo: demonstrar abertura de chamado no Approve, nota interna automática e desbloqueio explícito pelo atendente.

Especificação: solicitação da equipe nesta conversa, 24/10/2026. Implementação local autorizada, sem deploy, push, APIs externas ou banco. Execução pelo Codex nesta sessão; sem subagentes.

Arquitetura: Next.js App Router, TypeScript, Tailwind, React Context. Estado em memória no layout raiz, preservado ao navegar com Link e descartado ao recarregar. Simulações sinalizadas. CSV público contém somente dados fictícios. A triagem retorna apenas Markdown, sem mutações; o reducer aplica ações explícitas.

- [x] Base e contexto: tipos, processos, tickets, mensagens, formulário validado, CSV com aliases e fallback. Testes: entrada inválida, CSV vazio/malformado, status preservado pela triagem.
- [x] Suporte: lista com busca/filtros, detalhe com resposta e nota interna isolada, sidebar com intenção delimitada e log. Testes: processo inexistente, comando desconhecido, desbloqueio e repetição idempotente.
- [x] Approve e triagem: formulário, chat público, processos sincronizados na navegação. Triagem por palavras-chave, sem inventar similares. Testes: sem correspondência, Markdown escapado, nenhuma nota interna no cliente.
- [x] Verificação: testes unitários, lint, TypeScript, build e Playwright (fluxo completo, mobile, erro de CSV e teclado). Documentar resultados reais e roteiro de 3 minutos no README.

Critério de aceite: abrir chamado mantém status Aberto; nota interna tem os seis blocos exigidos; comando “Desbloquear Alvará 001” altera o processo e gera log; Approve exibe a mudança ao retornar; cliente não vê investigação. Vazio, carregamento e erro têm estados legíveis.

Decisões locais: conta/prefeitura tem campo próprio; IA é heurística local com delay; sem autenticação, persistência, sincronização entre abas ou conexão real com prefeitura. Não se destina a uso com dados reais.
