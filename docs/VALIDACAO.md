# Validação do MVP

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
