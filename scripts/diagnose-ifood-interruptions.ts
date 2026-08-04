import "@/utils/scripts/load-next-env";

import { IFOOD_MERCHANT_BASE_URL } from "@/lib/data-connectors/ifood/types";
import { resolveIfoodManagementContext } from "@/lib/integrations/ifood/context";
import { connection } from "@/services/drizzle";
import dayjs from "dayjs";

/**
 * Diagnóstico SOMENTE LEITURA das pausas programadas: imprime a string crua de `start`/`end` como o
 * iFood devolve, ao lado do status atual da loja.
 *
 * Existe para responder uma pergunta só: quando mandamos `...T19:00:00.000Z`, o iFood guarda o
 * instante UTC ou o wall-clock 19:00? A resposta decide se o bug está no envio ou na exibição.
 */

const DEFAULT_ORGANIZATION_ID = "59c2b238-bc21-4710-b47b-db6e2a380079";

function getArgValue(name: string) {
	const prefix = `--${name}=`;
	const arg = process.argv.find((value) => value.startsWith(prefix));
	return arg ? arg.slice(prefix.length) : null;
}

async function main() {
	const organizacaoId = getArgValue("org") ?? process.env.IFOOD_TEST_ORGANIZATION_ID ?? DEFAULT_ORGANIZATION_ID;
	const context = await resolveIfoodManagementContext({ organizacaoId });

	console.log("Agora:");
	console.log(`  UTC   ${dayjs().toISOString()}`);
	console.log(`  Local ${dayjs().format("YYYY-MM-DDTHH:mm:ss")} (offset ${dayjs().format("Z")})`);

	for (const merchantId of context.merchantIds) {
		console.log(`\n=== Loja ${merchantId} ===`);

		const interruptions = await context.client.get<unknown>(`${IFOOD_MERCHANT_BASE_URL}/merchants/${merchantId}/interruptions`);
		console.log("\n--- GET /interruptions (payload cru) ---");
		console.log(JSON.stringify(interruptions.data, null, 2));

		const status = await context.client.get<unknown>(`${IFOOD_MERCHANT_BASE_URL}/merchants/${merchantId}/status`);
		console.log("\n--- GET /status (resumo) ---");
		const operations = Array.isArray(status.data) ? (status.data as Record<string, unknown>[]) : [];
		for (const operation of operations) {
			console.log(`  ${operation.operation} · state=${operation.state} · available=${operation.available}`);
			const message = operation.message as Record<string, unknown> | null;
			if (message?.title) console.log(`    ↳ ${message.title}`);
		}
	}

	if (process.argv.includes("--cleanup")) {
		for (const merchantId of context.merchantIds) {
			const list = await context.client.get<Record<string, unknown>[]>(`${IFOOD_MERCHANT_BASE_URL}/merchants/${merchantId}/interruptions`);
			const residuo = (list.data ?? []).filter((item) => String(item.description ?? "").startsWith("[TESTE]"));
			for (const item of residuo) {
				try {
					await context.client.delete(`${IFOOD_MERCHANT_BASE_URL}/merchants/${merchantId}/interruptions/${item.id}`);
					console.log(`Removida: ${item.id} · ${item.description}`);
				} catch (error) {
					// `RecentlyCreatedInterruption`: o iFood recusa apagar uma pausa criada há pouco.
					console.warn(`Não removida ainda: ${item.id} · ${(error as { response?: { data?: { error?: { code?: string } } } })?.response?.data?.error?.code}`);
				}
			}
			if (!residuo.length) console.log(`Nenhum resíduo [TESTE] na loja ${merchantId}.`);
		}
	}

	if (process.argv.includes("--roundtrip")) {
		const merchantId = context.merchantIds[0];
		// Datada para amanhã de propósito: prova o formato sem fechar a loja em nenhum momento.
		const inicio = dayjs().add(1, "day").hour(16).minute(0).second(0).format("YYYY-MM-DDTHH:mm:ss");
		const fim = dayjs().add(1, "day").hour(16).minute(30).second(0).format("YYYY-MM-DDTHH:mm:ss");

		console.log(`\n=== Round-trip do formato (loja ${merchantId}) ===`);
		console.log(`Enviando  start=${inicio}  end=${fim}`);

		const created = await context.client.post<Record<string, unknown>>(`${IFOOD_MERCHANT_BASE_URL}/merchants/${merchantId}/interruptions`, {
			description: "[TESTE] round-trip de fuso",
			start: inicio,
			end: fim,
		});
		console.log("Resposta do POST:", JSON.stringify(created.data));

		const readBack = await context.client.get<Record<string, unknown>[]>(`${IFOOD_MERCHANT_BASE_URL}/merchants/${merchantId}/interruptions`);
		const found = (readBack.data ?? []).find((item) => item.id === created.data.id);
		console.log("Relido do GET :", JSON.stringify(found));

		const ok = found?.start === inicio && found?.end === fim;
		console.log(ok ? "\n✅ O wall-clock voltou idêntico — sem deslocamento de fuso." : "\n❌ O valor voltou diferente do enviado.");

		await context.client.delete(`${IFOOD_MERCHANT_BASE_URL}/merchants/${merchantId}/interruptions/${created.data.id}`);
		console.log("Pausa de teste removida.");
	}

	console.log(`
Como ler:
  Se um 'start' voltar como "...T19:00:00" (sem Z) e a loja estiver ABERTA agora às 16h,
  o iFood tratou o valor como horário LOCAL — o envio em UTC é o bug.
  Se voltar com Z/offset e a loja estiver FECHADA, o envio está certo e o bug é da exibição.
`);
}

main()
	.catch((error) => {
		console.error("Falha no diagnóstico.");
		console.error(error?.response?.data ?? error);
		process.exitCode = 1;
	})
	.finally(async () => {
		await connection.end();
	});
