"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, CheckCircle2, Headphones } from "lucide-react";
import { useGlobal } from "@/context/GlobalContext";
import { ProcessForm } from "./ProcessDetail";
import { SupportWidget } from "./SupportWidget";
import { Card } from "@/components/ui";
export function ProcessWorkspace({ id }: { id: string }) {
  const { processes, loading, storageReady } = useGlobal();
  const router = useRouter();
  const process = processes.find(item => item.id === id);
  if (loading || !storageReady) return <div role="status" className="animate-pulse p-10 text-sm text-slate-500 dark:text-slate-400">Carregando formulário e informações salvas...</div>;
  if (!process) return <div className="p-10"><h1 className="text-xl font-bold">Processo não encontrado</h1><Link href="/requerente" className="mt-4 inline-block text-blue-600 dark:text-blue-400">Voltar aos processos</Link></div>;
  return <div className="mx-auto max-w-6xl px-5 py-8 lg:px-8">
    <Link href={`/requerente${process.protocol ? "?aba=protocolados" : ""}`} className="mb-5 inline-flex items-center gap-2 text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400"><ArrowLeft size={14} />Voltar aos processos</Link>
    <p className="text-[10px] font-semibold uppercase tracking-wider text-blue-600 dark:text-blue-400">Approve / Requerente / {process.protocol ? "Processos protocolados" : "Disponíveis para protocolar"}</p>
    <h1 className="mb-6 mt-2 text-2xl font-bold tracking-tight">{process.name} · Formulário</h1>
    {process.protocol && <div role="status" className="mb-6 flex items-start gap-3 rounded-xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950 p-4 text-emerald-800"><CheckCircle2 size={20} /><div><p className="text-sm font-bold">Solicitação protocolada</p><p className="mt-1 text-xs">{process.protocol} · {new Date(process.submittedAt!).toLocaleString("pt-BR")}</p></div></div>}
    <div className="grid items-start gap-6 lg:grid-cols-[1fr_250px]"><Card className="min-w-0 p-5 sm:p-7"><ProcessForm key={process.id} process={process} allowProtocol onCancel={() => router.push(`/requerente${process.protocol ? "?aba=protocolados" : ""}`)} onSubmitted={nextId => router.replace(`/requerente/processos/${nextId}`)} /></Card>
      <aside className="space-y-4 lg:sticky lg:top-6"><Card className="p-5"><Headphones size={24} className="text-blue-600 dark:text-blue-400" /><h2 className="mt-3 text-sm font-bold">Suporte durante o preenchimento</h2><p className="mt-2 text-xs leading-6 text-slate-500 dark:text-slate-400">Use Ajuda para falar com o suporte sem sair do formulário. Seu chamado será associado a este processo.</p></Card><p className="px-1 text-[11px] leading-6 text-slate-400">Salvar informações mantém o rascunho. Protocolar registra uma nova solicitação e gera um número de protocolo.</p></aside>
    </div><div className="h-14" /><SupportWidget processId={process.id} />
  </div>;
}
