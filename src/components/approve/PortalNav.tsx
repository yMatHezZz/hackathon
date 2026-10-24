"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { FileText, Inbox, LifeBuoy, Sparkles } from "lucide-react";
export function PortalNav({ municipal, mobile = false }: { municipal: boolean; mobile?: boolean }) {
  const pathname = usePathname();
  const base = municipal ? "/prefeitura" : "/requerente";
  const items = [{ href: `${base}/caixa`, label: "Minha caixa", icon: Inbox }, { href: `${base}/processos`, label: "Processos", icon: FileText }, ...(municipal ? [{ href: `${base}/formularios`, label: "Formulários com IA", icon: Sparkles }] : []), { href: `${base}/suporte`, label: municipal ? "Suporte técnico" : "Meus chamados", icon: LifeBuoy }];
  return <nav aria-label={mobile ? "Menu móvel do portal" : "Menu do portal"} className={mobile ? "flex gap-1 overflow-x-auto border-b border-slate-200 bg-white p-2 dark:border-slate-700 dark:bg-slate-900 md:hidden" : "grid w-full gap-2 px-3"}>{items.map(item => {
    const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
    return <Link key={item.href} href={item.href} aria-current={active ? "page" : undefined} className={`flex items-center gap-2.5 rounded-xl font-semibold transition-colors ${mobile ? "shrink-0 px-3 py-2.5 text-[11px]" : "px-4 py-3 text-xs"} ${active ? "bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300" : "text-slate-500 hover:bg-slate-50 dark:text-slate-400 dark:hover:bg-slate-800"}`}><item.icon size={17} className="shrink-0" />{item.label}</Link>;
  })}</nav>;
}
