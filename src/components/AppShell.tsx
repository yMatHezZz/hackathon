"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, type ReactNode } from "react";
import { AudioLines, LifeBuoy, Moon, Settings2, Sun } from "lucide-react";
import { useGlobal } from "@/context/GlobalContext";
import { Dialog } from "@/components/ui/Dialog";
import { useTheme } from "@/components/ThemeProvider";
import { PortalNav } from "@/components/approve/PortalNav";

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { theme, toggle } = useTheme();
  const { compactView, setCompactView, storageError, refresh } = useGlobal();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const support = pathname.startsWith("/support");
  const municipal = pathname.startsWith("/prefeitura");
  const requester = pathname.startsWith("/requerente");
  const portal = municipal || requester;
  return <div className="min-h-screen bg-[#f5f7fa] text-slate-800 dark:bg-[#0b1120] dark:text-slate-100">
    <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-white focus:p-3 dark:focus:bg-slate-900">Pular para o conteúdo</a>
    <aside className={`fixed inset-y-0 left-0 z-30 hidden flex-col items-center border-r border-slate-200 bg-white py-6 dark:border-slate-700 dark:bg-slate-900 md:flex ${portal ? "w-[220px]" : "w-[76px]"}`}>
      {portal ? <div className="mb-9 w-full px-7"><p className="text-2xl font-bold tracking-tight">approve<span className="text-blue-600">.</span></p><p className="mt-1 text-[10px] text-slate-400">{municipal ? "Portal do analista" : "Portal do requerente"}</p></div> : <Link href="/support" aria-label="Central Nolyp" className="mb-10 flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-white"><AudioLines size={23} /></Link>}
      {portal ? <PortalNav municipal={municipal} /> : <nav aria-label="Navegação Nolyp"><Link href="/support" aria-label="Central de suporte" className="rail-link rail-active"><LifeBuoy size={21} /></Link></nav>}
      {portal && <button onClick={() => setSettingsOpen(true)} aria-label="Configurações" className="mt-6 flex w-full items-center gap-2 px-7 py-3 text-xs font-semibold text-slate-400 hover:text-blue-600"><Settings2 size={16} />Preferências</button>}
      <div className="mt-auto flex items-center gap-3 px-5"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-50 text-xs font-bold text-blue-700 dark:bg-blue-950 dark:text-blue-300">{municipal ? "CA" : "ND"}</span>{portal && <div><p className="text-xs font-semibold">{municipal ? "Camila Analista" : "Requerente"}</p><p className="mt-1 text-[10px] text-slate-400">Ambiente demonstrativo</p></div>}</div>
    </aside>
    <div className={portal ? "md:pl-[220px]" : "md:pl-[76px]"}>
      <header className="flex min-h-[76px] flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-white px-5 py-4 dark:border-slate-700 dark:bg-slate-900 lg:px-8">
        <div className="flex items-center gap-3">{requester ? <span className="text-lg font-bold">approve<span className="text-blue-600">.</span></span> : <Link href={municipal ? "/prefeitura/caixa" : "/support"} aria-label="Início Nolyp" className="text-lg font-bold tracking-tight">nolyp<span className="text-blue-600">.</span></Link>}<span className="h-5 border-l border-slate-200 dark:border-slate-700" /><span className="text-xs text-slate-500 dark:text-slate-400">{support ? "Support Hub" : municipal ? "Prefeitura Modelo · Analista" : "Prefeitura Modelo"}</span></div>
        <div className="flex flex-wrap items-center gap-3"><span className="rounded-md border border-amber-200 bg-amber-50 px-2 py-1 text-[9px] font-semibold tracking-wider text-amber-800 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200">DEMONSTRAÇÃO · IA LOCAL</span><button type="button" onClick={toggle} aria-label={theme === "dark" ? "Ativar tema claro" : "Ativar tema escuro"} className="rounded-lg border border-slate-200 p-2 text-slate-500 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-950">{theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}</button>{!requester && <><Link href="/requerente" className="header-link">Abrir requerente</Link><Link href="/prefeitura" className="header-link">Abrir prefeitura</Link>{!support && <Link href="/prefeitura/suporte/novo" className="header-link">Abrir suporte</Link>}</>}</div>
      </header>
      {portal && <PortalNav municipal={municipal} mobile />}
      {storageError && <div role="alert" className="flex flex-wrap items-center justify-between gap-3 border-b border-rose-200 bg-rose-50 px-5 py-3 text-xs text-rose-800 dark:border-rose-800 dark:bg-rose-950 dark:text-rose-200"><span>{storageError}</span><button onClick={() => void refresh()} className="font-semibold underline">Reconectar ao banco</button></div>}
      <main id="main">{children}</main><footer className="flex flex-wrap justify-between gap-2 border-t border-slate-200 px-5 py-3 text-[10px] text-slate-400 dark:border-slate-700"><span>{portal ? "Prefeitura Modelo · Approve" : "Nolyp Support Hub"}</span><span>Demonstração local · IA simulada</span></footer>
    </div>
    {settingsOpen && <Dialog title="Configurações da visualização" onClose={() => setSettingsOpen(false)}><p className="mb-5 text-sm text-slate-500">Ajuste a apresentação dos processos nesta sessão.</p><label className="flex items-center justify-between gap-4 rounded-xl border border-slate-200 p-4 text-sm font-semibold dark:border-slate-700">Modo compacto da tabela<input type="checkbox" checked={compactView} onChange={event => setCompactView(event.target.checked)} className="h-4 w-4 accent-blue-600" /></label></Dialog>}
  </div>;
}
