import { test, expect, type Page } from "@playwright/test";
import { DatabaseSync } from "node:sqlite";
import { resolve, sep } from "node:path";
import { HubRepository } from "../../src/lib/server/repository";
import { initialProcesses } from "../../src/lib/demo-data";

test.beforeEach(() => {
  const filename = resolve(process.env.ZENITH_DB_PATH!);
  const root = resolve(process.cwd(), "artifacts", "e2e") + sep;
  if (!filename.startsWith(root)) throw new Error("Os testes só podem preparar bancos dentro de artifacts/e2e.");
  new HubRepository(filename).close();
  const db = new DatabaseSync(filename);
  db.exec("PRAGMA busy_timeout=5000; BEGIN IMMEDIATE; DELETE FROM messages; DELETE FROM tickets; DELETE FROM knowledge; DELETE FROM process_protocols; DELETE FROM processes; UPDATE hub_meta SET revision=revision+1 WHERE id=1;");
  for (const process of initialProcesses) db.prepare("INSERT INTO processes(id,payload) VALUES (?,?)").run(process.id, JSON.stringify(process));
  db.exec("COMMIT"); db.close();
});

async function openTicket(page: Page) {
  await page.goto("/requerente");
  await page.getByRole("button", { name: "Ajuda", exact: true }).click();
  await page.getByLabel("Nome completo").fill("Ana Demonstração");
  await page.getByLabel("E-mail").fill("ana@example.com");
  await page.getByLabel("Prefeitura / Conta").fill("Prefeitura Modelo");

  await page.getByLabel("Descrição do impedimento").fill("Alvará 001 bloqueado ao enviar documentos. Preciso de ajuda para continuar.");
  await page.getByRole("button", { name: "Abrir chamado", exact: true }).click();
  await expect(page.getByText("O chamado foi aberto e a equipe técnica já está analisando.", { exact: false })).toBeVisible();
}

test("fluxo completo, nota interna isolada e processo atualizado", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  await openTicket(page);
  await expect(page.getByText("Investigação inicial automática", { exact: false })).toHaveCount(0);
  await page.getByRole("button", { name: "Fechar ajuda" }).click();
  await page.getByRole("link", { name: "Abrir suporte", exact: true }).click();
  if (!page.url().includes("/support/chamados")) await page.getByRole("link", { name: "Chamados", exact: true }).click();
  await expect(page.getByText("Nenhum chamado selecionado")).toBeVisible();
  await page.getByRole("button").filter({ hasText: "Ana Demonstração" }).click();
  await expect(page.getByRole("heading", { name: "Investigação inicial automática", exact: true })).toBeVisible();
  const panel = page.getByLabel("Assistente de IA");
  const commandButton = page.getByRole("button", { name: "Executar comando" });
  const panelBox = await panel.locator("..").boundingBox();
  const buttonBox = await commandButton.boundingBox();
  expect(buttonBox!.y + buttonBox!.height).toBeLessThanOrEqual(panelBox!.y + panelBox!.height + 1);
  await expect(page.getByLabel("Status do chamado")).toHaveValue("Aberto");
  await page.getByLabel("Comando para a IA").fill("Não desbloquear Alvará 001");
  await page.getByRole("button", { name: "Executar comando" }).click();
  await expect(page.getByText("Comando não reconhecido.", { exact: false })).toBeVisible();
  await page.getByLabel("Comando para a IA").fill("Desbloquear Alvará 001");
  await page.getByRole("button", { name: "Executar comando" }).click();
  await expect(page.getByText("Ação executada: Alvará 001 desbloqueado pela IA").first()).toBeVisible();
  await expect(page.getByLabel("Status do chamado")).toHaveValue("Aberto");
  await page.getByLabel("Resposta ao solicitante").fill("Processo liberado para análise. Pode continuar o envio.");
  await page.getByRole("button", { name: "Enviar resposta" }).click();
  await page.getByRole("link", { name: "Abrir requerente", exact: true }).click();
  const process = page.getByRole("row").filter({ hasText: "Alvará 001" });
  await expect(process).toBeVisible();
  await expect(page.getByRole("columnheader", { name: "Status", exact: true })).toHaveCount(0);
  await page.getByRole("button", { name: "Ajuda", exact: true }).click();
  await expect(page.getByText("Processo liberado para análise. Pode continuar o envio.")).toBeVisible();
  await expect(page.getByText("Nota interna", { exact: false })).toHaveCount(0);
  expect(errors).toEqual([]);
});

