# Validação do MVP

## CSV Pylon e fontes públicas — 24/10/2026

- Arquivo real utilizado: `C:/Users/Valde/Downloads/pylon_articles.csv`, 64 registros. Metadados: 58 publicados, 5 com alterações pendentes (versão pública obtida) e 1 rascunho. Todas as 63 URLs públicas pertencem a `aprova.help.usepylon.com`; 63 conteúdos extraídos, nenhuma falha. Rascunho importado inativo.
- Importação real no SQLite: 64 inserções. Segunda execução: 0 inserções/atualizações, 64 inalterados. Base anterior preservada. Índice e relatório em `data/pylon`, ignorados pelo Git.
- Agente testado na API local contra a base real: pergunta sobre exclusão de conta retornou `solution`, fonte “Exclusão de conta no sistema” e URL pública correspondente. Sem criação de chamado nesse teste. Base mostra Abrir artigo original; respostas incluem URL clicável.
- `npm test`: 43 testes aprovados; testes novos cobrem domínio/URLs, importação idempotente, edições manuais preservadas e execução real do agente com fonte Pylon. `python tests/test_pylon_parser.py`: 2 testes aprovados (extração do corpo, exclusão de menus/scripts e restrição de URLs).
- Lint e TypeScript aprovados. Playwright: 24 cenários aprovados em 1,2 minuto, com build de produção e banco isolado; novo cenário verifica link original na base e link clicável na resposta automática. Primeira rodada encontrou seletor de busca inadequado, corrigido para o nome acessível real antes de repetir a suíte.
- Revisão manual: importador CLI restrito ao domínio público aprovado, redirecionamentos limitados, respostas HTML até 2 MB, corpo de artigo limitado, conteúdo privado/rascunho/falha inativo; transação SQL e IDs estáveis; edições manuais protegidas. Links públicos validados em renderização e na resposta do agente. Codex Security não executado.
- Limites: busca usa conteúdo indexado na importação, não navegação ao vivo em cada chamado. Atualização disponível pelos dois scripts documentados; imagens não passam por OCR. Não foram seguidos automaticamente links para outros domínios.

## Agente Aprova real e treinamento — 24/10/2026

- Núcleo público incorporado do commit `08e6f8110886c9ed807974a05838a69fadf207ab`, sem alterar os cinco módulos Python originais. Ponte local `runner.py` usa `Agent(use_llm=False)`; nenhuma chamada a LLM externo. Seed fictício versionável, sem dataset original de chamados reais. Proveniência em `integrations/aprova-agent/UPSTREAM.md`.
- Runtime real confirmado por stdin e pela API local: `ready: true`, `engine: aprova-agent-mvp@08e6f811`, `mode: local`, `llm: false`; automação ativa no banco local. Migration 004 adiciona configurações, exemplos e fila sem apagar dados.
- `npm test`: 40 testes aprovados em 7 arquivos. Casos do agente: execução Python real, resposta fundamentada, procedimento interno não publicado, idempotência, aprovação municipal, pergunta automática, intervenção humana concorrente, pausa/resolução, persistência de fila/treinamento, reprocessamento e fontes desativadas.
- `npm run test:e2e`: 23 cenários aprovados em 1,1 minuto contra build de produção. Novos: chat do requerente recebe resposta sem clique do atendente e sem duplicar após recarga; solução municipal fica invisível no histórico até aprovação; complemento é enviado sem aprovação e o analista pode responder; treino salva/recupera exemplo e teste real não cria tickets. Suíte anterior roda com automação pausada no banco isolado, para preservar os testes manuais; cenários novos ativam explicitamente o agente.
- Lint, TypeScript e build final aprovados. Primeira rodada E2E encontrou seletores exatos inadequados para labels de selects; foram trocados por comboboxes com nome acessível e toda a suíte passou. Nenhuma asserção funcional removida.
- Visual conferido em `agent-training-desktop.png` e `agent-approval.png` dentro de `artifacts/e2e` (ignorados pelo Git). Treinamento também verificado em largura 390 px e tema escuro, sem overflow horizontal.
- Revisão manual focada: processo Python sem shell ou rede, entrada/saída e tempo limitados, UTF-8 preservado; rotas com verificação de origem/localhost; SQL parametrizado; fila com lease/token, chave única por mensagem e gravação idempotente; conversa e fontes revalidadas antes de publicar/aprovar. Artigos internos não viram solução pública sem seção destinada ao cliente ou exemplo revisado. Codex Security não executado; revisão manual não equivale a scan.
- Limites: execução local requer Python 3.9+; não é fine tuning nem LLM generativo. Perfil permanece demonstrativo, sem autenticação real. A recuperação depende da qualidade dos artigos/exemplos, sem garantia de solução para todos os chamados; ausência de orientação encaminha à equipe. Não resolve status ou altera processos automaticamente. Nenhum deploy, commit ou push efetuado neste incremento.

