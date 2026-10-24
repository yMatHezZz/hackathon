# INSTRUCTIONS — o que cada instrução faz e quando é chamada

A banca precisa enxergar quais instruções o agente segue e a responsabilidade de cada uma.
O agente é **determinístico e auditável**: a cada ticket, roda esta sequência fixa.

## Fluxo de uma mensagem (`Agent.handle`)

```
texto do cliente
  │
  ├─1. mask_pii            (extract.py)      mascara CPF / e-mail / telefone  → LGPD
  │
  ├─2. classify            (classifier.py)   TF-IDF + kNN balanceado por classe
  │                                          → bucket + confiança (concordância dos vizinhos)
  │
  ├─3. extract             (extract.py)      nº do processo, secretaria, campos faltando
  │
  ├─4. gate de confiança   (agent.py)        incerto (confiança < 0,45 OU match < 0,08)
  │                                          OU falta o nº do processo → PERGUNTA 1 coisa
  │
  └─5. ação por bucket      (agent.py)
         BUG               → nota de triagem p/ N2 (investigar erro)
         CONSTRUIR_ALTERAR → nota de triagem p/ fila de Parametrização
         DUVIDA            → responder (rascunho) ao cliente
```

## Responsabilidade de cada instrução

| Instrução | Arquivo | Responsabilidade | Garantia |
|---|---|---|---|
| **mask_pii** | `extract.py` | Remover dados pessoais antes de logar/processar | Nenhum CPF/e-mail/telefone sai em claro |
| **classify** | `classifier.py` | Rotular a demanda em BUG / CONSTRUIR_ALTERAR / DUVIDA | Sem LLM, sem GPU, < 5 ms, voto balanceado por classe |
| **extract** | `extract.py` | Achar processo/secretaria e o que falta | Alimenta o indicador "resolvível na 1ª análise" |
| **gate de confiança** | `agent.py` | Decidir: agir ou perguntar | Quando em dúvida, **pergunta 1 coisa** em vez de chutar (mata o loop) |
| **triage_note** | `agent.py` | Montar a nota pronta pro analista humano | Markdown com classificação, entidades e encaminhamento |
| **generate (opcional)** | `llm.py` | Rascunho de resposta / hipótese técnica | **Só geração**, nunca classificação; degrada p/ template se indisponível |

## Por que o LLM NÃO classifica

Medição honesta (leave-one-out, 150 tickets reais): o LLM pequeno local (qwen2.5:3b) classificou a ~45–57% — instável nas categorias que se sobrepõem. O **retrieval semântico leve acertou 71,3%**, mais rápido e sem GPU. Então o LLM é reservado à geração de texto, onde o raciocínio ajuda e a acurácia de rótulo não é a métrica.

## Como a banca reproduz os números

```bash
python evaluate_honest.py      # imprime a acurácia leave-one-out por bucket
```
