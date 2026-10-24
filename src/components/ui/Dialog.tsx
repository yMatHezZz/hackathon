"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { X } from "lucide-react";

export function Dialog({ title, closeLabel = "Fechar", onClose, children }: {
  title: string;
  closeLabel?: string;
  onClose: () => void;
  children: ReactNode;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => { dialog.current?.showModal(); }, []);
  return <dialog ref={dialog} onCancel={onClose} onClose={onClose} aria-label={title}
    className="fixed inset-0 m-auto max-h-[90dvh] w-[640px] max-w-[calc(100vw-32px)] overflow-y-auto rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-0 text-slate-800 dark:text-slate-100 shadow-2xl backdrop:bg-slate-900/35">
    <div className="sticky top-0 z-10 flex items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-6 py-4">
      <h2 className="text-lg font-bold tracking-tight">{title}</h2>
      <button type="button" onClick={onClose} aria-label={closeLabel} className="rounded-lg p-2 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"><X size={18} /></button>
    </div>
    <div className="p-6">{children}</div>
  </dialog>;
}
