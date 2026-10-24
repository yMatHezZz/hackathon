import type { Process, ProcessInformation, TicketForm } from "./types";
export const normalize = (value: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
export function validateTicketForm(form: TicketForm): string | null {
  if (!form.name.trim() || form.name.length > 100) return "Informe seu nome (até 100 caracteres).";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim()) || form.email.length > 254) return "Informe um e-mail válido.";
  if (!form.account.trim() || form.account.length > 150) return "Informe a prefeitura ou conta (até 150 caracteres).";
  if (!((form.origin === "requerente" && form.channel === "Chat") || (form.origin === "prefeitura" && form.channel === "Formulário"))) return "Origem e canal do chamado inválidos.";
  if (form.origin === "prefeitura" && (!form.subject?.trim() || form.subject.trim().length < 5)) return "Informe um título com pelo menos 5 caracteres.";
  if (form.subject && form.subject.length > 120) return "O título deve ter até 120 caracteres.";
  if (form.description.trim().length < 10 || form.description.length > 4000) return "Descreva o impedimento com 10 a 4.000 caracteres.";
  return null;
}
export function updateProcessInformation(processes: Process[], id: string, information: ProcessInformation): Process[] {
  if (!processes.some(process => process.id === id)) throw new Error("Processo não encontrado.");
  const clean = {
    customFields: information.customFields,
    applicant: information.applicant.trim(),
    address: information.address.trim(),
    activity: information.activity.trim(),
    notes: information.notes.trim(),
    applicantEmail: information.applicantEmail?.trim() ?? "",
    applicantDocument: information.applicantDocument?.trim() ?? "",
    applicantPhone: information.applicantPhone?.trim() ?? "",
    requestType: information.requestType?.trim() || "Emissão",
    propertyRegistration: information.propertyRegistration?.trim() ?? "",
    propertyArea: information.propertyArea?.trim() ?? "",
    propertyUse: information.propertyUse?.trim() ?? "",
    documents: information.documents?.trim() ?? "",
    feeAmount: information.feeAmount?.trim() ?? "",
    feeReference: information.feeReference?.trim() ?? "",
    feeDueDate: information.feeDueDate?.trim() ?? "",
  };
  if (!clean.applicant || !clean.address || !clean.activity) throw new Error("Preencha requerente, endereço e atividade do processo.");
  if (clean.applicant.length > 150 || clean.address.length > 250 || clean.activity.length > 250 || clean.notes.length > 2000) throw new Error("Revise o tamanho das informações preenchidas.");
  if (clean.applicantEmail && (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean.applicantEmail) || clean.applicantEmail.length > 254)) throw new Error("Informe um e-mail válido para o requerente.");
  if (!["Emissão", "Renovação", "Alteração", "Regularização"].includes(clean.requestType)) throw new Error("Tipo de solicitação inválido.");
  if (clean.applicantDocument.length > 30 || clean.applicantPhone.length > 40 || clean.propertyRegistration.length > 80 || clean.propertyUse.length > 120 || clean.documents.length > 4000 || clean.feeReference.length > 100) throw new Error("Revise o tamanho dos dados complementares.");
  for (const [label, value] of [["Área do imóvel", clean.propertyArea], ["Valor da taxa", clean.feeAmount]]) {
    if (value && (!/^\d+(\.\d{1,2})?$/.test(value) || Number(value) > 1_000_000_000)) throw new Error(`${label}: informe um número não negativo com até duas casas decimais.`);
  }
  if (clean.feeDueDate && (!/^\d{4}-\d{2}-\d{2}$/.test(clean.feeDueDate) || !Number.isFinite(Date.parse(clean.feeDueDate)) || new Date(clean.feeDueDate).toISOString().slice(0, 10) !== clean.feeDueDate)) throw new Error("Vencimento da taxa inválido.");
  return processes.map(process => process.id === id ? { ...process, information: clean, updatedAt: new Date().toISOString() } : process);
}
export function executeCommand(command: string, processes: Process[]) {
  const match = normalize(command).match(/^desbloquear\s+(alvara|licenca|consulta)\s+(\d{3})[.!]?$/);
  if (!match) return { changed: false, processes, message: "Comando não reconhecido. Use: Desbloquear Alvará 001. Nenhuma alteração realizada." };
  const process = processes.find(p => normalize(p.type) === match[1] && p.id === match[2]);
  if (!process) return { changed: false, processes, message: "Processo não encontrado nesta demonstração. Nenhuma alteração realizada." };
  if (process.status !== "Bloqueado") return { changed: false, processes, message: `${process.name} já está ${process.status.toLowerCase()}. Nenhuma alteração necessária.` };
  return { changed: true, processes: processes.map(p => p === process ? { ...p, status: "Em Análise" as const, updatedAt: new Date().toISOString() } : p), message: `Ação executada: ${process.name} desbloqueado pela IA` };
}
