"use client";

import Link from "next/link";
import { useState } from "react";
import type { Ticket } from "@/lib/types";
import { useGlobal } from "@/context/GlobalContext";
import { requesterHistory } from "@/lib/requester-history";
import { Avatar, Badge, inputClass } from "@/components/ui";
import { PriorityBadge } from "./TicketMetadata";

export function RequesterPanel({ ticket, history = false, onSelect }: { ticket?: Ticket; history?: boolean; onSelect?: (id: string) => void }) {
  const { tickets, processes, loading, storageError } = useGlobal();
  const [query, setQuery] = useState("");
  if (!ticket) return <p className="p-5 text-xs leading-6 text-slate-500 dark:text-slate-400">Selecione um chamado para consultar {history ? "o histórico" : "os dados"} do solicitante.</p>;
  const items = requesterHistory(ticket, tickets);
  const related = processes.find(process => process.id === ticket.processId);
  if (history) {
    const filtered = items.filter(item => `${item.id} ${item.subject} ${item.status}`.toLocaleLowerCase("pt-BR").includes(query.toLocaleLowerCase("pt-BR")));
    return <div className="space-y-4 p-5"><div><h3 className="text-sm font-bold">Histórico do solicitante</h3><p className="mt-2 break-words text-xs text-slate-500 dark:text-slate-400">{ticket.email} · {ticket.account}</p><p className="mt-2 text-[11px] text-slate-500 dark:text-slate-400">{items.length} chamados · {items.filter(item => item.status !== "Resolvido").length} em aberto</p></div>
      <label className="block text-xs font-semibold">Buscar no histórico<input aria-label="Buscar no histórico do solicitante" value={query} onChange={event => setQuery(event.target.value)} className={`${inputClass} mt-2 text-xs`} placeholder="Assunto, ID ou status" /></label>
      {loading && <p role="status" className="animate-pulse text-xs">Carregando histórico...</p>}
      {storageError && <p role="alert" className="text-xs text-amber-700 dark:text-amber-300">Não foi possível atualizar o banco. Os registros exibidos podem estar desatualizados.</p>}
      {!filtered.length && <p className="text-xs leading-6 text-slate-500 dark:text-slate-400">{query ? "Nenhum chamado corresponde à busca." : "Nenhum histórico identificado para este e-mail e conta."}</p>}
      <ol className="space-y-3">{filtered.map(item => <li key={item.id}><button aria-label={`Consultar chamado ${item.id}`} aria-current={item.id === ticket.id ? "true" : undefined} disabled={!onSelect} onClick={() => onSelect?.(item.id)} className={`w-full rounded-xl border p-3 text-left transition-all hover:border-blue-400 ${item.id === ticket.id ? "border-blue-300 bg-blue-50 dark:border-blue-700 dark:bg-blue-950" : "border-slate-200 dark:border-slate-700"}`}><span className="break-all font-mono text-[10px] text-slate-500 dark:text-slate-400">{item.id}{item.id === ticket.id ? " · Atual" : ""}</span><span className="mt-2 block break-words text-xs font-semibold leading-5">{item.subject}</span><span className="mt-2 flex flex-wrap gap-2"><Badge status={item.status} /><PriorityBadge priority={item.priority} /></span><span className="mt-2 block text-[10px] text-slate-500 dark:text-slate-400">{new Date(item.createdAt).toLocaleString("pt-BR")}<br />{item.origin === "prefeitura" ? "Prefeitura" : item.origin === "requerente" ? "Requerente" : "Histórico"} · {item.channel}</span></button></li>)}</ol>
      <p className="border-t border-slate-200 pt-3 text-[10px] leading-5 text-slate-400 dark:border-slate-700">Vínculo pelo mesmo e-mail e prefeitura/conta. Chamados de outros solicitantes não são agrupados por nome.</p>
    </div>;
  }
  const data = [["Nome", ticket.name], ["E-mail", ticket.email], ["Prefeitura / Conta", ticket.account], ["Ambiente", ticket.origin === "prefeitura" ? "Approve · Prefeitura" : ticket.origin === "requerente" ? "Approve · Requerente" : "Histórico CSV"], ["Canal", ticket.channel], ["Abertura", new Date(ticket.createdAt).toLocaleString("pt-BR")], ["Última atualização", new Date(ticket.updatedAt ?? ticket.createdAt).toLocaleString("pt-BR")], ["Processo", related?.name ?? "Não informado"]];
  return <div className="space-y-5 p-5"><div className="flex items-center gap-3"><Avatar name={ticket.name} /><div className="min-w-0"><h3 className="break-words text-sm font-bold">{ticket.name}</h3><p className="mt-1 text-[11px] text-slate-400">Dados do solicitante</p></div></div><dl className="space-y-4">{data.map(([label, value]) => <div key={label}><dt className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">{label}</dt><dd className="mt-1 break-words text-xs leading-5">{value || "Não informado"}</dd></div>)}</dl><div className="flex flex-wrap items-center gap-2"><Badge status={ticket.status} /><PriorityBadge priority={ticket.priority} /></div>{related && <Link href={`/requerente/processos/${encodeURIComponent(related.id)}`} className="inline-block text-xs font-semibold text-blue-600 underline dark:text-blue-400">Consultar formulário do processo ↗</Link>}<p className="rounded-lg bg-slate-50 p-3 text-xs leading-6 text-slate-500 dark:bg-slate-950 dark:text-slate-400">{items.length} chamados desta pessoa nesta conta.</p></div>;
}
