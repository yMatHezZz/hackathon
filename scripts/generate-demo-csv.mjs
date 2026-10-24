import { mkdirSync, writeFileSync } from "node:fs";

// Histórico sintético: seis categorias com 25 exemplos cada. Nenhum dado real.
const categories = [
  ["Alvará bloqueado", "Alvará bloqueado ao enviar documentos; não é possível avançar para análise", "Permissão revisada pelo administrador; processo liberado para análise"],
  ["Acesso ao portal", "Erro de login e acesso à conta após atualização de cadastro", "Cadastro validado pelo administrador e acesso restabelecido"],
  ["Licença em análise", "Licença sem atualização de status após envio da documentação obrigatória", "Fila de análise revisada e documentação encaminhada à equipe responsável"],
  ["Upload de documentos", "Erro no upload de documento PDF por limite de tamanho do arquivo", "Arquivo convertido em PDF e reduzido conforme os limites do portal"],
  ["Permissão para editar", "Perfil sem permissão para editar dados do alvará e anexar documentos", "Administrador corrigiu o perfil e validou as permissões da conta"],
  ["Notificação por email", "Notificação de aprovação não recebida no email cadastrado na consulta", "Endereço demonstrativo revisado e notificação reenviada"],
];
const names = ["Marina Demo", "Carlos Exemplo", "Beatriz Teste", "Rafael Demo", "Luiza Exemplo"];
const cities = ["Prefeitura Modelo", "Prefeitura Exemplo", "Município Demonstração", "Prefeitura Horizonte", "Município Teste"];
const quote = value => `"${String(value).replaceAll('"', '""')}"`;
const rows = [["id", "assunto", "descricao", "solucao", "nome", "email", "prefeitura", "data_abertura", "status"]];
for (let i = 0; i < 150; i++) {
  const [subject, description, resolution] = categories[i % categories.length];
  rows.push([String(1001 + i), `${subject} • Protocolo ${String(i + 1).padStart(3, "0")}`, `${description}. Relato sintético ${i + 1} de ${cities[i % cities.length]}.`, resolution, names[i % names.length], `demo${i + 1}@example.com`, cities[i % cities.length], `2026-10-${String(1 + i % 23).padStart(2, "0")}T13:30:00Z`, "Resolvido"]);
}
mkdirSync(new URL("../public", import.meta.url), { recursive: true });
writeFileSync(new URL("../public/tickets_suporte_150_balanceado.csv", import.meta.url), "\uFEFF" + rows.map(row => row.map(quote).join(",")).join("\n") + "\n", "utf8");
console.log("CSV demonstrativo: 150 chamados fictícios, seis categorias balanceadas.");
