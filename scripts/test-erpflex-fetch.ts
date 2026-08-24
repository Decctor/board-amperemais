import "@/utils/scripts/load-next-env";

import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import { erpFlexDataConnector } from "@/lib/data-connectors/erp-flex/canonical";
import { createErpFlexClients } from "@/lib/data-connectors/erp-flex/client";
import { ErpFlexConfigSchema, type TErpFlexConfig } from "@/lib/data-connectors/erp-flex/types";
import { getActiveDataSourceIntegrations } from "@/lib/integrations/data-sources";
import { connection, db } from "@/services/drizzle";
import dayjs from "dayjs";

/**
 * Probe somente leitura da API do ERPFlex. Além de validar uma conexão existente (--org), aceita
 * credenciais diretas (--username/--password) para testar o acesso ANTES de conectar uma
 * organização — a documentação deles é incompleta e o --diagnose existe para confirmar na prática
 * a composição de URL dos filtros (d{data}/P{página}) e o formato dos envelopes.
 */

type TScriptOptions = {
	organizationId: string | null;
	integrationId: string | null;
	username: string | null;
	password: string | null;
	database: string | null;
	startDate: Date;
	endDate: Date;
	outputPath: string | null;
	raw: boolean;
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
  npm run test:erpflex-fetch -- [--org=<organizationId> | --username=<u> --password=<p> --database=<d>] [--start=<ISO>] [--end=<ISO>] [--out=<path>] [--raw] [--diagnose]

Opções:
  --org             ID da organização com conexão ERP-FLEX ativa (credenciais vêm do banco).
  --integration-id  Conexão específica quando a organização tem mais de uma.
  --username        Usuário da API (alternativa a --org; env ERPFLEX_TEST_USERNAME).
  --password        Senha da API (env ERPFLEX_TEST_PASSWORD).
  --database        Nome da base no ERPFlex (env ERPFLEX_TEST_DATABASE).
  --start           Início da janela. Padrão: 7 dias atrás.
  --end             Fim da janela. Padrão: agora.
  --out             Caminho para salvar o JSON do resultado.
  --raw             Inclui payloads brutos no arquivo de saída.
  --diagnose        Só testa endpoints leves e imprime as respostas cruas (não monta o batch).
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
		organizationId: getArgValue("org"),
		integrationId: getArgValue("integration-id"),
		username: getArgValue("username") ?? process.env.ERPFLEX_TEST_USERNAME ?? null,
		password: getArgValue("password") ?? process.env.ERPFLEX_TEST_PASSWORD ?? null,
		database: getArgValue("database") ?? process.env.ERPFLEX_TEST_DATABASE ?? null,
		startDate: parseDateArg("start", now.subtract(7, "days").startOf("day").toDate()),
		endDate: parseDateArg("end", now.toDate()),
		outputPath: getArgValue("out"),
		raw: hasFlag("raw"),
		diagnose: hasFlag("diagnose"),
	};
}

async function resolveConfig(options: TScriptOptions): Promise<{ integrationId: string; config: TErpFlexConfig }> {
	if (options.organizationId) {
		const rows = await getActiveDataSourceIntegrations({ executor: db, organizationId: options.organizationId, types: ["ERP-FLEX"] });
		if (!rows.length) throw new Error(`Organização não está conectada ao ERPFlex: ${options.organizationId}`);
		if (options.integrationId) {
			const row = rows.find((candidate) => candidate.id === options.integrationId);
			if (!row) throw new Error(`Conexão ERPFlex ${options.integrationId} não encontrada/ativa para a organização ${options.organizationId}`);
			return { integrationId: row.id, config: ErpFlexConfigSchema.parse(row.configuracao) };
		}
		if (rows.length > 1) {
			throw new Error(
				`Organização ${options.organizationId} tem ${rows.length} conexões ERPFlex ativas — informe --integration-id=<id>. Opções: ${rows.map((row) => row.id).join(", ")}`,
			);
		}
		return { integrationId: rows[0].id, config: ErpFlexConfigSchema.parse(rows[0].configuracao) };
	}

	if (!options.username || !options.password) {
		throw new Error("Informe --org=<organizationId> ou credenciais diretas via --username e --password (--database opcional).");
	}

	return {
		integrationId: "erpflex-fetch-test",
		config: {
			tipo: "ERP-FLEX",
			username: options.username,
			password: options.password,
			database: options.database ?? "erpflex-fetch-test",
		},
	};
}

async function probeErpFlexEndpoint({
	client,
	path: probePath,
	params,
}: {
	client: ReturnType<typeof createErpFlexClients>["v1"];
	path: string;
	params?: Record<string, string | number>;
}) {
	try {
		const response = await client.get<unknown>(probePath, { params });
		return { path: probePath, ok: true, status: response.status, sample: response.data };
	} catch (error) {
		if (error && typeof error === "object" && "isAxiosError" in error && error.isAxiosError) {
			const axiosError = error as {
				response?: { status?: number; data?: unknown };
				config?: { url?: string; params?: unknown };
			};
			return {
				path: probePath,
				ok: false,
				status: axiosError.response?.status ?? null,
				error: axiosError.response?.data ?? null,
				url: axiosError.config?.url ?? null,
			};
		}
		throw error;
	}
}

/**
 * Probes leves nos dois níveis da API. É aqui que as suposições tiradas da documentação são
 * confirmadas: composição d{data}/P{página}, envelope { faturamentos: [...] }, campos de cliente
 * (telefone/celular existem?) e comportamento do ?nf_canceladas=S.
 */
