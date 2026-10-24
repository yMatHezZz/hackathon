import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
const backgrounds = { white: "slate-900", "slate-50": "slate-950", "slate-100": "slate-800", "slate-200": "slate-700", "blue-50": "blue-950", "blue-100": "blue-900", "amber-50": "amber-950", "amber-100": "amber-900", "emerald-50": "emerald-950", "emerald-100": "emerald-900", "rose-50": "rose-950", "rose-100": "rose-900", "yellow-50": "yellow-950" };
const foregrounds = { "slate-950": "slate-50", "slate-900": "slate-100", "slate-800": "slate-100", "slate-700": "slate-200", "slate-600": "slate-300", "slate-500": "slate-400", "blue-900": "blue-100", "blue-800": "blue-200", "blue-700": "blue-300", "blue-600": "blue-400", "amber-900": "amber-100", "amber-800": "amber-200", "amber-700": "amber-300", "amber-600": "amber-400", "emerald-700": "emerald-300", "emerald-600": "emerald-400", "rose-800": "rose-200", "rose-700": "rose-300", "rose-600": "rose-400" };
function walk(folder) {
  for (const entry of readdirSync(folder, { withFileTypes: true })) {
    const filename = join(folder, entry.name);
    if (entry.isDirectory()) { walk(filename); continue; }
    if (!/\.tsx$/.test(filename)) continue;
    let content = readFileSync(filename, "utf8");
    content = content.replace(/(?<![\w:-])((?:hover:|focus:|disabled:|placeholder:)?)((?:bg|text|border|ring)-)(white|(?:slate|blue|amber|emerald|rose|yellow)-(?:50|100|200|300|400|500|600|700|800|900|950))(\/\d+)?(?=[\s"'`}$])/g, (all, prefix, kind, color, opacity = "", offset, original) => {
      if (original.slice(offset + all.length).startsWith(` dark:${prefix}`)) return all;
      const next = kind === "bg-" ? backgrounds[color] : kind === "text-" ? foregrounds[color] : color === "slate-200" || color === "slate-100" ? "slate-700" : color.endsWith("-200") || color.endsWith("-100") ? color.replace(/-(?:100|200)$/, "-800") : undefined;
      return next ? `${all} dark:${prefix}${kind}${next}${opacity}` : all;
    });
    content = content.replace(/bg-\[#f5f7fa\](?! dark:)/g, "bg-[#f5f7fa] dark:bg-[#0b1120]").replace(/bg-\[#fcfdff\](?! dark:)/g, "bg-[#fcfdff] dark:bg-slate-950");
    writeFileSync(filename, content);
  }
}
walk("src");
