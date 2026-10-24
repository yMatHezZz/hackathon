"""Agente de suporte Aprova — portatil, LLM opcional, zero deps obrigatorias.

Uso em Python:
    from aprova_agent import Agent
    agent = Agent()
    r = agent.handle("nao consigo salvar, da erro na tela de taxas do processo 20592")
    print(r["bucket"], r["action"], r["triage_note"])

Uso via HTTP (qualquer linguagem): rode `python -m aprova_agent.server` e faca POST /handle.
"""
from .agent import Agent
from .classifier import SemanticClassifier

__all__ = ["Agent", "SemanticClassifier"]
__version__ = "0.1.0"
