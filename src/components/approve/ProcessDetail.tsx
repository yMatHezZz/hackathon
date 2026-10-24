"use client";

import { useState, type FormEvent } from "react";
import { Save } from "lucide-react";
import type { Process, ProcessInformation } from "@/lib/types";
import { useGlobal } from "@/context/GlobalContext";
import { Button } from "@/components/ui";
import { ConfiguredFields } from "./ConfiguredFields";
import { defaultFormDefinition } from "@/lib/form-schema";
import { Dialog } from "@/components/ui/Dialog";


export function ProcessDetail({ process, onClose }: { process: Process; onClose: () => void }) {
  return <Dialog title={`Formulário de ${process.name}`} closeLabel="Fechar detalhes" onClose={onClose}><ProcessForm process={process} onSaved={onClose} onCancel={onClose} /></Dialog>;
}
export function ProcessForm({ process, onSaved, onCancel, onSubmitted, allowProtocol = false }: { process: Process; onSaved?: () => void; onCancel: () => void; onSubmitted?: (id: string) => void; allowProtocol?: boolean }) {
  const { saveProcess, submitProcess } = useGlobal();
  const [information, setInformation] = useState<ProcessInformation>({ ...process.information, requestType: process.information.requestType || "Emissão" });
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const submit = async (event: FormEvent) => {
    event.preventDefault(); if (saving) return;
    setSaving(true); setError(""); setSaved(false);
    try {
      const action = (event.nativeEvent as SubmitEvent).submitter?.getAttribute("value");
      if (action === "protocol") { const id = await submitProcess(process.id, information); onSubmitted?.(id); }
      else { await saveProcess(process.id, information); setSaved(true); onSaved?.(); }
    }
    catch (error) { setError(error instanceof Error ? error.message : "Não foi possível salvar as informações."); }
    finally { setSaving(false); }
  };
  return <>
    <h2 className="mb-3 text-lg font-bold">{(process.formDefinition ?? defaultFormDefinition).title}</h2>
    <div className="mb-5"><p className="font-mono text-xs text-slate-400">{process.protocol ? `Protocolo ${process.protocol}` : `Modelo ${process.name}`}</p><p className="mt-2 text-xs leading-6 text-slate-500 dark:text-slate-400">Modelo demonstrativo de solicitação. Requerente, atividade e endereço são obrigatórios. Utilize informações fictícias.</p></div>
    <form onSubmit={submit} className="space-y-6">
      <fieldset disabled={allowProtocol && !!process.protocol} className="min-w-0 space-y-6 disabled:opacity-90">
      <ConfiguredFields definition={process.formDefinition ?? defaultFormDefinition} information={information} onChange={setInformation} />
      </fieldset>
      {saved && <p role="status" className="rounded-lg bg-emerald-50 dark:bg-emerald-950 p-3 text-xs text-emerald-700 dark:text-emerald-300">Rascunho salvo no banco local.</p>}
      {error && <p role="alert" className="rounded-lg bg-rose-50 dark:bg-rose-950 p-3 text-xs text-rose-700 dark:text-rose-300">{error}</p>}
      <div className="sticky bottom-0 flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 py-4"><p className="text-[10px] text-slate-400">As informações serão salvas no banco local.</p><div className="flex flex-wrap gap-2"><Button type="button" variant="secondary" onClick={onCancel}>Voltar</Button>{(!allowProtocol || !process.protocol) && <Button type="submit" value="save" disabled={saving}><Save size={15} />{saving ? "Salvando..." : "Salvar informações"}</Button>}{allowProtocol && !process.protocol && <Button type="submit" value="protocol" disabled={saving}>{saving ? "Enviando..." : "Protocolar solicitação"}</Button>}</div></div>
    </form>
  </>;
}
