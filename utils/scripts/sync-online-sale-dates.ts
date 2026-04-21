import "@/utils/scripts/load-next-env";

import { connection, db } from "@/services/drizzle";
import { sales, utils } from "@/services/drizzle/schema";
import dayjs from "dayjs";
import dayjsCustomParseFormat from "dayjs/plugin/customParseFormat";
import { eq } from "drizzle-orm";
import { OnlineSoftwareSaleImportationSchema } from "@/schemas/online-importation.schema";
import z from "zod";
import axios from "axios";

dayjs.extend(dayjsCustomParseFormat);

const SCRIPT_NAME = "SYNC-ORG-SALES-HISTORY";
const DEFAULT_ORGANIZATION_ID = "4a4e8578-63f0-4119-9695-a2cc068de8d6";
const DEFAULT_LOOKBACK_MONTHS = 3;
const SUPPORTING_DATA_BATCH_SIZE = 250;
const SALES_BATCH_SIZE = 100;

type TCashbackBalanceEntry = {
	clienteId: string;
	programaId: string;
	saldoValorDisponivel: number;
	saldoValorAcumuladoTotal: number;
};

type TScriptOptions = {
	organizationId: string;
	startDate: string;
	endDate: string;
	dryRun: boolean;
};

type TClientLookupData = {
	id: string;
	externalId: string | null;
	basePhone: string | null;
	firstPurchaseDate: Date | null;
	lastPurchaseDate: Date | null;
	rfmTitle: string | null;
	metadataTotalCompras: number;
	metadataValorTotalCompras: number;
};

type TExistingSaleLookupData = {
	id: string;
	idExterno: string;
	natureza: string;
	valorTotal: number;
};

type TPartnerLookupData = {
	id: string;
	clienteId: string | null;
};

type TAddOnOptionLookupData = {
	id: string;
	addOnId: string;
};
/**
 * Helper function to update the local cashback balance Map cache.
 * This ensures consistency when tracking balances across multiple sales iterations.
 * @param map - The Map storing cashback balances by clientId
 * @param clientId - Client ID (key for the Map)
 * @param programId - Cashback program ID
 * @param availableBalance - New available balance value
 * @param accumulatedTotal - New accumulated total value
 */
function updateCashbackBalanceInMap(
	map: Map<string, TCashbackBalanceEntry>,
	clientId: string,
	programId: string,
	availableBalance: number,
	accumulatedTotal: number,
): void {
	map.set(clientId, {
		clienteId: clientId,
		programaId: programId,
		saldoValorDisponivel: availableBalance,
		saldoValorAcumuladoTotal: accumulatedTotal,
	});
}

function serializeError(error: unknown) {
	if (error instanceof z.ZodError) {
		return {
			type: "ZodError",
			message: error.message,
			issues: error.issues.map((issue) => ({
				path: issue.path.join("."),
				message: issue.message,
				code: issue.code,
				expected: "expected" in issue ? issue.expected : undefined,
				received: "received" in issue ? issue.received : undefined,
			})),
		};
	}
	if (axios.isAxiosError(error)) {
		return {
			type: "AxiosError",
			message: error.message,
			code: error.code,
			status: error.response?.status,
			statusText: error.response?.statusText,
			url: error.config?.url,
			method: error.config?.method,
			requestData: error.config?.data,
			responseData: error.response?.data,
		};
	}
	if (error instanceof Error) {
		return {
			type: error.name,
			message: error.message,
			stack: error.stack,
			cause: error.cause,
		};
	}
	return {
		type: typeof error,
		value: error,
	};
}

function chunkArray<T>(array: T[], size: number): T[][] {
	if (size <= 0) {
		throw new Error("Batch size must be greater than zero.");
	}

	const chunks: T[][] = [];
	for (let index = 0; index < array.length; index += size) {
		chunks.push(array.slice(index, index + size));
	}
	return chunks;
}

function readArgumentValue(name: string): string | undefined {
	const prefix = `--${name}=`;
	return process.argv.find((arg) => arg.startsWith(prefix))?.slice(prefix.length);
}

function hasFlag(name: string): boolean {
	return process.argv.includes(`--${name}`);
}

function getUsageText() {
	return [
		`Uso: npm run sync:org-sales-history -- --orgId=<uuid> [--startDate=<iso>] [--endDate=<iso>] [--lookbackMonths=<n>] [--dryRun]`,
		"",
		"Exemplos:",
		`  npm run sync:org-sales-history -- --orgId=${DEFAULT_ORGANIZATION_ID}`,
		`  npm run sync:org-sales-history -- --orgId=${DEFAULT_ORGANIZATION_ID} --lookbackMonths=12`,
		`  npm run sync:org-sales-history -- --orgId=${DEFAULT_ORGANIZATION_ID} --startDate=2025-01-01T00:00:00.000Z --endDate=2025-12-31T23:59:59.999Z`,
		`  npm run sync:org-sales-history -- --orgId=${DEFAULT_ORGANIZATION_ID} --dryRun`,
	].join("\n");
}

