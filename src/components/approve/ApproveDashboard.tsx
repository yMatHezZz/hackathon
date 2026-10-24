"use client";

import Link from "next/link";
import { ArrowUpRight, FileText, History, Info } from "lucide-react";
import { useGlobal } from "@/context/GlobalContext";
import { ProcessList } from "@/components/approve/ProcessList";
import { SupportWidget } from "@/components/approve/SupportWidget";
import type { Portal } from "@/lib/types";
import { useState } from "react";

export function ApproveDashboard({ portal, initialTab = "available" }: { portal: Portal; initialTab?: "available" | "submitted" }) {
  const { processes } = useGlobal();
  const municipal = portal === "prefeitura";
  const [tab, setTab] = useState(initialTab);
  return <div className="mx-auto max-w-[1360px] px-5 py-8 lg:px-10 lg:py-10">
    <div className="mb-9 flex flex-wrap items-center justify-between gap-4">
      <div><p className="text-xl font-bold tracking-tight text-slate-950 dark:text-slate-50">approve<span className="text-blue-600 dark:text-blue-400">.</span></p><p className="mt-0.5 text-[10px] font-semibold uppercase tracking-wider text-slate-400">Prefeitura Modelo</p></div>
      <span className="rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-1.5 text-[11px] text-slate-500 dark:text-slate-400">{municipal ? "Prefeitura · Camila Analista" : "Requerente · Cidadão"} · Simulação</span>
    </div>
    <div className="mb-8 flex flex-wrap items-end justify-between gap-5"><div><p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-blue-600 dark:text-blue-400">{municipal ? "Gestão de processos" : "Seu espaço no Approve"}</p><h1 className="text-3xl font-bold tracking-tight text-slate-950 dark:text-slate-50">Menos espera.<br className="sm:hidden" /> Mais andamento.</h1><p className="mt-3 text-sm leading-6 text-slate-500 dark:text-slate-400">{municipal ? "Revise as informações dos processos e acompanhe o suporte da prefeitura." : "Acompanhe seus processos e fale com o suporte quando precisar."}</p></div>
      {municipal && <div className="flex flex-wrap gap-2"><Link href="/prefeitura/formularios" className="rounded-lg bg-blue-600 px-4 py-2.5 text-xs font-semibold text-white hover:bg-blue-700">Configurar formulários</Link><Link href="/prefeitura/suporte" className="inline-flex items-center gap-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 py-2.5 text-xs font-semibold text-slate-600 dark:text-slate-300 shadow-sm hover:border-blue-300"><History size={15} />Histórico de suporte<ArrowUpRight size={14} /></Link></div>}
    </div>
    <p className="mb-4 flex items-center gap-2 text-xs font-semibold text-slate-500 dark:text-slate-400"><FileText size={15} />{processes.filter(process => !process.protocol).length} modelos disponíveis · {processes.filter(process => process.protocol).length} solicitações protocoladas</p>
    <div role="tablist" aria-label="Seções de processos" className="mb-4 flex flex-wrap gap-2">{([{ id: "available", label: "Disponíveis para protocolar" }, { id: "submitted", label: "Protocolados" }] as const).map(item => <button key={item.id} role="tab" aria-selected={tab === item.id} onClick={() => setTab(item.id)} className={`rounded-lg px-4 py-2.5 text-xs font-semibold ${tab === item.id ? "bg-blue-600 text-white" : "border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-500 dark:text-slate-400"}`}>{item.label}</button>)}</div>
    <section id="processos" aria-label="Processos do ambiente Approve" className="scroll-mt-5"><ProcessList portal={portal} section={tab} /></section>
    <div className="mt-6 flex items-start gap-3 rounded-xl border border-blue-100 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-950/50 p-5"><Info size={18} className="mt-0.5 shrink-0 text-blue-600 dark:text-blue-400" /><div><p className="text-xs font-semibold text-blue-900 dark:text-blue-100">{municipal ? "Precisa de apoio da equipe técnica?" : "Algo está impedindo o andamento?"}</p><p className="mt-1 text-xs leading-6 text-slate-500 dark:text-slate-400">{municipal ? "Use Abrir suporte para registrar uma solicitação em formulário. As respostas ficam no histórico municipal." : "Abra o botão Ajuda e descreva o problema. Acompanhe a conversa por aqui enquanto a equipe analisa seu chamado."}</p></div></div>
    <div className="h-12" />{!municipal && <SupportWidget />}
  </div>;
}
