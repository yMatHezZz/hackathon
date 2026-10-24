"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { ArrowLeft, Headphones, LockKeyhole, MessageCircle, Plus, Send, X } from "lucide-react";
import { useGlobal } from "@/context/GlobalContext";
import { Avatar, Badge, Button, Field, inputClass } from "@/components/ui";

export function SupportWidget({ processId }: { processId?: string }) {
  const { tickets, loading, storageReady, createTicket, addReply } = useGlobal();
  const [open, setOpen] = useState(false);
  const [composing, setComposing] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [reply, setReply] = useState("");
  const [sending, setSending] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  const helpButton = useRef<HTMLButtonElement>(null);
  const ticket = !composing ? tickets.find(t => t.id === selectedId && t.origin === "requerente" && (!processId || t.processId === processId)) ?? tickets.find(t => t.origin === "requerente" && (!processId || t.processId === processId)) : undefined;
  useEffect(() => {
    if (open) dialog.current?.showModal();
    else if (dialog.current?.open) dialog.current.close();
  }, [open]);
  const close = () => { setOpen(false); setError(""); helpButton.current?.focus(); };
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); if (sending) return; setSending(true);
    const data = new FormData(event.currentTarget);
    const form = { name: String(data.get("name") ?? ""), email: String(data.get("email") ?? ""), account: String(data.get("account") ?? ""), description: String(data.get("description") ?? "") };
    try { const id = await createTicket({ ...form, processId, channel: "Chat", origin: "requerente" }); setSelectedId(id); setComposing(false); setError(""); } catch (e) { setError(e instanceof Error ? e.message : "Não foi possível abrir o chamado."); } finally { setSending(false); }
  };
  const sendReply = async (event: FormEvent) => {
    event.preventDefault(); if (sending) return; setSending(true);
    if (!ticket) return;
    try { await addReply(ticket.id, reply, "customer"); setReply(""); setError(""); } catch (e) { setError(e instanceof Error ? e.message : "Não foi possível enviar."); } finally { setSending(false); }
  };
  return <><button ref={helpButton} onClick={() => setOpen(true)} aria-label="Ajuda" aria-haspopup="dialog" className="fixed bottom-6 right-5 z-40 flex items-center gap-2 rounded-full bg-blue-600 px-5 py-3.5 text-sm font-semibold text-white shadow-xl shadow-blue-900/20 transition-all hover:-translate-y-1 hover:bg-blue-700"><MessageCircle size={19} />Ajuda</button>
    <dialog ref={dialog} onCancel={close} onClose={close} aria-labelledby="widget-title" className="fixed inset-auto bottom-5 right-5 m-0 max-h-[calc(100dvh-40px)] w-[400px] max-w-[calc(100vw-40px)] overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-0 text-slate-800 dark:text-slate-100 shadow-2xl backdrop:bg-slate-900/25">
      <div className="flex items-center justify-between bg-blue-600 px-5 py-5 text-white"><div className="flex items-center gap-3"><span className="rounded-xl bg-white/15 dark:bg-slate-900/15 p-2"><Headphones size={22} /></span><div><h2 id="widget-title" className="text-sm font-bold">Como podemos ajudar?</h2><p className="mt-1 text-[11px] text-blue-100">Equipe Nolyp · Ambiente simulado</p></div></div><button onClick={close} aria-label="Fechar ajuda" className="rounded-md p-1.5 hover:bg-white/15 dark:hover:bg-slate-900/15"><X size={18} /></button></div>
      <div className="max-h-[calc(100dvh-140px)] overflow-y-auto p-5">
        {ticket ? <><div className="mb-5 flex flex-wrap items-center justify-between gap-2"><span className="font-mono text-[10px] text-slate-400">#{ticket.id}</span><Badge status={ticket.status} /></div><div className="space-y-4" aria-live="polite">{ticket.messages.filter(entry => entry.kind === "customer" || entry.kind === "support").map(entry => <div key={entry.id} className="flex gap-2"><Avatar name={entry.kind === "customer" ? ticket.name : "Equipe Nolyp"} blue={entry.kind === "support"} /><div className="min-w-0"><p className="mb-1 text-[10px] font-bold text-slate-500 dark:text-slate-400">{entry.kind === "customer" ? ticket.name : "Equipe Nolyp"}</p><p className={`whitespace-pre-wrap break-words rounded-xl p-3 text-xs leading-6 ${entry.kind === "customer" ? "bg-slate-100 dark:bg-slate-800" : "bg-blue-50 dark:bg-blue-950 text-blue-900 dark:text-blue-100"}`}>{entry.content}</p></div></div>)}</div><form onSubmit={sendReply} className="mt-5 flex items-end gap-2"><label className="flex-1 text-xs font-semibold text-slate-600 dark:text-slate-300">Sua mensagem<textarea value={reply} onChange={e => setReply(e.target.value)} required maxLength={4000} rows={2} className={`${inputClass} mt-2`} placeholder="Envie mais detalhes..." /></label><Button type="submit" disabled={!reply.trim() || sending} aria-label="Enviar mensagem" className="mb-1 px-3"><Send size={16} /></Button></form><Button variant="ghost" onClick={() => { setComposing(true); setError(""); setReply(""); }} className="mt-4 w-full text-xs"><Plus size={14} />Abrir outro chamado</Button></> : <><p className="mb-5 text-xs leading-6 text-slate-500 dark:text-slate-400">Conte o que está impedindo você de continuar. Nossa equipe vai acompanhar o seu caso.</p><form onSubmit={submit} className="space-y-3"><Field label="Nome completo"><input name="name" autoComplete="name" placeholder="Seu nome" required maxLength={100} className={inputClass} /></Field><Field label="E-mail"><input name="email" type="email" autoComplete="email" placeholder="voce@example.com" required maxLength={254} className={inputClass} /></Field><div className="grid gap-3"><Field label="Prefeitura / Conta"><input name="account" placeholder="Prefeitura Modelo" required maxLength={150} className={inputClass} /></Field></div><Field label="Descrição do impedimento"><textarea name="description" rows={3} minLength={10} maxLength={4000} required placeholder="Ex.: Alvará 001 bloqueado ao enviar documentos..." className={inputClass} /></Field><Button type="submit" disabled={loading || sending || !storageReady} className="w-full">{loading ? "Carregando histórico..." : sending ? "Salvando chamado..." : "Abrir chamado"}<Send size={14} /></Button></form>{composing && tickets.some(t => t.origin === "requerente") && <Button variant="ghost" className="mt-2 w-full text-xs" onClick={() => setComposing(false)}><ArrowLeft size={13} />Voltar à conversa</Button>}<p className="mt-3 flex items-center gap-1.5 text-[10px] leading-5 text-slate-400"><LockKeyhole size={12} />Demonstração: use nome e e-mail fictícios.</p></>}
        {error && <p role="alert" className="mt-3 rounded-lg bg-rose-50 dark:bg-rose-950 p-3 text-xs text-rose-700 dark:text-rose-300">{error}</p>}
      </div>
    </dialog>
  </>;
}
