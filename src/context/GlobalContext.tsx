"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import type { ArticleInput, HubSnapshot, KnowledgeArticle, MutationResult, Process, ProcessInformation, ReplyDraft, Ticket, TicketForm, TicketPriority, TicketStatus } from "@/lib/types";
import { loadTickets } from "@/lib/csv-loader";
import { initialProcesses } from "@/lib/demo-data";
import { api } from "@/lib/client-api";
import type { ProcessFormDefinition } from "@/lib/types";

interface HubState {
  tickets: Ticket[];
  processes: Process[];
  knowledge: KnowledgeArticle[];
  loading: boolean;
  storageReady: boolean;
  storageError: string;
  dataNotice: string;
  dataSource: string;
}
interface HubContext extends HubState {
  saveFormDefinition: (id: string, definition: ProcessFormDefinition, expectedRevision: number) => Promise<void>;
  compactView: boolean;
  setCompactView: (compact: boolean) => void;
  refresh: () => Promise<void>;
  createTicket: (form: TicketForm) => Promise<string>;
  saveProcess: (id: string, information: ProcessInformation) => Promise<void>;
  addReply: (id: string, content: string, kind: "customer" | "support") => Promise<void>;
  setTicketStatus: (id: string, status: TicketStatus) => Promise<void>;
  setTicketPriority: (id: string, priority: TicketPriority) => Promise<void>;
  runCommand: (id: string, command: string) => Promise<string>;
  retryTriage: (id: string) => Promise<void>;
  saveArticle: (input: ArticleInput, id?: string) => Promise<void>;
  submitProcess: (id: string, information: ProcessInformation) => Promise<string>;
  suggestReply: (id: string) => Promise<ReplyDraft>;
}
const GlobalContext = createContext<HubContext | null>(null);

export function GlobalProvider({ children }: { children: ReactNode }) {
  const [compactView, setCompactView] = useState(false);
  const [state, setState] = useState<HubState>({ tickets: [], processes: initialProcesses, knowledge: [], loading: true, storageReady: false, storageError: "", dataNotice: "", dataSource: "Carregando histórico" });
  const history = useRef<Ticket[]>([]);
  const revision = useRef(-1);
  const mounted = useRef(true);
  const apply = useCallback((snapshot: HubSnapshot) => {
    if (!mounted.current || snapshot.revision < revision.current) return;
    revision.current = snapshot.revision;
    setState(current => ({ ...current, tickets: [...snapshot.tickets, ...history.current], processes: snapshot.processes, knowledge: snapshot.knowledge, storageReady: true, storageError: "" }));
  }, []);
  const refresh = useCallback(async () => {
    try {
      const result = await api<HubSnapshot | { unchanged: true; revision: number }>(revision.current >= 0 ? `/api/hub?since=${revision.current}` : "/api/hub");
      if (!("unchanged" in result)) apply(result);
    }
    catch (error) { if (mounted.current) setState(current => ({ ...current, storageError: error instanceof Error ? error.message : "Falha na conexão com o banco." })); }
  }, [apply]);

  useEffect(() => {
    mounted.current = true;
    const controller = new AbortController();
    Promise.allSettled([loadTickets(controller.signal), api<HubSnapshot>("/api/hub", "GET", undefined, controller.signal)]).then(([csv, database]) => {
      if (controller.signal.aborted) return;
      if (csv.status === "fulfilled") {
        history.current = csv.value.tickets;
        setState(current => ({ ...current, dataNotice: csv.value.notice, dataSource: csv.value.source }));
      }
      if (database.status === "fulfilled") apply(database.value);
      else setState(current => ({ ...current, tickets: history.current, storageError: "Não foi possível abrir o banco. Tente reconectar antes de criar chamados." }));
      setState(current => ({ ...current, loading: false }));
    });
    let polling = false;
    const interval = setInterval(async () => {
      if (polling || document.visibilityState !== "visible") return;
      polling = true;
      try { await refresh(); } finally { polling = false; }
    }, 1800);
    const focus = () => { void refresh(); };
    window.addEventListener("focus", focus);
    return () => { mounted.current = false; controller.abort(); clearInterval(interval); window.removeEventListener("focus", focus); };
  }, [apply, refresh]);

  const mutate = useCallback(async (url: string, body: unknown, method = "PATCH") => {
    try { const result = await api<MutationResult>(url, method, body); apply(result.snapshot); return result; }
    catch (error) {
      const message = error instanceof Error ? error.message : "O banco não confirmou a operação.";
      if (mounted.current) setState(current => ({ ...current, storageError: message }));
      throw new Error(message);
    }
  }, [apply]);
  const createTicket = useCallback(async (form: TicketForm) => {
    const result = await mutate("/api/tickets", form, "POST");
    if (!result.ticketId) throw new Error("O servidor não retornou o identificador do chamado.");
    return result.ticketId;
  }, [mutate]);
  const saveProcess = useCallback(async (id: string, information: ProcessInformation) => { await mutate(`/api/processes/${encodeURIComponent(id)}`, information); }, [mutate]);
  const saveFormDefinition = useCallback(async (id: string, definition: ProcessFormDefinition, expectedRevision: number) => { await mutate(`/api/processes/${encodeURIComponent(id)}/form-schema`, { definition, expectedRevision }); }, [mutate]);
  const addReply = useCallback(async (id: string, content: string, kind: "customer" | "support") => { await mutate(`/api/tickets/${encodeURIComponent(id)}`, { action: "reply", content, kind }); }, [mutate]);
  const setTicketStatus = useCallback(async (id: string, status: TicketStatus) => { await mutate(`/api/tickets/${encodeURIComponent(id)}`, { action: "status", status }); }, [mutate]);
  const setTicketPriority = useCallback(async (id: string, priority: TicketPriority) => { await mutate(`/api/tickets/${encodeURIComponent(id)}`, { action: "priority", priority }); }, [mutate]);
  const runCommand = useCallback(async (id: string, command: string) => {
    await new Promise(resolve => setTimeout(resolve, 700));
    return (await mutate(`/api/tickets/${encodeURIComponent(id)}`, { action: "command", command })).message ?? "Comando processado.";
  }, [mutate]);
  const retryTriage = useCallback(async (id: string) => { await mutate(`/api/tickets/${encodeURIComponent(id)}`, { action: "retry-triage" }); }, [mutate]);
  const saveArticle = useCallback(async (input: ArticleInput, id?: string) => { await mutate(id ? `/api/knowledge/${encodeURIComponent(id)}` : "/api/knowledge", input, id ? "PATCH" : "POST"); }, [mutate]);
  const submitProcess = useCallback(async (id: string, information: ProcessInformation) => {
    const result = await mutate(`/api/processes/${encodeURIComponent(id)}/submit`, information, "POST");
    if (!result.processId) throw new Error("O servidor não confirmou o protocolo.");
    return result.processId;
  }, [mutate]);
  const suggestReply = useCallback(async (id: string) => {
    const result = await mutate(`/api/tickets/${encodeURIComponent(id)}`, { action: "suggest-reply" });
    if (!result.draft) throw new Error("Não foi possível preparar uma resposta.");
    return result.draft;
  }, [mutate]);

  return <GlobalContext.Provider value={{ ...state, compactView, setCompactView, refresh, saveProcess, saveFormDefinition, createTicket, addReply, setTicketStatus, setTicketPriority, runCommand, retryTriage, saveArticle, submitProcess, suggestReply }}>{children}</GlobalContext.Provider>;
}
export function useGlobal() { const context = useContext(GlobalContext); if (!context) throw new Error("useGlobal precisa de GlobalProvider"); return context; }