test("CSV ausente usa fallback e busca vazia funciona", async ({ page }) => {
  await page.route("**/tickets_suporte_150_balanceado.csv", route => route.fulfill({ status: 404, body: "Not found" }));
  await page.goto("/support/chamados");
  await expect(page.getByText("CSV indisponível ou inválido.", { exact: false })).toBeVisible();
  await expect(page.getByRole("button").filter({ hasText: "Marina Demo" })).toBeVisible();
  await page.getByRole("textbox", { name: "Buscar chamados" }).fill("não existe xyz");
  await expect(page.getByText("Nenhum chamado encontrado")).toBeVisible();
});

test("CSV malformado não quebra inicialização", async ({ page }) => {
  await page.route("**/tickets_suporte_150_balanceado.csv", route => route.fulfill({ status: 200, body: 'id,assunto\n1,"quebrado' }));
  await page.goto("/support/chamados");
  await expect(page.getByText("CSV indisponível ou inválido.", { exact: false })).toBeVisible();
  if (!page.url().includes("/support/chamados")) await page.getByRole("link", { name: "Chamados", exact: true }).click();
  await expect(page.getByText("Nenhum chamado selecionado")).toBeVisible();
});

test("mobile, formulário inválido e foco do diálogo por teclado", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/requerente");
  const help = page.getByRole("button", { name: "Ajuda", exact: true });
  await help.click();
  await page.getByRole("button", { name: "Abrir chamado", exact: true }).click();
  await expect(page.getByLabel("Nome completo")).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await expect(help).toBeFocused();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.getByRole("link", { name: "Abrir suporte", exact: true }).click();
  if (!page.url().includes("/support/chamados")) await page.getByRole("link", { name: "Chamados", exact: true }).click();
  await expect(page.getByText("Nenhum chamado selecionado")).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});

test("prefeitura edita processo, solicita suporte e consulta histórico próprio sem chat", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.goto("/prefeitura");
  await expect(page.getByRole("button", { name: "Ajuda", exact: true })).toHaveCount(0);
  await page.getByRole("button", { name: "Ver detalhes de Alvará 001" }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.getByLabel("Endereço do estabelecimento").fill("Rua Nova Demonstração, 321");
  await page.getByLabel("Atividade / Finalidade").fill("Comércio de livros e café");
  await page.getByRole("button", { name: "Salvar informações" }).click();
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await expect(page.getByRole("columnheader", { name: "Status", exact: true })).toHaveCount(0);
  await page.getByRole("button", { name: "Ver detalhes de Alvará 001" }).click();
  await expect(page.getByLabel("Endereço do estabelecimento")).toHaveValue("Rua Nova Demonstração, 321");
  await page.getByRole("button", { name: "Fechar detalhes" }).click();
  await page.getByRole("link", { name: "Histórico de suporte", exact: true }).click();
  await expect(page.getByText("Nenhuma solicitação de suporte ainda")).toBeVisible();
  await page.getByRole("link", { name: "Abrir suporte", exact: true }).click();
  await expect(page).toHaveURL(/\/prefeitura\/suporte\/novo$/);
  await page.getByLabel("Título").fill("Bloqueio municipal do Alvará 001");
  await page.getByLabel("Descrição detalhada do problema").fill("Alvará 001 bloqueado ao enviar documentos após revisão das informações do estabelecimento.");
  await page.getByLabel("Processo relacionado").selectOption("001");
  await page.getByRole("button", { name: "Solicitar", exact: true }).click();
  await expect(page).toHaveURL(/\/prefeitura\/suporte$/);
  await expect(page.getByRole("heading", { name: "Bloqueio municipal do Alvará 001", exact: true })).toBeVisible();
  await expect(page.getByText("Investigação inicial automática", { exact: false })).toHaveCount(0);
  await expect(page.getByRole("textbox")).toHaveCount(0);
  await page.getByRole("link", { name: "Abrir Nolyp Hub", exact: true }).click();
  await page.getByRole("link", { name: "Chamados", exact: true }).click();
  await page.getByRole("button").filter({ hasText: "Bloqueio municipal do Alvará 001" }).click();
  await expect(page.getByRole("heading", { name: "Investigação inicial automática", exact: true })).toBeVisible();
  await expect(page.getByText("Canal:", { exact: true }).locator("..")).toContainText("Formulário");
  await expect(page.getByText(/tipo (da|de) conta/i)).toHaveCount(0);
  await page.getByLabel("Comando para a IA").fill("Desbloquear Alvará 001");
  await page.getByRole("button", { name: "Executar comando" }).click();
  await expect(page.getByText("Ação executada: Alvará 001 desbloqueado pela IA").first()).toBeVisible();
  await page.getByLabel("Resposta ao solicitante").fill("Liberação concluída. Continue a análise do processo.");
  await page.getByRole("button", { name: "Enviar resposta" }).click();
  await page.getByRole("link", { name: "Abrir prefeitura", exact: true }).click();
  await expect(page.getByRole("row").filter({ hasText: "Alvará 001" })).toBeVisible();
  await page.getByRole("link", { name: "Histórico de suporte", exact: true }).click();
  await expect(page.getByText("Liberação concluída. Continue a análise do processo.")).toBeVisible();
  await page.getByRole("link", { name: "Início Nolyp", exact: true }).click();
  await page.getByRole("link", { name: "Entrar como requerente", exact: true }).click();
  await page.getByRole("link", { name: "Preencher Alvará 001", exact: true }).click();
  await expect(page.getByLabel("Endereço do estabelecimento")).toHaveValue("Rua Nova Demonstração, 321");
  await expect(page.getByRole("button", { name: "Salvar informações" })).toBeVisible();
  await page.getByRole("link", { name: "Voltar aos processos", exact: true }).click();
  await page.getByRole("button", { name: "Ajuda", exact: true }).click();
  await expect(page.getByLabel("Nome completo")).toBeVisible();
  expect(errors).toEqual([]);
});