function readScriptOptions(): TScriptOptions | null {
	if (hasFlag("help") || process.argv.includes("-h")) {
		return null;
	}

	const organizationId = readArgumentValue("orgId") ?? readArgumentValue("organizationId") ?? DEFAULT_ORGANIZATION_ID;
	const startDateArgument = readArgumentValue("startDate");
	const endDateArgument = readArgumentValue("endDate");
	const lookbackMonthsArgument = readArgumentValue("lookbackMonths");
	const lookbackMonths = lookbackMonthsArgument ? Number.parseInt(lookbackMonthsArgument, 10) : DEFAULT_LOOKBACK_MONTHS;

	if (!Number.isInteger(lookbackMonths) || lookbackMonths <= 0) {
		throw new Error("O argumento --lookbackMonths deve ser um inteiro positivo.");
	}

	const endDate = endDateArgument ?? dayjs().toISOString();
	const startDate = startDateArgument ?? dayjs(endDate).subtract(lookbackMonths, "months").startOf("day").toISOString();

	if (!dayjs(startDate).isValid()) {
		throw new Error("O argumento --startDate deve ser uma data ISO válida.");
	}

	if (!dayjs(endDate).isValid()) {
		throw new Error("O argumento --endDate deve ser uma data ISO válida.");
	}

	return {
		organizationId,
		startDate,
		endDate,
		dryRun: hasFlag("dryRun"),
	};
}

