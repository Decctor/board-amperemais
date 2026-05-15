import "@/utils/scripts/load-next-env";

import { writeFile } from "node:fs/promises";
import path from "node:path";

import { fetchNuvemshopImportBatch } from "@/lib/data-connectors/nuvemshop";
import type { TNuvemshopConfig } from "@/lib/data-connectors/nuvemshop/types";
import { db } from "@/services/drizzle";
import { organizations } from "@/services/drizzle/schema";
import dayjs from "dayjs";
import { eq } from "drizzle-orm";

type TScriptOptions = {
	organizationId: string | null;
	startDate: Date;
	endDate: Date;
	outputPath: string | null;
	raw: boolean;
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
  npm run test:nuvemshop-fetch -- --org=<organizationId> [--start=<ISO>] [--end=<ISO>] [--out=<path>] [--raw]

Alternativa sem organização no banco:
  NUVEMSHOP_STORE_ID=<storeId> NUVEMSHOP_ACCESS_TOKEN=<token> npm run test:nuvemshop-fetch

Opções:
  --org       ID da organização conectada à Nuvem Shop.
  --start     Início da janela updated_at. Padrão: últimas 24 horas.
  --end       Fim da janela updated_at. Padrão: agora.
  --out       Caminho para salvar o JSON do batch canônico.
  --raw       Inclui payload bruto da Nuvem Shop no arquivo de saída.
`);
}

function parseDateArg(name: string, fallback: Date) {
	const value = getArgValue(name);
	if (!value) return fallback;

	const parsed = dayjs(value);
	if (!parsed.isValid()) throw new Error(`Data inválida em --${name}: ${value}`);
	return parsed.toDate();
}

function parseOptions(): TScriptOptions {
	const now = dayjs();

	return {
		organizationId: getArgValue("org") ?? process.env.NUVEMSHOP_TEST_ORGANIZATION_ID ?? null,
		startDate: parseDateArg("start", now.subtract(1, "day").toDate()),
		endDate: parseDateArg("end", now.toDate()),
		outputPath: getArgValue("out"),
		raw: hasFlag("raw"),
	};
}

function getConfigFromEnv(): TNuvemshopConfig {
	const storeId = process.env.NUVEMSHOP_STORE_ID;
	const accessToken = process.env.NUVEMSHOP_ACCESS_TOKEN;

	if (!storeId || !accessToken) {
		throw new Error("Informe --org=<organizationId> ou defina NUVEMSHOP_STORE_ID e NUVEMSHOP_ACCESS_TOKEN no ambiente.");
	}

	return {
		tipo: "NUVEM-SHOP",
		storeId,
		accessToken,
		tokenType: "bearer",
		scope: [],
	};
}

async function getConfigFromOrganization(organizationId: string): Promise<TNuvemshopConfig> {
	const organization = await db.query.organizations.findFirst({
		where: eq(organizations.id, organizationId),
		columns: {
			integracaoTipo: true,
			integracaoConfiguracao: true,
		},
	});

	if (!organization) throw new Error(`Organização não encontrada: ${organizationId}`);
	if (organization.integracaoTipo !== "NUVEM-SHOP") throw new Error(`Organização não está conectada à Nuvem Shop: ${organizationId}`);
	if (!organization.integracaoConfiguracao || organization.integracaoConfiguracao.tipo !== "NUVEM-SHOP") {
		throw new Error(`Configuração Nuvem Shop inválida para organização: ${organizationId}`);
	}

	return {
		...organization.integracaoConfiguracao,
		storeId: String(organization.integracaoConfiguracao.storeId),
	};
}

function printSummary(batch: Awaited<ReturnType<typeof fetchNuvemshopImportBatch>>) {
	const validSales = batch.sales.filter((sale) => sale.isValidSale);
	const canceledSales = batch.sales.filter((sale) => sale.isCanceled);

	console.log("\n[NUVEMSHOP_FETCH_TEST] Resumo");
	console.log({
		source: batch.source,
		organizationId: batch.organizationId,
		window: {
			startDate: batch.window.startDate.toISOString(),
			endDate: batch.window.endDate.toISOString(),
		},
		sales: batch.sales.length,
		validSales: validSales.length,
		canceledSales: canceledSales.length,
		products: batch.products,
	});

	console.log("\n[NUVEMSHOP_FETCH_TEST] Primeiras vendas");
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

async function main() {
	if (hasFlag("help")) {
		printHelp();
		return;
	}

	const options = parseOptions();
	const config = options.organizationId ? await getConfigFromOrganization(options.organizationId) : getConfigFromEnv();
	const organizationId = options.organizationId ?? `nuvemshop-${config.storeId}`;

	console.log("[NUVEMSHOP_FETCH_TEST] Buscando pedidos", {
		organizationId,
		storeId: config.storeId,
		startDate: options.startDate.toISOString(),
		endDate: options.endDate.toISOString(),
	});

	const batch = await fetchNuvemshopImportBatch({
		organizationId,
		config,
		window: {
			startDate: options.startDate,
			endDate: options.endDate,
		},
	});

	printSummary(batch);

	if (options.outputPath) {
		const outputPath = path.resolve(process.cwd(), options.outputPath);
		const output = options.raw ? batch : { ...batch, raw: undefined };
		await writeFile(outputPath, JSON.stringify(output, null, 2), "utf-8");
		console.log(`\n[NUVEMSHOP_FETCH_TEST] Resultado salvo em ${outputPath}`);
	}
}

main().catch((error) => {
	console.error("[NUVEMSHOP_FETCH_TEST] Falha ao buscar dados da Nuvem Shop.");
	console.error(error);
	process.exit(1);
});
