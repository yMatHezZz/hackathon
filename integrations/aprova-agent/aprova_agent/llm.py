"""Backend de LLM OPCIONAL e PLUGAVEL (so para GERACAO de texto: rascunho/nota de triagem).
Nunca usado para classificar (o kNN leve faz melhor). Degrada com elegancia se indisponivel.

Config por variaveis de ambiente (qualquer sistema):
  LLM_BASE_URL  (padrao http://localhost:11434  = Ollama local)
  LLM_MODEL     (padrao qwen2.5:3b)
  LLM_API       ('ollama' padrao, ou 'openai' para endpoints compativeis OpenAI)
  LLM_API_KEY   (para endpoints 'openai', opcional)
  LLM_TIMEOUT   (segundos, padrao 60)
"""
import json
import os
import urllib.request

BASE_URL = os.getenv("LLM_BASE_URL", "http://localhost:11434").rstrip("/")
MODEL = os.getenv("LLM_MODEL", "qwen2.5:3b")
API = os.getenv("LLM_API", "ollama").lower()
API_KEY = os.getenv("LLM_API_KEY", "")
TIMEOUT = float(os.getenv("LLM_TIMEOUT", "60"))


def _post(url, payload, headers=None):
    h = {"Content-Type": "application/json"}
    if headers:
        h.update(headers)
    req = urllib.request.Request(url, data=json.dumps(payload).encode("utf-8"), headers=h)
    with urllib.request.urlopen(req, timeout=TIMEOUT) as r:
        return json.loads(r.read())


def available():
    """True se o LLM responde. Nao levanta excecao."""
    try:
        if API == "ollama":
            urllib.request.urlopen(BASE_URL + "/api/tags", timeout=4)
        return True
    except Exception:
        return False


def generate(system, user, max_tokens=400, temperature=0.2):
    """Gera texto. Retorna str, ou None se o LLM estiver indisponivel/falhar
    (o chamador cai no template). Nunca quebra o agente."""
    try:
        if API == "openai":
            url = BASE_URL + "/v1/chat/completions"
            headers = {"Authorization": "Bearer " + API_KEY} if API_KEY else None
            d = _post(url, {
                "model": MODEL,
                "messages": [{"role": "system", "content": system},
                             {"role": "user", "content": user}],
                "max_tokens": max_tokens, "temperature": temperature,
            }, headers)
            return d["choices"][0]["message"]["content"].strip()
        # ollama
        d = _post(BASE_URL + "/api/chat", {
            "model": MODEL, "stream": False,
            "messages": [{"role": "system", "content": system},
                         {"role": "user", "content": user}],
            "options": {"temperature": temperature, "num_predict": max_tokens},
        })
        return d["message"]["content"].strip()
    except Exception:
        return None