## Solicitar processo em nova aba — 24/10/2026

Botão SOLICITAR PROCESSO destacado nos modelos dos dois portais, com abertura em nova aba e aviso acessível. Página de preenchimento municipal reutiliza formulário/protocolo e oferece suporte técnico sem chat; processos já protocolados mantêm consulta.

`npm run test:e2e`: 19 cenários aprovados em 57,3 segundos, com build de produção. Verificado popup real, URL por portal, título do formulário, salvamento/reabertura, protocolo e preenchimento em largura móvel. Lint e TypeScript aprovados. Sem alterações no banco ou regras de negócio neste incremento.

## Aumento de fontes — 24/10/2026

Escala central em CSS: textos pequenos e legendas aumentados em cerca de 2 px; `text-xs` passa a 14 px, `text-sm` a 16 px e `text-base` a 17 px. Links e Markdown também ampliados, títulos preservados. Botões do formulário passaram a quebrar linha no celular; campo do chat compacto mantém visibilidade no desktop. Causas verificadas por medidas do DOM, sem enfraquecer as asserções de layout.

`npm run lint`, `npm run typecheck` e build de produção aprovados. `npm run test:e2e`: 19 cenários aprovados em 1,0 minuto após corrigir os dois pontos de layout. Conferência visual no editor e cobertura móvel/tema escuro pelos cenários existentes. Nenhuma alteração de dados ou regras de negócio.

## Portais e editor com foco no chat — 24/10/2026

- `npm test`: 34 testes aprovados. `npm run lint` e `npm run typecheck`: aprovados. `npm run test:e2e`: 19 cenários aprovados em 52,6 segundos contra build de produção.
- Navegação: `/` redireciona para `/requerente/caixa`; Minha caixa e Processos usam páginas diferentes nos dois portais; página inicial promocional removida. Header do requerente sem links; menu lateral e móvel com rótulos; texto “Revise as informações…” ausente.
- Editor: chat à esquerda, maior que a prévia à direita, com campo de mensagem dentro do viewport desktop testado. Sem editor JSON na interface. Ajustes manuais abaixo da prévia; remoção de card Taxas e desfazer verificados; edição manual concorrente preservada; campos e protocolos continuam persistentes.
- Suporte de edição: link ausente antes do primeiro prompt; aparece com tentativa registrada; servidor recusa ticket com contexto de IA se o processo ainda não recebeu prompt. Suporte técnico geral preservado e histórico municipal identificado com clareza.
- Visual conferido em `artifacts/e2e/editor-chat-first-desktop.png`, `form-builder-mobile-dark.png` e `citizen-history-mobile-dark.png`; arquivos ignorados pelo Git. Layout móvel e tema escuro cobertos pelos cenários; sem overflow horizontal nas verificações.
- Revisão manual focada da regra no servidor; sem novas dependências, migrations ou alteração destrutiva neste incremento. Codex Security não executado. IA e perfil seguem demonstrativos, sem autenticação real.

## Limpeza visual da conversa — 24/10/2026

- Dados do solicitante removidos do topo da conversa; continuam disponíveis na sidebar. Status e prioridade preservados como controles compactos.
- Nota da IA com hipótese/próxima ação visíveis e investigação completa expansível; texto salvo e fontes preservados. HTML do Markdown continua bloqueado.
- `npm run lint` e `npm run typecheck`: aprovados. `npm run test:e2e`: 19 testes aprovados em 1,1 minuto, com build de produção. Verificado: ausência da ficha/e-mail no centro, dados disponíveis na sidebar, expansão/recolhimento por Enter e alteração persistida de prioridade.
- Visual desktop conferido em `artifacts/e2e/ticket-clean-desktop.png`, ignorado pelo Git. Sem alteração no banco, nos endpoints ou na lógica de triagem neste ajuste visual.