test("ticket de chat não aparece no histórico municipal e o formulário municipal é responsivo", async ({ page }) => {
  await openTicket(page);
  await page.getByRole("button", { name: "Fechar ajuda" }).click();
  await page.getByRole("link", { name: "Início Nolyp", exact: true }).click();
  await page.getByRole("link", { name: "Entrar como analista", exact: true }).click();
  await page.getByRole("link", { name: "Histórico de suporte", exact: true }).click();
  await expect(page.getByRole("button").filter({ hasText: "Preciso de ajuda para continuar." })).toHaveCount(0);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole("link", { name: "Abrir suporte", exact: true }).click();
  await page.getByRole("button", { name: "Solicitar", exact: true }).click();
  await expect(page.getByLabel("Título", { exact: true })).toBeFocused();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await expect(page.getByRole("button", { name: "Ajuda", exact: true })).toHaveCount(0);
});

test("histórico municipal e prioridade sobrevivem à recarga", async ({ page }) => {
  await page.goto("/prefeitura/suporte/novo");
  await page.getByLabel("Título", { exact: true }).fill("Persistência do Alvará 001");
  await page.getByLabel("Descrição detalhada do problema").fill("Alvará 001 bloqueado ao enviar documentos, preciso registrar o histórico no banco.");
  await page.getByLabel("Processo relacionado").selectOption("001");
  await page.getByLabel("Prioridade", { exact: true }).selectOption("Alta");
  await page.getByRole("button", { name: "Solicitar", exact: true }).click();
  await expect(page).toHaveURL(/\/prefeitura\/suporte$/);
  await page.reload();
  await expect(page.getByRole("heading", { name: "Persistência do Alvará 001", exact: true })).toBeVisible();
  await expect(page.getByText("camila.analista@example.com")).toBeVisible();
  await page.getByRole("link", { name: "Abrir Nolyp Hub", exact: true }).click();
  await page.getByRole("link", { name: "Chamados", exact: true }).click();
  await page.getByRole("button").filter({ hasText: "Persistência do Alvará 001" }).click();
  await expect(page.getByLabel("Prioridade do chamado")).toHaveValue("Alta");
  await expect(page.getByText("Approve · Prefeitura", { exact: true }).last()).toBeVisible();
  await page.getByLabel("Prioridade do chamado").selectOption("Urgente");
  await expect(page.getByLabel("Prioridade do chamado")).toBeEnabled();
  await page.reload();
  await page.getByRole("button").filter({ hasText: "Persistência do Alvará 001" }).click();
  await expect(page.getByLabel("Prioridade do chamado")).toHaveValue("Urgente");
});