type TOnlineSoftwareImportationOptions = {
	organizationId: string;
	config: { tipo: "ONLINE-SOFTWARE"; token: string; serverUrl: string };
	startDate: string;
	endDate: string;
	dryRun: boolean;
};
async function handleOnlineSoftwareImportation({ organizationId, config, startDate, endDate, dryRun: _dryRun }: TOnlineSoftwareImportationOptions) {
	try {
		const parsedStartDate = dayjs(startDate);
		const parsedEndDate = dayjs(endDate);
		if (parsedStartDate.isAfter(parsedEndDate)) {
			throw new Error("O período informado para importação da Online Software é inválido.");
		}

		const weekPeriods: Array<{ startDate: string; endDate: string }> = [];
		let currentPeriodStart = parsedStartDate;
		while (currentPeriodStart.isBefore(parsedEndDate) || currentPeriodStart.isSame(parsedEndDate)) {
			const candidatePeriodEnd = currentPeriodStart.add(6, "day").endOf("day");
			const currentPeriodEnd = candidatePeriodEnd.isAfter(parsedEndDate) ? parsedEndDate : candidatePeriodEnd;
			weekPeriods.push({
				startDate: currentPeriodStart.toISOString(),
				endDate: currentPeriodEnd.toISOString(),
			});
			currentPeriodStart = currentPeriodEnd.add(1, "millisecond");
		}

		console.log(
			`[ORG: ${organizationId}] [INFO] [DATA_COLLECTING] [ONLINE-SOFTWARE] Starting OnlineSoftware integration in ${weekPeriods.length} weekly period(s)`,
		);
		const onlineSoftwareConfig = config as { tipo: "ONLINE-SOFTWARE"; token: string; serverUrl: string };

		const computeOnlineSaleDate = (onlineSale: (typeof OnlineSoftwareSaleImportationSchema)["_output"]) => {
			const onlineSaleDateTime = onlineSale.datahora ? dayjs(onlineSale.datahora, ["DD/MM/YYYY HH:mm:ss", "DD/MM/YYYY HH:mm"], true) : null;
			const onlineBaseSaleDate = onlineSaleDateTime?.isValid() ? onlineSaleDateTime : dayjs(onlineSale.data, "DD/MM/YYYY", true);

			if (!onlineBaseSaleDate.isValid()) {
				throw new Error(`Data inválida recebida da Online Software. data="${onlineSale.data}" datahora="${onlineSale.datahora ?? ""}"`);
			}

			return onlineSaleDateTime?.isValid()
				? onlineSaleDateTime.toDate()
				: dayjs().isSame(onlineBaseSaleDate, "day")
					? dayjs().toDate()
					: onlineBaseSaleDate.add(3, "hours").toDate();
		};

		for (const weekPeriod of weekPeriods) {
			console.log(
				`[ORG: ${organizationId}] [INFO] [DATA_COLLECTING] [ONLINE-SOFTWARE] Processing period from ${weekPeriod.startDate} to ${weekPeriod.endDate}`,
			);
			const startDateFixed = dayjs(weekPeriod.startDate).format("DD/MM/YYYY").replaceAll("/", "");
			const endDateFixed = dayjs(weekPeriod.endDate).format("DD/MM/YYYY").replaceAll("/", "");
			const { data: onlineAPIResponse } = await axios.post(onlineSoftwareConfig.serverUrl, {
				token: onlineSoftwareConfig.token,
				rotina: "listarVendas001",
				dtinicio: startDateFixed,
				dtfim: endDateFixed,
			});
			console.log("ONLINE API RECEIVED RESULT", onlineAPIResponse.resultado[0]);
			const onlineSoftwareSales = z
				.array(OnlineSoftwareSaleImportationSchema, {
					required_error: "Payload da Online não é uma lista.",
					invalid_type_error: "Tipo não permitido para o payload.",
				})
				.parse(onlineAPIResponse.resultado);
			const deduplicatedOnlineSalesMap = new Map<string, (typeof onlineSoftwareSales)[number]>();
			for (const onlineSale of onlineSoftwareSales) {
				deduplicatedOnlineSalesMap.set(onlineSale.id, onlineSale);
			}
			const deduplicatedOnlineSales = Array.from(deduplicatedOnlineSalesMap.values());
			const duplicatedSalesCount = onlineSoftwareSales.length - deduplicatedOnlineSales.length;

			console.log("ONLINE SALES PARSED", onlineSoftwareSales.length);
			if (duplicatedSalesCount > 0) {
				console.log(
					`[ORG: ${organizationId}] [ONLINE-SOFTWARE] ${duplicatedSalesCount} venda(s) duplicada(s) foram descartadas do payload desta janela.`,
				);
			}
			console.log(`[ORG: ${organizationId}] ${deduplicatedOnlineSales.length} vendas encontradas após deduplicação.`);
			if (deduplicatedOnlineSales.length === 0) {
				continue;
			}

			const salesBatches = chunkArray(deduplicatedOnlineSales, SALES_BATCH_SIZE);
			for (const [batchIndex, salesBatch] of salesBatches.entries()) {
				await db.transaction(async (tx) => {
					for (const [saleOffset, onlineSale] of salesBatch.entries()) {
						console.log(`[ORG: ${organizationId}] [ONLINE-SOFTWARE] Processing sale ${saleOffset + 1} of ${deduplicatedOnlineSales.length}...`);
						const saleDate = computeOnlineSaleDate(onlineSale);
						console.log(
							`[ORG: ${organizationId}] [INFO] [DATA_COLLECTING] [SALE] Updating sale ${onlineSale.id} (${saleDate.toLocaleString()}) with ${onlineSale.itens.length} items...`,
						);
						await tx
							.update(sales)
							.set({
								dataVenda: saleDate,
							})
							.where(eq(sales.idExterno, onlineSale.id));
					}
				});
			}
		}
	} catch (error) {
		const serializedError = serializeError(error);
		console.error(`[ORG: ${organizationId}] [ERROR] Running into error for the data collecting cron`, serializedError);
		await db.insert(utils).values({
			organizacaoId: organizationId,
			identificador: "ONLINE_IMPORTATION",
			valor: {
				identificador: "ONLINE_IMPORTATION",
				dados: {
					organizacaoId: organizationId,
					data: startDate,
					erro: JSON.stringify(error, Object.getOwnPropertyNames(error)),
					descricao: `Tentativa de importação de vendas do Online Software ${startDate} to ${endDate}.`,
				},
			},
		});
	}
}
export async function syncOrganizationSalesHistory(options: TScriptOptions) {
	const config = await db.query.organizations.findFirst({
		where: (fields, { eq: equals }) => equals(fields.id, options.organizationId),
		columns: {
			nome: true,
			integracaoConfiguracao: true,
		},
	});

	if (!config?.integracaoConfiguracao) {
		throw new Error(`Configuração de integração não encontrada para a organização ${options.organizationId}.`);
	}
	console.log("Running sync for organization:", {
		organizationId: options.organizationId,
		organizationName: config.nome,
	});
	if (config.integracaoConfiguracao.tipo === "CARDAPIO-WEB") {
		console.log("Not applicable for this script");
	} else if (config.integracaoConfiguracao.tipo === "ONLINE-SOFTWARE") {
		await handleOnlineSoftwareImportation({
			organizationId: options.organizationId,
			config: { ...config.integracaoConfiguracao, serverUrl: "https://onlinesoftware.com.br/planodecontas/apirestweb/vends/listvends.php" } as {
				tipo: "ONLINE-SOFTWARE";
				token: string;
				serverUrl: string;
			},
			startDate: options.startDate,
			endDate: options.endDate,
			dryRun: options.dryRun,
		});
	} else {
		throw new Error("Tipo de integração não suportado.");
	}
	return {
		message: options.dryRun ? "Dry run concluído." : "Importação concluída.",
		organizationId: options.organizationId,
		startDate: options.startDate,
		endDate: options.endDate,
		dryRun: options.dryRun,
	};
}

async function main() {
	const options = readScriptOptions();

	if (!options) {
		console.log(getUsageText());
		return;
	}

	const startedAt = Date.now();
	console.log(`[${SCRIPT_NAME}] Starting with options:`, options);

	const result = await syncOrganizationSalesHistory(options);
	const elapsedMs = Date.now() - startedAt;

	console.log(`[${SCRIPT_NAME}] Finished successfully in ${elapsedMs}ms.`);
	console.log(`[${SCRIPT_NAME}] Result:`, result);
}

void main()
	.then(() => {
		process.exitCode = 0;
	})
	.catch((error) => {
		console.error(`[${SCRIPT_NAME}] Error:`, error);
		process.exitCode = 1;
	})
	.finally(async () => {
		await connection.end().catch((error) => {
			console.error(`[${SCRIPT_NAME}] Error while closing database connection:`, error);
		});

		process.exit(process.exitCode ?? 0);
	});
