# Nolyp Support Hub

MVP de hackathon com três visões: requerente, prefeitura e suporte Nolyp. A IA é uma simulação local com busca no histórico e no playbook. Não utiliza APIs de IA, chaves ou serviços externos durante o uso. Os dados de processos são demonstrativos; a base contém o playbook real importado localmente pela equipe.

## Executar

Pré-requisitos: Node.js 24 e npm. O servidor utiliza o módulo nativo `node:sqlite`, sem dependências externas de banco. Instale a partir do lockfile:

```sh
npm ci
npm run dev
```

Abra [localhost:3000](http://localhost:3000). A página inicial oferece acesso aos três ambientes.

| Rota | Ambiente e finalidade |
| --- | --- |
| `/requerente` | Cidadão: catálogo de modelos disponíveis e solicitações protocoladas |
| `/requerente/processos/[id]` | Formulário em página própria, salvamento de rascunho, protocolo e suporte contextual |
| `/prefeitura` | Analista: formulário editável dos processos e histórico municipal |
| `/prefeitura/suporte` | Histórico exclusivo das solicitações municipais, com respostas da equipe, sem chat |
| `/prefeitura/suporte/novo` | Formulário com título, descrição e processo relacionado; botão Solicitar |
| `/support` | Nolyp: visão geral com indicadores e chamados recentes |
| `/support/chamados` | Aba Chamados: lista, metadados, notas internas e sidebar de comandos |
| `/support/conhecimento` | Aba Base de conhecimento: criar, editar e ativar artigos |
| `/approve` | Compatibilidade: redireciona para `/requerente` |

Build de produção local:

```sh
npm run build
npm start
```

Não há variáveis obrigatórias. `.env.example` documenta a opção `ZENITH_DB_PATH` para mudar o arquivo do banco. Não adicione credenciais ao cliente.

## Banco de dados local

O banco padrão fica em `data/zenith.sqlite`, fora de `public` e ignorado no Git. O caminho e a variável `ZENITH_DB_PATH` foram preservados para manter os dados existentes após a mudança da marca para Nolyp. A primeira chamada às APIs aplica as migrations locais 001 e 002 e inicializa os quatro modelos fictícios. Não há escrita em Supabase nem banco remoto.

O SQLite guarda os chamados criados pelo requerente e pela prefeitura, mensagens, notas internas, status, prioridade, informações dos processos e artigos. O histórico municipal filtra somente a origem `prefeitura`. A gravação ocorre no servidor antes da confirmação e da navegação; se a API falhar, o formulário mantém os dados e mostra o erro.

Recarregar, abrir outra aba ou reiniciar o servidor preserva os registros. As abas visíveis consultam atualizações a cada 1,8 segundo e ao recuperar foco. O Context mantém a interface atualizada imediatamente após uma operação concluída. A preferência visual de densidade da tabela continua somente na sessão.

Os 150 registros sintéticos do CSV são uma referência de investigação e continuam carregados via fetch. Eles não substituem nem sobrescrevem os tickets gravados no banco. Chamados históricos CSV são somente leitura no suporte. Atualizações sem mudança de revisão não retransmitem o conteúdo do playbook.

Para backup, pare o servidor e copie o diretório `data` inteiro. Preserve também os arquivos auxiliares `-wal` e `-shm` caso existam. Não apague o banco para reiniciar a demonstração; use outro caminho local vazio em `ZENITH_DB_PATH` quando quiser um conjunto independente.

## Fluxo e contratos

- `src/context/GlobalContext.tsx`: consulta o snapshot das APIs, mantém o estado compartilhado e só aplica alterações confirmadas pelo banco. Uma revisão monotônica evita que uma resposta antiga sobrescreva dados mais recentes.
- `src/lib/ai-triage.ts`: `investigateTicket(form, history, knowledge): string`. Função pura que retorna os cinco blocos da nota interna em Markdown. Identifica canal Chat ou Formulário, semelhantes e artigos ativos. Não altera status, não executa ações e não responde ao cliente. O servidor grava a nota uma única vez e recupera triagens pendentes após reiniciar.
- `src/lib/csv-loader.ts`: fetch do CSV e parse com Papaparse. Normaliza cabeçalhos, valida linhas e IDs, importa histórico como resolvido. Em erro de rede, timeout, arquivo vazio ou malformado, exibe aviso e usa seis registros fictícios locais.
- `src/lib/domain.ts`: validação do formulário e interpretação de comandos explícitos. O único comando de mutação é `Desbloquear <tipo> <ID de três dígitos>`; tipos aceitos: Alvará, Licença e Consulta. Não executa JavaScript, SQL ou instruções livres.
- O desbloqueio muda o processo de `Bloqueado` para `Em Análise` e inclui o log no ticket. Repetir o comando não duplica a ação. O status do chamado continua sob controle do atendente.
- Cada ticket tem origem `requerente`, `prefeitura` ou `historico`. O chat consulta somente tickets do requerente; o histórico municipal consulta somente tickets da prefeitura. A classificação de conta foi removida do modelo, dos formulários e das notas.
- Os portais mostram somente a descrição e as respostas públicas. Notas internas e logs ficam no Nolyp. A confirmação automática de abertura é separada da triagem.
- `saveProcess(id, information)` salva as cinco seções do formulário de processo: requerente, tipo da solicitação, imóvel, documentos e taxas. Requerente e prefeitura podem preencher os campos. Validações no servidor protegem tamanho, e-mail, números e datas; registros antigos continuam compatíveis.
- `ApproveDashboard` compartilha o sistema visual dos portais. Somente o requerente monta `SupportWidget`. O header concentra os hiperlinks dos ambientes e o acesso municipal ao suporte. Os processos não exibem status, filtros por status ou contadores de andamento. Os status dos chamados de suporte continuam disponíveis.
- `src/lib/server/repository.ts`: transações SQLite, consultas parametrizadas, snapshots e persistência das ações. O desbloqueio e o log pertencem à mesma transação.
- `src/app/api`: endpoints de chamados, processos e conhecimento. Validam campos, enumerações, referências e tamanho do corpo no servidor. O MVP escuta em `127.0.0.1`; as APIs recusam hosts externos e mutações de origem cruzada.

## Base de conhecimento

Em **Suporte → Base de conhecimento**, clique **Novo artigo** e preencha título, categoria, etiquetas e conteúdo. Artigos aceitam Markdown e ficam salvos no SQLite. **Editar artigo** permite revisar o texto e desmarcar **Disponível para a IA** para retirar um artigo das próximas análises, sem excluir seu registro.

A investigação usa correspondência de palavras entre o chamado e os artigos ativos. Ela cita título/ID/data do artigo e inclui um trecho da orientação na nota interna. A sidebar mostra o contexto correspondente. Artigos são material de consulta: não executam comandos nem concedem autorização. Notas já gravadas preservam a orientação usada naquele momento, mesmo após editar o artigo.

No copiloto, **Gerar resposta sugerida** consulta artigos ativos e prioriza orientações/modelos de resposta presentes no conteúdo. A sugestão mostra as fontes. **Usar no editor de resposta** copia o texto para revisão; somente **Enviar resposta** o publica no chamado. A triagem continua criando apenas uma nota interna.

### Playbook importado

A exportação ZIP fornecida pela equipe foi importada no SQLite: **844 páginas Markdown**, **707 disponíveis para consulta do agente** e **315 imagens locais**. Páginas com situação pendente/em andamento/não iniciada e páginas sem conteúdo útil permanecem visíveis na base, mas inativas para a IA. O campo de origem preserva o caminho e a situação do export.

Os textos, imagens e relatórios preparados ficam em `data/playbook/`; esse conteúdo é privado, ignorado no Git e não fica em `public`. A base permite busca no conteúdo, navegação entre referências internas e edição dos artigos. A lista apresenta lotes de 100 itens com opção de carregar mais.

Para importar novamente a mesma exportação local:

```sh
python scripts/prepare-playbook.py "caminho/export.zip"
node scripts/import-playbook.mjs
```

Pré-requisito adicional para preparar o ZIP: Python 3. A aplicação em si utiliza apenas Node.js. A preparação não executa scripts nem arquivos do ZIP. Importa páginas e imagens PNG/JPEG referenciadas; vídeos, executáveis, documentos Office/PDF e outros anexos binários não são convertidos em artigos.

IDs determinísticos evitam duplicação. Conteúdo importado sem edição pode receber sanitização atualizada; artigos editados pela equipe são preservados. A segunda execução de importação confirmou zero inserções e zero atualizações.

A preparação ocultou valores com padrões de credenciais. `data/playbook/redactions.json` lista as páginas afetadas sem reproduzir os valores; `data/playbook/report.json` registra as contagens. Essa detecção é heurística, não uma garantia de remoção de segredos. Os responsáveis devem revisar e revogar/rotacionar credenciais reais no ZIP original. Não envie o arquivo ou a base a serviços externos sem autorização.

## Tema

O botão de sol/lua no header alterna claro e escuro em todos os ambientes, incluindo formulários, chat e base. A preferência fica no navegador, acompanha a navegação e sobrevive à recarga. Sem preferência salva, a aplicação usa a preferência do sistema.

## Formulário demonstrativo dos processos

No requerente, selecione **Preencher** em **Disponíveis para protocolar**. O formulário abre em uma nova página, com o botão Ajuda disponível e o chamado vinculado ao processo. Na prefeitura, **Detalhes** permite revisar o mesmo modelo. Os campos incluem:

- Dados do requerente: nome, e-mail, identificação e telefone.
- Tipo da solicitação: emissão, renovação, alteração ou regularização; atividade e observações.
- Dados do imóvel: endereço, inscrição/matrícula, área e uso.
- Documentos complementares: descrição e referência dos documentos; não há upload de arquivos.
- Taxas: valor informado, número da guia e vencimento. Não calcula tributos nem executa pagamentos.

O modelo segue as seções descritas pela equipe. O endereço da Aprova fornecido redirecionou para login; não foi possível inspecionar o formulário autenticado. Não se trata de reprodução verificada desse formulário.

**Salvar informações** mantém o rascunho do modelo. **Protocolar solicitação** valida os dados e registra uma solicitação separada com protocolo `NLP-AAAA-NNNNNN`, data e referência ao modelo. O catálogo continua disponível para novas solicitações. O registro protocolado aparece na aba **Protocolados** e abre em modo de consulta no requerente. A geração do número e a gravação ocorrem na mesma transação SQLite; reabrir um registro protocolado não cria outro protocolo.

## CSV demonstrativo

`public/tickets_suporte_150_balanceado.csv` contém **150 registros sintéticos**, com seis categorias de 25 exemplos. Os textos reutilizam situações fictícias; não representam chamados de clientes ou uma integração real.

Para regenerar o arquivo:

```sh
node scripts/generate-demo-csv.mjs
```

Colunas recomendadas: `id,assunto,descricao,solucao,nome,email,prefeitura,data_abertura,status`. Aceita vírgula ou ponto e vírgula, BOM e aliases como `titulo`, `description`, `resolution` e `solicitante`. Datas devem usar ISO 8601. Arquivo limitado a 5 MB após leitura. IDs devem ser únicos. O conteúdo de `status` é normalizado para `Resolvido`, pois este arquivo é a base histórica.

Para substituir a base, use somente dados fictícios. Arquivos em `public` ficam acessíveis por URL. A interface identifica o CSV como demonstrativo. Se o esquema não puder ser interpretado, o fallback fica explícito.

## Validar

```sh
npm run lint
npm run typecheck
npm test
npm run build
npm audit
npx playwright install chromium
npm run test:e2e
```

Playwright compila e inicia uma instância nova do build de produção na porta 3100, sem reutilizar um servidor já aberto. Deixe essa porta livre. Cada suíte usa um banco exclusivo em `artifacts/e2e/`, e prepara somente esse banco entre cenários. O banco de demonstração em `data/` permanece intacto. Os testes usam dados fictícios. Traces de falhas ficam em `test-results/` e não entram no Git.

Os testes cobrem domínio, SQLite, limites HTTP, protocolos separados, respostas fundamentadas, tema persistente, formulário em página própria com chat, abertura de chamados, isolamento do histórico, erros de integração, mobile e teclado. A importação real teve contagens e idempotência verificadas separadamente no banco local.

Resultados desta implementação constam em [docs/VALIDACAO.md](docs/VALIDACAO.md).

## Demonstração em até três minutos

1. **0:00–0:25**: mostre os três ambientes na página inicial. Entre como requerente e abra Ajuda para mostrar o chat exclusivo; feche-o e volte pelo logo Nolyp.
2. **0:25–1:00**: no requerente, entre em Preencher, mostre as cinco seções e o suporte dentro da página. Protocole a solicitação e mostre a separação entre catálogo e Protocolados.
3. **1:00–1:35**: use `Abrir suporte`. Preencha título `Alvará 001 bloqueado`, descreva o bloqueio no envio de documentos e selecione `Alvará 001`. Clique `Solicitar`; mostre o histórico municipal, sem chat.
4. **1:35–2:15**: use `Abrir Nolyp Hub`, selecione o chamado e mostre a nota interna. Gere a resposta sugerida, confira as fontes do playbook, copie para o editor e revise antes de enviar.
5. **2:15–2:40**: use `Abrir prefeitura`. Mostre as informações salvas do processo e a resposta no Histórico de suporte. A investigação interna não aparece no portal.
6. **2:40–3:00**: volte pelo logo, entre como requerente e confira o mesmo processo atualizado. Explique o estado compartilhado e as limitações da simulação.

Fallback para a apresentação: se o CSV falhar, o histórico fictício local sustenta a triagem. Nenhuma dependência externa é necessária após a instalação. Se o banco ficar indisponível, a aplicação informa o erro e não confirma o salvamento.

## Limitações e próximos passos

Os registros criados nesta versão persistem no SQLite local. Dados de sessões antigas que existiam apenas em memória e já foram descartados não podem ser recuperados. Arquivos de banco não entram no Git; faça backup local quando necessário.

Este MVP não tem autenticação ou autorização de usuários reais nem integração com prefeitura. As três visões compartilham o banco de demonstração local; separar interfaces e ocultar notas não cria uma barreira de autorização. Use somente dados fictícios. Antes de publicar ou conectar dados reais, implemente autenticação, autorização por usuário/ambiente e política de retenção. O arquivo SQLite requer armazenamento persistente; não serve como banco compartilhado em hospedagem serverless com disco efêmero.

A heurística não compreende linguagem livre, não comprova causa técnica e não substitui validação humana. Uma ação de processo não resolve automaticamente o chamado. A migration local aplica o schema na primeira abertura do banco. Nenhum deploy, push ou PR foi realizado nesta implementação.

Resumo para equipe/Gemini: persistência SQLite confirmada antes de atualizar a interface; nova aba Chamados com metadados; artigos salvos orientam a triagem, mantendo comandos explícitos. Próximas prioridades: autenticação/autorização, integração autorizada com processos e avaliação da triagem com dados sintéticos mais variados.
