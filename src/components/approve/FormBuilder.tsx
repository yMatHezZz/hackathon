"use client";

import Link from "next/link";
import { useMemo, useState, type FormEvent } from "react";
import { ArrowDown, ArrowUp, Plus, Settings2, Trash2 } from "lucide-react";
import { useGlobal } from "@/context/GlobalContext";
import type { FormFieldDefinition, Process, ProcessFormDefinition, ProcessInformation } from "@/lib/types";
import { baseFields, coreFields, defaultFormDefinition, fieldTypes, parseFormDefinition } from "@/lib/form-schema";
import { Button, Card, Field, inputClass } from "@/components/ui";
import { Dialog } from "@/components/ui/Dialog";
import { ConfiguredFields } from "./ConfiguredFields";

const typeLabels: Record<FormFieldDefinition["type"], string> = { text: "Texto curto", textarea: "Texto longo", email: "E-mail", tel: "Telefone", number: "Número", date: "Data", select: "Seleção", checkbox: "Caixa de seleção" };
const stringify = (value: ProcessFormDefinition) => JSON.stringify(value, null, 2);
const slug = (value: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "").slice(0, 45);

export function FormBuilder() {
  const { processes, loading, storageReady, storageError, refresh } = useGlobal();
  const [selected, setSelected] = useState("");
  const models = processes.filter(process => !process.protocol);
  const model = models.find(process => process.id === selected) ?? models[0];
  return <main className="mx-auto max-w-[1440px] px-5 py-8 lg:px-10">
    <Link href="/prefeitura" className="text-sm font-semibold text-blue-600 dark:text-blue-400">← Voltar à prefeitura</Link>
    <div className="mb-7 mt-6"><p className="text-xs font-semibold uppercase tracking-widest text-blue-600 dark:text-blue-400">Configuração de processos</p><h1 className="mt-2 text-3xl font-bold tracking-tight">Formulários do seu jeito.</h1><p className="mt-3 max-w-2xl text-sm leading-6 text-slate-500 dark:text-slate-400">Adicione campos pelo construtor ou edite o JSON. Publique para disponibilizar o formulário aos requerentes. Processos protocolados preservam a versão usada no envio.</p></div>
    {loading ? <p role="status">Carregando modelos...</p> : !storageReady ? <Card className="space-y-3 p-5"><p role="alert">{storageError || "Banco local indisponível."}</p><Button onClick={() => void refresh()}>Tentar novamente</Button></Card> : !model ? <p>Nenhum modelo disponível.</p> : <>
      <div className="mb-6 max-w-md"><Field label="Modelo de processo"><select value={model.id} onChange={event => setSelected(event.target.value)} className={inputClass}>{models.map(process => <option key={process.id} value={process.id}>{process.name}</option>)}</select></Field></div>
      <Editor key={model.id} process={model} />
    </>}
  </main>;
}