## Histórico do requerente e encaminhamento da IA — 24/10/2026

- `npm test`: 34 testes aprovados em 6 arquivos. Casos novos: histórico visual do requerente por origem/e-mail/conta, ausência de dados sem perfil, tentativas recuperadas após reabrir SQLite, resultados registrados, IDs vinculados ao processo, limite de 20 anexos, cópia imutável no ticket e recusa de IDs inexistentes/de outro processo.
- `npm run test:e2e`: 19 testes aprovados em 51,2 segundos contra build de produção. Novo fluxo do requerente verifica histórico próprio, ausência de dados de outra pessoa/notas internas, envio e recuperação de mensagem após recarga, busca vazia, perfil sem chamados e tela móvel em tema escuro. Fluxo do analista verifica tentativa aplicada ao rascunho, recuperação do histórico sem reaplicação automática, encaminhamento ao suporte com observações e histórico persistido nos dois ambientes.
- Lint e TypeScript: aprovados. Build executado pelo Playwright. Na primeira execução houve um seletor de teste ambíguo entre conversa da página e widget fechado; o seletor foi delimitado ao chamado selecionado e toda a suíte foi repetida com sucesso.
- Migration 003 aditiva cria `form_ai_attempts`, sem exclusão de registros. Dados de teste em banco isolado dentro de `artifacts/e2e`. Cópia do ticket contém resultados, fontes e observações; atualizar o registro original não altera essa cópia.
- Conferência visual: `citizen-history-mobile-dark.png` e `ai-escalation-support.png` em `artifacts/e2e` (ignorados pelo Git). Layout móvel sem overflow horizontal no cenário testado.
- Revisão manual: origem/localhost e limite de corpo mantidos nas APIs; validação de IDs/processo/transições e consultas parametrizadas; contexto recebido do cliente reconstruído a partir do banco. Codex Security não executado; revisão manual não equivale a scan.
- Limites: o perfil do requerente é uma seleção de demonstração lembrada no navegador, sem autenticação ou isolamento de API para usuários reais. Histórico do editor mostra as 50 tentativas mais recentes; chamado aceita até 20. Tentativas que não chegam ao servidor não são registradas. Rascunhos não publicados não são reaplicados após recarregar.

## Copiloto contextual e histórico — 24/10/2026

- `npm test`: 32 testes aprovados em 5 arquivos. Novos cenários cobrem histórico por e-mail/conta, ordenação, card com campos vindos de artigo ativo, exclusão de artigos inativos, adição/renomeação, instruções desconhecidas e embutidas nos artigos, endpoint sem publicação/revisão alterada e recusa de ajustes em protocolos.
- `npm run test:e2e`: 16 testes aprovados em 51,6 segundos contra build de produção; mais um cenário novo aprovado separadamente com `--grep "chat preserva"`, verificando falha de API e resposta concorrente a edição manual. Total: 17 cenários cobertos; a suíte completa foi executada antes da inclusão desse último teste.
- `npm run lint` e `npm run typecheck`: aprovados. Build de produção executado nas duas chamadas do Playwright. Banco de teste isolado em `artifacts/e2e`; banco e artigos reais não alterados.
- Fluxos novos: sidebar com Solicitante/Histórico/Agente; setas do teclado; busca vazia e abertura de chamado anterior; conta diferente excluída; log de ação executada; chat usa artigo ativo, cria campos, desfaz, aceita atalho com detalhes já escritos e publica explicitamente; campo criado aceita resposta e recupera valor após recarga.
- Visual conferido: histórico desktop, chat desktop e chat móvel de 390 px em tema escuro; sem overflow horizontal ou erros JavaScript nos cenários. Capturas locais ignoradas pelo Git: `requester-history-desktop.png`, `form-copilot-desktop.png`, `form-copilot-mobile-dark.png` em `artifacts/e2e`.
- Revisão manual focada: endpoint mantém proteção de origem/localhost, limite de corpo e validação do schema; artigos são referência textual, sem execução de comandos; sem acesso a serviços externos ou mudança destrutiva do banco. Codex Security não executado; revisão manual não equivale a scan do produto.
- Limites: IA é um interpretador local de comandos delimitados, sinalizado na UI; card significa seção. Campos derivados da base exigem lista de descritores reconhecida; caso contrário o assistente pede os nomes. Conversa permanece na sessão; publicação e persistência continuam explícitas. Não inclui autenticação real.

