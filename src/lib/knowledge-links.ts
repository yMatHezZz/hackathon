export function pylonArticleUrl(value: unknown): string | null {
  if (typeof value !== "string" || value.length > 1000) return null;
  try { const url = new URL(value); return url.protocol === "https:" && url.hostname === "aprova.help.usepylon.com" && !url.username && !url.password && (!url.port || url.port === "443") && url.pathname.startsWith("/articles/") ? url.href : null; } catch { return null; }
}
