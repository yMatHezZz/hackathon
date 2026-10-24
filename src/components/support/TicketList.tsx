"use client";

import { useState } from "react";
import { Inbox, Search, SlidersHorizontal } from "lucide-react";
import { useGlobal } from "@/context/GlobalContext";
import { Avatar, Badge, inputClass } from "@/components/ui";
import { PriorityBadge } from "./TicketMetadata";

export function TicketList({ selectedId, onSelect }: { selectedId: string | null; onSelect: (id: string) => void }) {
  const { tickets, loading } = useGlobal();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("Todos");
  const filtered = tickets.filter(t => (filter === "Todos" || (filter === "Abertos" ? t.status !== "Resolvido" : t.status === "Resolvido")) && `${t.id} ${t.subject} ${t.name} ${t.account} ${t.email} ${t.origin}`.toLocaleLowerCase("pt-BR").includes(search.toLocaleLowerCase("pt-BR")));
  return <section aria-label="Lista de chamados" className="flex min-h-0 flex-col border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 lg:border-b-0 lg:border-r">
    <div className="border-b border-slate-100 dark:border-slate-700 p-5">
      <div className="mb-4 flex items-center justify-between"><h2 className="text-sm font-bold">Caixa de entrada <span className="ml-1.5 rounded-md bg-slate-100 dark:bg-slate-800 px-2 py-0.5 text-xs text-slate-500 dark:text-slate-400">{tickets.length}</span></h2><SlidersHorizontal size={16} className="text-slate-400" aria-hidden="true" /></div>
      <label className="relative block"><Search size={15} className="absolute left-3 top-3 text-slate-400" /><input aria-label="Buscar chamados" placeholder="Buscar por assunto, nome ou ID..." value={search} onChange={e => setSearch(e.target.value)} className={`${inputClass} pl-9 text-xs`} /></label>
      <div className="mt-4 flex gap-1 rounded-lg bg-slate-100 dark:bg-slate-800 p-1" aria-label="Filtrar chamados">{["Todos", "Abertos", "Resolvidos"].map(value => <button key={value} onClick={() => setFilter(value)} aria-pressed={filter === value} className={`flex-1 rounded-md px-2 py-1.5 text-[11px] font-semibold transition-all ${filter === value ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-sm" : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100"}`}>{value}</button>)}</div>
    </div>
    <div className="max-h-[370px] overflow-y-auto lg:max-h-none lg:flex-1">
      {loading ? <div role="status" className="space-y-4 p-5"><p className="text-xs text-slate-500 dark:text-slate-400">Carregando histórico...</p>{[1, 2, 3].map(n => <div key={n} className="h-20 animate-pulse rounded-lg bg-slate-100 dark:bg-slate-800" />)}</div> : filtered.length ? filtered.map(ticket => <button key={ticket.id} onClick={() => onSelect(ticket.id)} aria-pressed={selectedId === ticket.id} className={`relative w-full border-b border-slate-100 dark:border-slate-700 p-5 text-left transition-all hover:bg-slate-50 dark:hover:bg-slate-950 ${selectedId === ticket.id ? "bg-blue-50/70 dark:bg-blue-950/70 before:absolute before:inset-y-0 before:left-0 before:w-[3px] before:bg-blue-600" : ""}`}>
        <div className="mb-2.5 flex items-center gap-2"><Avatar name={ticket.name} blue={ticket.source === "Formulário"} /><div className="min-w-0 flex-1"><p className="truncate text-xs font-semibold">{ticket.name}</p><p className="mt-0.5 truncate text-[10px] text-slate-400">{ticket.account}</p></div><span className="shrink-0 text-[10px] text-slate-400">{new Date(ticket.createdAt).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })}</span></div>
        <p className="line-clamp-1 text-[13px] font-semibold text-slate-800 dark:text-slate-100">{ticket.subject}</p><p className="mt-1 line-clamp-1 text-xs text-slate-500 dark:text-slate-400">{ticket.description}</p><p className="mt-2 truncate text-[10px] text-slate-500 dark:text-slate-400">{ticket.email}</p><p className="mt-1 text-[10px] text-slate-400">{ticket.origin === "prefeitura" ? "Approve · Prefeitura" : ticket.origin === "requerente" ? "Approve · Requerente" : "Histórico CSV"} · {new Date(ticket.createdAt).toLocaleTimeString("pt-BR", {hour:"2-digit", minute:"2-digit"})}</p><div className="mt-3 flex flex-wrap items-center justify-between gap-2"><Badge status={ticket.status} /><PriorityBadge priority={ticket.priority} /><span className="max-w-36 truncate font-mono text-[10px] text-slate-400">#{ticket.id}</span></div>
      </button>) : <div className="grid justify-items-center gap-2 px-5 py-12 text-center text-slate-400"><Inbox size={26} /><p className="text-sm">Nenhum chamado encontrado</p><p className="text-xs">Ajuste a busca ou o filtro.</p></div>}
    </div>
    <div className="border-t border-slate-100 dark:border-slate-700 px-5 py-3 text-[10px] text-slate-400">{filtered.length} chamados · Histórico fictício</div>
  </section>;
}
