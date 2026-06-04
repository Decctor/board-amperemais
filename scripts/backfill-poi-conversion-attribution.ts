import "dotenv/config";
import { processConversionAttribution } from "@/lib/conversions/attribution";
import { connection, db } from "@/services/drizzle";
import { campaignConversions, sales } from "@/services/drizzle/schema";
import { and, asc, eq, gt, gte, isNotNull, like, lte, type SQL } from "drizzle-orm";

type BackfillArgs = {
	apply: boolean;
	orgId: string | null;
	since: Date | null;
	until: Date | null;
	limit: number;
};

function getArgValue(name: string) {
	const prefix = `--${name}=`;
	const inlineArg = process.argv.find((arg) => arg.startsWith(prefix));
	if (inlineArg) return inlineArg.slice(prefix.length);

	const index = process.argv.indexOf(`--${name}`);
	if (index >= 0) return process.argv[index + 1] ?? null;

	return null;
}

function hasFlag(name: string) {
	return process.argv.includes(`--${name}`);
}

function parseDateArg(name: string) {
	const value = getArgValue(name);
	if (!value) return null;

	const date = new Date(value);
	if (Number.isNaN(date.getTime())) {
		throw new Error(`Valor invalido para --${name}: ${value}`);
	}

	return date;
}

function parseArgs(): BackfillArgs {
	const limitArg = getArgValue("limit");
	const limit = limitArg ? Number(limitArg) : 500;
	if (!Number.isInteger(limit) || limit <= 0) throw new Error("--limit deve ser um numero inteiro positivo.");

	return {
		apply: hasFlag("apply"),
		orgId: getArgValue("orgId"),
		since: parseDateArg("since"),
		until: parseDateArg("until"),
		limit,
	};
}

function printUsage() {
	console.log(`Uso:
  npm run backfill:poi-conversion-attribution
  npm run backfill:poi-conversion-attribution -- --apply
  npm run backfill:poi-conversion-attribution -- --apply --orgId=<id> --since=2026-05-25 --until=2026-06-03 --limit=100

Opcoes:
  --apply       Persiste o backfill. Sem esta flag, roda em modo dry-run.
  --orgId      Filtra por organizacao.
  --since      Filtra vendas com data_venda >= data informada.
  --until      Filtra vendas com data_venda <= data informada.
  --limit      Limite de vendas candidatas por execucao. Padrao: 500.`);
}

async function findCandidateSales(args: BackfillArgs) {
	const conditions: SQL[] = [
		like(sales.idExterno, "POI-%"),
		eq(sales.atribuicaoProcessada, false),
		isNotNull(sales.organizacaoId),
		isNotNull(sales.clienteId),
		isNotNull(sales.dataVenda),
		gt(sales.valorTotal, 0),
	];

	if (args.orgId) conditions.push(eq(sales.organizacaoId, args.orgId));
	if (args.since) conditions.push(gte(sales.dataVenda, args.since));
	if (args.until) conditions.push(lte(sales.dataVenda, args.until));

	return db
		.select({
			id: sales.id,
			organizacaoId: sales.organizacaoId,
			clienteId: sales.clienteId,
			valorTotal: sales.valorTotal,
			dataVenda: sales.dataVenda,
			idExterno: sales.idExterno,
		})
		.from(sales)
		.where(and(...conditions))
		.orderBy(asc(sales.dataVenda), asc(sales.id))
		.limit(args.limit);
}

async function saleAlreadyHasConversion(saleId: string) {
	const existing = await db.query.campaignConversions.findFirst({
		where: eq(campaignConversions.vendaId, saleId),
		columns: { id: true },
	});

	return !!existing;
}

async function main() {
	if (hasFlag("help") || process.argv.includes("-h")) {
		printUsage();
		return;
	}

	const args = parseArgs();
	const candidateSales = await findCandidateSales(args);

	console.log(`[POI_ATTRIBUTION_BACKFILL] Modo: ${args.apply ? "APPLY" : "DRY-RUN"}`);
	console.log(`[POI_ATTRIBUTION_BACKFILL] Candidatas encontradas: ${candidateSales.length}`);

	if (candidateSales.length === 0) return;

	console.table(
		candidateSales.slice(0, 10).map((sale) => ({
			id: sale.id,
			orgId: sale.organizacaoId,
			clientId: sale.clienteId,
			value: sale.valorTotal,
			date: sale.dataVenda?.toISOString(),
			externalId: sale.idExterno,
		})),
	);

	if (!args.apply) {
		console.log("[POI_ATTRIBUTION_BACKFILL] Dry-run concluido. Execute com --apply para persistir.");
		return;
	}

	let processed = 0;
	let skippedWithExistingConversion = 0;
	let failed = 0;

	for (const sale of candidateSales) {
		if (!sale.organizacaoId || !sale.clienteId || !sale.dataVenda) continue;

		const alreadyHasConversion = await saleAlreadyHasConversion(sale.id);
		if (alreadyHasConversion) {
			skippedWithExistingConversion += 1;
			console.log(`[POI_ATTRIBUTION_BACKFILL] Pulando ${sale.id}: conversao ja existe.`);
			continue;
		}

		try {
			await db.transaction(async (tx) => {
				await processConversionAttribution(tx, {
					vendaId: sale.id,
					clienteId: sale.clienteId!,
					organizacaoId: sale.organizacaoId!,
					valorVenda: sale.valorTotal,
					dataVenda: sale.dataVenda!,
				});
			});
			processed += 1;
			console.log(`[POI_ATTRIBUTION_BACKFILL] Processada ${sale.id}.`);
		} catch (error) {
			failed += 1;
			console.error(`[POI_ATTRIBUTION_BACKFILL] Falha ao processar ${sale.id}:`, error);
		}
	}

	console.log(
		`[POI_ATTRIBUTION_BACKFILL] Finalizado. Processadas: ${processed}. Puladas com conversao existente: ${skippedWithExistingConversion}. Falhas: ${failed}.`,
	);
}

main()
	.catch((error) => {
		console.error("[POI_ATTRIBUTION_BACKFILL] Falha no backfill:", error);
		process.exitCode = 1;
	})
	.finally(async () => {
		await connection.end();
	});