test("base de conhecimento salva artigos e orienta novas investigações", async ({ page }) => {
  await page.goto("/support/conhecimento");
  await page.getByRole("button", { name: "Novo artigo" }).click();
  await page.getByLabel("Título do artigo").fill("Alvará bloqueado por cadastro pendente");
  await page.getByLabel("Etiquetas (separadas por vírgula)").fill("alvará, bloqueado, documentos");
  await page.getByLabel("Conteúdo e orientações").fill("Conferir o comprovante cadastral sintético ZENITH-BASE antes de liberar o envio de documentos do alvará.");
  await page.getByRole("button", { name: "Salvar artigo" }).click();
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await page.reload();
  await expect(page.getByRole("heading", { name: "Alvará bloqueado por cadastro pendente", exact: true })).toBeVisible();
  await openTicket(page);
  await page.getByRole("button", { name: "Fechar ajuda" }).click();
  await page.getByRole("link", { name: "Abrir suporte", exact: true }).click();
  await page.getByRole("link", { name: "Chamados", exact: true }).click();
  await page.getByRole("button").filter({ hasText: "Ana Demonstração" }).click();
  await expect(page.getByRole("heading", { name: "Investigação inicial automática", exact: true })).toBeVisible();
  await expect(page.locator(".internal-markdown")).toContainText("ZENITH-BASE");
  await expect(page.getByLabel("Status do chamado")).toHaveValue("Aberto");
  await page.getByRole("button", { name: "Gerar resposta sugerida" }).click();
  await page.getByRole("button", { name: "Usar no editor de resposta" }).click();
  await expect(page.getByLabel("Resposta ao solicitante")).toHaveValue(/ZENITH-BASE/);
  await page.getByRole("link", { name: "Base de conhecimento", exact: true }).click();
  await page.getByRole("button", { name: "Editar artigo" }).click();
  await page.getByLabel("Disponível para a IA").uncheck();
  await page.getByRole("button", { name: "Salvar artigo" }).click();
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await expect(page.getByText("Inativo", { exact: true })).toBeVisible();
});

test("protocolar mantém o modelo disponível, registra solicitação e preserva o suporte na página", async ({ page }) => {
  await page.goto("/requerente");
  await page.getByRole("tab", { name: "Protocolados", exact: true }).click();
  await expect(page.getByText("Nenhum processo encontrado.")).toBeVisible();
  await page.getByRole("tab", { name: "Disponíveis para protocolar", exact: true }).click();
  await page.getByRole("link", { name: "Preencher Alvará 001", exact: true }).click();
  await expect(page).toHaveURL(/\/requerente\/processos\/001$/);
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page.getByRole("button", { name: "Ajuda", exact: true }).click();
  await expect(page.getByLabel("Descrição do impedimento")).toBeVisible();
  await page.getByRole("button", { name: "Fechar ajuda" }).click();
  await page.getByRole("button", { name: "Protocolar solicitação" }).click();
  await expect(page.getByText("Solicitação protocolada", { exact: true })).toBeVisible();
  await expect(page).toHaveURL(/\/requerente\/processos\/PRC-/);
  await page.reload();
  await expect(page.getByText("Solicitação protocolada", { exact: true })).toBeVisible();
  await page.getByRole("link", { name: "Voltar aos processos", exact: true }).click();
  await expect(page.getByRole("tab", { name: "Protocolados", exact: true })).toHaveAttribute("aria-selected", "true");
  await expect(page.getByRole("link", { name: "Consultar Alvará 001", exact: true })).toBeVisible();
  await page.getByRole("tab", { name: "Disponíveis para protocolar", exact: true }).click();
  await expect(page.getByRole("link", { name: "Preencher Alvará 001", exact: true })).toBeVisible();
});

