"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookOpen, LayoutDashboard, Ticket } from "lucide-react";
export default function SupportLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const tabs = [{ href: "/support", title: "Visão geral", icon: LayoutDashboard }, { href: "/support/chamados", title: "Chamados", icon: Ticket }, { href: "/support/conhecimento", title: "Base de conhecimento", icon: BookOpen }];
  return <><nav aria-label="Abas do suporte" className="flex flex-wrap gap-1 border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 pt-3 lg:px-8">{tabs.map(tab => <Link key={tab.href} href={tab.href} aria-current={pathname === tab.href ? "page" : undefined} className={`inline-flex items-center gap-2 border-b-2 px-4 py-3 text-xs font-semibold transition-all ${pathname === tab.href ? "border-blue-600 text-blue-600 dark:text-blue-400" : "border-transparent text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400"}`}><tab.icon size={15} />{tab.title}</Link>)}</nav>{children}</>;
}
