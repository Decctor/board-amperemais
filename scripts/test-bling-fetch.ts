import "@/utils/scripts/load-next-env";

import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import { blingDataConnector } from "@/lib/data-connectors/bling/canonical";
import { createBlingClient, getValidBlingConfig, refreshBlingToken } from "@/lib/data-connectors/bling/client";
import { BLING_API_BASE_URL, BlingConfigSchema, type TBlingConfig } from "@/lib/data-connectors/bling/types";
import { connection, db } from "@/services/drizzle";
import { organizations } from "@/services/drizzle/schema";
import dayjs from "dayjs";
import { eq } from "drizzle-orm";

const DEFAULT_ORGANIZATION_ID = "2658876a-d365-4e37-ba1e-5a63239cf98f";

type TScriptOptions = {
	organizationId: string;
	startDate: Date;
	endDate: Date;
	outputPath: string | null;
	raw: boolean;
	sampleSize: number;
	forceRefresh: boolean;
	diagnose: boolean;
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
  npm run test:bling-fetch -- [--org=<organizationId>] [--start=<ISO>] [--end=<ISO>] [--out=<path>] [--raw] [--samples=<n>]

Opções:
  --org         ID da organização conectada ao Bling. Padrão: ${DEFAULT_ORGANIZATION_ID}
  --start       Início da janela (dataInicial). Padrão: início do mês atual.
  --end         Fim da janela (dataFinal). Padrão: agora.
  --out         Caminho para salvar o JSON do resultado.
  --raw         Inclui payload bruto do Bling no arquivo de saída.
  --samples     Quantidade de pedidos com resposta bruta da API (listagem + detalhe). Padrão: 3.
  --force-refresh  Força renovação do token OAuth antes da busca.
  --diagnose       Só valida autenticação e testa endpoints leves (não busca vendas).
`);
}

function parseDateArg(name: string, fallback: Date) {
	const value = getArgValue(name);
	if (!value) return fallback;

	const parsed = dayjs(value);
	if (!parsed.isValid()) throw new Error(`Data inválida em --${name}: ${value}`);
	return parsed.toDate();
}

function parseSampleSize() {
	const value = getArgValue("samples");
	if (!value) return 3;

	const parsed = Number(value);
	if (!Number.isFinite(parsed) || parsed < 0) throw new Error(`Valor inválido em --samples: ${value}`);
	return Math.floor(parsed);
}

function parseOptions(): TScriptOptions {
	const now = dayjs();

	return {
		organizationId: getArgValue("org") ?? process.env.BLING_TEST_ORGANIZATION_ID ?? DEFAULT_ORGANIZATION_ID,
		startDate: parseDateArg("start", now.startOf("month").toDate()),
		endDate: parseDateArg("end", now.toDate()),
		outputPath: getArgValue("out"),
		raw: hasFlag("raw"),
		sampleSize: parseSampleSize(),
		forceRefresh: hasFlag("force-refresh"),
		diagnose: hasFlag("diagnose"),
	};
}

async function getConfigFromOrganization(organizationId: string): Promise<TBlingConfig> {
	const organization = await db.query.organizations.findFirst({
		where: eq(organizations.id, organizationId),
		columns: {
			integracaoTipo: true,
			integracaoConfiguracao: true,
		},
	});

	if (!organization) throw new Error(`Organização não encontrada: ${organizationId}`);
	if (organization.integracaoTipo !== "BLING") throw new Error(`Organização não está conectada ao Bling: ${organizationId}`);
	if (!organization.integracaoConfiguracao || organization.integracaoConfiguracao.tipo !== "BLING") {
		throw new Error(`Configuração Bling inválida para organização: ${organizationId}`);
	}

	return BlingConfigSchema.parse(organization.integracaoConfiguracao);
}

function maskToken(token: string | null | undefined) {
	if (!token) return null;
	if (token.length <= 12) return "***";
	return `${token.slice(0, 6)}...${token.slice(-4)} (len=${token.length})`;
}

function printConfigDiagnostics({
	label,
	config,
	clientId,
}: {
	label: string;
	config: TBlingConfig;
	clientId: string | undefined;
}) {
	console.log(`\n[BLING_FETCH_TEST] ${label}`);
	console.log({
		clientId: clientId ? `${clientId.slice(0, 8)}...` : "AUSENTE",
		tokenType: config.tokenType,
		scope: config.scope,
		connectedAt: config.connectedAt,
		expiresAt: config.expiresAt,
		accessToken: maskToken(config.accessToken),
		refreshToken: maskToken(config.refreshToken),
	});
}

async function probeBlingEndpoint({
	config,
	path,
	params,
}: {
	config: TBlingConfig;
	path: string;
	params?: Record<string, string | number>;
}) {
	const client = createBlingClient(config);

	try {
		const response = await client.get<unknown>(path, { params });
		return {
			path,
			ok: true,
			status: response.status,
			sample: response.data,
		};
	} catch (error) {
		if (error && typeof error === "object" && "isAxiosError" in error && error.isAxiosError) {
			const axiosError = error as {
				response?: { status?: number; data?: unknown };
				config?: { url?: string; params?: unknown };
			};
			return {
				path,
				ok: false,
				status: axiosError.response?.status ?? null,
				error: axiosError.response?.data ?? null,
				url: axiosError.config?.url ?? null,
				params: axiosError.config?.params ?? null,
			};
		}

		throw error;
	}
}

async function runDiagnose({
	organizationId,
	baseConfig,
	forceRefresh,
}: {
	organizationId: string;
	baseConfig: TBlingConfig;
	forceRefresh: boolean;
}) {
	const clientId = process.env.BLING_CLIENT_ID;
	printConfigDiagnostics({ label: "Config no banco (antes)", config: baseConfig, clientId });

	const validConfig = await resolveValidConfig({
		organizationId,
		config: baseConfig,
		forceRefresh,
	});

	printConfigDiagnostics({ label: "Config em uso (depois do refresh)", config: validConfig, clientId });
	console.log({
		accessTokenChanged: baseConfig.accessToken !== validConfig.accessToken,
		refreshTokenChanged: baseConfig.refreshToken !== validConfig.refreshToken,
		apiBaseUrl: BLING_API_BASE_URL,
	});

	const probes = await Promise.all([
		probeBlingEndpoint({ config: validConfig, path: "/contatos", params: { pagina: 1, limite: 1 } }),
		probeBlingEndpoint({
			config: validConfig,
			path: "/pedidos/vendas",
			params: {
				dataInicial: formatBlingDate(dayjs().startOf("month").toDate()),
				dataFinal: formatBlingDate(new Date()),
				pagina: 1,
				limite: 1,
			},
		}),
	]);

	console.log("\n[BLING_FETCH_TEST] Resultado dos probes");
	for (const probe of probes) {
		console.log({
			path: probe.path,
			ok: probe.ok,
			status: probe.status,
			error: "error" in probe ? probe.error : undefined,
		});
	}

	const failedProbe = probes.find((probe) => !probe.ok);
	if (failedProbe && failedProbe.status === 401) {
		console.error(`
Provável causa: as credenciais BLING_CLIENT_ID/BLING_CLIENT_SECRET do seu .env local não são as MESMAS usadas quando a organização conectou o Bling em produção.

O refresh pode até retornar um novo expiresAt, mas o access token não autentica na API se o app OAuth for outro.

Próximos passos:
1. Confirme que BLING_CLIENT_ID e BLING_CLIENT_SECRET locais são idênticos aos de produção.
2. Reconecte o Bling em Configurações > Integrações (gera novo par de tokens).
3. Rode novamente: npm run test:bling-fetch -- --diagnose --force-refresh
`);
	}
}

function formatBlingDate(date: Date) {
	return dayjs(date).format("YYYY-MM-DD");
}

async function resolveValidConfig({
	organizationId,
	config,
	forceRefresh,
}: {
	organizationId: string;
	config: TBlingConfig;
	forceRefresh: boolean;
}) {
	if (forceRefresh) {
		console.log("[BLING_FETCH_TEST] Renovando token OAuth (force-refresh)...");
		const refreshedConfig = await refreshBlingToken(config);
		await db
			.update(organizations)
			.set({ integracaoConfiguracao: refreshedConfig })
			.where(eq(organizations.id, organizationId));
		return refreshedConfig;
	}

	return getValidBlingConfig({ organizationId, config });
}

async function fetchRawApiSamples({
	config,
	window,
	sampleSize,
}: {
	config: TBlingConfig;
	window: { startDate: Date; endDate: Date };
	sampleSize: number;
}) {
	if (sampleSize === 0) return null;

	const client = createBlingClient(config);

	const listResponse = await client.get<unknown>("/pedidos/vendas", {
		params: {
			dataInicial: formatBlingDate(window.startDate),
			dataFinal: formatBlingDate(window.endDate),
			pagina: 1,
			limite: Math.max(sampleSize, 1),
		},
	});

	const listData = listResponse.data as { data?: Array<{ id?: string | number }> };
	const saleIds = (listData.data ?? [])
		.map((sale) => (sale.id ? String(sale.id) : null))
		.filter((saleId): saleId is string => !!saleId)
		.slice(0, sampleSize);

	const details = [];
	for (const saleId of saleIds) {
		const detailResponse = await client.get<unknown>(`/pedidos/vendas/${saleId}`);
		details.push({
			saleId,
			response: detailResponse.data,
		});
	}

	return {
		list: listResponse.data,
		details,
	};
}

function printSummary(batch: Awaited<ReturnType<typeof blingDataConnector.fetchImportBatch>>) {
	const validSales = batch.sales.filter((sale) => sale.isValidSale);
	const canceledSales = batch.sales.filter((sale) => sale.isCanceled);
	const raw = batch.raw as { sales?: unknown[]; contacts?: unknown[]; products?: unknown[] } | undefined;

	console.log("\n[BLING_FETCH_TEST] Resumo do fetch");
	console.log({
		source: batch.source,
		organizationId: batch.organizationId,
		window: {
			startDate: batch.window.startDate.toISOString(),
			endDate: batch.window.endDate.toISOString(),
		},
		rawSales: raw?.sales?.length ?? 0,
		rawContacts: raw?.contacts?.length ?? 0,
		rawProducts: raw?.products?.length ?? 0,
		sales: batch.sales.length,
		validSales: validSales.length,
		canceledSales: canceledSales.length,
		products: batch.products.length,
		sellers: batch.sellers.length,
	});

	console.log("\n[BLING_FETCH_TEST] Primeiras vendas (canônicas)");
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

	const firstRawSale = raw?.sales?.[0];
	if (firstRawSale) {
		console.log("\n[BLING_FETCH_TEST] Exemplo de venda bruta (após parse Zod com passthrough)");
		console.dir(firstRawSale, { depth: 8 });
	}

	const firstCanonicalSale = batch.sales[0];
	if (firstCanonicalSale) {
		console.log("\n[BLING_FETCH_TEST] Exemplo de venda canônica");
		console.dir(firstCanonicalSale, { depth: 6 });
	}
}

async function saveOutput({
	outputPath,
	raw,
	value,
}: {
	outputPath: string | null;
	raw: boolean;
	value: unknown;
}) {
	if (!outputPath) return;

	const resolvedOutputPath = path.resolve(process.cwd(), outputPath);
	await mkdir(path.dirname(resolvedOutputPath), { recursive: true });
	const output = raw ? value : JSON.parse(JSON.stringify(value, (_key, nestedValue) => (_key === "raw" ? undefined : nestedValue)));
	await writeFile(resolvedOutputPath, JSON.stringify(output, null, 2), "utf-8");
	console.log(`\n[BLING_FETCH_TEST] Resultado salvo em ${resolvedOutputPath}`);
}

async function main() {
	if (hasFlag("help")) {
		printHelp();
		return;
	}

	const options = parseOptions();
	const baseConfig = await getConfigFromOrganization(options.organizationId);

	if (options.diagnose) {
		await runDiagnose({
			organizationId: options.organizationId,
			baseConfig,
			forceRefresh: options.forceRefresh,
		});
		return;
	}

	const validConfig = await resolveValidConfig({
		organizationId: options.organizationId,
		config: baseConfig,
		forceRefresh: options.forceRefresh,
	});
	const window = {
		startDate: options.startDate,
		endDate: options.endDate,
	};

	console.log("[BLING_FETCH_TEST] Buscando vendas do Bling", {
		organizationId: options.organizationId,
		startDate: options.startDate.toISOString(),
		endDate: options.endDate.toISOString(),
		sampleSize: options.sampleSize,
		tokenExpiresAt: validConfig.expiresAt,
	});

	const batch = await blingDataConnector.fetchImportBatch({
		organizationId: options.organizationId,
		config: validConfig,
		window,
	});

	const apiSamples = await fetchRawApiSamples({
		config: validConfig,
		window,
		sampleSize: options.sampleSize,
	});

	printSummary(batch);

	const output = {
		meta: {
			organizationId: options.organizationId,
			window: {
				startDate: options.startDate.toISOString(),
				endDate: options.endDate.toISOString(),
			},
			note: "Somente leitura. Nenhum dado foi inserido no banco.",
		},
		apiSamples,
		batch,
	};

	const defaultOutputPath = options.outputPath ?? `tmp/bling-fetch-${options.organizationId.slice(0, 8)}-${dayjs().format("YYYY-MM-DD-HHmmss")}.json`;
	await saveOutput({
		outputPath: defaultOutputPath,
		raw: options.raw,
		value: output,
	});
}

main()
	.catch((error) => {
		console.error("[BLING_FETCH_TEST] Falha ao buscar dados do Bling.");
		if (error?.isAxiosError) {
			console.error({
				message: error.message,
				status: error.response?.status,
				data: error.response?.data,
				url: error.config?.url,
				params: error.config?.params,
			});
			if (error.response?.status === 401) {
				console.error(
					"\nDica: token OAuth inválido ou expirado. Verifique BLING_CLIENT_ID/BLING_CLIENT_SECRET no .env e tente com --force-refresh. Se persistir, reconecte a integração Bling na organização.",
				);
			}
		} else if (error instanceof Error && error.message.includes("Credenciais do Bling")) {
			console.error(error.message);
			console.error("Defina BLING_CLIENT_ID e BLING_CLIENT_SECRET no ambiente (ex.: .env.local).");
		} else {
			console.error(error);
		}
		process.exitCode = 1;
	})
	.finally(async () => {
		await connection.end();
	});
