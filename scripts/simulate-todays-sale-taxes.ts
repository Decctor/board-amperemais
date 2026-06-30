import "@/utils/scripts/load-next-env";

import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import { mapSaleContextToNfcePayload } from "@/lib/fiscal/providers/nuvem-fiscal/mappers/nfce";
import { mapSaleContextToNfePayload } from "@/lib/fiscal/providers/nuvem-fiscal/mappers/nfe";
import { resolveAutoDocumentType } from "@/lib/fiscal/sale-fiscal-signals";
import { findActiveFiscalSeries, loadFiscalOrganization } from "@/lib/fiscal/settings";
import { computeSaleTaxation } from "@/lib/fiscal/taxation-context";
import type { TFiscalSaleContext, TFiscalSalePayment } from "@/lib/fiscal/types";
import { resolveOperationProfileForSale } from "@/lib/fiscal/operation-profile";
import { connection, db } from "@/services/drizzle";
import type { TFiscalDocument } from "@/services/drizzle/schema";
import { sales } from "@/services/drizzle/schema";
import dayjs from "dayjs";
import timezone from "dayjs/plugin/timezone";
import utc from "dayjs/plugin/utc";
import { and, asc, eq, gte, inArray, lt } from "drizzle-orm";

dayjs.extend(utc);
dayjs.extend(timezone);

const SCRIPT_NAME = "SIMULATE-TODAYS-SALE-TAXES";
const DEFAULT_ORGANIZATION_ID = "27817d9a-cb04-4704-a1f4-15b81a3610d3";
const DEFAULT_TIMEZONE = "America/Sao_Paulo";

