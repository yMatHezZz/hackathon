"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { BookOpen, CornerDownLeft, Plus, Send, Sparkles, Undo2 } from "lucide-react";
import Link from "next/link";
import type { FormAiAttempt, ProcessFormDefinition } from "@/lib/types";
import type { FormAdjustmentResult } from "@/lib/form-assistant";
import { api } from "@/lib/client-api";
import { Button, Card, inputClass } from "@/components/ui";
import { AiAttemptHistory, outcomeLabels } from "./AiAttemptHistory";

interface Exchange { id: string; role: "user" | "assistant"; content: string; changes?: string[]; sources?: FormAdjustmentResult["sources"] }
function attemptMessages(attempts: FormAiAttempt[]): Exchange[] {
  return attempts.flatMap(attempt => [{ id: `${attempt.id}-user`, role: "user", content: attempt.prompt }, { id: attempt.id, role: "assistant", content: `${attempt.message}\nRegistro: ${outcomeLabels[attempt.outcome]}.`, changes: attempt.changes, sources: attempt.sources }] as Exchange[]);
}
const shortcuts = [
  { label: "Adicionar card", prefix: "Adicionar card", prompt: 'Adicionar card "Dados complementares" com campos "Nome do responsável", "E-mail do responsável"' },
  { label: "Adicionar campo", prefix: "Adicionar campo", prompt: 'Adicionar campo "Ponto de referência" obrigatório' },
  { label: "Usar base de conhecimento", prefix: "", prompt: 'Adicionar card "Responsável técnico" conforme a base de conhecimento' },
  { label: "Tornar obrigatório", prefix: "Tornar obrigatório o campo", prompt: 'Tornar obrigatório o campo "Telefone de contato"' },
  { label: "Renomear campo", prefix: "Renomear campo", prompt: 'Renomear campo "Telefone de contato" para "Telefone do requerente"' },
];
export function FormAssistantChat({ processId, definition, disabled = false, onApply, focusMode = false }: { processId: string; definition?: ProcessFormDefinition; disabled?: boolean; focusMode?: boolean; onApply: (definition: ProcessFormDefinition) => void }) {
  const [messages, setMessages] = useState<Exchange[]>([{ id: "welcome", role: "assistant", content: 'Descreva o que deseja mudar ou escolha um atalho. Vou consultar a base e ajustar o rascunho para você.' }]);
  const [prompt, setPrompt] = useState("");
  const [section, setSection] = useState(definition?.sections[0]?.id ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [attempts, setAttempts] = useState<FormAiAttempt[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [historyError, setHistoryError] = useState("");
  const [undo, setUndo] = useState<{ before: ProcessFormDefinition; after: string; attemptId: string } | null>(null);
  const promptRef = useRef<HTMLTextAreaElement>(null);
  const transcript = useRef<HTMLDivElement>(null);
  const active = useRef(true);
  const latest = useRef(definition);
  useEffect(() => { latest.current = definition; }, [definition]);
  const target = definition?.sections.find(item => item.id === section)?.id ?? definition?.sections[0]?.id ?? "";
  useEffect(() => { active.current = true; return () => { active.current = false; }; }, []);
  useEffect(() => {
    const controller = new AbortController();
    api<{ attempts: FormAiAttempt[] }>(`/api/processes/${encodeURIComponent(processId)}/form-assistant`, "GET", undefined, controller.signal).then(data => {
      if (controller.signal.aborted) return;
      setAttempts(data.attempts); if (data.attempts.length) setMessages(attemptMessages(data.attempts));
    }).catch(() => { if (!controller.signal.aborted) setHistoryError("Não foi possível carregar as tentativas anteriores."); }).finally(() => { if (!controller.signal.aborted) setHistoryLoading(false); });
    return () => controller.abort();
  }, [processId]);
  const confirmOutcome = async (attemptId: string, outcome: "applied" | "not_applied" | "undone") => {
    try {
      const { attempt } = await api<{ attempt: FormAiAttempt }>(`/api/processes/${encodeURIComponent(processId)}/form-assistant/${encodeURIComponent(attemptId)}`, "PATCH", { outcome });
      if (active.current) setAttempts(current => current.map(item => item.id === attempt.id ? attempt : item));
    } catch { if (active.current) setHistoryError("Não foi possível confirmar o resultado no histórico. O registro pode aparecer como preparado, sem aplicação confirmada."); }
  };
  useEffect(() => { if (transcript.current) transcript.current.scrollTop = transcript.current.scrollHeight; }, [messages, busy]);
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!definition || busy || historyLoading || !prompt.trim() || disabled) return;
    const before = structuredClone(definition); const beforeJSON = JSON.stringify(definition); const requestPrompt = prompt.trim();
    setBusy(true); setError(""); setPrompt("");
    setMessages(current => [...current, { id: crypto.randomUUID(), role: "user", content: requestPrompt }]);
    try {
      const result = await api<FormAdjustmentResult & { attempt: FormAiAttempt }>(`/api/processes/${encodeURIComponent(processId)}/form-assistant`, "POST", { definition: before, sectionId: target || undefined, prompt: requestPrompt });
      if (!active.current) return;
      setAttempts(current => [...current, result.attempt].slice(-50));
      if (result.changed && JSON.stringify(latest.current) !== beforeJSON) { await confirmOutcome(result.attempt.id, "not_applied"); throw new Error("O formulário mudou durante a análise. Seu rascunho foi preservado; envie o pedido novamente."); }
      if (result.changed) { onApply(result.definition); setUndo({ before, after: JSON.stringify(result.definition), attemptId: result.attempt.id }); await confirmOutcome(result.attempt.id, "applied"); }
      setMessages(current => [...current, { id: crypto.randomUUID(), role: "assistant", content: result.message, changes: result.changes, sources: result.sources }]);
    } catch (error) {
      if (active.current) { setError(error instanceof Error ? error.message : "Não foi possível consultar o assistente."); setPrompt(requestPrompt); }
    } finally { if (active.current) setBusy(false); }
  };
  const undoable = undo && definition && JSON.stringify(definition) === undo.after;
  return <Card className={`min-w-0 overflow-hidden ${focusMode ? "flex flex-col shadow-sm" : ""}`} aria-label="Chat de IA do formulário">
    <div className="border-b border-slate-200 bg-blue-50/60 p-5 dark:border-slate-700 dark:bg-blue-950/40"><div className="flex items-center justify-between gap-3"><h2 className="flex items-center gap-2 text-sm font-bold"><Sparkles size={17} className="text-blue-600 dark:text-blue-400" />Copiloto de formulários</h2><span className="rounded bg-amber-100 px-2 py-1 text-[9px] font-semibold text-amber-800 dark:bg-amber-950 dark:text-amber-200">IA SIMULADA</span></div><p className="mt-2 text-xs leading-5 text-slate-500 dark:text-slate-400">Ajuste seu formulário com o apoio da base de conhecimento.</p></div>
    <div ref={transcript} role="log" aria-label="Conversa com o copiloto de formulários" aria-live="polite" className={`${focusMode ? "min-h-[100px] max-h-[260px]" : "max-h-[370px]"} space-y-4 overflow-y-auto px-5 py-4`}>{messages.map(message => <article key={message.id} className={`rounded-xl p-3 ${message.role === "user" ? "ml-5 bg-blue-600 text-white" : "mr-2 border border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-950"}`}><p className={`mb-2 text-[10px] font-bold uppercase tracking-wide ${message.role === "user" ? "text-blue-100" : "text-blue-600 dark:text-blue-400"}`}>{message.role === "user" ? "Você" : "Copiloto Nolyp"}</p><p className="whitespace-pre-wrap break-words text-xs leading-6">{message.content}</p>{!!message.changes?.length && <ul aria-label="Alterações realizadas" className="mt-3 space-y-1 border-t border-slate-200 pt-3 text-xs leading-5 dark:border-slate-700">{message.changes.map((change, index) => <li key={index}>✓ {change}</li>)}</ul>}{message.sources && <div className="mt-3 border-t border-slate-200 pt-3 dark:border-slate-700">{message.sources.length ? <><p className="mb-2 flex items-center gap-1 text-[10px] font-semibold text-blue-600 dark:text-blue-400"><BookOpen size={12} />Base consultada</p>{message.sources.map(source => <details key={source.id} className="mb-2 text-[11px]"><summary className="cursor-pointer break-words font-semibold">{source.title}</summary><p className="mt-2 break-words leading-5 text-slate-500 dark:text-slate-400">{source.excerpt}</p><p className="mt-1 font-mono text-[9px] text-slate-400">{source.id}</p></details>)}</> : <p className="text-[10px] text-slate-500 dark:text-slate-400">Nenhum artigo ativo correspondente ao pedido.</p>}</div>}</article>)}{busy && <p role="status" className="flex animate-pulse items-center gap-2 text-xs text-blue-600 dark:text-blue-400"><Sparkles size={14} />Consultando a base e preparando o ajuste...</p>}</div>
    <div className="border-t border-slate-200 p-5 dark:border-slate-700">{historyLoading && <p role="status" className="mb-3 animate-pulse text-xs">Carregando histórico de tentativas...</p>}{historyError && <p role="alert" className="mb-3 text-xs text-amber-700 dark:text-amber-300">{historyError}</p>}<div className="mb-4 flex flex-wrap gap-2">{shortcuts.map(shortcut => <button key={shortcut.label} type="button" disabled={busy || historyLoading || disabled || !definition} onClick={() => { setPrompt(current => !current.trim() ? shortcut.prompt : shortcut.prefix ? `${shortcut.prefix} ${current.replace(/^(?:Adicionar card|Adicionar campo|Renomear campo|Tornar obrigatório o campo)\s+/i, "")}` : `${current} conforme a base de conhecimento`); promptRef.current?.focus(); }} className="inline-flex items-center gap-1 rounded-lg border border-blue-200 px-2 py-1.5 text-[10px] font-semibold text-blue-700 hover:bg-blue-50 disabled:opacity-40 dark:border-blue-800 dark:text-blue-300 dark:hover:bg-blue-950"><Plus size={11} />{shortcut.label}</button>)}</div>
      <form onSubmit={submit} className="flex flex-col gap-3"><label className="order-2 block text-[11px] font-semibold">Seção de destino<select aria-label="Seção de destino do ajuste" disabled={!definition || busy || disabled} value={target} onChange={event => setSection(event.target.value)} className={`${inputClass} mt-1 text-xs`}>{definition?.sections.map(section => <option key={section.id} value={section.id}>{section.title}</option>)}</select></label><label className="order-1 block text-[11px] font-semibold">Pedido para a IA<textarea ref={promptRef} aria-label="Pedido para a IA do formulário" disabled={!definition || busy || disabled} value={prompt} onChange={event => setPrompt(event.target.value)} maxLength={1500} rows={focusMode ? 2 : 3} className={`${inputClass} mt-1 text-xs`} placeholder={'Ex.: Adicionar campo "Referência do imóvel" obrigatório'} /></label>{!definition && <p className="text-xs text-amber-700 dark:text-amber-300">Selecione um formulário para começar.</p>}{error && <p role="alert" className="text-xs text-rose-700 dark:text-rose-300">{error} Nenhuma alteração aplicada.</p>}<div className="order-3 flex flex-wrap justify-between gap-2"><Button type="button" variant="secondary" disabled={!undoable || busy || disabled} onClick={() => { if (undoable && undo) { onApply(undo.before); void confirmOutcome(undo.attemptId, "undone"); setUndo(null); setMessages(current => [...current, { id: crypto.randomUUID(), role: "assistant", content: "Último ajuste desfeito. O rascunho anterior foi restaurado." }]); } }} className="px-3 text-xs"><Undo2 size={13} />Desfazer ajuste</Button><Button type="submit" disabled={!definition || !prompt.trim() || busy || historyLoading || disabled} className="px-3 text-xs"><Send size={13} />{busy ? "Ajustando..." : "Executar ajuste"}</Button></div></form><p className="mt-3 flex items-start gap-1 text-[10px] leading-5 text-slate-500 dark:text-slate-400"><CornerDownLeft size={13} className="mt-1 shrink-0" />Os ajustes ficam no rascunho. Use Publicar formulário para disponibilizá-los. As tentativas ficam salvas; recarregar não reaplica ajustes ao rascunho.</p></div>
    <div className="border-t border-slate-200 p-5 dark:border-slate-700"><details><summary className="cursor-pointer text-xs font-semibold">Histórico salvo de tentativas ({attempts.length})</summary><p className="my-3 text-[10px] leading-5 text-slate-400">Últimas 50 tentativas recebidas pelo servidor. Aplicado indica o rascunho daquela sessão; a publicação é separada.</p><AiAttemptHistory attempts={attempts} /></details>{attempts.length > 0 && <><Link href={`/prefeitura/suporte/novo?processo=${encodeURIComponent(processId)}&ia=1`} className="mt-4 inline-flex rounded-lg bg-blue-600 px-4 py-2.5 text-xs font-semibold text-white hover:bg-blue-700">Pedir ajuda ao suporte</Link><p className="mt-2 text-[10px] leading-5 text-slate-400">Não conseguiu o resultado esperado? Envie o contexto e as tentativas para a equipe técnica.</p></>}</div>
  </Card>;
}
