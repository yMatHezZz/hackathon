# Zenith Support Hub — três ambientes

## Importação Pylon por CSV e fontes públicas

Ler `Downloads/pylon_articles.csv`, importar metadados e obter conteúdo das URLs públicas listadas, restrito ao domínio observado e sem seguir links internos indiscriminadamente. Guardar conteúdo/relatório em `data/pylon` ignorado pelo Git; importação SQLite idempotente e preservação de edições manuais. Rascunhos, falhas e itens sem permissão pública ficam inativos. Disponibilizar fonte original na base e nas respostas do agente, com links seguros/clicáveis. Validar extração HTML, URLs, duplicação, agente com fonte importada e dados persistidos; executar importação real autorizada e registrar contagens.

## Integração do agente Aprova e treinamento

Integrar o núcleo Python real do repositório indicado, fixado por commit e executado localmente sem LLM externo. Exemplos iniciais fictícios; base ativa e exemplos revisados do SQLite orientam as respostas. Fila durável por mensagem pública do cliente, execução assíncrona, prevenção de duplicidade e invalidação de propostas quando a conversa muda. Requerente/chat: resposta automática; prefeitura: solução exige aprovação humana, pergunta de complementação pode ser automática. Triagem permanece interna e independente; não resolver status nem executar comandos de processo automaticamente.

Treinamento no suporte: exemplos rotulados, resposta esperada/tipo e fontes, ativação, teste sem publicar, saúde do runtime e controle de automação. Não é fine tuning de LLM. Configurações e exemplos persistentes; fila recuperável após reinício, erro visível e reprocessamento explícito. Testar agente Python real, decisões por origem/tipo, fontes inativas, persistência, idempotência, resposta humana concorrente, aprovação obsoleta e fluxo UI completo. Não enviar dados a serviços externos nem usar o servidor upstream com CORS aberto.

## Acesso à solicitação de processo

Trocar a ação dos modelos por SOLICITAR PROCESSO, com botão azul destacado e formulário em nova aba nos dois portais. Reutilizar a página de preenchimento por portal, preservando suporte do cidadão e formulário de suporte municipal sem chat. Processos protocolados continuam com consulta. Validar popup, preenchimento, salvamento e protocolo no navegador, incluindo móvel.

## Legibilidade da aplicação

Aumentar a escala tipográfica pequena em cerca de 2 px, incluindo rótulos, legendas, textos, controles, links e Markdown, por configuração central de CSS. Preservar títulos e espaçamento geral. Validar layout e ausência de overflow no celular, tema escuro e fluxo do editor/suporte com os checks existentes.

## Navegação dos portais e editor centrado no chat

Separar Minha caixa (protocolados) e Processos (modelos) em rotas por portal, com menu lateral rotulado e navegação móvel. Remover landing promocional: `/` abre o portal do requerente. Sem links de troca de ambiente no header do requerente. Editor: chat principal à esquerda, prévia à direita, ajustes manuais abaixo da prévia, remoção de cards com proteção dos campos essenciais e opção de desfazer; remover editor JSON da UI. Suporte de edição só aparece após tentativa recebida pelo servidor e mantém histórico anexável. Manter suporte municipal geral separado e claro. Preservar dados e alterações pendentes. Validar novas rotas, chat/prévia, remoção/desfazer, bloqueio do suporte antes do prompt, persistência e regressões em desktop/mobile/escuro; atualizar testes que dependiam da navegação anterior.

## Ajuste visual do atendimento

Remover a ficha de dados do solicitante acima da conversa e sua repetição no header, preservando a aba Solicitante da sidebar. Manter status/prioridade como controles compactos. Apresentar investigação da IA com hipótese e próxima ação em destaque discreto; evidências, fontes e texto original acessíveis em expansão. Preservar Markdown completo, dados e regras de negócio. Validar sidebar, expansão por teclado, controles, tema e fluxos existentes com Playwright, lint e tipos.

## Incremento: histórico do requerente e escalonamento da IA

Objetivo: `/requerente/suporte` com perfil fictício lembrado no navegador, chamados filtrados por origem/e-mail/conta, consulta de respostas públicas e continuação do atendimento. Corrigir seleção do widget para respeitar o mesmo perfil. Persistir tentativas do editor no SQLite, incluindo resultado aplicado/não aplicado/desfeito, e reabrir esse histórico após recarga. Analista pode abrir solicitação pelo editor e revisar tentativas/notas anexadas; servidor reconstrói o contexto a partir dos IDs e congela uma cópia no ticket.

Contratos: migration 003 aditiva para tentativas; GET/POST no assistente e PATCH de resultado por tentativa; no máximo 20 tentativas anexadas por ticket. Notas internas nunca aparecem ao requerente. Sem autenticação real: perfil serve somente à demonstração local. Preservar mudanças pendentes do incremento anterior na branch atual. Validação: isolamento visual por perfil, persistência após reabrir SQLite, vínculo/limites das tentativas, histórico imutável no ticket e fluxos E2E de requerente/analista/suporte, mobile/escuro, lint/tipos/build.

## Incremento: copiloto contextual e histórico do solicitante

Objetivo: sidebar do suporte com botões Agente, Solicitante e Histórico; identificação por e-mail + conta, abertura de chamados anteriores no painel e eventos de ações do agente. Editor de formulários recebe chat local com atalhos Adicionar card/campo, Renomear campo e Tornar obrigatório, consultando artigos ativos do SQLite e aplicando mudanças validadas no rascunho com opção de desfazer. Card significa seção. Publicação continua explícita.

Contratos: `requester-history` é função pura; `form-assistant` recebe schema, prompt, intenção e seção e devolve schema/alterações/fontes. Endpoint local POST sem escrita; publica pelo endpoint já existente com revisão. Artigos são dados de referência, nunca comandos. Sem API externa ou novas dependências. Etapas: testes de domínio e integração; sidebar; chat e integração ao construtor; navegador desktop/mobile/escuro, lint, tipos e build. Aceite: abrir chamado anterior da mesma pessoa/conta sem misturar homônimos; solicitar card/campo com contexto da base, visualizar alteração, desfazer e publicar mantendo protocolos históricos.

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
## Incremento: formulários configuráveis por JSON

Objetivo: configuração por modelo em `/prefeitura/formularios`, com adição visual de campos, edição JSON e prévia. Reutilizar o renderer nos dois portais. Persistir schema e respostas no SQLite existente, conservando respostas removidas do layout e congelando o schema no protocolo.

Módulos: `form-schema`, tipos, validação/repositório/API, contexto, formulário e construtor municipal. Aceite: adicionar um campo, publicar, preencher no requerente e recuperar o valor após recarregar; publicação concorrente recusada; modelos independentes e protocolos preservados. Validação: testes de schema/persistência, Playwright, lint, tipos e build. Sem novas dependências ou serviços.