type TScriptOptions = {
	organizationId: string;
	startDate: Date;
	endDate: Date;
	outputPath: string;
	timezone: string;
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

function printHelp() {
	console.log(`
Uso:
  npm run simulate:sale-taxes -- [--org=<organizationId>] [--date=YYYY-MM-DD] [--start=<ISO>] [--end=<ISO>] [--out=<path>]

Padrões:
  --org       ${DEFAULT_ORGANIZATION_ID}
  --date      hoje em ${DEFAULT_TIMEZONE}
  --out       tmp/sale-tax-simulation-<org>-<date>.json
  --timezone  ${DEFAULT_TIMEZONE}

Observações:
  - O script só lê o banco e salva um JSON local.
  - Nenhuma nota é emitida, nenhum documento fiscal é criado e nenhuma numeração é reservada.
  - Cada venda inclui idExterno para comparação com o CardápioWeb.
`);
}

function getDefaultWindow(timezoneName: string) {
	const day = dayjs().tz(timezoneName);
	return { startDate: day.startOf("day").toDate(), endDate: day.add(1, "day").startOf("day").toDate(), label: day.format("YYYY-MM-DD") };
}

function parseDate(value: string, argName: string) {
	const parsed = dayjs(value);
	if (!parsed.isValid()) throw new Error(`Data inválida em --${argName}: ${value}`);
	return parsed.toDate();
}

function parseOptions(): TScriptOptions | null {
	if (hasFlag("help") || process.argv.includes("-h")) return null;

	const timezoneName = getArgValue("timezone") ?? DEFAULT_TIMEZONE;
	const organizationId = getFirstArgValue(["org", "orgId", "organizationId"]) ?? DEFAULT_ORGANIZATION_ID;
	const dateArg = getArgValue("date");
	const defaultWindow = dateArg
		? {
				startDate: dayjs.tz(dateArg, timezoneName).startOf("day").toDate(),
				endDate: dayjs.tz(dateArg, timezoneName).add(1, "day").startOf("day").toDate(),
				label: dayjs.tz(dateArg, timezoneName).format("YYYY-MM-DD"),
			}
		: getDefaultWindow(timezoneName);

	const startDate = getArgValue("start") ? parseDate(getArgValue("start") as string, "start") : defaultWindow.startDate;
	const endDate = getArgValue("end") ? parseDate(getArgValue("end") as string, "end") : defaultWindow.endDate;

	if (dayjs(startDate).isAfter(endDate) || dayjs(startDate).isSame(endDate)) {
		throw new Error("O período informado é inválido: --start deve ser anterior a --end.");
	}

	const outputPath =
		getArgValue("out") ??
		path.join("tmp", `sale-tax-simulation-${organizationId.slice(0, 8)}-${defaultWindow.label}-${dayjs().format("HHmmss")}.json`);

	return { organizationId, startDate, endDate, outputPath, timezone: timezoneName };
}

async function loadSalesForWindow(options: TScriptOptions) {
	return db.query.sales.findMany({
		where: and(
			eq(sales.organizacaoId, options.organizationId),
			gte(sales.dataVenda, options.startDate),
			lt(sales.dataVenda, options.endDate),
		),
		with: {
			itens: true,
			cliente: true,
			entregaLocalizacao: true,
		},
		orderBy: asc(sales.dataVenda),
	});
}

async function loadProductFiscalProfilesForSale(venda: TFiscalSaleContext["venda"]) {
	if (venda.itens.length === 0) return [];
	const produtoIds = [...new Set(venda.itens.map((item) => item.produtoId))];
	return db.query.productFiscalProfiles.findMany({
		where: (fields, operators) =>
			operators.and(
				operators.eq(fields.organizacaoId, venda.organizacaoId ?? ""),
				operators.inArray(fields.produtoId, produtoIds),
				operators.isNull(fields.produtoVarianteId),
			),
	});
}

async function loadTaxGroupsForProfiles(perfisProdutos: { grupoTributarioId: string | null }[]) {
	const grupoIds = [...new Set(perfisProdutos.map((perfil) => perfil.grupoTributarioId).filter((id): id is string => !!id))];
	if (grupoIds.length === 0) return [];
	return db.query.fiscalTaxGroups.findMany({
		where: (fields) => inArray(fields.id, grupoIds),
		with: { regras: true },
	});
}

async function loadIbptRatesForSale({ perfisProdutos, uf }: { perfisProdutos: { ncm: string }[]; uf: string | null | undefined }) {
	if (!uf) return [];
	const ncms = [...new Set(perfisProdutos.map((perfil) => perfil.ncm).filter((ncm): ncm is string => !!ncm))];
	if (ncms.length === 0) return [];
	return db.query.fiscalIbptRates.findMany({
		where: (fields, operators) => operators.and(operators.eq(fields.uf, uf.toUpperCase()), operators.inArray(fields.ncm, ncms)),
		orderBy: (fields, operators) => operators.desc(fields.vigenciaInicio),
	});
}

async function loadSalePayments({ saleId, organizationId }: { saleId: string; organizationId: string }) {
	const entries = await db.query.accountingEntries.findMany({
		where: (fields, operators) => operators.and(operators.eq(fields.vendaId, saleId), operators.eq(fields.organizacaoId, organizationId)),
		columns: { id: true },
		with: {
			transacoesFinanceiras: {
				columns: {
					valor: true,
					tipo: true,
					metodo: true,
					provedorStatus: true,
				},
			},
		},
	});

	const totalsByMethod = new Map<TFiscalSalePayment["metodo"], number>();
	for (const transaction of entries.flatMap((entry) => entry.transacoesFinanceiras)) {
		if (transaction.tipo !== "ENTRADA") continue;
		if (["CANCELADO", "ESTORNADO"].includes(transaction.provedorStatus ?? "")) continue;
		totalsByMethod.set(transaction.metodo, (totalsByMethod.get(transaction.metodo) ?? 0) + transaction.valor);
	}

	return [...totalsByMethod.entries()].map(([metodo, valor]) => ({
		metodo,
		valor: Math.round((valor + Number.EPSILON) * 100) / 100,
	}));
}

function buildDestinatarioSnapshot(venda: TFiscalSaleContext["venda"] | null) {
	if (!venda?.cliente) return null;
	const address = venda.entregaLocalizacao ?? venda.cliente;
	return {
		nome: venda.cliente.nome,
		cpfCnpj: venda.cliente.cpfCnpj,
		inscricaoEstadual: venda.cliente.inscricaoEstadual,
		indicadorInscricaoEstadual: venda.cliente.indicadorInscricaoEstadual,
		email: venda.cliente.email,
		endereco: {
			cep: address?.localizacaoCep ?? null,
			estado: address?.localizacaoEstado ?? null,
			cidade: address?.localizacaoCidade ?? null,
			bairro: address?.localizacaoBairro ?? null,
			logradouro: address?.localizacaoLogradouro ?? null,
			numero: address?.localizacaoNumero ?? null,
			complemento: address?.localizacaoComplemento ?? null,
		},
	};
}

async function buildSaleFiscalContext({ venda, organizationId }: { venda: TFiscalSaleContext["venda"]; organizationId: string }) {
	const organizacao = await loadFiscalOrganization(organizationId);
	if (!organizacao) throw new Error(`Organização não encontrada: ${organizationId}`);

	const tipoDocumento = resolveAutoDocumentType({
		canal: venda.canal,
		entregaModalidade: venda.entregaModalidade,
		destinatarioCpfCnpj: venda.cliente?.cpfCnpj,
	});
	const ambiente = organizacao.fiscalConfiguracao?.ambiente ?? "HOMOLOGACAO";
	const operacao = await resolveOperationProfileForSale({
		organizacaoId: organizationId,
		tipoDocumento,
		signals: {
			canal: venda.canal,
			entregaModalidade: venda.entregaModalidade,
		},
		operacaoPadraoPorTipoId: organizacao.fiscalConfiguracao?.operacaoPadraoPorTipo?.[tipoDocumento] ?? null,
	});
	const serie = operacao.seriePadrao ?? (await findActiveFiscalSeries({ organizacaoId: organizationId, tipoDocumento, ambiente }));
	if (!serie) throw new Error(`Série fiscal ativa não encontrada para ${tipoDocumento}.`);

	const [perfisProdutos, pagamentos] = await Promise.all([
		loadProductFiscalProfilesForSale(venda),
		loadSalePayments({ saleId: venda.id, organizationId }),
	]);
	const gruposTributarios = await loadTaxGroupsForProfiles(perfisProdutos);
	const ibptRates = await loadIbptRatesForSale({ perfisProdutos, uf: organizacao.fiscalConfiguracao?.endereco.uf });

	const context: TFiscalSaleContext = {
		venda,
		organizacao,
		serie,
		operacao,
		perfisProdutos,
		gruposTributarios,
		ibptRates,
		destinatarioSnapshot: buildDestinatarioSnapshot(venda),
		pagamentos,
	};

	return { context, tipoDocumento };
}

function buildSimulationDocument({
	organizationId,
	saleId,
	tipoDocumento,
	serie,
}: {
	organizationId: string;
	saleId: string;
	tipoDocumento: "NFCE" | "NFE";
	serie: string;
}) {
	return {
		id: `simulacao-${saleId}`,
		organizacaoId: organizationId,
		vendaId: saleId,
		tipo: tipoDocumento,
		status: "PENDENTE",
		statusInterno: "RASCUNHO",
		ambiente: "HOMOLOGACAO",
		referencia: `SIMULACAO:${saleId}`,
		serie,
		numero: null,
		chaveAcessoReferencia: null,
	} as TFiscalDocument;
}

async function simulateSale({ venda, organizationId }: { venda: TFiscalSaleContext["venda"]; organizationId: string }) {
	try {
		const { context, tipoDocumento } = await buildSaleFiscalContext({ venda, organizationId });
		const taxation = computeSaleTaxation(context);
		const documento = buildSimulationDocument({
			organizationId,
			saleId: venda.id,
			tipoDocumento,
			serie: context.serie.serie,
		});
		const payload = tipoDocumento === "NFCE" ? mapSaleContextToNfcePayload(context, documento) : mapSaleContextToNfePayload(context, documento);
		const existingDocuments = await db.query.fiscalOutboundDocuments.findMany({
			where: (fields, operators) => operators.and(operators.eq(fields.organizacaoId, organizationId), operators.eq(fields.vendaId, venda.id)),
			orderBy: (fields, operators) => operators.desc(fields.dataInsercao),
		});

		return {
			ok: true,
			venda: {
				id: venda.id,
				idExterno: venda.idExterno,
				dataVenda: venda.dataVenda?.toISOString() ?? null,
				valorTotal: venda.valorTotal,
				statusVenda: venda.statusVenda,
				canal: venda.canal,
				entregaModalidade: venda.entregaModalidade,
				itensQuantidade: venda.itens.length,
			},
			documento: {
				tipo: tipoDocumento,
				operacaoId: context.operacao.id,
				operacaoNome: context.operacao.nome,
				serieId: context.serie.id,
				serie: context.serie.serie,
				proximoNumeroSimulado: context.serie.proximoNumero,
				documentosExistentes: existingDocuments.map((document) => ({
					id: document.id,
					tipo: document.tipo,
					status: document.status,
					statusInterno: document.statusInterno,
					chaveAcesso: document.chaveAcesso,
					numero: document.numero,
					serie: document.serie,
				})),
			},
			cenario: taxation.scenario,
			totais: {
				...taxation.totais,
				valorTotalVenda: venda.valorTotal,
				diferencaValorNotaVenda: Math.round((taxation.totais.vNF - venda.valorTotal + Number.EPSILON) * 100) / 100,
			},
			itens: taxation.itens.map(({ item, result }, index) => ({
				nItem: index + 1,
				itemVendaId: item.id,
				produtoId: item.produtoId,
				produtoVarianteId: item.produtoVarianteId,
				idExternoVenda: venda.idExterno,
				quantidade: item.quantidade,
				valorUnitario: item.valorVendaUnitario,
				valorBruto: item.valorVendaTotalBruto,
				valorDesconto: item.valorTotalDesconto,
				valorLiquido: item.valorVendaTotalLiquido,
				cfop: result.cfop,
				imposto: result,
			})),
			erros: taxation.erros,
			pagamentos: context.pagamentos,
			payloadNuvemFiscalEmulado: payload,
		};
	} catch (error) {
		return {
			ok: false,
			venda: {
				id: venda.id,
				idExterno: venda.idExterno,
				dataVenda: venda.dataVenda?.toISOString() ?? null,
				valorTotal: venda.valorTotal,
				itensQuantidade: venda.itens.length,
			},
			erro: error instanceof Error ? { name: error.name, message: error.message, stack: error.stack } : { message: String(error) },
		};
	}
}

async function saveOutput({ outputPath, payload }: { outputPath: string; payload: unknown }) {
	const resolvedOutputPath = path.resolve(process.cwd(), outputPath);
	await mkdir(path.dirname(resolvedOutputPath), { recursive: true });
	await writeFile(resolvedOutputPath, JSON.stringify(payload, null, 2), "utf-8");
	return resolvedOutputPath;
}

async function main() {
	const options = parseOptions();
	if (!options) {
		printHelp();
		return;
	}

	console.log(`[${SCRIPT_NAME}] Buscando vendas`, {
		organizationId: options.organizationId,
		startDate: options.startDate.toISOString(),
		endDate: options.endDate.toISOString(),
		timezone: options.timezone,
	});

	const vendas = await loadSalesForWindow(options);
	const results = [];
	for (const venda of vendas) {
		results.push(await simulateSale({ venda, organizationId: options.organizationId }));
	}

	const payload = {
		meta: {
			geradoEm: new Date().toISOString(),
			organizacaoId: options.organizationId,
			intervalo: {
				inicio: options.startDate.toISOString(),
				fim: options.endDate.toISOString(),
				timezone: options.timezone,
			},
			observacao: "Simulação local. Não emite nota, não cria documento fiscal e não reserva numeração.",
		},
		resumo: {
			totalVendas: vendas.length,
			simulacoesOk: results.filter((result) => result.ok).length,
			simulacoesComErro: results.filter((result) => !result.ok).length,
			totalDocumentosExistentes: results.reduce((total, result) => {
				const documento = "documento" in result ? result.documento : null;
				return total + (documento?.documentosExistentes.length ?? 0);
			}, 0),
		},
		vendas: results,
	};

	const resolvedOutputPath = await saveOutput({ outputPath: options.outputPath, payload });
	console.log(`[${SCRIPT_NAME}] Simulação salva em ${resolvedOutputPath}`);
	console.log(`[${SCRIPT_NAME}] Resumo`, payload.resumo);
}

void main()
	.catch((error) => {
		console.error(`[${SCRIPT_NAME}] Falha ao simular impostos.`);
		console.error(error);
		process.exitCode = 1;
	})
	.finally(async () => {
		await connection.end().catch((error) => {
			console.error(`[${SCRIPT_NAME}] Erro ao fechar conexão com o banco:`, error instanceof Error ? error.message : String(error));
		});
	});
