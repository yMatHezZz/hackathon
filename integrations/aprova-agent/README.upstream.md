# Aprova — Agente de Suporte (MVP portátil)

Agente que **alivia o trabalho do suporte humano**: lê o ticket (mesmo bagunçado, estilo WhatsApp), **classifica** o tipo de demanda, **extrai** os dados essenciais, e ou **responde**, ou **monta a nota de triagem pronta** pro analista, ou **faz UMA pergunta** quando falta informação — melhorando o ticket **desde a abertura**.

Feito pra ser **fácil de plugar em qualquer sistema** (front e back), rodar **offline, sem GPU, custo R$ 0 por ticket**.

---

## Resultado real (validação honesta)

Medido com **leave-one-out** nos **150 chamados reais** (sem vazamento de dados):

| Abordagem | Acurácia (3 buckets operacionais) |
|---|---|
| Regras por palavra-chave (baseline) | **36,0%** |
| **Este agente (retrieval semântico leve)** | **71,3%** |

Equilibrado por classe: BUG 63% · Parametrização/Ajuste 78% · Dúvida 60%.
Latência **< 5 ms/ticket**, **sem GPU**, **R$ 0,00** por ticket.

> Decisão de engenharia honesta: testamos um LLM pequeno local (qwen2.5:3b) para **classificar** — ficou em ~45–57% (instável nas categorias fuzzy). O **retrieval semântico leve é mais preciso E mais rápido**. Por isso o LLM entra **só na geração** (rascunho de resposta / hipótese técnica), nunca na classificação.

---

## Como rodar

**Python (import direto):**
```python
from aprova_agent import Agent
agent = Agent()                       # use_llm=True por padrao (usa Ollama se disponivel)
r = agent.handle("nao consigo salvar, erro 500 na tela de taxas do processo 20592")
print(r["bucket"], r["action"])       # BUG  triagem_n2
print(r["triage_note"])               # nota markdown pronta pro analista
```

**Servidor HTTP (qualquer linguagem no front/back):**
```bash
python -m aprova_agent.server          # sobe em http://0.0.0.0:8080  (CORS liberado)
```
```bash
curl -X POST http://localhost:8080/handle -H "Content-Type: application/json" \
  -d '{"text":"preciso criar um novo processo para a Sec. de Saude", "author":"Analista X"}'
```

**Validação honesta (reproduz o número):**
```bash
python evaluate_honest.py
```

---

## Integração front + back

- **Frontend** (widget de chat / formulário): `fetch('http://SEU_HOST:8080/handle', {method:'POST', body: JSON.stringify({text})})` → use `reply` para mostrar ao cliente e `action` para decidir o fluxo.
- **Backend** (fila Pylon/Nolyp, e-mail, WhatsApp): importe `Agent` e use `triage_note` (markdown pronto) + `bucket`/`entities` para rotear e pré-preencher o chamado.
- **Contrato de resposta** de `/handle`: `bucket`, `bucket_label`, `confidence`, `action` (`responder` | `triagem_n2` | `triagem_parametrizacao` | `perguntar`), `missing_fields`, `entities`, `reply`, `triage_note`, `resolvable_first_pass`.

## Configuração do LLM (opcional, por variável de ambiente)

| Variável | Padrão | Para quê |
|---|---|---|
| `LLM_BASE_URL` | `http://localhost:11434` | Ollama local; ou URL de um endpoint |
| `LLM_MODEL` | `qwen2.5:3b` | modelo pequeno que cabe em GPU 4 GB |
| `LLM_API` | `ollama` | ou `openai` (endpoints compatíveis) |
| `LLM_API_KEY` | — | para `LLM_API=openai` |

Sem LLM, tudo funciona com templates (o agente nunca quebra).

---

## O que vem na caixa

- `aprova_agent/classifier.py` — classificador semântico leve (TF-IDF + kNN balanceado).
- `aprova_agent/extract.py` — extração de entidades + mascaramento LGPD (CPF/e-mail/telefone).
- `aprova_agent/llm.py` — backend de LLM **opcional e plugável** (só geração).
- `aprova_agent/agent.py` — orquestração (classifica → gate de confiança → extrai → ação).
- `aprova_agent/server.py` — API HTTP stdlib (qualquer front/back).
- `evaluate_honest.py` — harness de validação honesta (leave-one-out).
- `INSTRUCTIONS/` — o que cada parte faz (para a banca do hackathon).
