import type { FormFieldDefinition, KnowledgeArticle, ProcessFormDefinition } from "./types";
import { coreFields, parseFormDefinition } from "./form-schema";
import { normalize } from "./domain";
import { findKnowledgeArticles } from "./knowledge";

export interface FormAdjustmentInput { definition: ProcessFormDefinition; prompt: string; sectionId?: string; context?: string }
export interface FormAdjustmentResult {
  definition: ProcessFormDefinition;
  changed: boolean;
  message: string;
  changes: string[];
  sources: { id: string; title: string; excerpt: string }[];
}
const slug = (value: string) => normalize(value).replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "").slice(0, 42) || "novo";
function uniqueId(label: string, used: Set<string>, prefix: string) {
  const base = `${prefix}_${slug(label)}`;
  let id = base; let count = 2;
  while (used.has(id)) id = `${base}_${count++}`;
  used.add(id); return id;
}
function excerpt(article: KnowledgeArticle, query: string) {
  const terms = normalize(query).split(/\W+/).filter(word => word.length > 3);
  const lines = article.content.replace(/```[\s\S]*?```/g, "").replace(/!\[[^\]]*\]\([^)]*\)/g, "").replace(/\[([^\]]+)\]\([^)]*\)/g, "$1").replace(/<[^>]+>/g, "").split(/\n+/)
    .map(line => line.replace(/^[#*\s-]+/, "").trim()).filter(line => line.length > 15 && !/CREDENCIAL OCULTADA|Bearer |api[_-]?key|password|service_role/i.test(line));
  return (lines.find(line => terms.some(term => normalize(line).includes(term))) ?? lines[0] ?? "Artigo de referência sem trecho textual disponível.").slice(0, 360);
}
function newField(label: string, detail: string, used: Set<string>): FormFieldDefinition {
  const text = normalize(`${label} ${detail}`);
  const type: FormFieldDefinition["type"] = /e-?mail/.test(text) ? "email" : /telefone|celular|tipo\s*:?\s*tel\b/.test(text) ? "tel" : /\bdata\b|tipo\s*:?\s*date\b/.test(text) ? "date" : /\bnumero\b|\barea\b|\bvalor\b|tipo\s*:?\s*number\b/.test(text) ? "number" : /texto longo|textarea|descricao|observacoes/.test(text) ? "textarea" : /checkbox|caixa de selecao/.test(text) ? "checkbox" : /\bselecao\b|\bselect\b|opcoes\s*:/.test(text) ? "select" : "text";
  const field: FormFieldDefinition = { id: uniqueId(label, used, "custom"), label: label.trim(), type, required: /obrigatori/.test(text) && !/nao obrigatori|opcional/.test(text), width: type === "textarea" ? "full" : "half" };
  if (type === "select") {
    const options = detail.match(/op[çc][oõ]es\s*:\s*(.+)$/i)?.[1];
    if (!options) throw new Error("Para seleção, informe opções: Urbana | Rural.");
    field.options = options.split(/[|;]/).map(option => option.trim()).filter(Boolean);
  }
  if (type === "number") { field.min = 0; field.max = 1e9; field.step = 0.01; }
  return field;
}
function articleFields(articles: KnowledgeArticle[], used: Set<string>): FormFieldDefinition[] {
  const fields: FormFieldDefinition[] = [];
  for (const article of articles) {
    let inFields = false;
    for (const line of article.content.split("\n")) {
      if (/^#{1,6}\s/.test(line)) { inFields = /campos (?:recomendados|do formulario)|dados necessarios/.test(normalize(line)); continue; }
      if (!inFields || !/^\s*[-*]\s+/.test(line) || line.length > 240 || /https?:|```|ignore|execute|remova|senha|token|chave|credencial|password|bearer/i.test(line)) continue;
      const clean = line.replace(/^\s*[-*]\s+/, "").replace(/\*\*/g, "").trim();
      const label = clean.replace(/\s*\([^)]*\)\s*$/, "").replace(/\s*\|.*$/, "").trim();
      if (label.length < 2 || label.length > 150 || fields.some(field => normalize(field.label) === normalize(label))) continue;
      try { fields.push(newField(label, clean, used)); } catch { /* Descritor incompleto não vira um campo. */ }
      if (fields.length >= 8) return fields;
    }
  }
  return fields;
}

export function adjustForm(input: FormAdjustmentInput, knowledge: KnowledgeArticle[]): FormAdjustmentResult {
  const definition = parseFormDefinition(structuredClone(input.definition));
  const prompt = input.prompt.trim();
  if (!prompt || prompt.length > 1500) throw new Error("Informe um pedido com até 1.500 caracteres.");
  const matches = findKnowledgeArticles(`${prompt} ${input.context ?? ""}`, knowledge);
  const sources = matches.map(article => ({ id: article.id, title: article.title, excerpt: excerpt(article, prompt) }));
  const changes: string[] = [];
  const unchanged = (message: string): FormAdjustmentResult => ({ definition, changed: false, message, changes: [], sources });
  const quoted = [...prompt.matchAll(/["“]([^"”]+)["”]/g)].map(match => match[1].trim());
  const action = normalize(prompt);
  if (/^(?:nao |nunca )/.test(action)) return unchanged("Nenhuma alteração executada. Use um pedido afirmativo para ajustar o rascunho.");
  const adding = prompt.match(/^(?:adicion(?:ar|e)|cri(?:ar|e)|inclu(?:ir|a))\s+(?:um(?:a)?\s+)?(card|se[cç][aã]o|campo)\b\s*(.*)$/i);
  if (adding) {
    const kind = normalize(adding[1]);
    const label = quoted[0] ?? adding[2].replace(/\s+(?:conforme|com base|com campos|obrigat[oó]rio|opcional|tipo[: ]).*$/i, "").trim();
    if (!label || label.length > 150) return unchanged('Informe o nome entre aspas. Exemplo: Adicionar card "Dados complementares".');
    const used = new Set(definition.sections.flatMap(section => section.fields.map(field => field.id)));
    if (kind === "card" || kind === "secao") {
      if (definition.sections.some(section => normalize(section.title) === normalize(label))) return unchanged("Já existe um card com esse nome. Selecione a seção para adicionar campos.");
      const fromKnowledge = /conforme.{0,12}base|com base|playbook/.test(action);
      const fields = quoted.length > 1 ? quoted.slice(1).map(name => newField(name, "", used)) : fromKnowledge ? articleFields(matches, used) : [];
      if (fromKnowledge && quoted.length <= 1 && !fields.length) return unchanged('Não encontrei uma lista de campos recomendados nos artigos ativos. Informe os campos: Adicionar card "Dados complementares" com campos "Nome", "E-mail".');
      definition.sections.push({ id: uniqueId(label, new Set(definition.sections.map(section => section.id)), "section"), title: label, fields });
      changes.push(`Card “${label}” adicionado${fields.length ? ` com ${fields.length} campos` : ""}.`);
      fields.forEach(field => changes.push(`Campo “${field.label}” (${field.type})${field.required ? ", obrigatório" : ""}.`));
    } else {
      const section = definition.sections.find(section => section.id === input.sectionId);
      if (!section) return unchanged("Selecione a seção de destino antes de adicionar um campo.");
      if (definition.sections.some(section => section.fields.some(field => normalize(field.label) === normalize(label)))) return unchanged("Já existe um campo com esse rótulo. Escolha outro nome.");
      const field = newField(label, quoted.length ? prompt.slice(prompt.indexOf(quoted[0]) + quoted[0].length + 1) : adding[2].slice(label.length), used);
      section.fields.push(field);
      changes.push(`Campo “${field.label}” adicionado em “${section.title}” (${field.type})${field.required ? ", obrigatório" : ""}.`);
    }
  } else if (/^renome(?:ar|ie)\s+(?:o\s+)?campo\b/.test(action)) {
    if (quoted.length !== 2) return unchanged('Use: Renomear campo "Nome atual" para "Novo nome".');
    const field = definition.sections.flatMap(section => section.fields).find(field => normalize(field.label) === normalize(quoted[0]) || field.id === quoted[0]);
    if (!field) return unchanged("Campo não encontrado no formulário atual.");
    field.label = quoted[1]; changes.push(`Campo “${quoted[0]}” renomeado para “${quoted[1]}”, preservando o identificador e as respostas.`);
  } else if (/^(?:tornar|torne)\b/.test(action) && /obrigatori|opcional/.test(action)) {
    const field = definition.sections.flatMap(section => section.fields).find(field => normalize(field.label) === normalize(quoted[0] ?? "") || field.id === quoted[0]);
    if (!field) return unchanged('Informe o campo: Tornar obrigatório o campo "Telefone de contato".');
    const required = !/opcional/.test(action);
    if (!required && coreFields.includes(field.id)) return unchanged("Este é um campo essencial e deve continuar obrigatório.");
    field.required = required; changes.push(`Campo “${field.label}” definido como ${required ? "obrigatório" : "opcional"}.`);
  } else {
    return unchanged(sources.length ? `Encontrei ${sources.length} artigo(s) para orientar o ajuste. Consulte os trechos abaixo. Para executar, use Adicionar card, Adicionar campo, Renomear campo ou Tornar obrigatório, com os nomes entre aspas.` : 'Não reconheci um ajuste executável. Exemplos: Adicionar card "Dados extras"; Adicionar campo "Referência"; Renomear campo "Referência" para "Localização"; Tornar obrigatório o campo "Telefone de contato".');
  }
  return { definition: parseFormDefinition(definition), changed: true, message: `${changes[0]} Ajuste aplicado ao rascunho. Revise a prévia e publique quando estiver pronto.${sources.length ? " Os artigos consultados estão abaixo." : " Nenhum artigo correspondente foi encontrado; usei somente seu pedido e o schema atual."}`, changes, sources };
}
