import "@/utils/scripts/load-next-env";

import { runArchivedEventProcessing } from "@/lib/external-events/archive";
import { processSpedyWebhookBody, resolveSpedyWebhookOrganizationId, type TSpedyWebhookBody } from "@/lib/fiscal/providers/spedy/webhook";
import { processGatewayWebhookBody, resolveGatewayWebhookOrganizationId, type TGatewayWebhookBody } from "@/lib/whatsapp/gateway-webhook-processing";
import { processMetaWebhookBody, resolveMetaWebhookOrganizationId, type TMetaWebhookBody } from "@/lib/whatsapp/webhook-processing";
import { ExternalEventSourceEnum, type TExternalEventSourceEnum } from "@/schemas/enums";
import { connection, db } from "@/services/drizzle";
import { type TExternalEventEntity, externalEvents } from "@/services/drizzle/schema";
import { and, asc, eq, gte, inArray, lte } from "drizzle-orm";

const SCRIPT_NAME = "REPLAY-EXTERNAL-EVENTS";
const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 500;

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
Uso:
  npm run replay:external-events -- --origem=<META-WHATSAPP|WHATSAPP-GATEWAY|SPEDY> [filtros] [--apply]

Reprocessa eventos arquivados no inbox (ampmais_external_events) pelo MESMO caminho do
webhook (seams em lib/whatsapp/*-webhook-processing.ts). Substitui o scraping de runtime
logs da Vercel como ferramenta de recuperação.

Seguro por padrão:
  - DRY-RUN por default: lista o que seria reprocessado, sem executar. Use --apply para rodar.
  - Filtro obrigatório além de --origem: --desde=<ISO> (com --ate opcional), --chave=<hash>
    ou --ids=<id1,id2,...>.
  - --status=<RECEBIDO|PROCESSADO|FALHOU> restringe por desfecho (ex.: só os FALHOU).
  - --limit=<n> (default ${DEFAULT_LIMIT}, máximo ${MAX_LIMIT}), ordem determinística (data_insercao, id).
  - Payloads nunca são logados (contêm dados pessoais) — só id/tipo/status/data.

Exemplos:
  npm run replay:external-events -- --origem=META-WHATSAPP --status=FALHOU --desde=2026-08-01T00:00:00Z
  npm run replay:external-events -- --origem=META-WHATSAPP --ids=<eventId> --apply
`);
}

type TReplayOptions = {
	origem: TExternalEventSourceEnum;
	desde: Date | null;
	ate: Date | null;
	chave: string | null;
	ids: string[];
	status: "RECEBIDO" | "PROCESSADO" | "FALHOU" | null;
	limit: number;
	apply: boolean;
};

function parseOptions(): TReplayOptions | null {
	if (hasFlag("help") || process.argv.includes("-h")) return null;

	const origemRaw = getArgValue("origem");
	const origemParsed = ExternalEventSourceEnum.safeParse(origemRaw);
	if (!origemParsed.success) {
		throw new Error(`Informe --origem=<${ExternalEventSourceEnum.options.join("|")}>.`);
	}

	const desdeRaw = getArgValue("desde");
	const ateRaw = getArgValue("ate");
	const desde = desdeRaw ? new Date(desdeRaw) : null;
	const ate = ateRaw ? new Date(ateRaw) : null;
	if (desde && Number.isNaN(desde.getTime())) throw new Error(`Data inválida em --desde: ${desdeRaw}`);
	if (ate && Number.isNaN(ate.getTime())) throw new Error(`Data inválida em --ate: ${ateRaw}`);

	const chave = getArgValue("chave");
	const ids = (getArgValue("ids") ?? "")
		.split(",")
		.map((id) => id.trim())
		.filter(Boolean);

	if (!desde && !chave && ids.length === 0) {
		throw new Error("Filtro obrigatório além de --origem: use --desde=<ISO>, --chave=<hash> ou --ids=<id1,id2,...>.");
	}

	const statusRaw = getArgValue("status");
	if (statusRaw && !["RECEBIDO", "PROCESSADO", "FALHOU"].includes(statusRaw)) {
		throw new Error(`Status inválido em --status: ${statusRaw}`);
	}

	const limitRaw = getArgValue("limit");
	const limit = limitRaw ? Number(limitRaw) : DEFAULT_LIMIT;
	if (!Number.isInteger(limit) || limit < 1 || limit > MAX_LIMIT) {
		throw new Error(`--limit deve ser um inteiro entre 1 e ${MAX_LIMIT}.`);
	}

	return {
		origem: origemParsed.data,
		desde,
		ate,
		chave,
		ids,
		status: (statusRaw as TReplayOptions["status"]) ?? null,
		limit,
		apply: hasFlag("apply"),
	};
}

/** Despacho por origem — o mesmo seam que o route handler usa sob waitUntil. */
function buildEventRunner(event: TExternalEventEntity): { run: () => Promise<void>; resolveOrganizationId: () => Promise<string | null> } {
	if (event.origem === "META-WHATSAPP") {
		const body = event.payload as TMetaWebhookBody;
		return {
			run: () => processMetaWebhookBody(body),
			resolveOrganizationId: () => resolveMetaWebhookOrganizationId(body),
		};
	}
	if (event.origem === "SPEDY") {
		const body = event.payload as TSpedyWebhookBody;
		return {
			run: () => processSpedyWebhookBody(body),
			resolveOrganizationId: () => resolveSpedyWebhookOrganizationId(body),
		};
	}
	const body = event.payload as TGatewayWebhookBody;
	return {
		run: () => processGatewayWebhookBody(body),
		resolveOrganizationId: () => resolveGatewayWebhookOrganizationId(body),
	};
}

async function main() {
	const options = parseOptions();
	if (!options) {
		printHelp();
		return;
	}

	const conditions = [eq(externalEvents.origem, options.origem)];
	if (options.desde) conditions.push(gte(externalEvents.dataInsercao, options.desde));
	if (options.ate) conditions.push(lte(externalEvents.dataInsercao, options.ate));
	if (options.chave) conditions.push(eq(externalEvents.chaveIdempotencia, options.chave));
	if (options.ids.length > 0) conditions.push(inArray(externalEvents.id, options.ids));
	if (options.status) conditions.push(eq(externalEvents.processamentoStatus, options.status));

	const events = await db
		.select()
		.from(externalEvents)
		.where(and(...conditions))
		.orderBy(asc(externalEvents.dataInsercao), asc(externalEvents.id))
		.limit(options.limit);

	console.log(`[${SCRIPT_NAME}] ${events.length} evento(s) selecionado(s) (origem=${options.origem}, limit=${options.limit}).`);

	if (!options.apply) {
		for (const event of events) {
			console.log(`[${SCRIPT_NAME}] [DRY-RUN] ${event.id} | ${event.tipo} | ${event.processamentoStatus} | ${event.dataInsercao.toISOString()}`);
		}
		if (events.length > 0) console.log(`[${SCRIPT_NAME}] Dry-run: nada foi reprocessado. Use --apply para executar.`);
		return;
	}

	let processed = 0;
	let failed = 0;
	for (const event of events) {
		const runner = buildEventRunner(event);
		const outcome = await runArchivedEventProcessing({ eventId: event.id, ...runner });
		if (outcome === "PROCESSADO") processed++;
		else failed++;
		console.log(`[${SCRIPT_NAME}] ${event.id} | ${event.tipo} → ${outcome}`);
	}

	console.log(`[${SCRIPT_NAME}] Concluído: ${processed} processado(s), ${failed} falha(s) de ${events.length}.`);
}

main()
	.catch((error) => {
		console.error(`[${SCRIPT_NAME}] Erro fatal:`, error);
		process.exitCode = 1;
	})
	.finally(async () => {
		await connection.end();
	});
