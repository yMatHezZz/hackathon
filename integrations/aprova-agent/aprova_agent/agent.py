"""Agente de suporte Aprova — orquestracao portatil.

Fluxo (alivia o suporte humano, melhora a abertura do ticket):
  1. Mascara PII (LGPD)         -> extract.mask_pii
  2. Classifica (kNN leve)      -> classifier.SemanticClassifier  (BUG / CONSTRUIR_ALTERAR / DUVIDA)
  3. Extrai entidades           -> extract.extract (processo, secretaria, faltando)
  4. Gate de confianca          -> incerto OU falta campo essencial => pergunta UMA coisa
  5. Acao por bucket            -> nota de triagem pronta p/ o humano (+ rascunho opcional via LLM)

Nunca depende do LLM para funcionar: sem LLM, usa templates. Zero deps obrigatorias.
"""
from . import extract as _ex
from . import llm as _llm
from .classifier import SemanticClassifier

CONF_THRESHOLD = 0.45  # concordancia minima dos vizinhos; abaixo disso, pergunta
MIN_SIM = 0.08         # match minimo; abaixo disso a entrada e vaga/sem sinal

_ACTION_BY_BUCKET = {
    "BUG": "triagem_n2",
    "CONSTRUIR_ALTERAR": "triagem_parametrizacao",
    "DUVIDA": "responder",
}
_BUCKET_LABEL = {
    "BUG": "Problema/Erro (investigar)",
    "CONSTRUIR_ALTERAR": "Parametrização/Ajuste (configurar)",
    "DUVIDA": "Dúvida (orientar)",
}


class Agent:
    def __init__(self, use_llm=True, conf_threshold=CONF_THRESHOLD):
        self.clf = SemanticClassifier()
        self.use_llm = use_llm
        self.conf_threshold = conf_threshold
        self._llm_on = use_llm and _llm.available()

    # -- API principal, 1 chamada resolve tudo --
    def handle(self, text, author=None):
        safe = _ex.mask_pii(text or "")
        cls = self.clf.classify(safe)
        ent = _ex.extract(safe)
        bucket, conf = cls["bucket"], cls["confidence"]

        low_conf = conf < self.conf_threshold or cls.get("top_similarity", 1.0) < MIN_SIM
        # so exige numero_do_processo (campo essencial p/ 1a analise); secretaria e desejavel
        needs_field = "numero_do_processo" in ent["missing"]

        if low_conf or needs_field:
            action = "perguntar"
            question = self._clarifying_question(ent, bucket, low_conf)
            reply = question
            triage = None
        else:
            action = _ACTION_BY_BUCKET.get(bucket, "triagem_n2")
            triage = self._triage_note(safe, bucket, ent, cls, author)
            reply = self._draft_reply(safe, bucket) if action == "responder" else None

        return {
            "ok": True,
            "bucket": bucket,
            "bucket_label": _BUCKET_LABEL.get(bucket, bucket),
            "confidence": conf,
            "action": action,
            "missing_fields": ent["missing"],
            "entities": {"processo": ent["processo"], "secretaria": ent["secretaria"],
                         "emails": ent["emails"]},
            "reply": reply,              # texto p/ responder ao cliente (pergunta ou resposta)
            "triage_note": triage,       # markdown p/ o analista humano (None se perguntando)
            "resolvable_first_pass": (action != "perguntar"),
            "llm_used": self._llm_on and action in ("responder",),
            "classifier_scores": cls["scores"],
        }

    # -- pergunta unica, prioriza o campo mais essencial --
    def _clarifying_question(self, ent, bucket, low_conf):
        if "numero_do_processo" in ent["missing"]:
            return ("Para agilizar, qual é o número do processo/protocolo relacionado? "
                    "Com ele eu já localizo e encaminho certo na primeira análise.")
        if "secretaria" in ent["missing"] and bucket == "CONSTRUIR_ALTERAR":
            return "Qual secretaria/fluxo deve receber esse ajuste (ex.: Obras, Saúde, Meio Ambiente)?"
        if bucket == "BUG":
            return "Em que tela/ação o erro acontece e qual mensagem aparece? Se puder, me mande um print."
        return "Pode me dar um pouco mais de detalhe sobre o que você precisa resolver?"

    # -- nota de triagem estruturada p/ o humano (markdown) --
    def _triage_note(self, text, bucket, ent, cls, author):
        header = (
            f"### Nota de Triagem — {_BUCKET_LABEL.get(bucket, bucket)}\n"
            f"- **Classificação:** {bucket}  (confiança {cls['confidence']})\n"
            f"- **Processo:** {ent['processo'] or '—'}  ·  **Secretaria:** {ent['secretaria'] or '—'}\n"
            f"- **Solicitante:** {author or '—'}\n"
            f"- **Relato (PII mascarada):** {text[:600]}\n"
        )
        if bucket == "BUG":
            header += "- **Encaminhar:** N2 (investigar erro). Reproduzir passos e checar logs/integração.\n"
        elif bucket == "CONSTRUIR_ALTERAR":
            header += "- **Encaminhar:** Fila de Parametrização. Validar regra/campo e impacto no fluxo.\n"
        else:
            header += "- **Encaminhar:** N1 (orientação). Resposta direta possível.\n"
        # enriquecimento opcional por LLM (hipotese tecnica) — nunca bloqueia
        if self._llm_on:
            hip = _llm.generate(
                "Você é um analista de suporte da Aprova (govtech). Em 1-2 frases, diga a provável "
                "causa/hipótese técnica e o próximo passo. Português, objetivo, sem inventar dados.",
                "Ticket: " + text[:800], max_tokens=120)
            if hip:
                header += f"- **Hipótese (IA local):** {hip}\n"
        return header

    def _draft_reply(self, text, bucket):
        if self._llm_on:
            r = _llm.generate(
                "Você é o atendimento oficial da Aprova Digital. Responda em português (pt-BR), "
                "cordial e objetivo, orientando o próximo passo. Não invente dados nem prometa prazos.",
                "Mensagem do cliente: " + text[:800], max_tokens=220)
            if r:
                return r
        return ("Obrigado pelo contato! Já estou verificando sua solicitação e em seguida "
                "oriento o próximo passo. Se possível, confirme o número do processo para agilizar.")
