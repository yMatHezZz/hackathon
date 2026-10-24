"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, type ReactNode } from "react";
import { ArrowUpRight, AudioLines, FileText, Home, LifeBuoy, Settings2, Moon, Sun } from "lucide-react";
import { useGlobal } from "@/context/GlobalContext";
import { Dialog } from "@/components/ui/Dialog";
import { useTheme } from "@/components/ThemeProvider";

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { theme, toggle } = useTheme();
  const { compactView, setCompactView, storageError, refresh } = useGlobal();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const support = pathname.startsWith("/support");
  const municipal = pathname.startsWith("/prefeitura");
  const portal = municipal || pathname.startsWith("/requerente") || pathname === "/approve";
  const home = municipal ? "/prefeitura" : "/requerente";

  return <div className="min-h-screen bg-[#f5f7fa] dark:bg-[#0b1120] text-slate-800 dark:text-slate-100">
    <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-white dark:focus:bg-slate-900 focus:p-3">Pular para o conteúdo</a>
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-[76px] flex-col items-center border-r border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 py-6 md:flex">
      <Link href="/" aria-label="Visão geral Nolyp" className="mb-10 flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-white shadow-lg shadow-blue-100"><AudioLines size={23} /></Link>
      <nav className="grid gap-4" aria-label={portal ? "Navegação Approve" : "Navegação Nolyp"}>
        <Link href={portal ? home : "/"} title="Home" aria-label="Home" className={`rail-link ${pathname === home || pathname === "/" ? "rail-active" : ""}`}><Home size={21} /></Link>
        {portal ? <>
          <Link href={`${home}#processos`} title="Documentos e processos" aria-label="Documentos e processos" className="rail-link"><FileText size={21} /></Link>
          <button onClick={() => setSettingsOpen(true)} title="Configurações" aria-label="Configurações" className="rail-link"><Settings2 size={21} /></button>
        </> : <>
          <Link href="/support" title="Central de suporte" aria-label="Central de suporte" className={`rail-link ${support ? "rail-active" : ""}`}><LifeBuoy size={21} /></Link>
        </>}
      </nav>
      <div className="mt-auto flex h-9 w-9 items-center justify-center rounded-full bg-slate-900 text-xs font-semibold text-white" title={municipal ? "Analista demonstrativo" : "Sessão demonstrativa"}>{municipal ? "CA" : "ND"}</div>
    </aside>
    <div className="md:pl-[76px]">
      <header className="flex min-h-[76px] flex-wrap items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-5 py-4 lg:px-8">
        <div className="flex items-center gap-3"><Link href="/" aria-label="Início Nolyp" className="text-lg font-bold tracking-tight text-slate-950 dark:text-slate-50">nolyp<span className="text-blue-600 dark:text-blue-400">.</span></Link><span className="h-5 border-l border-slate-200 dark:border-slate-700" /><span className="text-sm text-slate-500 dark:text-slate-400">{support ? "Support Hub" : portal ? "Ambiente Approve" : "Workspace"}</span></div>
        <div className="flex flex-wrap items-center gap-3">
          <span className="rounded-md border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950 px-2 py-1 text-[10px] font-semibold tracking-wider text-amber-800 dark:text-amber-200">DEMONSTRAÇÃO - IA SIMULADA</span>
          <button type="button" onClick={toggle} aria-label={theme === "dark" ? "Ativar tema claro" : "Ativar tema escuro"} className="rounded-lg border border-slate-200 dark:border-slate-700 p-2 text-slate-500 dark:text-slate-400 transition-all hover:bg-slate-50 dark:hover:bg-slate-950">{theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}</button>
          <Link href="/requerente" className="header-link" aria-current={pathname === "/requerente" ? "page" : undefined}>Abrir requerente</Link>
          <Link href="/prefeitura" className="header-link" aria-current={municipal ? "page" : undefined}>Abrir prefeitura</Link>
          {!support && <Link href={municipal ? "/prefeitura/suporte/novo" : "/support"} className="header-link">Abrir suporte<ArrowUpRight size={14} /></Link>}
        </div>
      </header>
      {storageError && <div role="alert" className="flex flex-wrap items-center justify-between gap-3 border-b border-rose-200 dark:border-rose-800 bg-rose-50 dark:bg-rose-950 px-5 py-3 text-xs text-rose-800 dark:text-rose-200"><span>{storageError}</span><button onClick={() => void refresh()} className="font-semibold underline">Reconectar ao banco</button></div>}<main id="main">{children}</main>
      <footer className="flex flex-wrap justify-between gap-2 border-t border-slate-200 dark:border-slate-700 px-5 py-3 text-[10px] text-slate-500 dark:text-slate-400 lg:px-8"><span>Nolyp Support Hub / Hackathon 2026</span><span>Demonstração local · SQLite · IA simulada</span></footer>
    </div>
    {settingsOpen && <Dialog title="Configurações da visualização" onClose={() => setSettingsOpen(false)}>
      <p className="mb-5 text-sm leading-6 text-slate-500 dark:text-slate-400">Ajuste a apresentação dos processos nesta sessão.</p>
      <label className="flex cursor-pointer items-center justify-between gap-4 rounded-xl border border-slate-200 dark:border-slate-700 p-4 text-sm font-semibold">Modo compacto da tabela<input type="checkbox" checked={compactView} onChange={event => setCompactView(event.target.checked)} className="h-4 w-4 accent-blue-600" /></label>
    </Dialog>}
  </div>;
}
