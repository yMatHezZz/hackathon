"use client";

import { useState, type FormEvent } from "react";
import ReactMarkdown from "react-markdown";
import Image from "next/image";
import { BookOpen, Pencil, Plus, Search, ShieldCheck } from "lucide-react";
import type { ArticleInput, KnowledgeArticle } from "@/lib/types";
import { useGlobal } from "@/context/GlobalContext";
import { Button, Card, Field, inputClass } from "@/components/ui";
import { Dialog } from "@/components/ui/Dialog";
import { pylonArticleUrl } from "@/lib/knowledge-links";

function ArticleEditor({ article, onClose }: { article?: KnowledgeArticle; onClose: () => void }) {
  const { saveArticle } = useGlobal();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); if (saving) return;
    const data = new FormData(event.currentTarget);
    const input: ArticleInput = { title: String(data.get("title")), category: String(data.get("category")), content: String(data.get("content")), tags: String(data.get("tags") ?? "").split(",").map(tag => tag.trim()).filter(Boolean), active: data.get("active") === "on" };
    setSaving(true); setError("");
    try { await saveArticle(input, article?.id); onClose(); }
    catch (error) { setError(error instanceof Error ? error.message : "Não foi possível salvar o artigo."); }
    finally { setSaving(false); }
  };
  return <Dialog title={article ? "Editar artigo" : "Novo artigo"} onClose={onClose}><form onSubmit={submit} className="space-y-4">
    <Field label="Título do artigo"><input name="title" defaultValue={article?.title} required minLength={5} maxLength={240} className={inputClass} /></Field>
    <Field label="Categoria"><input name="category" defaultValue={article?.category ?? "Processos"} required maxLength={100} className={inputClass} /></Field>
    <Field label="Etiquetas (separadas por vírgula)"><input name="tags" defaultValue={article?.tags.join(", ")} maxLength={450} placeholder="alvará, bloqueio, documentos" className={inputClass} /></Field>
    <Field label="Conteúdo e orientações"><textarea name="content" defaultValue={article?.content} rows={9} required minLength={20} maxLength={100000} placeholder="Descreva o procedimento validado, as evidências necessárias e os limites da orientação. Aceita Markdown." className={inputClass} /></Field>
    <label className="flex items-center gap-2 text-xs font-semibold text-slate-600 dark:text-slate-300"><input name="active" type="checkbox" defaultChecked={article?.active ?? true} className="h-4 w-4 accent-blue-600" />Disponível para a IA</label>
    <p className="text-[11px] leading-6 text-slate-500 dark:text-slate-400">Artigos ativos orientam novas investigações. Notas já gravadas preservam a análise feita naquele momento.</p>
    {error && <p role="alert" className="rounded-lg bg-rose-50 dark:bg-rose-950 p-3 text-xs text-rose-700 dark:text-rose-300">{error}</p>}
    <div className="flex justify-end gap-2 border-t border-slate-100 dark:border-slate-700 pt-4"><Button type="button" variant="secondary" onClick={onClose}>Cancelar</Button><Button type="submit" disabled={saving}>{saving ? "Salvando..." : "Salvar artigo"}</Button></div>
  </form></Dialog>;
}
export default function KnowledgePage() {
  const { knowledge, loading, storageReady } = useGlobal();
  const [query, setQuery] = useState("");
  const [editor, setEditor] = useState<KnowledgeArticle | "new" | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [limit, setLimit] = useState(100);
  const filtered = knowledge.filter(article => `${article.title} ${article.category} ${article.tags.join(" ")} ${article.content}`.toLowerCase().includes(query.toLowerCase()));
  const selected = filtered.find(article => article.id === selectedId) ?? filtered[0];
  return <div className="px-5 py-7 lg:px-8"><div className="mb-6 flex flex-wrap items-center justify-between gap-4"><div><p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-blue-600 dark:text-blue-400">Nolyp / Conhecimento</p><h1 className="text-2xl font-bold tracking-tight">Base de conhecimento</h1><p className="mt-2 text-xs leading-6 text-slate-500 dark:text-slate-400">Registre procedimentos que ajudem o agente a investigar e recomendar o próximo passo.</p></div><Button onClick={() => setEditor("new")} disabled={!storageReady}><Plus size={15} />Novo artigo</Button></div>
    <div className="mb-5 flex flex-wrap items-center justify-between gap-4"><label className="relative w-full sm:max-w-sm"><Search size={15} className="absolute left-3 top-3 text-slate-400" /><input value={query} onChange={event => { setQuery(event.target.value); setLimit(100); }} aria-label="Buscar artigos" placeholder="Título, categoria ou etiqueta..." className={`${inputClass} pl-9`} /></label><span className="text-xs text-slate-500 dark:text-slate-400">{knowledge.filter(article => article.active).length} ativos · {knowledge.length} artigos salvos</span></div>
    {loading ? <Card className="animate-pulse p-10 text-sm text-slate-500 dark:text-slate-400" role="status">Carregando base...</Card> : !filtered.length ? <Card className="grid justify-items-center gap-3 p-12 text-center"><BookOpen size={30} className="text-blue-500" /><h2 className="text-lg font-bold">{knowledge.length ? "Nenhum artigo encontrado" : "Sua base começa aqui"}</h2><p className="max-w-md text-sm leading-7 text-slate-500 dark:text-slate-400">Adicione orientações com termos relacionados aos chamados. A IA citará os artigos ativos que corresponderem ao relato.</p></Card> : <div className="grid items-start gap-5 lg:grid-cols-[320px_1fr]">
      <Card className="overflow-hidden">{filtered.slice(0, limit).map(article => <button key={article.id} onClick={() => setSelectedId(article.id)} aria-pressed={selected?.id === article.id} className={`w-full border-b border-slate-100 dark:border-slate-700 p-5 text-left hover:bg-slate-50 dark:hover:bg-slate-950 ${selected?.id === article.id ? "bg-blue-50 dark:bg-blue-950" : ""}`}><p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-slate-400">{article.category}</p><p className="break-words text-sm font-semibold">{article.title}</p><span className={`mt-3 inline-block rounded px-2 py-1 text-[10px] font-semibold ${article.active ? "bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300" : "bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400"}`}>{article.active ? "Disponível para IA" : "Inativo"}</span></button>)}{filtered.length > limit && <Button variant="ghost" className="w-full" onClick={() => setLimit(current => current + 100)}>Mostrar mais artigos ({filtered.length - limit})</Button>}</Card>
      {selected && <Card className="min-w-0 p-6"><div className="flex flex-wrap justify-between gap-3"><div><p className="font-mono text-[10px] text-slate-400">{selected.id}</p><h2 className="mt-2 break-words text-xl font-bold">{selected.title}</h2></div><Button variant="secondary" onClick={() => setEditor(selected)}><Pencil size={14} />Editar artigo</Button></div><p className="mt-3 text-[11px] text-slate-400">Atualizado em {new Date(selected.updatedAt).toLocaleString("pt-BR")}</p><p className="mt-2 break-words text-[10px] text-slate-400">{selected.source ?? "Artigo da equipe"}{selected.sourceStatus ? ` · Situação na origem: ${selected.sourceStatus}` : ""}</p>{pylonArticleUrl(selected.sourceUrl) && <a href={pylonArticleUrl(selected.sourceUrl)!} target="_blank" rel="noopener noreferrer" className="mt-4 inline-flex text-xs font-semibold text-blue-600 underline dark:text-blue-400">Abrir artigo original no Pylon ↗</a>}<div className="mt-4 flex flex-wrap gap-2">{selected.tags.map(tag => <span key={tag} className="rounded-md bg-blue-50 dark:bg-blue-950 px-2 py-1 text-[10px] text-blue-700 dark:text-blue-300">{tag}</span>)}</div><div className="internal-markdown mt-6 border-t border-slate-100 dark:border-slate-700 pt-5"><ReactMarkdown skipHtml allowedElements={["p", "h1", "h2", "h3", "ul", "ol", "li", "strong", "em", "code", "pre", "br", "img", "a", "blockquote", "hr"]} components={{ img: ({ src, alt }) => typeof src === "string" && /^\/api\/knowledge\/assets\/[a-f0-9]{64}\.(png|jpg|jpeg)$/.test(src) ? <Image src={src} alt={alt ?? "Imagem do playbook"} width={1200} height={800} unoptimized className="my-4 h-auto max-w-full rounded-lg" /> : <span>[Imagem externa não carregada]</span>, a: ({ href, children }) => href?.startsWith("/support/conhecimento#PB-") ? <button className="text-left text-blue-600 dark:text-blue-400 underline" onClick={() => { setQuery(""); setSelectedId(href.split("#")[1]); }}>{children}</button> : pylonArticleUrl(href) ? <a href={pylonArticleUrl(href)!} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline dark:text-blue-400">{children}</a> : <span>{children}</span> }} unwrapDisallowed>{selected.content}</ReactMarkdown></div></Card>}
    </div>}
    <p className="mt-6 flex items-start gap-2 text-[11px] leading-6 text-slate-500 dark:text-slate-400"><ShieldCheck size={15} className="mt-1 shrink-0 text-blue-600 dark:text-blue-400" />Os artigos fornecem contexto à IA simulada. O atendente continua responsável por validar e executar cada ação.</p>
    {editor && <ArticleEditor article={editor === "new" ? undefined : editor} onClose={() => setEditor(null)} />}
  </div>;
}
