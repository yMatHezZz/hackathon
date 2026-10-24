"use client";
import { useEffect, useState } from "react";
import type { FormAiAttempt } from "@/lib/types";
import { api } from "@/lib/client-api";
import { Field, inputClass } from "@/components/ui";
import { AiAttemptHistory, outcomeLabels } from "./AiAttemptHistory";

export function AiTicketAttachment({ processId, initiallyChecked }: { processId: string; initiallyChecked: boolean }) {
  const [enabled, setEnabled] = useState(initiallyChecked);
  const [attempts, setAttempts] = useState<FormAiAttempt[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [loading, setLoading] = useState(!!processId);
  const [error, setError] = useState("");
  useEffect(() => {
    if (!processId) return;
    const controller = new AbortController();
    api<{ attempts: FormAiAttempt[] }>(`/api/processes/${encodeURIComponent(processId)}/form-assistant`, "GET", undefined, controller.signal).then(data => {
      if (controller.signal.aborted) return;
      const recent = data.attempts.slice(-20); setAttempts(recent); setSelected(recent.map(attempt => attempt.id));
    }).catch(() => { if (!controller.signal.aborted) setError("Não foi possível carregar as tentativas. Descreva manualmente o que tentou ou recarregue a página."); }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [processId]);
  if (!loading && !attempts.length && !error) return initiallyChecked ? <p className="rounded-xl bg-blue-50 p-4 text-xs leading-6 text-blue-700 dark:bg-blue-950 dark:text-blue-300">Envie seu primeiro pedido ao copiloto do formulário para solicitar suporte de edição com IA.</p> : null;
  return <section className="rounded-xl border border-blue-200 bg-blue-50/40 p-4 dark:border-blue-800 dark:bg-blue-950/30"><label className="flex items-start gap-3 text-sm font-semibold"><input type="checkbox" name="attemptedAi" checked={enabled} disabled={!processId || loading || !attempts.length} onChange={event => setEnabled(event.target.checked)} className="mt-1 accent-blue-600" />Tentei ajustar o formulário com a IA</label>{!processId && <p className="mt-2 text-xs text-slate-500">Selecione o processo para incluir esse contexto.</p>}{enabled && processId && attempts.length > 0 && <div className="mt-4 space-y-4"><p className="text-xs leading-6 text-slate-500 dark:text-slate-400">Revise o relato e as tentativas selecionadas. Uma cópia ficará salva no chamado para a equipe técnica e no histórico municipal.</p><Field label="O que você tentou com a IA?"><textarea name="aiAttemptNotes" rows={3} maxLength={2000} minLength={!selected.length ? 5 : undefined} required={!selected.length} className={inputClass} placeholder="Descreva os ajustes tentados e o resultado que ainda precisa de apoio." /></Field>{loading && <p role="status" className="animate-pulse text-xs">Carregando tentativas do processo...</p>}{error && <p role="alert" className="text-xs text-amber-700 dark:text-amber-300">{error}</p>}<details open={initiallyChecked}><summary className="cursor-pointer text-xs font-semibold text-blue-700 dark:text-blue-300">Selecionar histórico da IA ({selected.length} de {attempts.length})</summary><p className="my-3 text-[10px] text-slate-400">Até 20 tentativas recentes por chamado.</p><div className="max-h-[480px] space-y-3 overflow-y-auto">{attempts.map(attempt => <div key={attempt.id} className="rounded-lg border border-blue-100 p-3 dark:border-blue-800"><label className="flex items-start gap-2 text-xs leading-5"><input name="aiAttemptIds" type="checkbox" value={attempt.id} checked={selected.includes(attempt.id)} onChange={event => setSelected(current => event.target.checked ? [...current, attempt.id] : current.filter(id => id !== attempt.id))} className="mt-1 accent-blue-600" /><span className="min-w-0"><span className="block break-words font-semibold">{attempt.prompt}</span><span className="mt-1 block text-[10px] text-slate-500 dark:text-slate-400">{outcomeLabels[attempt.outcome]} · {new Date(attempt.createdAt).toLocaleString("pt-BR")}</span></span></label><details className="mt-2"><summary className="cursor-pointer text-[10px] text-blue-600 dark:text-blue-400">Conferir registro completo</summary><div className="mt-2"><AiAttemptHistory attempts={[attempt]} /></div></details></div>)}</div>{!loading && !attempts.length && <p className="text-xs leading-6 text-slate-500 dark:text-slate-400">Nenhuma tentativa registrada. Você pode relatar manualmente o ajuste tentado.</p>}</details></div>}</section>;
}
