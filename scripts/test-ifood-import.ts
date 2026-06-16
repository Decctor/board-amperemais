import "@/utils/scripts/load-next-env";

import { writeFile } from "node:fs/promises";
import path from "node:path";

import { runDataCollectingV2 } from "@/lib/data-collecting-v2";
import { fetchIfoodImportBatch } from "@/lib/data-connectors/ifood";
import type { TIfoodConfig } from "@/lib/data-connectors/ifood/types";
import { connection, db } from "@/services/drizzle";
import { organizations } from "@/services/drizzle/schema";
import dayjs from "dayjs";
import { eq } from "drizzle-orm";

const DEFAULT_ORGANIZATION_ID = "59c2b238-bc21-4710-b47b-db6e2a380079";

type TScriptMode = "fetch" | "collect";

type TScriptOptions = {
	organizationId: string;
	startDate: Date;
	endDate: Date;
	outputPath: string | null;
	raw: boolean;
	mode: TScriptMode;
	processImmediateInteractions: boolean;
};

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
  npm run test:ifood-import -- [--org=<organizationId>] [--start=<ISO>] [--end=<ISO>] [--out=<path>] [--raw]
  npm run test:ifood-import -- --mode=collect [--org=<organizationId>]

Opções:
  --org                         ID da organização conectada ao iFood. Padrão: ${DEFAULT_ORGANIZATION_ID}
  --start                       Início da janela canônica. Padrão: início do dia atual.
  --end                         Fim da janela canônica. Padrão: agora.
  --mode=fetch|collect          fetch busca e mapeia sem gravar/ACK; collect executa o pipeline do cron.
  --out                         Caminho para salvar o JSON do batch/resultado.
  --raw                         Inclui payload bruto no arquivo de saída.
  --process-immediate           No modo collect, processa interações imediatas. Padrão: desativado.
`);
}

function parseDateArg(name: string, fallback: Date) {
	const value = getArgValue(name);
	if (!value) return fallback;

	const parsed = dayjs(value);
	if (!parsed.isValid()) throw new Error(`Data inválida em --${name}: ${value}`);
	return parsed.toDate();
}

function parseMode(): TScriptMode {
	const mode = getArgValue("mode") ?? "fetch";
	if (mode === "fetch" || mode === "collect") return mode;
	throw new Error(`Modo inválido: ${mode}. Use fetch ou collect.`);
}

function parseOptions(): TScriptOptions {
	const now = dayjs();

	return {
		organizationId: getArgValue("org") ?? process.env.IFOOD_TEST_ORGANIZATION_ID ?? DEFAULT_ORGANIZATION_ID,
		startDate: parseDateArg("start", now.startOf("day").toDate()),
		endDate: parseDateArg("end", now.toDate()),
		outputPath: getArgValue("out"),
		raw: hasFlag("raw"),
		mode: parseMode(),
		processImmediateInteractions: hasFlag("process-immediate"),
	};
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

function printFetchSummary(batch: Awaited<ReturnType<typeof fetchIfoodImportBatch>>) {
	const validSales = batch.sales.filter((sale) => sale.isValidSale);
	const canceledSales = batch.sales.filter((sale) => sale.isCanceled);
	const raw = batch.raw as { events?: unknown[]; orders?: unknown[] } | undefined;

	console.log("\n[IFOOD_IMPORT_TEST] Resumo do fetch");
	console.log({
		source: batch.source,
		organizationId: batch.organizationId,
		window: {
			startDate: batch.window.startDate.toISOString(),
			endDate: batch.window.endDate.toISOString(),
		},
		events: raw?.events?.length ?? 0,
		orders: raw?.orders?.length ?? 0,
		sales: batch.sales.length,
		validSales: validSales.length,
		canceledSales: canceledSales.length,
		products: batch.products.length,
		hasPostProcess: !!batch.postProcess,
	});

	console.log("\n[IFOOD_IMPORT_TEST] Primeiras vendas");
	console.table(
		batch.sales.slice(0, 10).map((sale) => ({
			sourceSaleId: sale.sourceSaleId,
			displayId: sale.displayId,
			totalValue: sale.totalValue,
			occurredAt: sale.occurredAt.toISOString(),
			statusText: sale.statusText,
			isValidSale: sale.isValidSale,
			isCanceled: sale.isCanceled,
			clientName: sale.client?.name ?? null,
			clientPhone: sale.client?.phone ?? null,
			items: sale.items.length,
		})),
	);
}

async function saveOutput({ outputPath, raw, value }: { outputPath: string | null; raw: boolean; value: unknown }) {
	if (!outputPath) return;

	const resolvedOutputPath = path.resolve(process.cwd(), outputPath);
	const output = raw ? value : JSON.parse(JSON.stringify(value, (_key, nestedValue) => (_key === "raw" ? undefined : nestedValue)));
	await writeFile(resolvedOutputPath, JSON.stringify(output, null, 2), "utf-8");
	console.log(`\n[IFOOD_IMPORT_TEST] Resultado salvo em ${resolvedOutputPath}`);
}

async function runFetchMode(options: TScriptOptions) {
	const config = await getConfigFromOrganization(options.organizationId);
	console.log("[IFOOD_IMPORT_TEST] Buscando eventos e pedidos", {
		organizationId: options.organizationId,
		merchantIds: config.merchantIds,
		startDate: options.startDate.toISOString(),
		endDate: options.endDate.toISOString(),
	});

	const batch = await fetchIfoodImportBatch({
		organizationId: options.organizationId,
		config,
		window: {
			startDate: options.startDate,
			endDate: options.endDate,
		},
	});

	printFetchSummary(batch);
	await saveOutput({ outputPath: options.outputPath, raw: options.raw, value: batch });
}

async function runCollectMode(options: TScriptOptions) {
	console.log("[IFOOD_IMPORT_TEST] Executando pipeline do cron para organização", {
		organizationId: options.organizationId,
		processImmediateInteractions: options.processImmediateInteractions,
		startDate: options.startDate.toISOString(),
		endDate: options.endDate.toISOString(),
	});

	const result = await runDataCollectingV2({
		organizationIds: [options.organizationId],
		window: {
			startDate: options.startDate,
			endDate: options.endDate,
		},
		processImmediateInteractions: options.processImmediateInteractions,
	});

	console.log("\n[IFOOD_IMPORT_TEST] Resultado do collect");
	console.dir(result, { depth: 6 });
	await saveOutput({ outputPath: options.outputPath, raw: options.raw, value: result });
}

async function main() {
	if (hasFlag("help")) {
		printHelp();
		return;
	}

	const options = parseOptions();
	if (options.mode === "collect") {
		await runCollectMode(options);
		return;
	}

	await runFetchMode(options);
}

main()
	.catch((error) => {
		console.error("[IFOOD_IMPORT_TEST] Falha ao testar importação iFood.");
		if (error?.isAxiosError) {
			console.error({
				message: error.message,
				status: error.response?.status,
				data: error.response?.data,
				url: error.config?.url,
				params: error.config?.params,
			});
		} else {
			console.error(error);
		}
		process.exitCode = 1;
	})
	.finally(async () => {
		await connection.end();
	});
