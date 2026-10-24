"use client";
import { MessageText } from "@/components/ui/MessageText";


import { useState, type FormEvent } from "react";
import { AiInvestigationNote } from "./AiInvestigationNote";
import { CheckCheck, CornerDownRight, MessageSquare, Send, Sparkles } from "lucide-react";
import type { Ticket } from "@/lib/types";
import { useGlobal } from "@/context/GlobalContext";
import { Avatar, Button, inputClass } from "@/components/ui";

import { TicketMetadata } from "./TicketMetadata";
import { TicketAiHistory } from "@/components/approve/AiAttemptHistory";
import { TicketAgentPanel } from "./TicketAgentPanel";

export function TicketDetail({ ticket, initialReply = "" }: { ticket?: Ticket; initialReply?: string }) {
  const { addReply, retryTriage } = useGlobal();
  const [reply, setReply] = useState(initialReply);
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);
  if (!ticket) return <section className="flex min-h-96 flex-col items-center justify-center bg-slate-50/50 dark:bg-slate-950/50 p-10 text-center"><span className="mb-5 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-5 text-blue-600 dark:text-blue-400 shadow-sm"><MessageSquare size={30} strokeWidth={1.5} /></span><h2 className="text-lg font-semibold">Nenhum chamado selecionado</h2><p className="mt-2 max-w-64 text-sm leading-relaxed text-slate-500 dark:text-slate-400">Selecione um chamado para ver a conversa e a investigação inicial.</p></section>;
  const submit = async (event: FormEvent) => {
    event.preventDefault(); if (sending) return; setSending(true);
    try { await addReply(ticket.id, reply, "support"); setReply(""); setError(""); } catch (e) { setError(e instanceof Error ? e.message : "Não foi possível enviar."); } finally { setSending(false); }
  };
  return <section aria-label="Detalhes do chamado" className="flex min-h-0 min-w-0 flex-col bg-[#fcfdff] dark:bg-slate-950">
    <header className="shrink-0 border-b border-slate-200 bg-white px-5 py-4 dark:border-slate-700 dark:bg-slate-900"><p className="font-mono text-[10px] text-slate-400">CHAMADO #{ticket.id}</p><h2 className="mt-2 break-words text-lg font-bold leading-snug tracking-tight text-slate-900 dark:text-slate-100">{ticket.subject}</h2></header>
    <TicketMetadata ticket={ticket} />
    <div className="min-h-0 space-y-6 overflow-y-auto px-5 py-6 lg:flex-1 lg:px-6" aria-live="polite">
      <TicketAgentPanel ticket={ticket} />
      {ticket.aiContext && <TicketAiHistory context={ticket.aiContext} />}
      <p className="text-center text-[10px] font-medium uppercase tracking-[0.12em] text-slate-400">{new Date(ticket.createdAt).toLocaleDateString("pt-BR", { day: "numeric", month: "long", year: "numeric" })}</p>
      {ticket.messages.map(entry => entry.kind === "internal" ? <AiInvestigationNote key={entry.id} content={entry.content} /> : entry.kind === "log" ? <div key={entry.id} className="flex items-start gap-2 rounded-lg border border-blue-100 dark:border-blue-800 bg-blue-50 dark:bg-blue-950 p-3 text-xs text-blue-800 dark:text-blue-200"><CornerDownRight size={15} className="shrink-0" /><p><MessageText text={entry.content} /></p></div> : <article key={entry.id} className="flex gap-3"><Avatar name={entry.kind === "customer" ? ticket.name : "Equipe Nolyp"} blue={entry.kind === "support"} /><div className="min-w-0 flex-1"><div className="mb-2 flex flex-wrap items-center justify-between gap-1"><span className="text-xs font-bold">{entry.kind === "customer" ? ticket.name : "Equipe Nolyp"}<span className="ml-2 text-[10px] font-normal text-slate-400">{entry.kind === "customer" ? "Solicitante" : "Suporte"}</span></span><time className="text-[10px] text-slate-400">{new Date(entry.createdAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</time></div><div className={`whitespace-pre-wrap break-words rounded-xl border p-4 text-xs leading-6 ${entry.kind === "customer" ? "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900" : "border-blue-100 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-950/50"}`}><MessageText text={entry.content} /></div></div></article>)}
      {ticket.triage === "pending" && <div role="status" className="flex animate-pulse items-center gap-2 rounded-lg bg-amber-50 dark:bg-amber-950 p-4 text-xs text-amber-800 dark:text-amber-200"><Sparkles size={16} />Investigando o chamado e consultando o histórico...</div>}
      {ticket.triage === "failed" && <div role="alert" className="rounded-lg bg-rose-50 dark:bg-rose-950 p-4 text-xs text-rose-700 dark:text-rose-300">A investigação não foi concluída. <button onClick={() => void retryTriage(ticket.id).catch(error => setError(error.message))} className="font-semibold underline">Tentar investigação novamente</button></div>}
    </div>
    <form onSubmit={submit} className="shrink-0 border-t border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-5"><label className="mb-2 flex items-center gap-2 text-xs font-semibold text-slate-600 dark:text-slate-300" htmlFor="support-reply"><MessageSquare size={14} />Resposta ao solicitante</label><textarea id="support-reply" value={reply} onChange={e => setReply(e.target.value)} placeholder="Escreva uma resposta para o cliente..." maxLength={4000} required rows={3} className={`${inputClass} min-h-20`} /><div className="mt-3 flex flex-wrap items-center justify-between gap-2"><span className="flex items-center gap-1 text-[10px] text-slate-400"><CheckCheck size={13} />{ticket.origin === "prefeitura" ? "Visível no histórico municipal" : "Visível no chat do requerente"}</span><Button type="submit" disabled={!reply.trim() || sending || ticket.origin === "historico"} className="px-3 py-2 text-xs">Enviar resposta<Send size={13} /></Button></div>{error && <p role="alert" className="mt-2 text-xs text-rose-600 dark:text-rose-400">{error}</p>}</form>
  </section>;
}
