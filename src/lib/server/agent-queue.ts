import { getRepository } from "./repository";
import { runAprovaAgent } from "./aprova-agent";
let running = false;
export function wakeResponseAgent() {
  if (running) return;
  running = true;
  setImmediate(async () => {
    let remaining = false;
    try {
      const repo = getRepository(); repo.enqueueEligibleAgentTickets();
      for (let index = 0; index < 10; index++) {
        const run = repo.claimAgentRun(); if (!run) break;
        remaining = index === 9;
        try { repo.completeAgentRun(run, await runAprovaAgent(repo.agentInputForRun(run))); }
        catch (error) { repo.failAgentRun(run, error instanceof Error ? error.message : "Não foi possível executar o agente."); }
      }
    } catch { /* A próxima consulta retoma a fila persistida após indisponibilidade do banco. */ }
    finally { running = false; if (remaining) setTimeout(wakeResponseAgent, 25); }
  });
}
