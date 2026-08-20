import "dotenv/config";
import axios from "axios";

/**
 * Registro one-shot dos webhooks inbound da Spedy. Webhooks sao por CONTA (owner key), nao por
 * empresa: um unico endpoint recebe eventos de todas as organizacoes. Cada webhook assina
 * exatamente um evento, entao criamos um por evento. Idempotente: eventos ja registrados para a
 * mesma URL sao pulados.
 *
 * Uso: npx tsx ./scripts/register-spedy-webhooks.ts --host=https://app.recompracrm.com.br [--apply]
 * Requer SPEDY_OWNER_API_KEY e SPEDY_WEBHOOK_SECRET no ambiente.
 */

const INBOUND_EVENTS = ["inbound_invoice.detected", "inbound_invoice.completed", "inbound_invoice.event"];

type TSpedyWebhook = { id?: string; event?: string; url?: string; enabled?: boolean };

async function main() {
	const apply = process.argv.includes("--apply");
	const hostArg = process.argv.find((arg) => arg.startsWith("--host="))?.slice("--host=".length);
	const apiKey = process.env.SPEDY_OWNER_API_KEY;
	const secret = process.env.SPEDY_WEBHOOK_SECRET;

	if (!hostArg) throw new Error("Informe --host=https://<host da aplicacao>.");
	if (!apiKey) throw new Error("SPEDY_OWNER_API_KEY nao configurada.");
	if (!secret) throw new Error("SPEDY_WEBHOOK_SECRET nao configurada.");

	const webhookUrl = `${hostArg.replace(/\/$/, "")}/api/webhooks/spedy?secret=${encodeURIComponent(secret)}`;
	const client = axios.create({
		baseURL: process.env.SPEDY_BASE_URL || "https://api.spedy.com.br",
		headers: { "X-Api-Key": apiKey, "Content-Type": "application/json" },
	});

	const { data: existing } = await client.get<TSpedyWebhook[]>("/v1/webhooks");
	console.log(`${existing.length} webhook(s) ja registrados na conta.`);

	for (const event of INBOUND_EVENTS) {
		const found = existing.find((webhook) => webhook.event === event && webhook.url === webhookUrl);
		if (found) {
			console.log(`- ${event}: ja registrado (${found.id}${found.enabled === false ? ", DESABILITADO" : ""}).`);
			continue;
		}
		if (!apply) {
			console.log(`- ${event}: a registrar. Execute novamente com --apply.`);
			continue;
		}
		const { data: created } = await client.post<TSpedyWebhook>("/v1/webhooks", { event, url: webhookUrl });
		console.log(`- ${event}: registrado (${created.id}).`);
	}
}

main().catch((error) => {
	if (axios.isAxiosError(error) && error.response?.data !== undefined) {
		console.error("Falha ao registrar webhooks da Spedy:", JSON.stringify(error.response.data, null, 2));
	} else {
		console.error("Falha ao registrar webhooks da Spedy:", error);
	}
	process.exitCode = 1;
});