## Incremento de formulários configuráveis — 24/10/2026

- `npm test`: 27 testes aprovados em 4 arquivos. Casos novos: schema inválido, IDs duplicados/inseguros, obrigatoriedade/opções/tipos, respostas desconhecidas, configuração e respostas após reabrir SQLite, isolamento por modelo, conflitos de revisão e schema congelado no protocolo.
- `npm run test:e2e`: 14 testes aprovados em 40,9 segundos, contra build de produção e banco isolado em `artifacts/e2e`. Novo fluxo: adicionar campo visualmente, publicar, recarregar configuração, rejeitar JSON inválido, preencher e salvar resposta no requerente, recarregar, protocolar e preservar o campo histórico após removê-lo do modelo.
- Lint e TypeScript aprovados; build de produção executado pelo Playwright. Sem dependências novas ou alteração destrutiva do banco.
- Conferência visual: construtor com prévia no desktop e layout móvel de 390 px em tema escuro; sem overflow horizontal ou erro JavaScript no cenário. Capturas locais em `artifacts/e2e/form-builder-*.png` (ignoradas no Git).
- Revisão manual focada: schema declarativo sem avaliação de código/HTML, propriedades e tipos limitados, IDs seguros, validação de respostas no servidor, consultas parametrizadas e proteção de origem/localhost mantidas. Codex Security não executado; revisão manual não equivale a scan do produto.
- Escopo: configura formulários de processos; sem regras condicionais, cálculos, upload ou autenticação real. Novas respostas continuam usando dados fictícios no MVP local.

Execução local em 24/10/2026, Windows, Node.js 24.22.0, npm 11.19.1. Next.js 16.4.3 e React 19.3.1. Testes com dados fictícios; playbook real da equipe importado e conferido localmente, com ocultação heurística de credenciais.

| Verificação | Resultado | Evidência reproduzível |
| --- | --- | --- |
| `npm run lint` | Aprovado | Sem erros ou avisos na execução final |
| `npm run typecheck` | Aprovado | TypeScript encerrou com código 0 |
| `npm test` | Aprovado | 22 testes em 3 arquivos: domínio, SQLite e limites HTTP |
| `npm run build` | Aprovado | Compilação, tipos, página dinâmica do formulário, APIs de protocolo/imagens e três ambientes |
| `npm audit` | Aprovado | 0 vulnerabilidades reportadas no lockfile final |
| `npm run test:e2e` | Aprovado | 13 testes Chromium contra build de produção em localhost:3100; última suíte completa em 36,5 segundos |
| Layout desktop | Aprovado | Inspeção visual a 1440 × 1000; base importada no tema escuro, marca Nolyp, contagem 707 ativos/844 salvos; suporte mantém as três colunas |
| Layout mobile | Aprovado | Teste a 390 × 844 nos portais, suporte e formulário municipal; sem rolagem horizontal da página |
| Console do navegador | Aprovado no fluxo observado | Fluxos de cidadão e prefeitura verificam ausência de `pageerror`; inspeção do modal municipal também não registrou erros |
| Leitura CSV | Aprovado | Resposta HTTP 200, 150 registros na lista e 151 após abrir um chamado |
| Segurança focada | Revisão manual e testes de limites HTTP | SQL parametrizado; validação no servidor; corpo até 64 KB (512 KB para artigos); hosts externos e mutações de origem cruzada recusados; Markdown sem HTML executável; arquivos do ZIP não executados; imagens limitadas a nomes hash e formatos PNG/JPEG locais |
| Codex Security | Não executado | Nenhum scan do produto foi iniciado; a revisão manual e `npm audit` não equivalem a esse scan |
| Autorização de usuários reais | Não aplicável ao fluxo simulado | Não há login ou backend; as três visões são abertas e só devem usar dados fictícios |
| Persistência SQLite | Aprovado | Arquivo fechado/reaberto nos testes conserva ticket, resposta, e-mail e prioridade; recarga de navegador conserva histórico municipal e prioridade alterada |
| Banco padrão da demonstração | Aplicado localmente | Migrations 1 e 2; processo e reserva de protocolo na mesma transação; nome do arquivo antigo preservado para compatibilidade; dados ignorados pelo Git |
| Base de conhecimento | Aprovado | 844 páginas importadas, 707 disponíveis para IA, 315 imagens; busca em artigo real conferida na UI; imagem local respondeu HTTP 200 image/png; reimportação final inseriu/atualizou zero registros |
| Resposta fundamentada | Aprovado | Sugestão usa conteúdo do artigo e informa fontes; copiar ao editor exige ação; envio permanece manual; teste de repositório confirma que sugerir não cria resposta ao cliente |
| Tema | Aprovado | Tema escuro nos dois portais, formulário, suporte e conhecimento; contraste de fundo/texto conferido no navegador, preferência preservada após recarga |
| Integração externa e deploy | Não executado | Nenhuma conexão de banco remoto ou publicação foi realizada |

