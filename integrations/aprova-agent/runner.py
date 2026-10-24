"""Ponte local do Nolyp para o Agent original. JSON por stdin/stdout; sem rede."""
import json
import re
import sys
from collections import Counter
from aprova_agent import Agent
from aprova_agent.classifier import _tokens, _norm
from aprova_agent.extract import mask_pii

ENGINE = "aprova-agent-mvp@08e6f811"

def main(data):
    agent = Agent(use_llm=False)
    if data.get("mode") == "health":
        return {"ready": True, "engine": ENGINE, "mode": "local", "llm": False}
    training = [ex for ex in data.get("training", []) if ex.get("active")][:500]
    for ex in training:
        agent.clf.examples.append({"text": mask_pii(ex["text"]), "bucket": ex["bucket"]})
    agent.clf._fit()
    text = data["text"][:12000]
    result = agent.handle(text, author=data.get("author", "Solicitante"))
    articles = {article["id"]: article for article in data.get("articles", []) if article.get("active")}
    query = agent.clf._vec(Counter(_tokens(mask_pii(data.get("query", text)))))
    candidates = []
    for example in training:
        refs = [articles[identifier] for identifier in example.get("articleIds", []) if identifier in articles]
        if example["kind"] == "solution" and len(refs) != len(example.get("articleIds", [])):
            continue
        if example["kind"] == "solution" and not refs:
            continue
        similarity = agent.clf._cos(query, agent.clf._vec(Counter(_tokens(mask_pii(example["text"])))))
        if similarity >= 0.62:
            candidates.append((similarity, example, refs))
    if candidates:
        score, example, refs = max(candidates, key=lambda item: item[0])
        return {"engine": ENGINE, "bucket": result["bucket"], "confidence": round(score, 3), "kind": example["kind"], "reply": example["reply"], "triageNote": result["triage_note"], "sources": [{"id": a["id"], "title": a["title"]} for a in refs]}
    words = {word for word in _tokens(data.get("query", text)) if len(word) > 3 and "_" not in word}
    topic = words - {"processo", "processos", "sistema", "formulario", "chamado", "minha", "onde", "como", "tenho", "quero"}
    ranked = []
    for article in articles.values():
        terms = set(_tokens(article["title"] + " " + article["content"]))
        score = len(words & terms)
        heading_matches = len(words & set(_tokens(article["title"])))
        if score >= 2 and (topic & terms):
            ranked.append((score + 2 * heading_matches, article))
    for _, article in sorted(ranked, key=lambda item: item[0], reverse=True):
        # Só seções explicitamente destinadas ao cliente viram respostas públicas.
        match = re.search(r"(?:^|\n)#{1,6}\s*(?:\d+[.)]?\s*)?(?:orienta[çc][ãa]o ao cliente|resposta ao cliente|modelo de resposta)[^\n]*\n([\s\S]*?)(?=\n#{1,6}\s|\Z)", article["content"], re.I)
        if not match:
            continue
        reply = re.sub(r"```[\s\S]*?```|!\[[^\]]*\]\([^)]*\)|<[^>]+>", "", match.group(1)).strip()
        reply = re.sub(r"\[([^\]]+)\]\([^)]*\)", r"\1", reply)
        if len(reply) < 15 or re.search(r"CREDENCIAL OCULTADA|Bearer |api[_-]?key|password|service_role", reply, re.I):
            continue
        return {"engine": ENGINE, "bucket": result["bucket"], "confidence": result["confidence"], "kind": "solution", "reply": reply[:3500], "triageNote": result["triage_note"], "sources": [{"id": article["id"], "title": article["title"]}]}
    if result["action"] == "perguntar":
        return {"engine": ENGINE, "bucket": result["bucket"], "confidence": result["confidence"], "kind": "clarification", "reply": result["reply"], "triageNote": result["triage_note"], "sources": []}
    return {"engine": ENGINE, "bucket": result["bucket"], "confidence": result["confidence"], "kind": "handoff", "reply": "A equipe técnica precisa analisar este caso. Suas informações estão registradas no chamado; o atendimento continuará por aqui.", "triageNote": result["triage_note"], "sources": []}

if __name__ == "__main__":
    try:
        incoming = sys.stdin.buffer.read(1048577)
        if len(incoming) > 1048576:
            raise ValueError("payload too large")
        print(json.dumps(main(json.loads(incoming.decode("utf-8"))), ensure_ascii=False))
    except Exception:
        print(json.dumps({"error": "O agente local não conseguiu processar a solicitação."}))
        sys.exit(1)