function Editor({ process }: { process: Process }) {
  const { saveFormDefinition } = useGlobal();
  const [raw, setRaw] = useState(() => stringify(process.formDefinition ?? defaultFormDefinition));
  const [revision, setRevision] = useState(process.formRevision ?? 1);
  const [published, setPublished] = useState(raw);
  const [mode, setMode] = useState<"visual" | "json">("visual");
  const [feedback, setFeedback] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState<{ section: number; field?: FormFieldDefinition } | null>(null);
  const [sectionDialog, setSectionDialog] = useState(false);
  const [preview, setPreview] = useState<ProcessInformation>({ ...process.information, requestType: process.information.requestType || "Emissão" });
  const parsed = useMemo(() => {
    try { return { definition: parseFormDefinition(JSON.parse(raw)), error: "" }; }
    catch (error) { return { definition: undefined, error: error instanceof Error ? error.message : "JSON inválido." }; }
  }, [raw]);
  const definition = parsed.definition;
  const update = (next: ProcessFormDefinition) => { setRaw(stringify(parseFormDefinition(next))); setFeedback(""); setError(""); };
  const editField = (section: number, value: FormFieldDefinition) => {
    if (!definition) return;
    const next = structuredClone(definition);
    const index = next.sections[section].fields.findIndex(field => field.id === editing?.field?.id);
    if (index < 0) next.sections[section].fields.push(value); else next.sections[section].fields[index] = value;
    update(next); setEditing(null);
  };
  const publish = async () => {
    if (!definition || saving) return;
    setSaving(true); setError(""); setFeedback("");
    try { await saveFormDefinition(process.id, definition, revision); setRevision(revision + 1); setPublished(raw); setFeedback("Configuração publicada. O formulário já está disponível nos portais."); }
    catch (error) { setError(error instanceof Error ? error.message : "Falha ao publicar."); }
    finally { setSaving(false); }
  };
  return <>
    <div className="mb-4 flex flex-wrap items-center justify-between gap-3"><p className="text-xs text-slate-500 dark:text-slate-400">Versão {revision} · {raw === published ? "Sem alterações pendentes" : "Alterações não publicadas"}</p><div className="flex flex-wrap gap-2"><Button variant="secondary" disabled={saving} onClick={() => { setRaw(stringify(process.formDefinition ?? defaultFormDefinition)); setPublished(stringify(process.formDefinition ?? defaultFormDefinition)); setRevision(process.formRevision ?? 1); setError(""); setFeedback(""); }}>Recarregar publicado</Button><Button disabled={!definition || saving || raw === published} onClick={publish}>{saving ? "Publicando..." : "Publicar formulário"}</Button></div></div>
    {(feedback || error) && <p role={error ? "alert" : "status"} className={`mb-4 rounded-xl p-4 text-sm ${error ? "bg-rose-50 text-rose-700 dark:bg-rose-950 dark:text-rose-300" : "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"}`}>{error || feedback}</p>}
    <div className="grid items-start gap-6 xl:grid-cols-2">
      <Card className="min-w-0 p-4 sm:p-6"><div role="tablist" aria-label="Modo de configuração" className="mb-6 flex gap-2">{(["visual", "json"] as const).map(tab => <Button key={tab} role="tab" aria-selected={mode === tab} variant={mode === tab ? "primary" : "secondary"} onClick={() => setMode(tab)}>{tab === "visual" ? "Construtor visual" : "Editor JSON"}</Button>)}</div>
        {parsed.error && <p role="alert" className="mb-4 rounded-lg bg-rose-50 p-3 text-sm text-rose-700 dark:bg-rose-950 dark:text-rose-300">{parsed.error} Corrija no editor JSON para continuar.</p>}
        {mode === "json" ? <><Field label="Configuração JSON"><textarea spellCheck={false} value={raw} onChange={event => { setRaw(event.target.value); setFeedback(""); }} className={`${inputClass} min-h-[600px] font-mono text-xs`} /></Field><p className="mt-3 text-xs leading-5 text-slate-500 dark:text-slate-400">version: 1 · IDs únicos e estáveis · tipos: text, textarea, email, tel, number, date, select e checkbox. Preserve os campos obrigatórios applicant, activity e address. Novos campos usam IDs próprios; não inclua scripts.</p></> : definition && <div className="space-y-5">
          <h2 className="text-lg font-bold">{definition.title}</h2>
          {definition.sections.map((section, sectionIndex) => <section key={section.id} className="rounded-xl border border-slate-200 p-4 dark:border-slate-700"><div className="mb-3 flex items-center justify-between gap-3"><h3 className="text-sm font-bold">{String(sectionIndex + 1).padStart(2, "0")} · {section.title}</h3><span className="text-xs text-slate-400">{section.fields.length} campos</span></div>
            <div className="divide-y divide-slate-100 dark:divide-slate-800">{section.fields.map((field, index) => <div key={field.id} className="flex flex-wrap items-center justify-between gap-2 py-3"><div className="min-w-0"><p className="break-words text-sm font-semibold">{field.label}{field.required ? " *" : ""}</p><p className="mt-1 break-all font-mono text-[10px] text-slate-400">{field.id} · {typeLabels[field.type]}</p></div><div className="flex shrink-0 gap-1">
              {([-1, 1] as const).map(direction => <button key={direction} title={direction < 0 ? "Mover para cima" : "Mover para baixo"} aria-label={`${direction < 0 ? "Subir" : "Descer"} ${field.label}`} disabled={index + direction < 0 || index + direction >= section.fields.length} onClick={() => { const next = structuredClone(definition); const fields = next.sections[sectionIndex].fields; [fields[index], fields[index + direction]] = [fields[index + direction], fields[index]]; update(next); }} className="rounded p-2 text-slate-500 hover:bg-slate-100 disabled:opacity-25 dark:hover:bg-slate-800">{direction < 0 ? <ArrowUp size={14} /> : <ArrowDown size={14} />}</button>)}
              <button aria-label={`Editar ${field.label}`} onClick={() => setEditing({ section: sectionIndex, field })} className="rounded p-2 text-blue-600 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-950"><Settings2 size={15} /></button>
              <button aria-label={`Remover ${field.label}`} disabled={coreFields.includes(field.id)} title={coreFields.includes(field.id) ? "Campo essencial" : "Remover do formulário; respostas salvas serão preservadas"} onClick={() => { const next = structuredClone(definition); next.sections[sectionIndex].fields.splice(index, 1); update(next); }} className="rounded p-2 text-rose-600 hover:bg-rose-50 disabled:opacity-25 dark:text-rose-400 dark:hover:bg-rose-950"><Trash2 size={15} /></button>
            </div></div>)}</div><Button variant="secondary" className="mt-3 w-full" onClick={() => setEditing({ section: sectionIndex })}><Plus size={14} />Adicionar campo em {section.title}</Button>
          </section>)}
          <Button variant="secondary" onClick={() => setSectionDialog(true)}><Plus size={15} />Adicionar seção</Button>
        </div>}
      </Card>
      <Card className="min-w-0 p-4 sm:p-6"><div className="mb-6 border-b border-slate-200 pb-4 dark:border-slate-700"><h2 className="text-lg font-bold">Prévia do formulário</h2><p className="mt-2 text-xs leading-5 text-slate-500 dark:text-slate-400">Experimente os campos. Os valores desta prévia não são salvos.</p></div>{definition ? <div className="space-y-6"><ConfiguredFields definition={definition} information={preview} onChange={setPreview} /></div> : <p className="text-sm text-slate-500">Prévia indisponível: revise a configuração JSON.</p>}</Card>
    </div>
    {editing && definition && <FieldEditor initial={editing.field} onClose={() => setEditing(null)} onSave={field => editField(editing.section, field)} />}
    {sectionDialog && definition && <SectionEditor onClose={() => setSectionDialog(false)} onSave={title => { const next = structuredClone(definition); next.sections.push({ id: `section_${slug(title)}`, title, fields: [] }); update(next); setSectionDialog(false); }} />}
  </>;
}