## Cenários reais de navegador

1. Abrir chamado pelo chat de `/requerente`; confirmar resposta automática; navegar para suporte sem recarregar; selecionar chamado; aguardar os cinco blocos Markdown; confirmar que status permanece `Aberto`; rejeitar `Não desbloquear Alvará 001`; executar `Desbloquear Alvará 001`; confirmar log e status do chamado preservado; enviar resposta humana; retornar ao requerente; confirmar processo `Em Análise`, resposta pública e ausência da nota interna.
2. Interceptar CSV com HTTP 404; confirmar aviso de fallback, histórico local e busca sem resultados.
3. Interceptar CSV com aspas quebradas; confirmar fallback e estado de seleção vazio.
4. Em largura de 390 px, submeter formulário vazio; confirmar foco no campo obrigatório; fechar com Escape; confirmar devolução do foco a Ajuda; navegar ao suporte e verificar largura.
5. Em `/prefeitura`, confirmar ausência do widget, editar endereço e atividade no formulário, salvar/reabrir e conferir os valores. Abrir suporte pelo header, enviar título/descrição/processo por formulário, consultar histórico e confirmar ausência de chat/notas internas. No Zenith, conferir canal Formulário e executar o comando simulado. Voltar à prefeitura e ao requerente para verificar as informações e a resposta pública no histórico.
6. Criar ticket de chat, navegar ao histórico municipal e confirmar que ele continua vazio. Em 390 px, verificar validação de campos obrigatórios e largura do formulário municipal, sem widget de chat.
7. Criar solicitação municipal com prioridade Alta, recarregar o histórico, conferir título/e-mail/ambiente, abrir a aba Chamados e mudar a prioridade para Urgente. Recarregar novamente e confirmar o valor gravado.
8. Criar artigo com orientação fictícia ZENITH-BASE, recarregar a base e abrir um novo ticket. Confirmar que a nota cita a orientação, sem alterar o status. Editar o artigo e desativá-lo. Um teste de repositório confirma que conteúdo inativo não orienta novas triagens.
9. Simular HTTP 503 na gravação. Confirmar mensagem de erro, permanência no formulário e título preenchido, sem navegar para um sucesso inexistente.
10. Nos dois portais, confirmar ausência de coluna/filtro/badges/contadores de status de processo e dos ícones de troca de ambiente na sidebar. Confirmar hiperlinks de requerente e prefeitura no header.
11. Em 390 px, preencher o modelo de alvará com requerente, renovação, matrícula/área do imóvel, referências de documentos e taxa/guia/vencimento. Salvar, recarregar e conferir os valores recuperados do SQLite. Nenhum upload ou pagamento é realizado.
12. Separar catálogo e protocolados, abrir formulário em página própria, conferir chat disponível, protocolar e recarregar. O registro aparece em Protocolados, enquanto o modelo continua no catálogo. Teste de repositório confirma que reabrir um processo já protocolado não gera nova reserva.
13. Alternar para tema escuro, navegar pelos ambientes e formulário, verificar fundo escuro/texto claro e recarregar. Voltar ao tema claro mantém o controle funcional. A comparação usa cores convertidas pelo navegador para não depender da serialização CSS rgb/lab.

