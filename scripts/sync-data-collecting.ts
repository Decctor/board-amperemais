import "@/utils/scripts/load-next-env";

import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import { runDataCollectingV2, type TDataCollectingV2EffectsOptions } from "@/lib/data-collecting-v2";
import { connection, db } from "@/services/drizzle";
import { organizations } from "@/services/drizzle/schema";
import dayjs from "dayjs";
import timezone from "dayjs/plugin/timezone";
import utc from "dayjs/plugin/utc";
import { eq } from "drizzle-orm";

dayjs.extend(utc);
dayjs.extend(timezone);

const SCRIPT_NAME = "SYNC-DATA-COLLECTING";
const DATA_COLLECTING_TIMEZONE = process.env.DATA_COLLECTING_TIMEZONE ?? "America/Sao_Paulo";

type TScriptOptions = {
	organizationId: string;
	startDate: Date;
	endDate: Date;
	processImmediateInteractions: boolean;
	effects: TDataCollectingV2EffectsOptions;
	rawOutputPath: string | null;
};

function getArgValue(name: string) {
	const prefix = `--${name}=`;
	const arg = process.argv.find((value) => value.startsWith(prefix));
	return arg ? arg.slice(prefix.length) : null;
}

function hasFlag(name: string) {
	return process.argv.includes(`--${name}`);
}

function getFirstArgValue(names: string[]) {
	for (const name of names) {
		const value = getArgValue(name);
		if (value) return value;
	}

	return null;
}

function getDefaultWindow() {
	const referenceDate = dayjs().tz(DATA_COLLECTING_TIMEZONE);
	return {
		startDate: referenceDate.startOf("month").toDate(),
		endDate: referenceDate.endOf("day").toDate(),
	};
}

function parseDateArg(names: string[], fallback: Date) {
	const value = getFirstArgValue(names);
	if (!value) return fallback;

	const parsed = dayjs(value);
	if (!parsed.isValid()) throw new Error(`Data inválida em --${names[0]}: ${value}`);
	return parsed.toDate();
}

function parseRawOutputPath() {
	const explicitPath = getArgValue("out");
	if (explicitPath !== null) return explicitPath;
	if (hasFlag("out")) return "";
	return null;
}

function parseRequiredEffectArg(name: string) {
	const value = getArgValue(name);
	if (value === "process") return true;
	if (value === "skip") return false;
	throw new Error(`Informe --${name}=<process|skip>.`);
}

function printHelp() {
	const defaultWindow = getDefaultWindow();

	console.log(`
Uso:
  npm run sync:data-collecting -- --org=<organizationId> [--start=<ISO>] [--end=<ISO>] --cashback=<process|skip> --campaigns=<process|skip> --conversion-attribution=<process|skip> [--process-immediate-interactions] [--out=<path>]

Executa o mesmo pipeline de app/api/cron/data-collecting/route.ts via runDataCollectingV2
para UMA organização, com qualquer conector configurado (Bling etc.), buscando vendas na
fonte e inserindo/atualizando no banco.

Padrões:
  --org     obrigatório
  --start   ${defaultWindow.startDate.toISOString()} (início do mês atual em ${DATA_COLLECTING_TIMEZONE})
  --end     ${defaultWindow.endDate.toISOString()} (fim do dia atual em ${DATA_COLLECTING_TIMEZONE})

Aliases:
  --orgId, --organizationId
  --startDate
  --endDate

Exemplo para sincronizar só vendas do dia, sem efeitos colaterais (loop de validação do
skip por assinatura: rodar duas vezes seguidas e comparar updated vs unchanged):
  npm run sync:data-collecting -- --org=<orgId> --start=<hojeT00:00> --cashback=skip --campaigns=skip --conversion-attribution=skip

Exemplo espelhando o cron (com campanhas/cashback):
  npm run sync:data-collecting -- --org=<orgId> --cashback=process --campaigns=process --conversion-attribution=process

Observações:
  --cashback, --campaigns e --conversion-attribution são obrigatórios.
  --out salva o payload bruto do conector (batch.raw) em JSON após a sincronização.
  Use --out sem valor para salvar em tmp/data-collecting-raw-<org>-<timestamp>.json.
  Por padrão, interações imediatas não são processadas.
  Use --process-immediate-interactions apenas com --campaigns=process.
`);
}

function getDefaultRawOutputPath(organizationId: string) {
	return path.join("tmp", `data-collecting-raw-${organizationId.slice(0, 8)}-${dayjs().format("YYYY-MM-DD-HHmmss")}.json`);
}

async function saveRawOutput({
	outputPath,
	organizationId,
	organizationName,
	window,
	result,
}: {
	outputPath: string;
	organizationId: string;
	organizationName: string;
	window: { startDate: Date; endDate: Date };
	result: Awaited<ReturnType<typeof runDataCollectingV2>>;
}) {
	const rawBatch = result.rawBatches?.find((batch) => batch.organizationId === organizationId);
	if (!rawBatch) {
		console.warn(`[${SCRIPT_NAME}] Nenhum payload raw disponível para salvar (org=${organizationId}).`);
		return;
	}

	const resolvedOutputPath = path.resolve(process.cwd(), outputPath);
	await mkdir(path.dirname(resolvedOutputPath), { recursive: true });

	const payload = {
		meta: {
			organizationId,
			organizationName,
			source: rawBatch.source,
			window: {
				startDate: window.startDate.toISOString(),
				endDate: window.endDate.toISOString(),
			},
			savedAt: new Date().toISOString(),
		},
		raw: rawBatch.raw,
		summary: result.summaries.find((summary) => summary.organizationId === organizationId) ?? null,
		errors: result.errors.filter((error) => error.organizationId === organizationId),
	};

	await writeFile(resolvedOutputPath, JSON.stringify(payload, null, 2), "utf-8");
	console.log(`[${SCRIPT_NAME}] Payload raw salvo em ${resolvedOutputPath}`);
}

