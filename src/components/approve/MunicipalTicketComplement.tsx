"use client";
import { useState, type FormEvent } from "react";
import type { Ticket } from "@/lib/types";
import { useGlobal } from "@/context/GlobalContext";
import { Button, Field, inputClass } from "@/components/ui";
export function MunicipalTicketComplement({ ticket }: { ticket: Ticket }) {
  const { addReply } = useGlobal(); const [text, setText] = useState(""); const [busy, setBusy] = useState(false); const [error, setError] = useState("");
  if (ticket.status === "Resolvido") return null;
  const latest = ticket.agentRuns?.[0];
  const submit = async (event: FormEvent) => { event.preventDefault(); if (busy || !text.trim()) return; setBusy(true); setError(""); try { await addReply(ticket.id, text, "customer"); setText(""); } catch (error) { setError(error instanceof Error ? error.message : "Não foi possível complementar o chamado."); } finally { setBusy(false); } };
  return <section className="mt-5 border-t border-slate-200 pt-5 dark:border-slate-700">{latest?.status === "pending_approval" && <p role="status" className="mb-4 rounded-lg bg-amber-50 p-3 text-xs text-amber-800 dark:bg-amber-950 dark:text-amber-200">A equipe está revisando uma mensagem de solução antes de enviar.</p>}{latest?.status === "published" && latest.result?.kind === "clarification" && <p className="mb-4 text-xs font-semibold text-blue-700 dark:text-blue-300">O agente solicitou mais informações. Complemente o chamado abaixo.</p>}<details><summary className="cursor-pointer text-xs font-semibold text-blue-600 dark:text-blue-400">Complementar informações do chamado</summary><form onSubmit={submit} className="mt-4 space-y-3"><Field label="Informações complementares"><textarea value={text} onChange={event => setText(event.target.value)} rows={3} required maxLength={4000} className={inputClass} /></Field>{error && <p role="alert" className="text-xs text-rose-700 dark:text-rose-300">{error}</p>}<Button type="submit" disabled={busy || !text.trim()}>{busy ? "Enviando..." : "Enviar informações ao suporte"}</Button></form></details></section>;
}
