"use client";

import { useState } from "react";
import { ArrowRight, FileText, Search } from "lucide-react";
import { useGlobal } from "@/context/GlobalContext";
import { Card, inputClass } from "@/components/ui";
import { ProcessDetail } from "./ProcessDetail";
import Link from "next/link";
import type { Portal } from "@/lib/types";

export function ProcessList({ portal = "requerente", section = "available" }: { portal?: Portal; section?: "available" | "submitted" }) {
  const { processes, compactView, loading, storageReady } = useGlobal();
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const filtered = processes.filter(process => (section === "submitted" ? !!process.protocol : !process.protocol) && `${process.name} ${process.type} ${process.information.applicant} ${process.protocol ?? ""}`.toLocaleLowerCase("pt-BR").includes(search.toLocaleLowerCase("pt-BR")));
  const selected = processes.find(process => process.id === selectedId);
  const padding = compactView ? "py-3" : "py-5";
  return <><Card className="overflow-hidden">
    <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-700 p-5"><div><h2 className="text-sm font-bold">{section === "submitted" ? "Processos protocolados" : "Disponíveis para protocolar"}</h2><p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{section === "submitted" ? "Solicitações registradas com número de protocolo." : "Escolha o modelo e preencha uma nova solicitação."}</p></div><label className="relative"><Search size={15} className="absolute left-3 top-3 text-slate-400" /><input aria-label="Buscar processos" value={search} onChange={event => setSearch(event.target.value)} placeholder="Buscar processo ou requerente..." className={`${inputClass} pl-9 text-xs`} /></label></div>
    <div className="overflow-x-auto"><table className="w-full min-w-[500px] text-left"><thead className="bg-slate-50 dark:bg-slate-950 text-[10px] uppercase tracking-wider text-slate-400"><tr><th className="px-5 py-3 font-medium">Processo</th><th className="px-4 py-3 font-medium">Atualização</th><th className="px-5 py-3 font-medium">Ação</th></tr></thead><tbody>{filtered.map(process => <tr key={process.id} className="border-t border-slate-100 dark:border-slate-700 transition-all hover:bg-slate-50/60 dark:hover:bg-slate-950/60">
      <td className={`px-5 ${padding}`}><div className="flex items-center gap-3"><span className="rounded-xl bg-blue-50 dark:bg-blue-950 p-2.5 text-blue-600 dark:text-blue-400"><FileText size={19} /></span><div><p className="text-sm font-semibold">{process.name}</p><p className="mt-1 text-[10px] text-slate-400">{process.protocol ?? `Modelo de ${process.type}`}</p></div></div></td>
      <td className={`px-4 text-xs text-slate-500 dark:text-slate-400 ${padding}`}>{new Date(process.updatedAt).toLocaleDateString("pt-BR")}</td>
      <td className={`px-5 ${padding}`}>{portal === "requerente" ? (loading || !storageReady ? <span className="text-xs text-slate-400">Carregando...</span> : <Link aria-label={`${process.protocol ? "Consultar" : "Preencher"} ${process.name}`} href={`/requerente/processos/${process.id}`} className="inline-flex items-center gap-2 text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline">{process.protocol ? "Consultar" : "Preencher"}<ArrowRight size={14} /></Link>) : <button aria-label={`Ver detalhes de ${process.name}`} disabled={loading || !storageReady} onClick={() => setSelectedId(process.id)} className="flex items-center gap-2 whitespace-nowrap text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline disabled:opacity-50">Detalhes<ArrowRight size={14} /></button>}</td>
    </tr>)}</tbody></table>{!filtered.length && <p className="p-10 text-center text-sm text-slate-500 dark:text-slate-400">Nenhum processo encontrado.</p>}</div>
    <div className="border-t border-slate-100 dark:border-slate-700 px-5 py-3 text-[10px] text-slate-400">{filtered.length} processos · Prefeitura Modelo · Dados fictícios</div>
  </Card>{selected && <ProcessDetail process={selected} onClose={() => setSelectedId(null)} />}</>;
}
