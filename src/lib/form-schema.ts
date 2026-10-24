import type { FormFieldDefinition, ProcessFormDefinition, ProcessInformation } from "./types";

export const fieldTypes = ["text", "email", "tel", "number", "date", "textarea", "select", "checkbox"] as const;
const field = (id: string, label: string, type: FormFieldDefinition["type"] = "text", extra: Partial<FormFieldDefinition> = {}): FormFieldDefinition => ({ id, label, type, ...extra });
export const defaultFormDefinition: ProcessFormDefinition = {
  version: 1, title: "Solicitação de processo", sections: [
    { id: "applicant", title: "Dados do requerente", fields: [field("applicant", "Requerente do processo", "text", { required: true, maxLength: 150 }), field("applicantEmail", "E-mail do requerente", "email", { maxLength: 254 }), field("applicantDocument", "CPF / CNPJ ou identificação", "text", { maxLength: 30 }), field("applicantPhone", "Telefone de contato", "tel", { maxLength: 40 })] },
    { id: "request", title: "Tipo da solicitação", fields: [field("requestType", "Tipo da solicitação", "select", { options: ["Emissão", "Renovação", "Alteração", "Regularização"] }), field("activity", "Atividade / Finalidade", "text", { required: true, maxLength: 250 }), field("notes", "Observações técnicas", "textarea", { maxLength: 2000, width: "full" })] },
    { id: "property", title: "Dados do imóvel", fields: [field("address", "Endereço do estabelecimento", "text", { required: true, maxLength: 250, width: "full" }), field("propertyRegistration", "Inscrição imobiliária / Matrícula", "text", { maxLength: 80 }), field("propertyArea", "Área do imóvel (m²)", "number", { min: 0, max: 1e9, step: 0.01 }), field("propertyUse", "Uso do imóvel", "text", { maxLength: 120, width: "full" })] },
    { id: "documents", title: "Documentos complementares", description: "Registre os nomes e as referências dos documentos. Este modelo salva as informações, sem realizar upload de arquivos.", fields: [field("documents", "Descrição e referência dos documentos", "textarea", { width: "full", maxLength: 4000 })] },
    { id: "fees", title: "Taxas", description: "Dados informados para conferência. O formulário não calcula tributos nem realiza pagamentos.", fields: [field("feeAmount", "Valor informado (R$)", "number", { min: 0, max: 1e9, step: 0.01 }), field("feeReference", "Número da guia / Referência", "text", { maxLength: 100 }), field("feeDueDate", "Vencimento informado", "date")] },
  ],
};
export const baseFields = new Map(defaultFormDefinition.sections.flatMap(section => section.fields).map(item => [item.id, item]));
export const coreFields = ["applicant", "activity", "address"];
const safeId = (value: unknown): value is string => typeof value === "string" && /^[a-zA-Z][a-zA-Z0-9_]{0,59}$/.test(value) && !["constructor", "prototype", "__proto__", "customFields"].includes(value);
function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Objeto JSON inválido.");
  return value as Record<string, unknown>;
}
function keys(value: Record<string, unknown>, allowed: string[]) {
  if (Object.keys(value).some(key => !allowed.includes(key))) throw new Error("Propriedade desconhecida na configuração.");
}
function label(value: unknown, name: string, max = 150): string {
  if (typeof value !== "string" || !value.trim() || value.length > max) throw new Error(`${name}: informe de 1 a ${max} caracteres.`);
  return value.trim();
}
export function parseFormDefinition(value: unknown): ProcessFormDefinition {
  const root = record(value); keys(root, ["version", "title", "sections"]);
  if (root.version !== 1 || !Array.isArray(root.sections) || root.sections.length < 1 || root.sections.length > 12) throw new Error("Use version 1 e de 1 a 12 seções.");
  const ids = new Set<string>(); const sectionIds = new Set<string>();
  const sections = root.sections.map(raw => {
    const section = record(raw); keys(section, ["id", "title", "description", "fields"]);
    if (!safeId(section.id) || sectionIds.has(section.id)) throw new Error("ID de seção inválido ou duplicado.");
    sectionIds.add(section.id);
    if (!Array.isArray(section.fields) || section.fields.length > 50) throw new Error("Cada seção aceita até 50 campos.");
    const fields = section.fields.map(rawField => {
      const item = { ...record(rawField) }; keys(item, ["id", "label", "type", "required", "placeholder", "helpText", "width", "options", "maxLength", "min", "max", "step"]);
      if (!safeId(item.id) || ids.has(item.id)) throw new Error("ID de campo inválido ou duplicado.");
      ids.add(item.id);
      if (!fieldTypes.includes(item.type as FormFieldDefinition["type"])) throw new Error("Tipo de campo não suportado.");
      const base = baseFields.get(item.id);
      if (base && base.type !== item.type) throw new Error(`O tipo do campo ${base.label} deve ser preservado.`);
      if (coreFields.includes(item.id) && item.required !== true) throw new Error(`O campo ${item.id} deve ser obrigatório.`);
      if (item.required !== undefined && typeof item.required !== "boolean") throw new Error("required deve ser booleano.");
      if (item.width !== undefined && item.width !== "half" && item.width !== "full") throw new Error("width deve ser half ou full.");
      for (const prop of ["min", "max", "step", "maxLength"] as const) {
        if (item[prop] !== undefined && (typeof item[prop] !== "number" || !Number.isFinite(item[prop]) || Math.abs(item[prop] as number) > 1e9)) throw new Error(`${prop}: número inválido.`);
      }
      if (item.maxLength !== undefined && (!Number.isInteger(item.maxLength) || Number(item.maxLength) < 1 || Number(item.maxLength) > (base?.maxLength ?? 4000))) throw new Error("maxLength fora do limite permitido.");
      if (item.step !== undefined && Number(item.step) <= 0) throw new Error("step deve ser positivo.");
      if (item.min !== undefined && item.max !== undefined && Number(item.min) > Number(item.max)) throw new Error("min não pode superar max.");
      if (base?.type === "number" && ((item.min !== undefined && Number(item.min) < 0) || (item.step !== undefined && Number(item.step) < 0.01))) throw new Error("Área e taxa aceitam números não negativos com até duas casas decimais.");
      if (item.type === "select") {
        if (!Array.isArray(item.options) || !item.options.length || item.options.length > 50) throw new Error("Seleção precisa de 1 a 50 opções.");
        item.options = item.options.map(option => label(option, "Opção", 100));
        if (new Set(item.options as string[]).size !== (item.options as string[]).length) throw new Error("Opção duplicada.");
        if (base?.options && (item.options as string[]).some(option => !base.options!.includes(option))) throw new Error("Opção de solicitação inválida.");
      } else if (item.options !== undefined) throw new Error("options é exclusivo para seleção.");
      for (const prop of ["placeholder", "helpText"] as const) if (item[prop] !== undefined) item[prop] = label(item[prop], prop, 500);
      return { ...item, label: label(item.label, "Rótulo") } as unknown as FormFieldDefinition;
    });
    return { id: section.id, title: label(section.title, "Título da seção"), ...(section.description === undefined ? {} : { description: label(section.description, "Descrição", 1000) }), fields };
  });
  if (ids.size > 100 || coreFields.some(id => !ids.has(id))) throw new Error("Preserve requerente, atividade e endereço; limite de 100 campos.");
  return { version: 1, title: label(root.title, "Título"), sections };
}
export function validateCustomFields(schema: ProcessFormDefinition, input: unknown, previous: Record<string, string | boolean> = {}, enforceRequired = true): Record<string, string | boolean> {
  const values = record(input ?? {});
  const fields = new Map(schema.sections.flatMap(section => section.fields).filter(item => !baseFields.has(item.id)).map(item => [item.id, item]));
  const result = { ...previous };
  if (Object.keys(values).length > 200) throw new Error("Quantidade de respostas excedida.");
  for (const [id, value] of Object.entries(values)) {
    if (!safeId(id) || (!fields.has(id) && !(Object.hasOwn(previous, id) && previous[id] === value))) throw new Error("Resposta para campo desconhecido.");
    if (typeof value !== "string" && typeof value !== "boolean") throw new Error("Valor de campo inválido.");
    if (typeof value === "string" && value.length > 4000) throw new Error("Resposta excede 4.000 caracteres.");
    result[id] = typeof value === "string" ? value.trim() : value;
  }
  for (const item of fields.values()) validateFieldValue(item, result[item.id], enforceRequired);
  return result;
}
export function validateFieldValue(item: FormFieldDefinition, value: unknown, enforceRequired = true) {
  if (item.type === "checkbox" && value !== undefined && typeof value !== "boolean") throw new Error(`${item.label}: valor inválido.`);
  const empty = value === undefined || value === "" || (item.type === "checkbox" && value === false);
  if (empty) { if (item.required && enforceRequired) throw new Error(`${item.label}: preenchimento obrigatório.`); return; }
  if (item.type === "checkbox") { if (typeof value !== "boolean") throw new Error(`${item.label}: valor inválido.`); return; }
  if (typeof value !== "string" || value.length > (item.maxLength ?? baseFields.get(item.id)?.maxLength ?? 4000)) throw new Error(`${item.label}: tamanho ou valor inválido.`);
  if (item.type === "select" && !item.options?.includes(value)) throw new Error(`${item.label}: selecione uma opção válida.`);
  if (item.type === "email" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) throw new Error(`${item.label}: e-mail inválido.`);
  if (item.type === "date" && (!/^\d{4}-\d{2}-\d{2}$/.test(value) || !Number.isFinite(Date.parse(value)) || new Date(value).toISOString().slice(0, 10) !== value)) throw new Error(`${item.label}: data inválida.`);
  if (item.type === "number") {
    const number = Number(value); const step = item.step ?? 0.01; const base = item.min ?? 0;
    if (!/^-?\d+(\.\d+)?$/.test(value) || !Number.isFinite(number) || number < (item.min ?? -1e9) || number > (item.max ?? 1e9) || Math.abs((number - base) / step - Math.round((number - base) / step)) > 1e-6) throw new Error(`${item.label}: número fora dos limites ou incremento inválido.`);
  }
}
export function validateConfiguredInformation(schema: ProcessFormDefinition, information: ProcessInformation) {
  for (const item of schema.sections.flatMap(section => section.fields)) if (baseFields.has(item.id)) validateFieldValue(item, information[item.id as keyof ProcessInformation]);
}