function parseOptions(): TScriptOptions | null {
	if (hasFlag("help") || process.argv.includes("-h")) return null;

	const defaultWindow = getDefaultWindow();
	const organizationId = getFirstArgValue(["org", "orgId", "organizationId"]);
	if (!organizationId) throw new Error("Informe --org=<organizationId>.");
	const startDate = parseDateArg(["start", "startDate"], defaultWindow.startDate);
	const endDate = parseDateArg(["end", "endDate"], defaultWindow.endDate);

	if (dayjs(startDate).isAfter(endDate)) {
		throw new Error("O período informado é inválido: --start deve ser anterior ou igual a --end.");
	}

	const processCampaigns = parseRequiredEffectArg("campaigns");
	const processImmediateInteractions = hasFlag("process-immediate-interactions");
	if (processImmediateInteractions && !processCampaigns) {
		throw new Error("--process-immediate-interactions só pode ser usado com --campaigns=process.");
	}

	return {
		organizationId,
		startDate,
		endDate,
		processImmediateInteractions,
		effects: {
			processCashback: parseRequiredEffectArg("cashback"),
			processCampaigns,
			processConversionAttribution: parseRequiredEffectArg("conversion-attribution"),
		},
		rawOutputPath: parseRawOutputPath(),
	};
}

/** Mesmo gate do runDataCollectingV2: integração configurada e coerente, seja qual for o conector. */
async function assertOrganizationWithIntegration(organizationId: string) {
	const organization = await db.query.organizations.findFirst({
		where: eq(organizations.id, organizationId),
		columns: {
			id: true,
			nome: true,
			integracaoTipo: true,
			integracaoConfiguracao: true,
		},
	});

	if (!organization) throw new Error(`Organização não encontrada: ${organizationId}`);
	if (!organization.integracaoTipo) throw new Error(`Organização sem integração configurada: ${organizationId}`);
	if (!organization.integracaoConfiguracao || organization.integracaoConfiguracao.tipo !== organization.integracaoTipo) {
		throw new Error(
			`Configuração de integração inválida para organização ${organizationId}: tipo=${organization.integracaoTipo}, configuracao.tipo=${organization.integracaoConfiguracao?.tipo ?? "ausente"}`,
		);
	}

	return organization;
}

function printSummary(result: Awaited<ReturnType<typeof runDataCollectingV2>>) {
	for (const summary of result.summaries) {
		console.log(`[${SCRIPT_NAME}] Organização ${summary.organizationId}`, {
			source: summary.source,
			importedSalesCount: summary.importedSalesCount,
			createdSalesCount: summary.createdSalesCount,
			updatedSalesCount: summary.updatedSalesCount,
			unchangedSalesCount: summary.unchangedSalesCount,
			createdClientsCount: summary.createdClientsCount,
			createdProductsCount: summary.createdProductsCount,
			createdSellersCount: summary.createdSellersCount,
			cashbackTransactionsCount: summary.cashbackTransactionsCount,
			createdInteractionsCount: summary.createdInteractionsCount,
		});
	}

	if (result.errors.length > 0) {
		console.error(`[${SCRIPT_NAME}] Erros`, result.errors);
	}
}

async function main() {
	const options = parseOptions();
	if (!options) {
		printHelp();
		return;
	}

	const startedAt = Date.now();
	const organization = await assertOrganizationWithIntegration(options.organizationId);

	console.log(`[${SCRIPT_NAME}] Iniciando sincronização`, {
		organizationId: options.organizationId,
		organizationName: organization.nome,
		source: organization.integracaoTipo,
		startDate: options.startDate.toISOString(),
		endDate: options.endDate.toISOString(),
		processImmediateInteractions: options.processImmediateInteractions,
		effects: options.effects,
		timezone: DATA_COLLECTING_TIMEZONE,
	});

	const result = await runDataCollectingV2({
		organizationIds: [options.organizationId],
		window: {
			startDate: options.startDate,
			endDate: options.endDate,
		},
		processImmediateInteractions: options.processImmediateInteractions,
		effects: options.effects,
		includeRawInResult: options.rawOutputPath !== null,
	});

	const elapsedMs = Date.now() - startedAt;
	console.log(`[${SCRIPT_NAME}] Sincronização concluída em ${elapsedMs}ms.`);
	printSummary(result);

	if (options.rawOutputPath) {
		await saveRawOutput({
			outputPath: options.rawOutputPath === "" ? getDefaultRawOutputPath(options.organizationId) : options.rawOutputPath,
			organizationId: options.organizationId,
			organizationName: organization.nome,
			window: {
				startDate: options.startDate,
				endDate: options.endDate,
			},
			result,
		});
	}

	if (result.errors.length > 0) {
		process.exitCode = 1;
	}
}

void main()
	.catch((error) => {
		console.error(`[${SCRIPT_NAME}] Falha ao sincronizar dados.`);
		if (error?.isAxiosError) {
			console.error({
				message: error.message,
				status: error.response?.status,
				data: error.response?.data,
				url: error.config?.url,
				params: error.config?.params,
			});
		} else {
			console.error(
				error instanceof Error
					? {
							type: error.name,
							message: error.message,
							stack: error.stack,
						}
					: String(error),
			);
		}
		process.exit(1);
	})
	.finally(async () => {
		await connection.end().catch((error) => {
			console.error(`[${SCRIPT_NAME}] Erro ao fechar conexão com o banco:`, error instanceof Error ? error.message : String(error));
		});

		process.exit(process.exitCode ?? 0);
	});
