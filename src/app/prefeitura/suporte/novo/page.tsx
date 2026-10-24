"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { ArrowLeft, ClipboardList, FileText, Send, ShieldCheck } from "lucide-react";
import { useGlobal } from "@/context/GlobalContext";
import { Button, Card, Field, inputClass } from "@/components/ui";

export default function NovoSuportePage() {
  const { processes, loading, storageReady, createTicket, dataNotice } = useGlobal();
  const router = useRouter();
  const [processId, setProcessId] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const process = processes.find(process => process.id === processId);
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (submitting) return;
    const data = new FormData(event.currentTarget);
    setSubmitting(true);
    try {
      await createTicket({ name: "Camila Analista", email: "camila.analista@example.com", account: "Prefeitura Modelo", origin: "prefeitura", channel: "Formulário", priority: String(data.get("priority") ?? "Média") as "Baixa" | "Média" | "Alta" | "Urgente", subject: String(data.get("subject") ?? ""), description: String(data.get("description") ?? ""), processId });
      router.push("/prefeitura/suporte");
    } catch (error) { setError(error instanceof Error ? error.message : "Não foi possível registrar a solicitação."); setSubmitting(false); }
  };
  return <div className="mx-auto max-w-6xl px-5 py-8 lg:px-10 lg:py-10">
    <Link href="/prefeitura/suporte" className="mb-6 inline-flex items-center gap-2 text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400"><ArrowLeft size={14} />Voltar ao histórico</Link>
    <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-blue-600 dark:text-blue-400">Approve / Prefeitura / Suporte</p>
    <h1 className="text-3xl font-bold tracking-tight">Nova solicitação</h1><p className="mb-8 mt-3 text-sm leading-6 text-slate-500 dark:text-slate-400">Descreva o impedimento para a equipe técnica investigar com o contexto do processo.</p>
    {dataNotice && <p role="status" className="mb-5 rounded-lg bg-amber-50 dark:bg-amber-950 p-4 text-xs text-amber-800 dark:text-amber-200">{dataNotice}</p>}
    <div className="grid items-start gap-6 lg:grid-cols-[1fr_300px]">
      <Card className="p-6 sm:p-8"><form onSubmit={submit} className="space-y-6">
        <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-700 pb-4 text-sm font-bold"><ClipboardList size={17} className="text-blue-600 dark:text-blue-400" />Detalhes da solicitação</div>
        <Field label="Título"><input name="subject" placeholder="Ex.: Bloqueio ao revisar o Alvará 001" required minLength={5} maxLength={120} className={inputClass} /></Field>
        <Field label="Descrição detalhada do problema"><textarea name="description" rows={7} placeholder="Informe o que tentou fazer, o resultado esperado e a mensagem de erro." required minLength={10} maxLength={4000} className={inputClass} /></Field>
        <Field label="Processo relacionado"><select value={processId} onChange={event => setProcessId(event.target.value)} required className={inputClass}><option value="">Selecione um processo</option>{processes.map(process => <option key={process.id} value={process.id}>{process.name}</option>)}</select></Field>
        <Field label="Prioridade"><select name="priority" aria-label="Prioridade" defaultValue="Média" className={inputClass}>{["Baixa", "Média", "Alta", "Urgente"].map(priority => <option key={priority}>{priority}</option>)}</select></Field>
        {error && <p role="alert" className="rounded-lg bg-rose-50 dark:bg-rose-950 p-3 text-xs text-rose-700 dark:text-rose-300">{error}</p>}
        <div className="flex flex-wrap items-center justify-between gap-4 border-t border-slate-100 dark:border-slate-700 pt-5"><Link href="/prefeitura/suporte" className="text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100">Cancelar</Link><Button type="submit" disabled={loading || submitting || !storageReady}>{loading ? "Carregando histórico..." : submitting ? "Solicitando..." : "Solicitar"}<Send size={15} /></Button></div>
      </form></Card>
      <div className="space-y-4"><Card className="p-5"><p className="mb-4 text-[10px] font-semibold uppercase tracking-wider text-slate-400">Solicitante da prefeitura</p><p className="text-sm font-semibold">Camila Analista</p><p className="mt-1 break-all text-xs text-slate-500 dark:text-slate-400">camila.analista@example.com</p><p className="mt-3 text-xs text-slate-500 dark:text-slate-400">Prefeitura Modelo · Perfil fictício</p></Card>
        {process && <Card className="fade-in p-5"><div className="mb-3 flex items-center gap-2 text-sm font-bold"><FileText size={16} className="text-blue-600 dark:text-blue-400" />{process.name}</div><p className="mt-3 text-xs leading-6 text-slate-500 dark:text-slate-400">{process.requestedInformation}</p></Card>}
        <div className="flex gap-2 rounded-xl border border-blue-100 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-950/50 p-5 text-xs leading-6 text-slate-500 dark:text-slate-400"><ShieldCheck size={18} className="mt-1 shrink-0 text-blue-600 dark:text-blue-400" /><p>Após solicitar, acompanhe o atendimento no histórico municipal. Este ambiente não utiliza chat. Use somente informações fictícias.</p></div>
      </div>
    </div>
  </div>;
}
