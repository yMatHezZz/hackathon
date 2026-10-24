"use client";

import { useState, type FormEvent } from "react";
import { ArrowUp, Check, CircleHelp, Command, ShieldCheck, Sparkles, Zap } from "lucide-react";
import type { Ticket, ReplyDraft } from "@/lib/types";
import { useGlobal } from "@/context/GlobalContext";
import { Button, inputClass } from "@/components/ui";
import { findKnowledgeArticles } from "@/lib/knowledge";
import { RequesterPanel } from "./RequesterPanel";

export function AiSidebar({ ticket, onUseDraft, onSelectTicket }: { ticket?: Ticket; onUseDraft?: (content: string) => void; onSelectTicket?: (id: string) => void }) {
  const { runCommand, processes, knowledge, suggestReply } = useGlobal();
  const [draft, setDraft] = useState<ReplyDraft | null>(null);
  const [draftBusy, setDraftBusy] = useState(false);
  const [command, setCommand] = useState("");
  const [thinking, setThinking] = useState(false);
  const [result, setResult] = useState("");
  const [tab, setTab] = useState<"agent" | "requester" | "history">("agent");
  const tabs = [{ id: "agent", label: "Agente" }, { id: "requester", label: "Solicitante" }, { id: "history", label: "Histórico" }] as const;
  const disabled = !ticket || ticket.status === "Resolvido";
  const related = ticket ? processes.find(process => process.id === ticket.processId) ?? processes.find(process => ticket.description.toLocaleLowerCase("pt-BR").includes(process.name.toLocaleLowerCase("pt-BR"))) : undefined;
  const suggested = related?.status === "Bloqueado" ? `Desbloquear ${related.name}` : "";
  const articles = ticket ? findKnowledgeArticles(`${ticket.subject} ${ticket.description}`, knowledge) : [];
  const generate = async () => {
    if (!ticket || draftBusy) return;
    setDraftBusy(true);
    try { setDraft(await suggestReply(ticket.id)); }
    catch (error) { setResult(error instanceof Error ? error.message : "Não foi possível consultar a base."); }
    finally { setDraftBusy(false); }
  };
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!ticket || thinking) return;
    setThinking(true); setResult("");
    try { setResult(await runCommand(ticket.id, command)); setCommand(""); } catch { setResult("A ação falhou. Nenhuma confirmação de execução recebida; confira o processo antes de tentar novamente."); } finally { setThinking(false); }
  };
  return <aside aria-label="Assistente de IA" className="flex min-h-0 min-w-0 flex-col border-t border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 lg:border-l lg:border-t-0">
    <div className="shrink-0 border-b border-slate-100 dark:border-slate-700 px-5 py-5"><div className="flex items-center gap-2"><span className="rounded-lg bg-blue-50 dark:bg-blue-950 p-1.5 text-blue-600 dark:text-blue-400"><Sparkles size={17} /></span><h2 className="text-sm font-bold">Copiloto Nolyp</h2></div><p className="mt-2 text-[11px] leading-5 text-slate-500 dark:text-slate-400">Contexto para decidir.<br />Ferramentas para resolver.</p></div>
    <div role="tablist" aria-label="Contexto do atendimento" className="grid shrink-0 grid-cols-3 gap-1 border-b border-slate-200 p-2 dark:border-slate-700">{tabs.map((item, index) => <button key={item.id} role="tab" id={`sidebar-tab-${item.id}`} aria-controls={`sidebar-panel-${item.id}`} aria-selected={tab === item.id} tabIndex={tab === item.id ? 0 : -1} onClick={() => setTab(item.id)} onKeyDown={event => { const next = event.key === "ArrowRight" ? (index + 1) % tabs.length : event.key === "ArrowLeft" ? (index + tabs.length - 1) % tabs.length : event.key === "Home" ? 0 : event.key === "End" ? tabs.length - 1 : -1; if (next >= 0) { event.preventDefault(); setTab(tabs[next].id); document.getElementById(`sidebar-tab-${tabs[next].id}`)?.focus(); } }} className={`rounded-lg px-1 py-2 text-[10px] font-semibold transition-all ${tab === item.id ? "bg-blue-600 text-white" : "text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"}`}>{item.label}</button>)}</div>
    {tab !== "agent" ? <div role="tabpanel" id={`sidebar-panel-${tab}`} aria-labelledby={`sidebar-tab-${tab}`} className="min-h-0 overflow-y-auto lg:flex-1"><RequesterPanel key={ticket?.id} ticket={ticket} history={tab === "history"} onSelect={onSelectTicket} /></div> : <div role="tabpanel" id="sidebar-panel-agent" aria-labelledby="sidebar-tab-agent" className="flex min-h-0 flex-1 flex-col">
    <div className="min-h-0 space-y-6 overflow-y-auto p-5 lg:flex-1">
      <div><Button onClick={() => void generate()} disabled={!ticket || draftBusy || ticket.origin === "historico"} variant="secondary" className="w-full px-2 text-xs">{draftBusy ? "Consultando a base..." : "Gerar resposta sugerida"}</Button><p className="mt-2 text-[10px] leading-5 text-slate-500 dark:text-slate-400">A sugestão consulta o playbook e precisa da sua revisão antes do envio.</p></div>
      {draft && <div className="rounded-xl border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950 p-4"><h3 className="text-xs font-bold text-blue-800 dark:text-blue-200">Resposta fundamentada</h3><p className="mt-3 whitespace-pre-wrap break-words text-xs leading-6 text-slate-600 dark:text-slate-300">{draft.content}</p><ul className="mt-3 space-y-2 text-[10px] text-blue-700 dark:text-blue-300">{draft.sources.map(source => <li key={source.id}>Fonte: {source.title} · {source.id}</li>)}</ul><Button onClick={() => onUseDraft?.(draft.content)} className="mt-4 w-full px-2 text-xs">Usar no editor de resposta</Button></div>}
      <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-400"><Command size={12} /> Assistente do atendente</div>
      <div className="rounded-xl border border-blue-100 dark:border-blue-800 bg-blue-50/60 dark:bg-blue-950/60 p-4"><div className="mb-2 flex items-center gap-2 text-xs font-bold text-blue-800 dark:text-blue-200"><Zap size={14} />Próxima ação sugerida</div><p className="text-xs leading-6 text-slate-600 dark:text-slate-300">{!ticket ? "Selecione um chamado para consultar as ações disponíveis." : ticket.status === "Resolvido" ? "Este chamado está resolvido. Reabra o atendimento para executar ações." : suggested ? `Confira ${related?.name} e valide a permissão antes de liberar o processo.` : "Valide a hipótese da nota interna e peça os detalhes que faltam ao solicitante."}</p>{!disabled && suggested && <button onClick={() => setCommand(suggested)} disabled={thinking} className="mt-3 text-left text-[11px] font-semibold leading-5 text-blue-700 dark:text-blue-300 hover:underline disabled:opacity-50">Preparar “{suggested}” ↗</button>}</div>
      {articles.length > 0 && <div><h3 className="mb-3 text-[10px] font-semibold uppercase tracking-wider text-slate-400">Base consultada</h3>{articles.map(article => <div key={article.id} className="mb-3 rounded-lg border border-blue-100 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-950/50 p-3"><p className="text-xs font-semibold text-blue-800 dark:text-blue-200">{article.title}</p><p className="mt-2 text-[11px] leading-5 text-slate-600 dark:text-slate-300">{article.content.slice(0, 240)}</p></div>)}</div>}
      <div><h3 className="mb-3 text-[10px] font-semibold uppercase tracking-wider text-slate-400">Como funciona</h3><ul className="space-y-3 text-[11px] leading-5 text-slate-500 dark:text-slate-400">{["Analisa o relato e o histórico", "Cria uma nota só para a equipe", "Você decide e executa a ação"].map(item => <li key={item} className="flex items-start gap-2"><Check size={13} className="mt-1 shrink-0 text-blue-500" />{item}</li>)}</ul></div>
      <section aria-label="Ações registradas do agente"><h3 className="mb-3 text-[10px] font-semibold uppercase tracking-wider text-slate-400">Ações registradas</h3>{ticket?.messages.some(message => message.kind === "log" && message.content.startsWith("Ação executada:")) ? <ol className="space-y-3">{ticket.messages.filter(message => message.kind === "log" && message.content.startsWith("Ação executada:")).toReversed().map(message => <li key={message.id} className="rounded-lg border border-blue-100 p-3 dark:border-blue-800"><p className="break-words text-xs leading-5">{message.content}</p><time className="mt-2 block text-[10px] text-slate-400">{new Date(message.createdAt).toLocaleString("pt-BR")}</time></li>)}</ol> : <p className="text-xs leading-5 text-slate-500 dark:text-slate-400">Nenhuma ação executada neste chamado.</p>}</section>
      <div className="flex items-start gap-2 border-t border-slate-100 dark:border-slate-700 pt-4 text-[10px] leading-5 text-slate-500 dark:text-slate-400"><ShieldCheck size={16} className="mt-0.5 shrink-0 text-emerald-600 dark:text-emerald-400" /><p>A investigação não altera status nem responde ao cliente. Ações exigem um comando seu.</p></div>
    </div>
    <div className="mt-auto shrink-0 border-t border-slate-100 dark:border-slate-700 bg-white dark:bg-slate-900 p-5"><div className="mb-3 flex items-center gap-1.5 text-[10px] text-slate-500 dark:text-slate-400"><CircleHelp size={12} />Execução local simulada</div><form onSubmit={submit}><label htmlFor="ai-command" className="mb-2 block text-xs font-semibold">Comando para a IA</label><textarea id="ai-command" value={command} onChange={e => setCommand(e.target.value)} disabled={disabled || thinking} maxLength={200} rows={3} placeholder="Desbloquear Alvará 001" className={`${inputClass} text-xs`} /><Button type="submit" disabled={disabled || thinking || !command.trim()} className="mt-2 w-full px-2 text-xs">{thinking ? <><Sparkles size={14} className="animate-pulse" />Executando...</> : <>Executar comando<ArrowUp size={14} /></>}</Button></form><div role="status" aria-live="polite" className="mt-3 break-words text-xs leading-5 text-slate-600 dark:text-slate-300">{result}</div></div>
    </div>}
  </aside>;
}
