"use client";
import { MessageText } from "@/components/ui/MessageText";

import { useState, type FormEvent } from "react";
import type { Ticket } from "@/lib/types";
import { useGlobal } from "@/context/GlobalContext";
import { Button, Field, inputClass } from "@/components/ui";

export function PublicTicketConversation({ ticket, allowReply = false }: { ticket: Ticket; allowReply?: boolean }) {
  const { addReply } = useGlobal();
  const [reply, setReply] = useState(""); const [busy, setBusy] = useState(false); const [error, setError] = useState("");
  const submit = async (event: FormEvent) => {
    event.preventDefault(); if (busy || !reply.trim()) return; setBusy(true); setError("");
    try { await addReply(ticket.id, reply, "customer"); setReply(""); } catch (error) { setError(error instanceof Error ? error.message : "Não foi possível enviar."); } finally { setBusy(false); }
  };
  return <><div className="space-y-4" aria-label="Conversa pública do chamado" aria-live="polite">{ticket.messages.filter(message => message.kind === "customer" || message.kind === "support").map(message => <article key={message.id} className={`rounded-xl p-4 ${message.kind === "customer" ? "bg-slate-50 dark:bg-slate-950" : "border border-blue-100 bg-blue-50/50 dark:border-blue-800 dark:bg-blue-950/50"}`}><div className="mb-2 flex flex-wrap justify-between gap-2"><h3 className="text-xs font-bold">{message.kind === "customer" ? ticket.name : message.id.startsWith("agent-reply:") ? "Assistente Aprova" : "Equipe Nolyp"}</h3><time className="text-[10px] text-slate-400">{new Date(message.createdAt).toLocaleString("pt-BR")}</time></div><p className="whitespace-pre-wrap break-words text-sm leading-7"><MessageText text={message.content} /></p></article>)}</div>{allowReply && ticket.status !== "Resolvido" && <form onSubmit={submit} className="mt-5 space-y-3"><Field label="Enviar mais informações"><textarea value={reply} onChange={event => setReply(event.target.value)} required maxLength={4000} rows={3} className={inputClass} /></Field>{error && <p role="alert" className="text-xs text-rose-700 dark:text-rose-300">{error}</p>}<Button type="submit" disabled={busy || !reply.trim()}>{busy ? "Enviando..." : "Enviar mensagem ao suporte"}</Button></form>}{ticket.status === "Resolvido" && <p className="mt-4 text-xs leading-6 text-slate-500 dark:text-slate-400">Chamado resolvido. Para outro impedimento, abra um novo chamado.</p>}</>;
}
