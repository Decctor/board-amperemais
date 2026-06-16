import "dotenv/config";
import { connection, db } from "@/services/drizzle";
import { sales } from "@/services/drizzle/schema";
import { and, asc, eq, isNull, like, ne, or, type SQL } from "drizzle-orm";

type BackfillArgs = {
	apply: boolean;
	orgId: string | null;
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

function parseArgs(): BackfillArgs {
	return {
		apply: hasFlag("apply"),
		orgId: getArgValue("orgId"),
	};
}

function buildWhereConditions(args: BackfillArgs) {
	const conditions: SQL[] = [
		like(sales.idExterno, "POI-%"),
		or(isNull(sales.processamentoOrigem), ne(sales.processamentoOrigem, "INTERNO"))!,
	];

	if (args.orgId) conditions.push(eq(sales.organizacaoId, args.orgId));

	return and(...conditions);
}

function printUsage() {
	console.log(`Uso:
  npm run backfill:poi-sales-processing-source
  npm run backfill:poi-sales-processing-source -- --apply
  npm run backfill:poi-sales-processing-source -- --apply --orgId=<id>

Opcoes:
  --apply   Persiste o backfill. Sem esta flag, roda em modo dry-run.
  --orgId   Filtra por organizacao.`);
}

async function main() {
	if (hasFlag("help") || process.argv.includes("-h")) {
		printUsage();
		return;
	}

	const args = parseArgs();
	const whereConditions = buildWhereConditions(args);
	const pendingSales = await db
		.select({
			id: sales.id,
			organizacaoId: sales.organizacaoId,
			idExterno: sales.idExterno,
			processamentoOrigem: sales.processamentoOrigem,
		})
		.from(sales)
		.where(whereConditions)
		.orderBy(asc(sales.organizacaoId), asc(sales.dataVenda), asc(sales.id));

	console.log(`[POI_SALES_PROCESSING_SOURCE_BACKFILL] Modo: ${args.apply ? "APPLY" : "DRY-RUN"}`);
	console.log(`[POI_SALES_PROCESSING_SOURCE_BACKFILL] Vendas POI pendentes: ${pendingSales.length}`);

	if (pendingSales.length === 0) return;

	console.table(
		pendingSales.slice(0, 10).map((sale) => ({
			id: sale.id,
			orgId: sale.organizacaoId,
			externalId: sale.idExterno,
			currentSource: sale.processamentoOrigem,
		})),
	);

	if (!args.apply) {
		console.log("[POI_SALES_PROCESSING_SOURCE_BACKFILL] Dry-run concluido. Execute com --apply para persistir.");
		return;
	}

	const updatedSales = await db
		.update(sales)
		.set({ processamentoOrigem: "INTERNO" })
		.where(whereConditions)
		.returning({ id: sales.id });

	console.log(`[POI_SALES_PROCESSING_SOURCE_BACKFILL] ${updatedSales.length} venda(s) atualizada(s).`);
}

main()
	.catch((error) => {
		console.error("[POI_SALES_PROCESSING_SOURCE_BACKFILL] Falha no backfill:", error);
		process.exitCode = 1;
	})
	.finally(async () => {
		await connection.end();
	});
