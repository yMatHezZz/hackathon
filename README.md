# Nolyp Support Hub

MVP de hackathon com três visões: requerente, prefeitura e suporte Nolyp. As respostas usam o núcleo Python real do [agente Aprova](https://github.com/Matheus0401/aprova-agent-mvp), com classificador local, base de conhecimento e exemplos revisados. O editor de formulários continua usando comandos locais simulados. Não utiliza LLM externo ou chaves durante o uso. Os dados de processos são demonstrativos; a base contém o playbook real importado localmente pela equipe.

## Executar

Pré-requisitos: Node.js 24, npm e Python 3.9+ disponível como `python` (ou configure `NOLYP_PYTHON_PATH`). O agente usa somente a biblioteca padrão do Python, sem pip, GPU ou Ollama. O servidor utiliza o módulo nativo `node:sqlite`, sem dependências externas de banco. Instale a partir do lockfile:

```sh
npm ci
npm run dev
```

Abra [localhost:3000](http://localhost:3000): o acesso inicial abre a caixa do requerente. O portal do analista está em `/prefeitura/caixa` e o suporte em `/support`. A antiga landing de seleção de ambientes foi removida.

| Rota | Ambiente e finalidade |
| --- | --- |
| `/requerente` | Redireciona à Minha caixa do requerente |
| `/requerente/caixa` | Solicitações protocoladas do portal do requerente |
| `/requerente/processos` | Catálogo de modelos disponíveis para novas solicitações |
| `/requerente/suporte` | Meus chamados: histórico do perfil fictício, respostas públicas e envio de informações |
| `/requerente/processos/[id]` | Formulário em página própria, salvamento de rascunho, protocolo e suporte contextual |
| `/prefeitura` | Redireciona à Minha caixa do analista |
| `/prefeitura/caixa` | Processos protocolados no portal do analista |
| `/prefeitura/processos` | Modelos disponíveis e acesso à configuração |
| `/prefeitura/processos/[id]` | Página de preenchimento e protocolo do analista |
| `/prefeitura/formularios` | Chat principal, prévia e ajustes manuais dos formulários por modelo |
| `/prefeitura/suporte` | Histórico exclusivo das solicitações municipais, com respostas da equipe, sem chat |
| `/prefeitura/suporte/novo` | Formulário com título, descrição e processo relacionado; botão Solicitar |
| `/support` | Nolyp: visão geral com indicadores e chamados recentes |
| `/support/chamados` | Aba Chamados: lista, metadados, notas internas e sidebar de comandos |
| `/support/conhecimento` | Aba Base de conhecimento: criar, editar e ativar artigos |
| `/support/treinamento` | Exemplos revisados, teste do agente real, saúde do Python e controle de automação |
| `/approve` | Compatibilidade: redireciona para `/requerente` |

Build de produção local:

```sh
npm run build
npm start
```

Não há variáveis obrigatórias se Python estiver no PATH. `.env.example` documenta a opção `ZENITH_DB_PATH` para mudar o arquivo do banco. Não adicione credenciais ao cliente.

## Banco de dados local

O banco padrão fica em `data/zenith.sqlite`, fora de `public` e ignorado no Git. O caminho e a variável `ZENITH_DB_PATH` foram preservados para manter os dados existentes após a mudança da marca para Nolyp. A primeira chamada às APIs aplica as migrations locais 001, 002, 003 e 004 e inicializa os quatro modelos fictícios. A migration 003 adiciona o histórico de tentativas com IA sem apagar registros existentes. Não há escrita em Supabase nem banco remoto.

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
- `ApproveDashboard` compartilha o sistema visual dos portais. Somente o requerente monta `SupportWidget`. O menu lateral separa Minha caixa, Processos e chamados; o analista também tem Formulários com IA. O header do requerente não contém links de troca de ambiente. Os processos não exibem status, filtros por status ou contadores de andamento. Os status dos chamados de suporte continuam disponíveis.
- `src/lib/server/repository.ts`: transações SQLite, consultas parametrizadas, snapshots e persistência das ações. O desbloqueio e o log pertencem à mesma transação.
- `src/app/api`: endpoints de chamados, processos e conhecimento. Validam campos, enumerações, referências e tamanho do corpo no servidor. O MVP escuta em `127.0.0.1`; as APIs recusam hosts externos e mutações de origem cruzada.

## Agente de respostas e treinamento

O núcleo `Agent` de `Matheus0401/aprova-agent-mvp` está incorporado em `integrations/aprova-agent`, fixado no commit `08e6f8110886c9ed807974a05838a69fadf207ab`. O wrapper executa esse código por stdin/stdout, sem abrir porta adicional e com `use_llm=False`. O servidor HTTP upstream com CORS aberto não é utilizado. O dataset original de chamados reais não foi importado: a inicialização usa exemplos fictícios, complementados pelos exemplos revisados da plataforma. Os resultados de acurácia do README upstream não se aplicam a este conjunto.

O agente é ativado por padrão. Em **Suporte → Treinamento**, é possível pausar a automação, verificar a conexão com Python, criar/editar/desativar até 100 exemplos e testar mensagens sem criar tickets. Cada exemplo tem mensagem, classificação, tipo de resposta, texto revisado e até cinco fontes ativas. Soluções exigem fonte; exemplos com fontes desativadas deixam de orientar o agente. Esse treinamento alimenta o classificador por exemplos e a recuperação de respostas; não faz fine tuning de LLM.

Regras de publicação:

- **Requerente / Chat:** o agente publica automaticamente resposta fundamentada, pergunta de complemento ou encaminhamento à equipe. Não altera o status do chamado nem executa comandos de processo.
- **Analista / Formulário:** a proposta de solução ou encaminhamento fica no painel do suporte. O atendente pode editar, **Aprovar e enviar mensagem** ou **Rejeitar proposta**. O conteúdo não aparece no histórico municipal antes da aprovação.
- **Pedido de informações:** perguntas de complementação podem ser enviadas automaticamente nos dois portais. O analista responde em **Complementar informações do chamado**; uma nova mensagem alimenta o agente. Perguntas idênticas não são repetidas indefinidamente.

A recuperação consulta somente artigos ativos. Apenas seções explicitamente marcadas como `## Orientação ao cliente`, `## Resposta ao cliente` ou `## Modelo de resposta`, ou respostas de treinamento revisadas, podem gerar soluções públicas. Textos operacionais internos não são copiados integralmente para o cliente. Sem orientação correspondente, o agente pede informação ou deixa a análise para a equipe. A triagem existente continua criando somente sua nota interna, separada da resposta automática.

Uma fila no SQLite (migration 004) registra uma execução por mensagem do cliente. O processamento ocorre no servidor após abertura/complementação e é retomado pelas consultas do hub após reinício. Lotes drenam a fila sem depender de novo clique. Uma concessão temporária, identificador de execução e inserção idempotente impedem respostas duplicadas; mensagens novas ou resposta humana invalidam propostas antigas. Aprovar verifica se a conversa e as fontes ainda são válidas. Pausar impede novos envios; falhas ficam visíveis no ticket com **Reprocessar com a base atual**, sem simular uma resposta bem-sucedida.

Para checar apenas o runtime, abra a aba Treinamento ou envie `{"mode":"health"}` por stdin a `python integrations/aprova-agent/runner.py`. O caminho alternativo do Python fica somente no servidor, conforme `.env.example`. Não são necessárias credenciais. O ambiente continua sendo um MVP local, sem autenticação real.

## Editor de formulários

### Copiloto para o analista

O chat em `/prefeitura/formularios` recebe o schema atual, o modelo selecionado, a seção de destino e o pedido do analista. Os atalhos **Adicionar card**, **Adicionar campo**, **Tornar obrigatório**, **Renomear campo** e **Usar base de conhecimento** preparam prompts editáveis. Se você já escreveu detalhes, os atalhos preservam esse texto. Exemplos:

```text
Adicionar card "Dados do negócio" com campos "Nome fantasia", "Telefone comercial"
Adicionar campo "Ponto de referência" obrigatório
Adicionar campo "Zona do imóvel" tipo seleção opções: Urbana | Rural
Renomear campo "Telefone de contato" para "Telefone do requerente"
Tornar obrigatório o campo "Telefone do requerente"
Adicionar card "Responsável técnico" conforme a base de conhecimento
```

**Card** significa seção do formulário. A IA continua sendo uma simulação local de comandos delimitados, sem modelo externo ou chaves. A consulta usa somente artigos ativos e informa fontes e trechos; pedidos desconhecidos não alteram o schema. O endpoint `/api/processes/[id]/form-assistant` grava a tentativa no SQLite e devolve alterações para o rascunho e a prévia; **Publicar formulário** continua necessário para salvar o schema. **Desfazer ajuste** restaura o último rascunho quando ele ainda corresponde à resposta do assistente. Uma edição manual concorrente é preservada. O editor recupera as últimas 50 tentativas ao recarregar, sem reaplicar mudanças não publicadas.

Para criar os campos de um card a partir da base, o artigo correspondente deve ter uma lista de descritores sob o título `## Campos recomendados` (também aceita `Campos do formulário` ou `Dados necessários`):

```markdown
## Campos recomendados
- Nome do responsável técnico (texto, obrigatório)
- E-mail do responsável técnico (email)
```

Artigos não executam instruções livres: somente esses descritores delimitados podem originar campos, quando o pedido solicita uso da base. Sem lista correspondente, o assistente pede os nomes dos campos em vez de inventar requisitos. Não altera protocolos anteriores nem publica automaticamente.

### Prévia e ajustes manuais

Nas listas de modelos dos dois portais, **SOLICITAR PROCESSO** abre o formulário de preenchimento em uma nova aba. O botão fica destacado em azul, com ícone e aviso de nova aba. Processos protocolados mantêm a ação **Consultar**. O preenchimento do requerente inclui chat contextual; o do analista inclui link para solicitar suporte técnico por formulário.

Em **Formulários com IA**, selecione o modelo e descreva o ajuste no chat principal à esquerda. A prévia fica à direita; abaixo dela, **Ajustes manuais** permite remover cards, desfazer a remoção, editar/remover campos e adicionar novos campos. Cards com campos essenciais são protegidos. Clique **Publicar formulário** para salvar no SQLite e atualizar os portais. A prévia não salva respostas. O editor JSON foi retirado da interface.

Para desenvolvimento, o schema continua sendo JSON validado no servidor; não há opção de edição JSON na interface. Exemplo da estrutura interna de um campo:

```json
{
  "id": "custom_ponto_referencia",
  "label": "Ponto de referência",
  "type": "text",
  "required": true,
  "width": "full",
  "maxLength": 250,
  "helpText": "Informe uma referência próxima ao imóvel."
}
```

O documento completo usa `{ "version": 1, "title": "Solicitação", "sections": [...] }`. Cada seção tem `id`, `title`, `description` opcional e `fields`. Tipos: `text`, `textarea`, `email`, `tel`, `number`, `date`, `select` e `checkbox`. Uma seleção usa `options: ["Urbana", "Rural"]`; números aceitam `min`, `max` e `step`; textos aceitam `maxLength` e `placeholder`. O modelo inicial está em `src/lib/form-schema.ts`.

As configurações têm até 12 seções e 100 campos, com IDs únicos e estáveis. Campos novos são gravados em `information.customFields`. O servidor valida tipos, obrigatoriedade, opções, tamanho, datas e números; JSON inválido ou propriedades desconhecidas impedem publicação. Os campos essenciais `applicant`, `activity` e `address` permanecem obrigatórios; tipos e limites dos campos originais são preservados. Para mudar o tipo de um campo publicado, crie outro ID.

Cada modelo mantém sua configuração e revisão. Publicações simultâneas retornam conflito em vez de sobrescrever alterações; **Recarregar publicado** descarta a edição local e recupera a configuração recebida do servidor. Remover um campo do layout conserva as respostas já salvas. Novos protocolos guardam uma cópia do schema usado no envio; mudanças posteriores no modelo não alteram esse formulário histórico. Configuração e respostas usam o payload JSON existente do SQLite, sem migration destrutiva ou serviço adicional.

## Contexto do solicitante no suporte

### Meus chamados do requerente

Em **Requerente → Meus chamados**, o cidadão consulta os tickets abertos com o mesmo e-mail e prefeitura/conta, busca por assunto/ID/status e envia mais informações nos atendimentos em aberto. O chat e o histórico mostram somente mensagens públicas; notas internas e logs não são renderizados nesse portal. **Novo chamado** abre o formulário do chat.

Ao abrir um chamado pelo widget, o nome, e-mail e conta fictícios são lembrados no navegador em `nolyp-requester-profile`. **Trocar perfil de demonstração** permite selecionar outro perfil. Sem perfil, a tela pede identificação e não lista chamados. Essa seleção filtra a interface local; não implementa autenticação ou isolamento de API para usuários reais. Use somente dados fictícios.

### Encaminhar tentativas de IA ao suporte

No chat do editor, **Histórico salvo de tentativas** mostra os pedidos recebidos pelo servidor, respostas, fontes e resultados (preparado, aplicado ao rascunho da sessão, não aplicado, falhou, desfeito ou sem alteração). A gravação da tentativa ocorre antes de devolver uma alteração; a confirmação de aplicação/desfazer é registrada separadamente. Uma tentativa preparada sem confirmação não é apresentada como aplicada. Recarregar restaura o histórico, preservando a separação entre rascunho e formulário publicado.

**Pedir ajuda ao suporte** abre `/prefeitura/suporte/novo` com o processo selecionado e a opção **Tentei ajustar o formulário com a IA** marcada. O analista descreve o impedimento, adiciona observações e revisa até 20 tentativas recentes para anexar. O acesso ao suporte de edição com IA aparece somente após o primeiro prompt recebido pelo servidor para o modelo. A validação também é feita na criação do ticket; antes disso, o analista pode usar o suporte técnico geral, sem contexto de tentativa com IA.

O servidor aceita IDs de tentativas pertencentes ao processo relacionado e cria uma cópia do histórico no ticket. Essa cópia fica disponível no histórico municipal e nos detalhes do atendimento no Nolyp, mesmo se a tentativa original tiver seu resultado atualizado posteriormente. A triagem inclui essa evidência, sem alterar status ou responder ao cliente. Sem conexão com o servidor, uma tentativa não recebida não pode ser registrada automaticamente.

### Sidebar do atendente

A conversa do chamado mostra apenas título e controles compactos de status/prioridade no topo. Nome, e-mail, conta e demais dados ficam na aba **Solicitante** da sidebar. A investigação da IA destaca hipótese e próxima ação em um card discreto; **Ver investigação completa** expande o Markdown com resumo, evidências, semelhantes e fontes, sem alterar a nota salva.

Na sidebar de `/support/chamados`, os botões **Agente**, **Solicitante** e **Histórico** separam o copiloto, os dados da pessoa e os atendimentos anteriores. **Solicitante** mostra nome, e-mail, conta, ambiente/canal, datas, processo, status e prioridade. **Histórico** agrupa pelo mesmo e-mail e prefeitura/conta, ordena por abertura e permite buscar por assunto, ID ou status. Clique em um registro para abri-lo no painel central; pessoas homônimas e contas diferentes não são agrupadas. As abas também funcionam com as setas do teclado.

A aba **Agente** preserva os comandos e a resposta sugerida, além de listar as ações executadas com data/hora. Esses registros são os logs persistidos do chamado; consultar histórico não altera nem responde ao atendimento.

## Base de conhecimento

Em **Suporte → Base de conhecimento**, clique **Novo artigo** e preencha título, categoria, etiquetas e conteúdo. Artigos aceitam Markdown e ficam salvos no SQLite. **Editar artigo** permite revisar o texto e desmarcar **Disponível para a IA** para retirar um artigo das próximas análises, sem excluir seu registro.

A investigação usa correspondência de palavras entre o chamado e os artigos ativos. Ela cita título/ID/data do artigo e inclui um trecho da orientação na nota interna. A sidebar mostra o contexto correspondente. Artigos são material de consulta: não executam comandos nem concedem autorização. Notas já gravadas preservam a orientação usada naquele momento, mesmo após editar o artigo.

No copiloto, **Gerar resposta sugerida** consulta artigos ativos e prioriza orientações/modelos de resposta presentes no conteúdo. A sugestão mostra as fontes. **Usar no editor de resposta** copia o texto para revisão; somente **Enviar resposta** o publica no chamado. A triagem continua criando apenas uma nota interna.

### Artigos públicos do Pylon

O CSV `pylon_articles.csv` fornecido pela equipe foi importado no SQLite: **64 registros**, com **63 artigos públicos indexados e ativos** e **1 rascunho inativo**. O CSV contém metadados e links; o conteúdo foi obtido diretamente das 63 URLs públicas listadas, sem falhas. Os cinco itens com alterações pendentes usam a versão atualmente publicada. A importação preserva a base anterior e edições manuais, sem duplicar registros.

Na base, **Abrir artigo original no Pylon** leva à fonte pública. O agente consulta o conteúdo indexado e acrescenta o link da fonte à solução; os links são clicáveis no chat e na conversa do chamado. Uma orientação pública diretamente correspondente pode responder dúvidas gerais sem exigir número de processo. Soluções do analista continuam exigindo aprovação.

Para atualizar o conteúdo das mesmas URLs, execute na raiz do projeto:

```sh
python scripts/prepare-pylon.py "caminho/pylon_articles.csv"
node scripts/import-pylon.mjs
```

O preparo consulta somente `https://aprova.help.usepylon.com/articles/`, limita redirecionamentos e tamanho das páginas e ignora menus/scripts. Rascunhos, conteúdo não público, acesso negado e falhas não ficam ativos para o agente. O texto público é indexado como orientação ao cliente; imagens não passam por OCR. O agente busca no índice local, sem baixar todas as páginas a cada chamado. `data/pylon/articles.json` e `data/pylon/report.json` guardam o conteúdo e o relatório, ignorados no Git. A segunda importação confirmou **0 inserções, 0 atualizações e 64 registros inalterados**.

### Playbook importado da equipe

A exportação ZIP fornecida pela equipe foi importada no SQLite: **844 páginas Markdown**, **707 disponíveis para consulta do agente** e **315 imagens locais**. Páginas com situação pendente/em andamento/não iniciada e páginas sem conteúdo útil permanecem visíveis na base, mas inativas para a IA. O campo de origem preserva o caminho e a situação do export.

Os textos, imagens e relatórios preparados ficam em `data/playbook/`; esse conteúdo é privado, ignorado no Git e não fica em `public`. A base permite busca no conteúdo, navegação entre referências internas e edição dos artigos. A lista apresenta lotes de 100 itens com opção de carregar mais.

Para importar novamente a mesma exportação local:

```sh
python scripts/prepare-playbook.py "caminho/export.zip"
node scripts/import-playbook.mjs
```

Pré-requisito para preparar o ZIP: Python 3, também usado pelo agente de respostas local. A preparação não executa scripts nem arquivos do ZIP. Importa páginas e imagens PNG/JPEG referenciadas; vídeos, executáveis, documentos Office/PDF e outros anexos binários não são convertidos em artigos.

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