O cenário principal também mede a posição do botão de execução dentro da área das três colunas. Isso protege a correção do formulário que ficava fora do painel.

Cada suíte E2E usa um arquivo SQLite exclusivo dentro de `artifacts/e2e`. A preparação entre cenários valida esse caminho antes de limpar dados do banco de teste. Nenhum teste apaga ou modifica o banco de demonstração em `data`.

Os testes SQLite também verificam transação de processo/log, repetição idempotente de comandos, nota de triagem única, rejeição de dados inválidos e reabertura de arquivo. Os testes HTTP exercitam bloqueio de origem cruzada/host externo e limites do corpo, sem invocar mutações em pedidos recusados.

Os testes de domínio e SQLite do formulário verificam preservação dos novos campos e rejeição de e-mail inválido, área negativa e taxa negativa. O processo usa o payload JSON já existente: nenhuma migration destrutiva ou descarte de registros foi necessário.

Referência visual: o endereço público da Aprova redirecionou para login. O modelo foi construído com as cinco seções descritas pela equipe nesta conversa, sem afirmar reprodução do formulário autenticado.

## Importação local do playbook

A exportação indicada tinha 1.220 entradas, incluindo 844 páginas Markdown. A preparação conferiu caminhos e limites, não executou scripts e preservou somente páginas e imagens referenciadas nos formatos suportados. Dados preparados em `data/playbook`, com referências de origem e relatório. A base importada foi conferida em `/support/conhecimento`, com 844 artigos e 707 ativos. Artigos pendentes/em andamento/não iniciados não orientam o agente.

O conteúdo com padrões de credenciais foi mascarado antes da gravação. `data/playbook/redactions.json` registra somente páginas afetadas e contagens, nunca os valores. O ZIP original permaneceu inalterado. A detecção é heurística; responsáveis precisam revisar e revogar/rotacionar credenciais reais. Páginas, imagens e banco não foram adicionados ao Git nem enviados a serviço externo. Arquivos binários complementares, como vídeos e documentos Office/PDF, não foram convertidos.

## Falhas encontradas e corrigidas

- A primeira instalação usava Vitest 3, com alertas transitivos. Atualização para Vitest 5.0.5 eliminou os alertas reportados pelo npm.
- Chromium não estava instalado. O download oficial do Playwright permitiu a execução; isso era limitação do ambiente.
- Um cabeçalho visualmente oculto na tabela criava rolagem horizontal no mobile. Exibir o cabeçalho corrigiu o caso; a suíte foi repetida com aprovação.
- A altura implícita do grid escondia o formulário da IA no desktop. Linhas com mínimo zero, áreas internas com rolagem e formulários sem encolhimento corrigiram o caso. O teste de posição falhou antes da correção e passou depois.
- Na adaptação para três ambientes, o servidor de desenvolvimento antigo servia HTML do formulário anterior junto a JavaScript atualizado. A suíte identificou erro de hidratação. Os testes agora compilam e iniciam uma instância nova do build na porta 3100, sem reutilizar servidor. Os seis cenários passaram nessa instância. Após reiniciar o servidor de desenvolvimento, a inspeção do modal municipal também não apresentou erro.

Na rede do modo de desenvolvimento, React Strict Mode aborta a primeira leitura do CSV durante a remontagem do efeito; a leitura seguinte respondeu HTTP 200. O loader respeita o AbortSignal e não converte desmontagem em erro visível.

## Limites para a equipe

Chamados, mensagens, prioridade, processos e artigos persistem em SQLite. Abas visíveis atualizam dados a cada 1,8 segundo. A IA usa correspondência de palavras; o CSV e os artigos fornecem contexto, sem medir qualidade de classificação. As APIs compartilham a demonstração local e não autenticam usuários reais. Separar histórico municipal, chat e notas internas é uma regra de apresentação, não autorização no servidor. O servidor é limitado a loopback e deve usar somente dados fictícios.

O README inclui os comandos e o roteiro de até três minutos. Nenhum push, PR ou deploy foi realizado.
