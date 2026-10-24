# INSTRUCTIONS — operação do Nolyp

Esta pasta descreve a integração utilizada na demonstração. As instruções originais do agente estão preservadas em [integrations/aprova-agent/INSTRUCTIONS/README.md](../integrations/aprova-agent/INSTRUCTIONS/README.md), fixadas no commit informado em [UPSTREAM.md](../integrations/aprova-agent/UPSTREAM.md).

## Executar

Requisitos: Node.js 24, npm e Python 3.9+ disponível como `python`. O caminho alternativo do Python pode ser configurado por `NOLYP_PYTHON_PATH`, conforme `.env.example`. Não há dependências Python para instalar nem chaves de IA obrigatórias.

```sh
npm ci
npm run dev
```

- Requerente: `http://localhost:3000/requerente/caixa`.
- Analista: `http://localhost:3000/prefeitura/caixa`.
- Atendimento: `http://localhost:3000/support/chamados`.
- Treinamento: `http://localhost:3000/support/treinamento`.
- Base: `http://localhost:3000/support/conhecimento`.

## Fluxo das respostas

1. A abertura ou complementação de um chamado cria uma execução persistida no SQLite.
2. O núcleo Python original classifica a mensagem. A integração consulta artigos ativos e exemplos revisados, sem LLM externo.
3. No chat do requerente, o agente publica a resposta automaticamente. No chamado municipal, uma solução exige aprovação do atendente. Pedidos de informações adicionais podem ser enviados automaticamente nos dois portais.
4. Mensagem nova ou intervenção humana invalida propostas antigas. A triagem interna permanece separada da resposta pública. O agente não desbloqueia processos nem resolve o status do chamado automaticamente.
5. A aba Treinamento permite cadastrar exemplos revisados com fontes, testar mensagens sem publicar e pausar a automação.

O seed do classificador contém somente exemplos fictícios. O conjunto de chamados reais usado na avaliação do repositório original não foi incluído; os números de acurácia descritos na documentação upstream não são resultados desta integração. O mascaramento por padrões não é garantia de anonimização completa.

## Recriar a base pública do Pylon

O CSV versionado contém títulos, links e metadados públicos. A coluna de autores foi removida. Os conteúdos baixados e o banco ficam em `data/`, fora do Git.

```sh
python scripts/prepare-pylon.py docs/sources/pylon_articles.csv
node scripts/import-pylon.mjs
```

A importação utiliza somente o domínio público autorizado, mantém rascunhos inativos, evita duplicatas e preserva edições manuais. O agente consulta conteúdo indexado e cita links das fontes; não baixa todas as páginas a cada chamado.

O playbook privado não acompanha o repositório. Quando houver uma exportação local autorizada, as instruções de importação estão no README principal. Não compartilhe arquivos com credenciais ou dados pessoais.

## Validar e demonstrar

```sh
npm run lint
npm run typecheck
npm test
python tests/test_pylon_parser.py
npm run test:e2e
npm run build
```

Use apenas dados fictícios. O perfil do portal é demonstrativo, sem autenticação real. Os testes de navegador usam um banco separado em `artifacts/e2e`.

Roteiro de até três minutos: consultar Processos e abrir uma solicitação em nova aba; criar um chamado de chat e observar a resposta; criar um chamado municipal e aprovar sua solução no suporte; mostrar Treinamento e testar uma mensagem; finalizar com a fonte Pylon clicável na base.

Consulte o [README](../README.md), o [plano](../docs/PLANO.md) e o [registro de validação](../docs/VALIDACAO.md) para os contratos e limites. Bancos SQLite, exportações privadas, caches, capturas, arquivos `.env` e dependências instaladas permanecem ignorados pelo Git.
