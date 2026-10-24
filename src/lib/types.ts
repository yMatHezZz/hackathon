export type TicketStatus = "Aberto" | "Em atendimento" | "Resolvido";
export type ProcessStatus = "Bloqueado" | "Em Análise" | "Aprovado";
export type MessageKind = "customer" | "support" | "internal" | "log";
export interface Message { id: string; kind: MessageKind; content: string; createdAt: string }
export type Portal = "requerente" | "prefeitura";
export type TicketPriority = "Baixa" | "Média" | "Alta" | "Urgente";
export interface TicketForm {
  name: string;
  email: string;
  account: string;
  description: string;
  subject?: string;
  channel: "Chat" | "Formulário";
  origin: Portal;
  processId?: string;
  priority?: TicketPriority;
}
export interface Ticket extends Omit<TicketForm, "origin" | "subject"> {
  origin: Portal | "historico";
  id: string;
  subject: string;
  status: TicketStatus;
  createdAt: string;
  updatedAt?: string;
  priority?: TicketPriority;
  source: "CSV" | "Demonstração" | "Formulário" | "Chat";
  resolution?: string;
  messages: Message[];
  triage: "pending" | "complete" | "failed" | "none";
}
export interface KnowledgeArticle {
  id: string;
  title: string;
  category: string;
  content: string;
  tags: string[];
  active: boolean;
  createdAt: string;
  updatedAt: string;
  source?: string;
  sourcePath?: string;
  sourceStatus?: string;
  contentHash?: string;
}
export type ArticleInput = Omit<KnowledgeArticle, "id" | "createdAt" | "updatedAt">;
export interface HubSnapshot {
  tickets: Ticket[];
  processes: Process[];
  knowledge: KnowledgeArticle[];
  revision: number;
}
export interface ReplyDraft { content: string; sources: { id: string; title: string }[] }
export interface MutationResult { snapshot: HubSnapshot; ticketId?: string; message?: string; draft?: ReplyDraft; processId?: string }
export interface ProcessInformation {
  applicant: string;
  address: string;
  activity: string;
  notes: string;
  applicantEmail?: string;
  applicantDocument?: string;
  applicantPhone?: string;
  requestType?: string;
  propertyRegistration?: string;
  propertyArea?: string;
  propertyUse?: string;
  documents?: string;
  feeAmount?: string;
  feeReference?: string;
  feeDueDate?: string;
}
export interface Process {
  id: string;
  name: string;
  type: string;
  status: ProcessStatus;
  updatedAt: string;
  information: ProcessInformation;
  requestedInformation: string;
  templateId?: string;
  protocol?: string;
  submittedAt?: string;
}
