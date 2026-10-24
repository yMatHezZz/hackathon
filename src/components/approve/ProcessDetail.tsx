"use client";

import { useState, type FormEvent, type ReactNode } from "react";
import { Save } from "lucide-react";
import type { Process, ProcessInformation } from "@/lib/types";
import { useGlobal } from "@/context/GlobalContext";
import { Button, Field, inputClass } from "@/components/ui";
import { Dialog } from "@/components/ui/Dialog";

function FormSection({ number, title, description, children }: { number: string; title: string; description?: string; children: ReactNode }) {
  return <fieldset className="min-w-0 rounded-xl border border-slate-200 dark:border-slate-700 p-4 sm:p-5"><legend className="px-2 text-sm font-bold text-slate-800 dark:text-slate-100"><span className="mr-2 text-blue-600 dark:text-blue-400">{number}</span>{title}</legend>{description && <p className="mb-4 text-xs leading-6 text-slate-500 dark:text-slate-400">{description}</p>}<div className="grid gap-4 sm:grid-cols-2">{children}</div></fieldset>;
}

export function ProcessDetail({ process, onClose }: { process: Process; onClose: () => void }) {
  return <Dialog title={`Formulário de ${process.name}`} closeLabel="Fechar detalhes" onClose={onClose}><ProcessForm process={process} onSaved={onClose} onCancel={onClose} /></Dialog>;
}
export function ProcessForm({ process, onSaved, onCancel, onSubmitted, allowProtocol = false }: { process: Process; onSaved?: () => void; onCancel: () => void; onSubmitted?: (id: string) => void; allowProtocol?: boolean }) {
  const { saveProcess, submitProcess } = useGlobal();
  const [information, setInformation] = useState<ProcessInformation>({ ...process.information, requestType: process.information.requestType || "Emissão" });
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const change = (field: keyof ProcessInformation, value: string) => setInformation(current => ({ ...current, [field]: value }));
  const input = (field: keyof ProcessInformation, label: string, options: { type?: string; max?: number; required?: boolean; placeholder?: string } = {}) => <Field label={label}><input type={options.type ?? "text"} value={information[field] ?? ""} onChange={event => change(field, event.target.value)} required={options.required} maxLength={options.max ?? 250} min={options.type === "number" ? "0" : undefined} max={options.type === "number" ? "1000000000" : undefined} step={options.type === "number" ? "0.01" : undefined} placeholder={options.placeholder} className={inputClass} /></Field>;
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
    <div className="mb-5"><p className="font-mono text-xs text-slate-400">{process.protocol ? `Protocolo ${process.protocol}` : `Modelo ${process.name}`}</p><p className="mt-2 text-xs leading-6 text-slate-500 dark:text-slate-400">Modelo demonstrativo de solicitação. Requerente, atividade e endereço são obrigatórios. Utilize informações fictícias.</p></div>
    <form onSubmit={submit} className="space-y-6">
      <fieldset disabled={allowProtocol && !!process.protocol} className="min-w-0 space-y-6 disabled:opacity-90">
      <FormSection number="01" title="Dados do requerente">
        {input("applicant", "Requerente do processo", { required: true, max: 150 })}
        {input("applicantEmail", "E-mail do requerente", { type: "email", max: 254, placeholder: "requerente@example.com" })}
        {input("applicantDocument", "CPF / CNPJ ou identificação", { max: 30, placeholder: "DEMO-001" })}
        {input("applicantPhone", "Telefone de contato", { type: "tel", max: 40, placeholder: "Contato demonstrativo" })}
      </FormSection>
      <FormSection number="02" title="Tipo da solicitação">
        <Field label="Tipo da solicitação"><select aria-label="Tipo da solicitação" value={information.requestType} onChange={event => change("requestType", event.target.value)} className={inputClass}>{["Emissão", "Renovação", "Alteração", "Regularização"].map(type => <option key={type}>{type}</option>)}</select></Field>
        {input("activity", "Atividade / Finalidade", { required: true })}
        <div className="sm:col-span-2"><Field label="Observações técnicas"><textarea rows={3} value={information.notes} onChange={event => change("notes", event.target.value)} maxLength={2000} className={inputClass} /></Field></div>
      </FormSection>
      <FormSection number="03" title="Dados do imóvel">
        <div className="sm:col-span-2">{input("address", "Endereço do estabelecimento", { required: true })}</div>
        {input("propertyRegistration", "Inscrição imobiliária / Matrícula", { max: 80, placeholder: "IMOVEL-DEMO-001" })}
        {input("propertyArea", "Área do imóvel (m²)", { type: "number", max: 30, placeholder: "0,00" })}
        <div className="sm:col-span-2">{input("propertyUse", "Uso do imóvel", { max: 120, placeholder: "Ex.: comercial, residencial ou misto" })}</div>
      </FormSection>
      <FormSection number="04" title="Documentos complementares" description="Registre os nomes e as referências dos documentos. Este modelo salva as informações, sem realizar upload de arquivos.">
        <div className="sm:col-span-2"><Field label="Descrição e referência dos documentos"><textarea rows={4} value={information.documents ?? ""} onChange={event => change("documents", event.target.value)} maxLength={4000} placeholder="Ex.: planta do imóvel, documento do requerente e referência do comprovante." className={inputClass} /></Field></div>
      </FormSection>
      <FormSection number="05" title="Taxas" description="Dados informados para conferência. O formulário não calcula tributos nem realiza pagamentos.">
        {input("feeAmount", "Valor informado (R$)", { type: "number", max: 30, placeholder: "0,00" })}
        {input("feeReference", "Número da guia / Referência", { max: 100, placeholder: "GUIA-DEMO-001" })}
        {input("feeDueDate", "Vencimento informado", { type: "date", max: 10 })}
      </FormSection>
      </fieldset>
      {saved && <p role="status" className="rounded-lg bg-emerald-50 dark:bg-emerald-950 p-3 text-xs text-emerald-700 dark:text-emerald-300">Rascunho salvo no banco local.</p>}
      {error && <p role="alert" className="rounded-lg bg-rose-50 dark:bg-rose-950 p-3 text-xs text-rose-700 dark:text-rose-300">{error}</p>}
      <div className="sticky bottom-0 flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 py-4"><p className="text-[10px] text-slate-400">As informações serão salvas no banco local.</p><div className="flex gap-2"><Button type="button" variant="secondary" onClick={onCancel}>Voltar</Button>{(!allowProtocol || !process.protocol) && <Button type="submit" value="save" disabled={saving}><Save size={15} />{saving ? "Salvando..." : "Salvar informações"}</Button>}{allowProtocol && !process.protocol && <Button type="submit" value="protocol" disabled={saving}>{saving ? "Enviando..." : "Protocolar solicitação"}</Button>}</div></div>
    </form>
  </>;
}
