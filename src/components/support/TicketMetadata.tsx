"use client";
import { useState } from "react";
import type { Ticket, TicketPriority, TicketStatus } from "@/lib/types";
import { useGlobal } from "@/context/GlobalContext";
import { inputClass } from "@/components/ui";

export function PriorityBadge({ priority = "Média" }: { priority?: TicketPriority }) {
  const colors = { Baixa: "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300", Média: "bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300", Alta: "bg-amber-50 dark:bg-amber-950 text-amber-800 dark:text-amber-200", Urgente: "bg-rose-50 dark:bg-rose-950 text-rose-700 dark:text-rose-300" };
  return <span className={`rounded-md px-2 py-1 text-[10px] font-semibold ${colors[priority]}`}>{priority}</span>;
}
export function TicketMetadata({ ticket }: { ticket: Ticket }) {
  const { setTicketStatus, setTicketPriority, processes } = useGlobal();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const readonly = ticket.origin === "historico";
  const save = async (kind: "status" | "priority", value: string) => {
    setSaving(true); setError("");
    try { if (kind === "status") await setTicketStatus(ticket.id, value as TicketStatus); else await setTicketPriority(ticket.id, value as TicketPriority); }
    catch (error) { setError(error instanceof Error ? error.message : "Não foi possível salvar."); }
    finally { setSaving(false); }
  };
  const info = [
    ["Solicitante", ticket.name], ["E-mail do usuário", ticket.email],
    ["Aberto em", new Date(ticket.createdAt).toLocaleString("pt-BR")],
    ["Ambiente de origem", ticket.origin === "prefeitura" ? "Approve · Prefeitura" : ticket.origin === "requerente" ? "Approve · Requerente" : "Histórico CSV demonstrativo"],
    ["Canal de abertura", ticket.channel], ["Processo relacionado", processes.find(process => process.id === ticket.processId)?.name ?? "Não informado"],
  ];
  return <div className="shrink-0 border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-5 py-4">
    <dl className="grid grid-cols-2 gap-x-4 gap-y-3">{info.map(([label, value]) => <div key={label} className="min-w-0"><dt className="text-[10px] font-semibold text-slate-400">{label}</dt><dd className="mt-1 break-words text-[11px] text-slate-700 dark:text-slate-200">{value}</dd></div>)}</dl>
    <div className="mt-4 grid grid-cols-2 gap-3"><label className="text-[10px] font-semibold text-slate-500 dark:text-slate-400">Status do chamado<select aria-label="Status do chamado" disabled={readonly || saving} value={ticket.status} onChange={event => void save("status", event.target.value)} className={`${inputClass} mt-1 py-1.5 text-xs`}>{["Aberto", "Em atendimento", "Resolvido"].map(status => <option key={status}>{status}</option>)}</select></label><label className="text-[10px] font-semibold text-slate-500 dark:text-slate-400">Prioridade<select aria-label="Prioridade do chamado" disabled={readonly || saving} value={ticket.priority ?? "Média"} onChange={event => void save("priority", event.target.value)} className={`${inputClass} mt-1 py-1.5 text-xs`}>{["Baixa", "Média", "Alta", "Urgente"].map(priority => <option key={priority}>{priority}</option>)}</select></label></div>
    {error && <p role="alert" className="mt-2 text-xs text-rose-700 dark:text-rose-300">{error}</p>}
    {readonly && <p className="mt-2 text-[10px] text-slate-400">Registro histórico de demonstração, disponível para consulta.</p>}
  </div>;
}
