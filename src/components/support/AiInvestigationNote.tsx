import ReactMarkdown from "react-markdown";
import { LockKeyhole, Sparkles } from "lucide-react";

const allowedElements = ["h2", "h3", "p", "ul", "li", "strong", "em", "code", "br"];
function section(content: string, number: number) {
  const heading = content.match(new RegExp(`^### ${number}\\.[^\\n]*\\n`, "m"));
  return heading ? content.slice(heading.index! + heading[0].length).split(/^### \d+\./m)[0].trim() : "";
}
export function AiInvestigationNote({ content }: { content: string }) {
  const hypothesis = section(content, 4);
  const nextAction = section(content, 5).split(/\r?\n\s*\r?\n/)[0];
  const body = content.replace(/^## [^\n]+\r?\n/, "");
  return <article aria-label="Análise interna da IA" className="fade-in rounded-xl border border-slate-200 border-l-[3px] border-l-amber-400 bg-white p-4 dark:border-slate-700 dark:border-l-amber-500 dark:bg-slate-900 sm:p-5">
    <div className="mb-4 flex flex-wrap items-center justify-between gap-2"><h3 className="flex items-center gap-2 text-xs font-semibold text-slate-800 dark:text-slate-100"><Sparkles size={15} className="text-amber-600 dark:text-amber-400" />Investigação inicial automática</h3><span className="flex items-center gap-1 rounded-md bg-amber-50 px-2 py-1 text-[9px] font-medium text-amber-800 dark:bg-amber-950 dark:text-amber-200"><LockKeyhole size={10} />Nota interna · IA simulada</span></div>
    {(hypothesis || nextAction) ? <><div className="space-y-4">{hypothesis && <div><p className="mb-1 text-[10px] font-semibold text-slate-400">Hipótese inicial</p><div className="text-xs leading-6 text-slate-600 dark:text-slate-300"><ReactMarkdown skipHtml allowedElements={["p", "strong", "em", "code"]} unwrapDisallowed>{hypothesis}</ReactMarkdown></div></div>}{nextAction && <div className="rounded-lg bg-slate-50 p-3 dark:bg-slate-950"><p className="mb-1 text-[10px] font-semibold text-slate-500 dark:text-slate-400">Próxima ação sugerida</p><div className="text-xs leading-6 text-slate-700 dark:text-slate-200"><ReactMarkdown skipHtml allowedElements={["p", "strong", "em", "code"]} unwrapDisallowed>{nextAction}</ReactMarkdown></div></div>}</div><details className="mt-4"><summary className="cursor-pointer text-[11px] font-medium text-slate-500 transition-colors hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100">Ver investigação completa</summary><div className="internal-markdown mt-4 border-t border-slate-100 pt-4 dark:border-slate-800"><ReactMarkdown skipHtml allowedElements={allowedElements} unwrapDisallowed>{body}</ReactMarkdown></div></details></> : <div className="internal-markdown"><ReactMarkdown skipHtml allowedElements={allowedElements} unwrapDisallowed>{body}</ReactMarkdown></div>}
  </article>;
}
