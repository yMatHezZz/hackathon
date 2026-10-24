export type AgentBucket = "BUG" | "CONSTRUIR_ALTERAR" | "DUVIDA";
export type AgentReplyKind = "solution" | "clarification" | "handoff";
export interface AgentSource { id: string; title: string; url?: string }
export interface AgentDecision {
  engine: string; bucket: AgentBucket; confidence: number; kind: AgentReplyKind;
  reply: string; triageNote: string | null; sources: AgentSource[];
}
export interface AgentTrainingInput { text: string; bucket: AgentBucket; kind: AgentReplyKind; reply: string; articleIds: string[]; active: boolean }
export interface AgentTrainingExample extends AgentTrainingInput { id: string; createdAt: string; updatedAt: string }
export type AgentRunStatus = "queued" | "running" | "pending_approval" | "published" | "failed" | "rejected" | "superseded";
export interface AgentRun {
  id: string; ticketId: string; targetMessageId: string; baselineMessageId: string;
  status: AgentRunStatus; attempts: number; createdAt: string; updatedAt: string;
  claimToken?: string; leaseUntil?: number; result?: AgentDecision; error?: string; publishedMessageId?: string;
}
export interface AgentSettings { enabled: boolean }