function FieldEditor({ initial, onClose, onSave }: { initial?: FormFieldDefinition; onClose: () => void; onSave: (field: FormFieldDefinition) => void }) {
  const [field, setField] = useState<FormFieldDefinition>(initial ?? { id: "", label: "", type: "text", width: "half" });
  const [options, setOptions] = useState(initial?.options?.join("\n") ?? "");
  const [error, setError] = useState("");
  const set = (next: Partial<FormFieldDefinition>) => setField(current => ({ ...current, ...next }));
  const submit = (event: FormEvent) => { event.preventDefault(); try { const value = { ...field, id: field.id || `custom_${slug(field.label)}` }; if (value.type === "select") value.options = options.split("\n").map(option => option.trim()).filter(Boolean); else delete value.options; onSave(value); } catch (error) { setError(error instanceof Error ? error.message : "Campo inválido."); } };
  return <Dialog title={initial ? "Editar campo" : "Adicionar campo"} onClose={onClose}><form onSubmit={submit} className="space-y-4">
    <Field label="Rótulo do campo"><input required maxLength={150} autoFocus value={field.label} onChange={event => set({ label: event.target.value })} className={inputClass} /></Field>
    <Field label="Identificador do campo"><input value={field.id} disabled={!!initial} placeholder={`custom_${slug(field.label) || "nome_do_campo"}`} maxLength={60} onChange={event => set({ id: event.target.value })} className={inputClass} /></Field><p className="text-xs text-slate-500">Gerado pelo rótulo quando vazio. O identificador mantém o vínculo com as respostas.</p>
    <Field label="Tipo do campo"><select value={field.type} disabled={!!initial} onChange={event => set({ type: event.target.value as FormFieldDefinition["type"] })} className={inputClass}>{fieldTypes.map(type => <option key={type} value={type}>{typeLabels[type]}</option>)}</select></Field>
    {field.type === "select" && <Field label="Opções (uma por linha)"><textarea required value={options} onChange={event => setOptions(event.target.value)} rows={4} className={inputClass} /></Field>}
    <Field label="Texto de ajuda"><input value={field.helpText ?? ""} maxLength={500} onChange={event => { const next = { ...field }; if (event.target.value) next.helpText = event.target.value; else delete next.helpText; setField(next); }} className={inputClass} /></Field>
    <Field label="Largura"><select value={field.width ?? "half"} onChange={event => set({ width: event.target.value as "half" | "full" })} className={inputClass}><option value="half">Meia linha</option><option value="full">Linha inteira</option></select></Field>
    <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={field.required ?? false} disabled={coreFields.includes(field.id)} onChange={event => set({ required: event.target.checked })} className="accent-blue-600" />Campo obrigatório</label>
    {initial && baseFields.has(initial.id) && <p className="text-xs text-slate-500">Campo do modelo original. O tipo e os limites do sistema são preservados.</p>}
    {error && <p role="alert" className="text-sm text-rose-600 dark:text-rose-400">{error}</p>}
    <div className="flex justify-end gap-2"><Button type="button" variant="secondary" onClick={onClose}>Cancelar</Button><Button type="submit">{initial ? "Aplicar campo" : "Adicionar ao formulário"}</Button></div>
  </form></Dialog>;
}
function SectionEditor({ onClose, onSave }: { onClose: () => void; onSave: (title: string) => void }) {
  const [title, setTitle] = useState(""); const [error, setError] = useState("");
  return <Dialog title="Adicionar seção" onClose={onClose}><form className="space-y-4" onSubmit={event => { event.preventDefault(); try { onSave(title); } catch (error) { setError(error instanceof Error ? error.message : "Seção inválida."); } }}><Field label="Nome da seção"><input required autoFocus maxLength={150} value={title} onChange={event => setTitle(event.target.value)} className={inputClass} /></Field>{error && <p role="alert" className="text-rose-600">{error}</p>}<Button type="submit">Adicionar seção</Button></form></Dialog>;
}
