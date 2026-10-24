import Link from "next/link";
import { ArrowRight, ArrowUpRight, Building2, Check, LifeBuoy, LockKeyhole, Sparkles, UserRound } from "lucide-react";

const environments = [
  { href: "/requerente", icon: UserRound, eyebrow: "APPROVE · CIDADÃO", title: "Requerente", text: "Acompanhe processos e relate impedimentos no chat de atendimento.", action: "Entrar como requerente" },
  { href: "/prefeitura", icon: Building2, eyebrow: "APPROVE · GESTÃO PÚBLICA", title: "Prefeitura", text: "Edite informações, solicite suporte e consulte o histórico municipal.", action: "Entrar como analista" },
  { href: "/support", icon: LifeBuoy, eyebrow: "NOLYP · ATENDIMENTO", title: "Central de suporte", text: "Investigue chamados, responda aos solicitantes e execute ações com a IA.", action: "Abrir Nolyp Hub" },
];

export default function Home() {
  return <div className="mx-auto max-w-6xl px-6 py-12 lg:py-16">
    <div className="mb-7 inline-flex items-center gap-2 rounded-full border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950 px-3 py-1.5 text-[11px] font-semibold text-blue-700 dark:text-blue-300"><span className="h-1.5 w-1.5 rounded-full bg-blue-500" />NOLYP SUPPORT HUB</div>
    <div className="grid gap-10 lg:grid-cols-[1.2fr_1fr]">
      <div><h1 className="max-w-xl text-4xl font-bold leading-[1.12] tracking-[-0.045em] text-slate-950 dark:text-slate-50 sm:text-6xl">Do impedimento<br />ao próximo <span className="text-blue-600 dark:text-blue-400">passo.</span></h1><p className="mt-6 max-w-md text-sm leading-7 text-slate-500 dark:text-slate-400">Três ambientes conectados: o cidadão acompanha, a prefeitura analisa e o suporte resolve com contexto.</p><p className="mt-5 text-[11px] text-slate-400">Sem cadastro · Dados fictícios · IA simulada</p></div>
      <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-6 shadow-sm"><h2 className="mb-5 border-b border-slate-100 dark:border-slate-700 pb-4 text-xs font-semibold">Um fluxo, três perspectivas</h2>{[
        { icon: Building2, title: "01 / Solicitar", text: "Chat para o cidadão. Formulário para a prefeitura." },
        { icon: Sparkles, title: "02 / Investigar", text: "Histórico semelhante e hipótese em uma nota interna." },
        { icon: Check, title: "03 / Resolver", text: "O atendente valida e executa. O processo segue em frente." },
      ].map((step, i) => <div key={step.title} className={`flex gap-4 ${i !== 2 ? "pb-5" : ""}`}><span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${i === 1 ? "bg-amber-50 dark:bg-amber-950 text-amber-600 dark:text-amber-400" : "bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400"}`}><step.icon size={19} /></span><div><h3 className="text-xs font-bold">{step.title}</h3><p className="mt-1 text-xs leading-6 text-slate-500 dark:text-slate-400">{step.text}</p></div></div>)}</div>
    </div>
    <div className="mt-12 grid gap-5 md:grid-cols-3">{environments.map(environment => <Link key={environment.href} href={environment.href} aria-label={environment.action} className="group flex flex-col rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-6 transition-all hover:-translate-y-1 hover:border-blue-300 hover:shadow-md"><div className="mb-5 flex items-center justify-between"><span className="rounded-xl bg-slate-50 dark:bg-slate-950 p-3 text-blue-600 dark:text-blue-400"><environment.icon size={23} /></span><ArrowUpRight size={19} className="text-slate-300 group-hover:text-blue-600" /></div><p className="text-[10px] font-semibold tracking-[0.1em] text-slate-400">{environment.eyebrow}</p><h2 className="mt-2 text-xl font-bold tracking-tight">{environment.title}</h2><p className="mb-5 mt-2 text-xs leading-6 text-slate-500 dark:text-slate-400">{environment.text}</p><p className="mt-auto flex items-center gap-2 text-xs font-semibold text-blue-600 dark:text-blue-400">{environment.action}<ArrowRight size={14} /></p></Link>)}</div>
    <p className="mt-8 flex items-start gap-2 text-[11px] leading-6 text-slate-400"><LockKeyhole size={14} className="mt-1 shrink-0" />A investigação é interna. O atendente decide sobre cada ação. Chamados, processos e artigos ficam salvos no banco local e continuam disponíveis ao recarregar.</p>
  </div>;
}
