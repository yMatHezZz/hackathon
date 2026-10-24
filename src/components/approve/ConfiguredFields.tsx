"use client";

import type { ProcessFormDefinition, ProcessInformation } from "@/lib/types";
import { baseFields } from "@/lib/form-schema";
import { Field, inputClass } from "@/components/ui";

export function ConfiguredFields({ definition, information, onChange }: { definition: ProcessFormDefinition; information: ProcessInformation; onChange: (information: ProcessInformation) => void }) {
  return <>{definition.sections.map((section, index) => <fieldset key={section.id} className="min-w-0 rounded-xl border border-slate-200 p-4 dark:border-slate-700 sm:p-5">
    <legend className="px-2 text-sm font-bold text-slate-800 dark:text-slate-100"><span className="mr-2 text-blue-600 dark:text-blue-400">{String(index + 1).padStart(2, "0")}</span>{section.title}</legend>
    {section.description && <p className="mb-4 text-xs leading-6 text-slate-500 dark:text-slate-400">{section.description}</p>}
    <div className="grid gap-4 sm:grid-cols-2">{section.fields.map(field => {
      const base = baseFields.has(field.id);
      const value = base ? information[field.id as keyof ProcessInformation] : information.customFields?.[field.id];
      const change = (value: string | boolean) => onChange(base ? { ...information, [field.id]: value } : { ...information, customFields: { ...information.customFields, [field.id]: value } });
      const props = { required: field.required, "aria-label": field.label, className: inputClass };
      return <div key={field.id} className={field.width === "full" ? "sm:col-span-2" : ""}><Field label={field.label}>
        {field.type === "checkbox" ? <input type="checkbox" checked={value === true} onChange={event => change(event.target.checked)} required={field.required} className="h-4 w-4 accent-blue-600" />
          : field.type === "select" ? <select {...props} value={typeof value === "string" ? value : ""} onChange={event => change(event.target.value)}><option value="">Selecione</option>{field.options?.map(option => <option key={option}>{option}</option>)}</select>
          : field.type === "textarea" ? <textarea {...props} rows={4} value={typeof value === "string" ? value : ""} onChange={event => change(event.target.value)} maxLength={field.maxLength ?? baseFields.get(field.id)?.maxLength ?? 4000} placeholder={field.placeholder} />
          : <input {...props} type={field.type} value={typeof value === "string" ? value : ""} onChange={event => change(event.target.value)} maxLength={field.maxLength ?? baseFields.get(field.id)?.maxLength ?? 4000} min={field.min} max={field.max} step={field.type === "number" ? field.step ?? 0.01 : undefined} placeholder={field.placeholder} />}
      </Field>{field.helpText && <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400">{field.helpText}</p>}</div>;
    })}</div>
  </fieldset>)}</>;
}