async function runDiagnose(config: TErpFlexConfig, window: { startDate: Date; endDate: Date }) {
	const clients = createErpFlexClients(config);
	const dateSegment = dayjs(window.endDate).format("DD-MM-YYYY");

	const probes = [
		await probeErpFlexEndpoint({ client: clients.v1, path: "/clientes/", params: { limit: 1, offset: 0 } }),
		await probeErpFlexEndpoint({ client: clients.v1, path: "/produtos/", params: { limit: 1, offset: 0 } }),
		await probeErpFlexEndpoint({ client: clients.v2, path: "/faturamento" }),
		await probeErpFlexEndpoint({ client: clients.v2, path: `/faturamento/d${dateSegment}` }),
		await probeErpFlexEndpoint({ client: clients.v2, path: `/faturamento/d${dateSegment}/P1` }),
		await probeErpFlexEndpoint({ client: clients.v2, path: "/faturamento", params: { nf_canceladas: "S" } }),
	];

	console.log("\n[ERPFLEX_FETCH_TEST] Resultado dos probes");
	for (const probe of probes) {
		console.log(`\n--- ${probe.path} (status=${probe.status ?? "sem resposta"}, ok=${probe.ok}) ---`);
		console.dir("sample" in probe ? probe.sample : probe.error, { depth: 6 });
	}

	if (probes.some((probe) => probe.status === 401)) {
		console.error(
			"\nProvável causa: credenciais de API inválidas ou ainda não provisionadas pelo ERPFlex (o acesso é liberado pelo time deles via api@erpflex.com.br).",
		);
	}

	return probes;
}

function printSummary(batch: Awaited<ReturnType<typeof erpFlexDataConnector.fetchImportBatch>>) {
	const validSales = batch.sales.filter((sale) => sale.isValidSale);
	const canceledSales = batch.sales.filter((sale) => sale.isCanceled);

	console.log("\n[ERPFLEX_FETCH_TEST] Resumo do fetch");
	console.log({
		source: batch.source,
		window: {
			startDate: batch.window.startDate.toISOString(),
			endDate: batch.window.endDate.toISOString(),
		},
		sales: batch.sales.length,
		validSales: validSales.length,
		canceledSales: canceledSales.length,
		products: batch.products.length,
	});

	console.log("\n[ERPFLEX_FETCH_TEST] Primeiras vendas (canônicas)");
	console.table(
		batch.sales.slice(0, 10).map((sale) => ({
			sourceSaleId: sale.sourceSaleId,
			displayId: sale.displayId,
			totalValue: sale.totalValue,
			occurredAt: sale.occurredAt.toISOString(),
			statusText: sale.statusText,
			isCanceled: sale.isCanceled,
			clientName: sale.client?.name ?? null,
			clientPhone: sale.client?.phone ?? null,
			items: sale.items.length,
		})),
	);

	const firstCanonicalSale = batch.sales[0];
	if (firstCanonicalSale) {
		console.log("\n[ERPFLEX_FETCH_TEST] Exemplo de venda canônica");
		console.dir(firstCanonicalSale, { depth: 6 });
	}
}

async function saveOutput({ outputPath, raw, value }: { outputPath: string | null; raw: boolean; value: unknown }) {
	if (!outputPath) return;

	const resolvedOutputPath = path.resolve(process.cwd(), outputPath);
	await mkdir(path.dirname(resolvedOutputPath), { recursive: true });
	const output = raw ? value : JSON.parse(JSON.stringify(value, (_key, nestedValue) => (_key === "raw" ? undefined : nestedValue)));
	await writeFile(resolvedOutputPath, JSON.stringify(output, null, 2), "utf-8");
	console.log(`\n[ERPFLEX_FETCH_TEST] Resultado salvo em ${resolvedOutputPath}`);
}

async function main() {
	if (hasFlag("help")) {
		printHelp();
		return;
	}

	const options = parseOptions();
	const { integrationId, config } = await resolveConfig(options);
	const window = { startDate: options.startDate, endDate: options.endDate };

	console.log("[ERPFLEX_FETCH_TEST] Configuração", {
		integrationId,
		username: config.username,
		database: config.database,
		startDate: window.startDate.toISOString(),
		endDate: window.endDate.toISOString(),
		diagnose: options.diagnose,
	});

	if (options.diagnose) {
		const probes = await runDiagnose(config, window);
		await saveOutput({ outputPath: options.outputPath, raw: true, value: { probes } });
		return;
	}

	const batch = await erpFlexDataConnector.fetchImportBatch({
		organizationId: options.organizationId ?? "erpflex-fetch-test",
		integrationId,
		config,
		window,
	});

	printSummary(batch);

	const output = {
		meta: {
			window: { startDate: window.startDate.toISOString(), endDate: window.endDate.toISOString() },
			note: "Somente leitura. Nenhum dado foi inserido no banco.",
		},
		batch,
	};

	const defaultOutputPath = options.outputPath ?? `tmp/erpflex-fetch-${dayjs().format("YYYY-MM-DD-HHmmss")}.json`;
	await saveOutput({ outputPath: defaultOutputPath, raw: options.raw, value: output });
}

main()
	.catch((error) => {
		console.error("[ERPFLEX_FETCH_TEST] Falha ao buscar dados do ERPFlex.");
		if (error?.isAxiosError) {
			console.error({
				message: error.message,
				status: error.response?.status,
				data: error.response?.data,
				url: error.config?.url,
			});
			if (error.response?.status === 401) {
				console.error("\nDica: confira usuário/senha de API — o acesso é provisionado pelo time do ERPFlex (api@erpflex.com.br).");
			}
		} else {
			console.error(error);
		}
		process.exitCode = 1;
	})
	.finally(async () => {
		await connection.end();
	});