test("tema escuro acompanha todos os ambientes e sobrevive à recarga", async ({ page }) => {
  await page.goto("/requerente");
  await page.getByRole("button", { name: "Ativar tema escuro" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  for (const route of ["/prefeitura", "/prefeitura/suporte/novo", "/support/chamados", "/support/conhecimento", "/requerente/processos/001"]) {
    await page.goto(route);
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
    const colors = await page.getByRole("banner").evaluate(element => {
      const canvas = document.createElement("canvas"); canvas.width = canvas.height = 1;
      const context = canvas.getContext("2d")!;
      const rgb = (color: string) => { context.fillStyle = color; context.fillRect(0, 0, 1, 1); return Array.from(context.getImageData(0, 0, 1, 1).data).slice(0, 3); };
      const styles = getComputedStyle(element);
      return { background: rgb(styles.backgroundColor), foreground: rgb(styles.color) };
    });
    expect(Math.max(...colors.background)).toBeLessThan(70);
    expect(Math.min(...colors.foreground)).toBeGreaterThan(150);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  }
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await page.getByRole("button", { name: "Ativar tema claro" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
});

test("falha na gravação mantém formulário e não inventa sucesso", async ({ page }) => {
  await page.route("**/api/tickets", route => route.fulfill({ status: 503, contentType: "application/json", body: JSON.stringify({ error: "Banco temporariamente indisponível." }) }));
  await page.goto("/prefeitura/suporte/novo");
  await page.getByLabel("Título", { exact: true }).fill("Falha de gravação controlada");
  await page.getByLabel("Descrição detalhada do problema").fill("Teste fictício de indisponibilidade do banco de dados ao registrar uma solicitação.");
  await page.getByLabel("Processo relacionado").selectOption("001");
  await page.getByRole("button", { name: "Solicitar", exact: true }).click();
  await expect(page.getByText("Banco temporariamente indisponível.").last()).toBeVisible();
  await expect(page).toHaveURL(/\/prefeitura\/suporte\/novo$/);
  await expect(page.getByLabel("Título", { exact: true })).toHaveValue("Falha de gravação controlada");
});

test("portais exibem processos sem status e acesso aos ambientes somente pelo header", async ({ page }) => {
  for (const route of ["/requerente", "/prefeitura"]) {
    await page.goto(route);
    await expect(page.getByRole("navigation").getByRole("link", { name: "Portal do requerente" })).toHaveCount(0);
    await expect(page.getByRole("navigation").getByRole("link", { name: "Portal da prefeitura" })).toHaveCount(0);
    await expect(page.getByRole("banner").getByRole("link", { name: "Abrir requerente", exact: true })).toBeVisible();
    await expect(page.getByRole("banner").getByRole("link", { name: "Abrir prefeitura", exact: true })).toBeVisible();
    await expect(page.getByRole("columnheader", { name: "Status", exact: true })).toHaveCount(0);
    await expect(page.getByLabel("Filtrar processos por status")).toHaveCount(0);
    await expect(page.getByText("Bloqueados", { exact: true })).toHaveCount(0);
    if (route === "/requerente") {
      await page.getByRole("link", { name: "Preencher Alvará 001", exact: true }).click();
      await expect(page).toHaveURL(/\/requerente\/processos\/001$/);
      continue;
    }
    await page.getByRole("button", { name: "Ver detalhes de Alvará 001" }).click();
    await expect(page.getByRole("dialog").getByText("Bloqueado", { exact: true })).toHaveCount(0);
    await page.getByRole("button", { name: "Fechar detalhes" }).click();
  }
});

test("requerente preenche modelo de alvará e recupera as cinco seções após recarregar", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/requerente");
  await page.getByRole("link", { name: "Preencher Alvará 001", exact: true }).click();
  const dialog = page.getByRole("main");
  for (const title of ["Dados do requerente", "Tipo da solicitação", "Dados do imóvel", "Documentos complementares", "Taxas"]) {
    await expect(dialog.getByRole("group", { name: new RegExp(title) })).toBeVisible();
  }
  await page.getByLabel("E-mail do requerente").fill("requerente@example.com");
  await page.getByLabel("CPF / CNPJ ou identificação").fill("DEMO-001");
  await page.getByLabel("Tipo da solicitação", { exact: true }).selectOption("Renovação");
  await page.getByLabel("Inscrição imobiliária / Matrícula").fill("IMOVEL-DEMO-321");
  await page.getByLabel("Área do imóvel (m²)").fill("180.50");
  await page.getByLabel("Descrição e referência dos documentos").fill("Planta demonstrativa, referência DEMO-PLANTA-001.");
  await page.getByLabel("Valor informado (R$)").fill("125.90");
  await page.getByLabel("Número da guia / Referência").fill("GUIA-DEMO-001");
  await page.getByLabel("Vencimento informado").fill("2026-12-10");
  await page.getByRole("button", { name: "Salvar informações" }).click();
  await expect(page.getByText("Rascunho salvo no banco local.")).toBeVisible();
  await page.reload();
  await expect(page.getByLabel("E-mail do requerente")).toHaveValue("requerente@example.com");
  await expect(page.getByLabel("Tipo da solicitação", { exact: true })).toHaveValue("Renovação");
  await expect(page.getByLabel("Inscrição imobiliária / Matrícula")).toHaveValue("IMOVEL-DEMO-321");
  await expect(page.getByLabel("Descrição e referência dos documentos")).toHaveValue("Planta demonstrativa, referência DEMO-PLANTA-001.");
  await expect(page.getByLabel("Valor informado (R$)")).toHaveValue("125.90");
  await expect(page.getByLabel("Número da guia / Referência")).toHaveValue("GUIA-DEMO-001");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});
