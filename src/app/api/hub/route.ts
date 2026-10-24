import { respond, snapshot } from "@/lib/server/http";
import { wakeResponseAgent } from "@/lib/server/agent-queue";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(request: Request) { return respond(request, () => {
  wakeResponseAgent();
  const raw = new URL(request.url).searchParams.get("since");
  return raw !== null && /^\d+$/.test(raw) ? snapshot(Number(raw)) : snapshot();
}); }
