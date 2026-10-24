import type { ArticleInput, ProcessInformation, TicketForm, TicketPriority, TicketStatus } from "../types";
import { validateTicketForm } from "../domain";
export class AppError extends Error { constructor(message: string, public status = 400) { super(message); } }
export function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new AppError("Dados inválidos.");
  return value as Record<string, unknown>;
}
export function text(value: unknown, max: number, label: string, min = 1): string {
  if (typeof value !== "string" || value.trim().length < min || value.length > max) throw new AppError(`${label}: informe de ${min} a ${max} caracteres.`);
  return value.trim();
}
export function priority(value: unknown): TicketPriority {
  if (value !== "Baixa" && value !== "Média" && value !== "Alta" && value !== "Urgente") throw new AppError("Prioridade inválida.");
  return value;
}
export function status(value: unknown): TicketStatus {
  if (value !== "Aberto" && value !== "Em atendimento" && value !== "Resolvido") throw new AppError("Status inválido.");
  return value;
}
export function ticketForm(value: unknown): TicketForm {
  const input = object(value);
  if (input.origin !== "prefeitura" && input.origin !== "requerente") throw new AppError("Ambiente inválido.");
  if (input.channel !== "Chat" && input.channel !== "Formulário") throw new AppError("Canal inválido.");
  const form: TicketForm = { name: text(input.name, 100, "Nome"), email: text(input.email, 254, "E-mail"), account: text(input.account, 150, "Conta"), description: text(input.description, 4000, "Descrição", 10), origin: input.origin, channel: input.channel, subject: input.subject === undefined ? undefined : text(input.subject, 120, "Título", 5), processId: input.processId === undefined || input.processId === "" ? undefined : text(input.processId, 30, "Processo"), priority: priority(input.priority ?? "Média") };
  const error = validateTicketForm(form);
  if (error) throw new AppError(error);
  if (form.origin === "prefeitura" && !form.processId) throw new AppError("Selecione o processo relacionado.");
  return form;
}
export function articleInput(value: unknown): ArticleInput {
  const input = object(value);
  if (!Array.isArray(input.tags) || input.tags.length > 12 || typeof input.active !== "boolean") throw new AppError("Revise as etiquetas e a disponibilidade do artigo.");
  return { title: text(input.title, 240, "Título", 5), category: text(input.category, 100, "Categoria"), content: text(input.content, 100000, "Conteúdo", 20), tags: [...new Set(input.tags.map(tag => text(tag, 40, "Etiqueta")))], active: input.active };
}
export function processInformation(value: unknown): ProcessInformation {
  const input = object(value);
  return {
    applicant: text(input.applicant, 150, "Requerente"), address: text(input.address, 250, "Endereço"), activity: text(input.activity, 250, "Atividade"), notes: text(input.notes, 2000, "Observações", 0),
    applicantEmail: text(input.applicantEmail ?? "", 254, "E-mail", 0), applicantDocument: text(input.applicantDocument ?? "", 30, "Documento", 0), applicantPhone: text(input.applicantPhone ?? "", 40, "Telefone", 0),
    requestType: text(input.requestType ?? "Emissão", 40, "Tipo de solicitação"), propertyRegistration: text(input.propertyRegistration ?? "", 80, "Inscrição imobiliária", 0), propertyArea: text(input.propertyArea ?? "", 30, "Área", 0), propertyUse: text(input.propertyUse ?? "", 120, "Uso do imóvel", 0),
    documents: text(input.documents ?? "", 4000, "Documentos complementares", 0), feeAmount: text(input.feeAmount ?? "", 30, "Valor da taxa", 0), feeReference: text(input.feeReference ?? "", 100, "Guia", 0), feeDueDate: text(input.feeDueDate ?? "", 10, "Vencimento", 0),
  };
}
