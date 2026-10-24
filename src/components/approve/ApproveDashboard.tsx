"use client";
import Link from "next/link";
import { ArrowRight, FileText, Inbox, Sparkles } from "lucide-react";
import { useGlobal } from "@/context/GlobalContext";
import { ProcessList } from "./ProcessList";
import { SupportWidget } from "./SupportWidget";
import type { Portal } from "@/lib/types";

export function ApproveDashboard({ portal, view = "inbox" }: { portal: Portal; view?: "inbox" | "catalog" }) {
  const { processes } = useGlobal();
  const municipal = portal === "prefeitura";
  const base = municipal ? "/prefeitura" : "/requerente";
  const inbox = view === "inbox";
  const count = processes.filter(process => inbox ? !!process.protocol : !process.protocol).length;
  return <div className="mx-auto max-w-[1400px] px-5 py-8 lg:px-10 lg:py-10">
    <div className="mb-7 flex flex-wrap items-end justify-between gap-5"><div><p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-blue-600 dark:text-blue-400">{municipal ? "Seu espaço de trabalho" : "Seu atendimento digital"}</p><h1 className="text-3xl font-bold tracking-tight">{inbox ? "Minha caixa" : "Processos"}</h1><p className="mt-3 max-w-xl text-sm leading-6 text-slate-500 dark:text-slate-400">{inbox ? "Suas solicitações protocoladas, organizadas em um só lugar." : municipal ? "Modelos de solicitação disponíveis para a prefeitura." : "Escolha um serviço e comece sua solicitação."}</p></div><div className="flex flex-wrap gap-2">{inbox ? <Link href={`${base}/processos`} className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-xs font-semibold text-white hover:bg-blue-700">{municipal ? "Ver processos" : "Nova solicitação"}<ArrowRight size={14} /></Link> : municipal && <Link href="/prefeitura/formularios" className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-xs font-semibold text-white"><Sparkles size={15} />Configurar formulários</Link>}<Link href={`${base}/suporte`} className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-xs font-semibold dark:border-slate-700 dark:bg-slate-900">{municipal ? "Histórico de suporte" : "Consultar atendimento"}</Link></div></div>
    <div className="mb-6 flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-5 py-4 dark:border-slate-700 dark:bg-slate-900"><span className="rounded-lg bg-blue-50 p-2 text-blue-600 dark:bg-blue-950 dark:text-blue-400">{inbox ? <Inbox size={19} /> : <FileText size={19} />}</span><p className="text-sm font-semibold">{count} {inbox ? "solicitações na sua caixa" : "modelos disponíveis"}</p>{municipal && inbox && <Link href="/prefeitura/formularios" className="ml-auto text-xs font-semibold text-blue-600 dark:text-blue-400">Configurar formulários →</Link>}</div>
    <section id="processos" aria-label="Processos do ambiente Approve"><ProcessList portal={portal} section={inbox ? "submitted" : "available"} /></section>
    {!municipal && <SupportWidget />}<div className="h-16" />
  </div>;
}
