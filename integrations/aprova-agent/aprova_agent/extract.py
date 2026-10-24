"""Extracao de entidades do ticket (stdlib puro) + mascaramento LGPD.
Alimenta o indicador 'resolvivel na 1a analise': detecta o que falta logo na abertura."""
import re

_CPF = re.compile(r"\b\d{3}\.?\d{3}\.?\d{3}-?\d{2}\b")
_EMAIL = re.compile(r"\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b")
_PHONE = re.compile(r"\b(?:\+?55\s?)?(?:\(?\d{2}\)?\s?)?9?\d{4}[-.\s]?\d{4}\b")
# processo: formatos comuns "processo 20592", "2026/0401", "proc. 12345"
_PROC = re.compile(r"(?:processo|proc\.?|protocolo|chamado)\s*n?[ºo°]?\s*[:#]?\s*(\d{3,}[/-]?\d*)", re.I)
_PROC2 = re.compile(r"\b(\d{4}/\d{3,})\b")
_SECRETARIA = re.compile(r"\b(?:secretaria|sec\.?)\s+(?:de\s+|da\s+|do\s+)?([A-Za-zÀ-ÿ][A-Za-zÀ-ÿ\s]{2,30})", re.I)


def mask_pii(text):
    """Mascara CPF, e-mail e telefone antes de logar/enviar (LGPD)."""
    t = _CPF.sub("[CPF]", text)
    t = _EMAIL.sub("[EMAIL]", t)
    t = _PHONE.sub("[TELEFONE]", t)
    return t


def extract(text):
    """-> {processo, secretaria, emails, missing: [campos essenciais faltando]}"""
    proc = None
    m = _PROC.search(text) or _PROC2.search(text)
    if m:
        proc = m.group(1)
    sec = None
    ms = _SECRETARIA.search(text)
    if ms:
        sec = ms.group(1).strip().split("\n")[0][:40]
    emails = _EMAIL.findall(text)
    missing = []
    if not proc:
        missing.append("numero_do_processo")
    if not sec:
        missing.append("secretaria")
    return {
        "processo": proc,
        "secretaria": sec,
        "emails": emails,
        "missing": missing,
    }
