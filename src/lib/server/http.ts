import { readFileSync } from "node:fs";
import { join } from "node:path";
import { demoHistory } from "../demo-data";
import { parseTicketsCsv } from "../csv-loader";
import { getRepository } from "./repository";
import { AppError } from "./validation";
import type { HubSnapshot } from "../types";

export function snapshot(): HubSnapshot;
export function snapshot(since: number): HubSnapshot | { unchanged: true; revision: number };
export function snapshot(since?: number) {
  const repo = getRepository();
  let history = demoHistory;
  try { history = parseTicketsCsv(readFileSync(join(process.cwd(), "public/tickets_suporte_150_balanceado.csv"), "utf8")); } catch { /* O histórico fictício local mantém a triagem disponível. */ }
  repo.settleTriage(history);
  if (since !== undefined && repo.getRevision() === since) return { unchanged: true as const, revision: since };
  return repo.snapshot();
}
export async function readJson(request: Request, limit = 65536): Promise<unknown> {
  if (!request.headers.get("content-type")?.startsWith("application/json")) throw new AppError("Envie dados em JSON.", 415);
  if (Number(request.headers.get("content-length")) > limit) throw new AppError(`Dados acima de ${Math.floor(limit / 1024)} KB.`, 413);
  const reader = request.body?.getReader();
  if (!reader) throw new AppError("Corpo da solicitação ausente.");
  const chunks: Uint8Array[] = []; let length = 0;
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      length += value.byteLength;
      if (length > limit) { await reader.cancel(); throw new AppError(`Dados acima de ${Math.floor(limit / 1024)} KB.`, 413); }
      chunks.push(value);
    }
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch (error) { if (error instanceof AppError) throw error; throw new AppError("JSON inválido."); }
}
export function assertLocalRequest(request: Request) {
    const url = new URL(request.url);
    if (!["localhost", "127.0.0.1", "[::1]"].includes(url.hostname)) throw new AppError("Este MVP com banco local aceita apenas acesso por localhost.", 403);
    const origin = request.headers.get("origin");
    if ((origin && origin !== url.origin) || (request.method !== "GET" && origin !== url.origin)) throw new AppError("Origem da solicitação não permitida.", 403);
}
export async function respond(request: Request, action: () => unknown | Promise<unknown>, status = 200) {
  try {
    assertLocalRequest(request);
    return Response.json(await action(), { status, headers: { "Cache-Control": "no-store, private", "X-Content-Type-Options": "nosniff" } });
  } catch (error) {
    const known = error instanceof AppError;
    return Response.json({ error: known ? error.message : "Não foi possível acessar o banco. Tente novamente." }, { status: known ? error.status : 500, headers: { "Cache-Control": "no-store" } });
  }
}
