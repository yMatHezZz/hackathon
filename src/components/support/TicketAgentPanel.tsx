"use client";
import { useState } from "react";
import { Bot, Check, RotateCcw, ShieldCheck, X } from "lucide-react";
import type { Ticket } from "@/lib/types";
import type { AgentRun } from "@/lib/agent-types";
import { useGlobal } from "@/context/GlobalContext";
import { Button, Field, inputClass } from "@/components/ui";
import { pylonArticleUrl } from "@/lib/knowledge-links";

export function TicketAgentPanel({ ticket }: { ticket: Ticket }) {
  const run = ticket.agentRuns?.[0];
  if (!run) return null;
  return <RunPanel key={`${run.id}-${run.status}`} run={run} ticket={ticket} />;
}
function RunPanel({ run, ticket }: { run: AgentRun; ticket: Ticket }) {
  const { agentAction } = useGlobal();
  const [reply, setReply] = useState(run.result?.reply ?? ""); const [busy, setBusy] = useState(false); const [error, setError] = useState("");
  const act = async (action: "approve-agent" | "reject-agent" | "retry-agent") => {
    setBusy(true); setError("");
    try { await agentAction(ticket.id, run.id, action, action === "approve-agent" ? reply : undefined); }
    catch (error) { setError(error instanceof Error ? error.message : "Não foi possível confirmar a ação."); } finally { setBusy(false); }
  };
  const labels = { queued: "Na fila do agente", running: "Agente consultando a base...", pending_approval: "Mensagem aguardando aprovação", published: "Mensagem do agente enviada", failed: "Agente precisa de atenção", rejected: "Proposta rejeitada pelo atendente", superseded: "Proposta substituída: a conversa mudou" };
  return <section aria-label="Resposta do agente Aprova" className={`rounded-xl border p-4 ${run.status === "pending_approval" ? "border-amber-200 bg-amber-50/50 dark:border-amber-800 dark:bg-amber-950/30" : "border-blue-100 bg-blue-50/30 dark:border-blue-800 dark:bg-blue-950/30"}`}>
    <h3 className="flex items-center gap-2 text-sm font-bold"><Bot size={17} className="text-blue-600 dark:text-blue-400" />{labels[run.status]}</h3>
    {run.status === "pending_approval" ? <div className="mt-3 space-y-3"><p className="flex items-start gap-2 text-xs leading-6 text-slate-500 dark:text-slate-400"><ShieldCheck size={15} className="mt-1 shrink-0" />A solução do chamado municipal só será enviada após sua aprovação. Revise o texto e as fontes.</p><Field label="Mensagem do agente para aprovação"><textarea value={reply} onChange={event => setReply(event.target.value)} rows={5} maxLength={4000} className={inputClass} /></Field><div className="flex flex-wrap gap-2"><Button disabled={busy || !reply.trim() || ticket.status === "Resolvido"} onClick={() => void act("approve-agent")} className="text-xs"><Check size={14} />Aprovar e enviar mensagem</Button><Button disabled={busy} variant="secondary" onClick={() => void act("reject-agent")} className="text-xs"><X size={14} />Rejeitar proposta</Button></div></div> : (run.status === "queued" || run.status === "running") ? <p role="status" className="mt-2 animate-pulse text-xs text-slate-500 dark:text-slate-400">A consulta é local. O histórico será atualizado automaticamente.</p> : run.status === "failed" ? <p role="alert" className="mt-2 text-xs leading-6 text-rose-700 dark:text-rose-300">{run.error} Nenhuma resposta automática foi enviada nesta execução.</p> : <p className="mt-2 text-xs leading-6 text-slate-500 dark:text-slate-400">{run.status === "published" ? `${run.result?.kind === "clarification" ? "Pedido de complementação" : "Resposta"} registrado na conversa. O status do chamado permanece sob controle do atendente.` : "Nenhuma mensagem desta proposta será enviada automaticamente."}</p>}
    {run.result && <details className="mt-3 text-xs"><summary className="cursor-pointer font-semibold text-blue-700 dark:text-blue-300">Fontes e classificação</summary><p className="mt-2 text-[11px] text-slate-500 dark:text-slate-400">{run.result.engine} · {run.result.bucket} · {Math.round(run.result.confidence * 100)}% de confiança</p>{run.result.sources.length ? <ul className="mt-2 space-y-1">{run.result.sources.map(source => <li key={source.id} className="break-words">{pylonArticleUrl(source.url) ? <a href={pylonArticleUrl(source.url)!} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline dark:text-blue-400">{source.title} ↗</a> : source.title}</li>)}</ul> : <p className="mt-2 text-slate-500 dark:text-slate-400">Sem orientação pública correspondente. O agente pode pedir informações ou encaminhar à equipe.</p>}{run.result.triageNote && <pre className="mt-3 whitespace-pre-wrap break-words rounded-lg bg-white p-3 font-sans text-[11px] leading-6 dark:bg-slate-900">{run.result.triageNote}</pre>}</details>}
    {["failed", "rejected"].includes(run.status) && <Button disabled={busy || ticket.status === "Resolvido"} variant="secondary" onClick={() => void act("retry-agent")} className="mt-3 text-xs"><RotateCcw size={13} />Reprocessar com a base atual</Button>}
    {error && <p role="alert" className="mt-3 text-xs text-rose-700 dark:text-rose-300">{error}</p>}
  </section>;
}
