import "@/utils/scripts/load-next-env";

import { runDataCollectingV2 } from "@/lib/data-collecting-v2";
import { acknowledgeIfoodEvents, createIfoodClient, getValidIfoodConfig, pollIfoodEvents } from "@/lib/data-connectors/ifood";
import type { TIfoodConfig } from "@/lib/data-connectors/ifood/types";
import { connection, db } from "@/services/drizzle";
import { organizations } from "@/services/drizzle/schema";
import dayjs from "dayjs";
import { eq } from "drizzle-orm";

const DEFAULT_ORGANIZATION_ID = "59c2b238-bc21-4710-b47b-db6e2a380079";
const DEFAULT_INTERVAL_SECONDS = 30;

function getArgValue(name: string) {
	const prefix = `--${name}=`;
	const arg = process.argv.find((value) => value.startsWith(prefix));
	return arg ? arg.slice(prefix.length) : null;
}

function hasFlag(name: string) {
	return process.argv.includes(`--${name}`);
}

function printHelp() {
	console.log(`
Mantém o aplicativo ONLINE no iFood fazendo polling de eventos a cada ${DEFAULT_INTERVAL_SECONDS}s (requisito de presença/homologação).

Uso:
  npm run ifood:homologation-polling -- [--org=<organizationId>] [--interval=<segundos>] [--no-ack] [--collect]

Opções:
  --org         ID da organização conectada ao iFood. Padrão: ${DEFAULT_ORGANIZATION_ID}
  --interval    Intervalo entre pollings em segundos. Padrão: ${DEFAULT_INTERVAL_SECONDS} (recomendado pelo iFood).
  --no-ack      Não envia acknowledgment dos eventos recebidos (deixa os eventos para o pipeline normal).
  --collect     Em vez de só polling+ACK, roda o pipeline completo de ingestão (runDataCollectingV2)
                a cada iteração — os pedidos entram no banco e aparecem no painel de pedidos em ~30s.
                Use este modo durante a homologação das etapas de pedido.

Encerre com Ctrl+C.
`);
}

async function getConfigFromOrganization(organizationId: string): Promise<TIfoodConfig> {
	const organization = await db.query.organizations.findFirst({
		where: eq(organizations.id, organizationId),
		columns: {
			integracaoTipo: true,
			integracaoConfiguracao: true,
		},
	});

	if (!organization) throw new Error(`Organização não encontrada: ${organizationId}`);
	if (organization.integracaoTipo !== "IFOOD") throw new Error(`Organização não está conectada ao iFood: ${organizationId}`);
	if (!organization.integracaoConfiguracao || organization.integracaoConfiguracao.tipo !== "IFOOD") {
		throw new Error(`Configuração iFood inválida para organização: ${organizationId}`);
	}

	return organization.integracaoConfiguracao;
}

function sleep(milliseconds: number) {
	return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

let shouldStop = false;

async function runPollingLoop({
	organizationId,
	intervalSeconds,
	sendAck,
	collect,
}: {
	organizationId: string;
	intervalSeconds: number;
	sendAck: boolean;
	collect: boolean;
}) {
	let iteration = 0;

	while (!shouldStop) {
		iteration += 1;
		const startedAt = dayjs();

		try {
			if (collect) {
				// Pipeline completo: o polling acontece dentro do fetch do data-connector (mantém a
				// presença no iFood) e os pedidos são gravados/ACKados pelo fluxo canônico.
				const result = await runDataCollectingV2({ organizationIds: [organizationId] });
				console.log(`[IFOOD_HOMOLOGATION_POLLING] #${iteration} ${startedAt.format("HH:mm:ss")} (collect)`, {
					summaries: result.summaries.length,
					errors: result.errors.length,
				});
				if (result.errors.length) console.error("[IFOOD_HOMOLOGATION_POLLING] Erros na ingestão", result.errors);
			} else {
				const config = await getConfigFromOrganization(organizationId);
				const validConfig = await getValidIfoodConfig({ organizationId, config });
				const client = createIfoodClient(validConfig);
				const events = await pollIfoodEvents(client, { merchantIds: validConfig.merchantIds });

				if (events.length && sendAck)
					await acknowledgeIfoodEvents(
						client,
						events.map((event) => event.id),
					);

				console.log(`[IFOOD_HOMOLOGATION_POLLING] #${iteration} ${startedAt.format("HH:mm:ss")}`, {
					merchantIds: validConfig.merchantIds,
					events: events.length,
					acknowledged: sendAck ? events.length : 0,
					codes: events.map((event) => event.fullCode ?? event.code),
				});
			}
		} catch (error) {
			const axiosDetails =
				error && typeof error === "object" && "isAxiosError" in error
					? {
							status: (error as { response?: { status?: number } }).response?.status,
							data: (error as { response?: { data?: unknown } }).response?.data,
						}
					: null;
			console.error(`[IFOOD_HOMOLOGATION_POLLING] #${iteration} falhou`, axiosDetails ?? error);
		}

		const elapsedMilliseconds = dayjs().diff(startedAt, "milliseconds");
		const waitMilliseconds = Math.max(intervalSeconds * 1000 - elapsedMilliseconds, 0);
		if (!shouldStop && waitMilliseconds > 0) await sleep(waitMilliseconds);
	}
}

async function main() {
	if (hasFlag("help")) {
		printHelp();
		return;
	}

	const organizationId = getArgValue("org") ?? process.env.IFOOD_TEST_ORGANIZATION_ID ?? DEFAULT_ORGANIZATION_ID;
	const intervalSeconds = Number(getArgValue("interval") ?? DEFAULT_INTERVAL_SECONDS);
	if (!Number.isFinite(intervalSeconds) || intervalSeconds < 5) throw new Error(`Intervalo inválido: ${getArgValue("interval")}`);
	const sendAck = !hasFlag("no-ack");
	const collect = hasFlag("collect");

	console.log("[IFOOD_HOMOLOGATION_POLLING] Iniciando polling contínuo", { organizationId, intervalSeconds, sendAck, collect });
	console.log("[IFOOD_HOMOLOGATION_POLLING] O aplicativo fica ONLINE no iFood enquanto este script estiver rodando. Encerre com Ctrl+C.");

	process.on("SIGINT", () => {
		console.log("\n[IFOOD_HOMOLOGATION_POLLING] Encerrando após a iteração atual...");
		shouldStop = true;
	});

	await runPollingLoop({ organizationId, intervalSeconds, sendAck, collect });
}

main()
	.catch((error) => {
		console.error("[IFOOD_HOMOLOGATION_POLLING] Falha no polling de homologação.");
		console.error(error);
		process.exitCode = 1;
	})
	.finally(async () => {
		await connection.end();
	});
