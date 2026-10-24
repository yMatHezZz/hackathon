export async function api<T>(url: string, method = "GET", body?: unknown, signal?: AbortSignal): Promise<T> {
  const response = await fetch(url, { method, cache: "no-store", signal: signal ?? AbortSignal.timeout(12000), headers: body === undefined ? undefined : { "Content-Type": "application/json" }, body: body === undefined ? undefined : JSON.stringify(body) });
  let data;
  try { data = await response.json(); } catch { throw new Error("O servidor não confirmou a gravação. Confira sua conexão e tente novamente."); }
  if (!response.ok) throw new Error(typeof data.error === "string" ? data.error : "Não foi possível concluir a operação no banco.");
  return data as T;
}
