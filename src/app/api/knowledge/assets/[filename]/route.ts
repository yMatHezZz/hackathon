import { readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { assertLocalRequest } from "@/lib/server/http";
export const runtime = "nodejs";
export async function GET(request: Request, context: { params: Promise<{ filename: string }> }) {
  try {
    assertLocalRequest(request);
    const { filename } = await context.params;
    if (!/^[a-f0-9]{64}\.(png|jpg|jpeg)$/.test(filename)) return new Response("Imagem não encontrada.", { status: 404 });
    const file = join(process.cwd(), "data/playbook/assets", filename);
    if (statSync(file).size > 10000000) return new Response("Imagem acima do limite.", { status: 413 });
    return new Response(readFileSync(file), { headers: { "Content-Type": filename.endsWith(".png") ? "image/png" : "image/jpeg", "Cache-Control": "private, max-age=86400", "X-Content-Type-Options": "nosniff" } });
  } catch { return new Response("Imagem indisponível.", { status: 404 }); }
}
