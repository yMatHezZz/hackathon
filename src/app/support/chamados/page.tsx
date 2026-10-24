"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowUpRight, Sparkles } from "lucide-react";
import { useGlobal } from "@/context/GlobalContext";
import { TicketList } from "@/components/support/TicketList";
import { TicketDetail } from "@/components/support/TicketDetail";
import { AiSidebar } from "@/components/support/AiSidebar";


export default function SupportPage() {
  const { tickets, dataNotice, dataSource } = useGlobal();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draft, setDraft] = useState({ ticketId: "", content: "", version: 0 });
  const selected = tickets.find(t => t.id === selectedId);
  return <div className="px-4 py-6 lg:px-8 lg:py-7"><div className="mb-6 flex flex-wrap items-start justify-between gap-4"><div><div className="mb-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">Workspace / Atendimento</div><h1 className="text-2xl font-bold tracking-tight text-slate-950 dark:text-slate-50">Chamados<span className="text-blue-600 dark:text-blue-400">.</span></h1><p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400">Cada chamado, um próximo passo. Sua equipe com mais contexto.</p></div><Link href="/requerente" className="inline-flex items-center gap-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 py-2.5 text-xs font-semibold shadow-sm transition-all hover:border-blue-300">Novo chamado no Approve<ArrowUpRight size={15} /></Link></div>
    {dataNotice && <p role="status" className="mb-4 rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950 px-4 py-3 text-xs text-amber-800 dark:text-amber-200">{dataNotice}</p>}
    <div className="mb-3 flex flex-wrap items-center justify-between gap-2"><div className="flex items-center gap-2 text-xs font-semibold"><span className="h-1.5 w-1.5 rounded-full bg-blue-500" />Fila de atendimento</div><span className="flex items-center gap-1.5 text-[10px] text-slate-400"><Sparkles size={12} />{dataSource}</span></div>
    <div className="grid overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-sm lg:h-[calc(100vh-240px)] lg:min-h-[850px] lg:grid-cols-[30%_50%_20%] lg:grid-rows-[minmax(0,1fr)]">
      <TicketList selectedId={selectedId} onSelect={setSelectedId} /><TicketDetail key={`${selectedId}-${draft.version}`} ticket={selected} initialReply={draft.ticketId === selectedId ? draft.content : ""} /><AiSidebar key={`ai-${selectedId}`} ticket={selected} onSelectTicket={setSelectedId} onUseDraft={content => setDraft(current => ({ ticketId: selectedId ?? "", content, version: current.version + 1 }))} />
    </div>
  </div>;
}
