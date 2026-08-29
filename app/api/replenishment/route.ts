import { appApiHandler } from "@/lib/app-api";
import { getCurrentSessionUncached } from "@/lib/authentication/session";
import type { TAuthUserSession } from "@/lib/authentication/types";
import { getReplenishmentAnalysis, type TGetReplenishmentAnalysisInput } from "@/lib/replenishment/get-replenishment-analysis";
import { getReplenishmentSettings, resolveEffectiveSettings } from "@/lib/replenishment/settings";
import { ReplenishmentStatusEnum, StockPositionSourceEnum } from "@/schemas/enums";
import createHttpError from "http-errors";
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

const PAGE_SIZE = 30;

// Os parâmetros de simulação chegam na query string e alimentam diretamente o cálculo (e a
// expressão de janela do SQL). Um "abc" viraria NaN e um 99999 varreria o histórico inteiro, então
// cada um é limitado às mesmas faixas que o formulário de política aceita.
function parseBoundedInteger(value: string | null | undefined, { min, max }: { min: number; max: number }) {
	if (!value) return undefined;
	const parsed = Number(value);
	if (!Number.isFinite(parsed)) return undefined;
	return Math.min(Math.max(Math.trunc(parsed), min), max);
}

function parseBoundedNumber(value: string | null | undefined, { min, max }: { min: number; max: number }) {
	if (!value) return undefined;
	const parsed = Number(value);
	if (!Number.isFinite(parsed)) return undefined;
	return Math.min(Math.max(parsed, min), max);
}

const GetReplenishmentInputSchema = z.object({
	page: z
		.string({ invalid_type_error: "Tipo não válido para página." })
		.optional()
		.nullable()
		.transform((value) => (value ? Math.max(Number(value), 1) : 1)),
	search: z
		.string({ invalid_type_error: "Tipo não válido para busca." })
		.optional()
		.nullable()
		.transform((value) => value?.trim() ?? ""),
	groups: z
		.string({ invalid_type_error: "Tipo não válido para grupos." })
		.optional()
		.nullable()
		.transform((value) => (value ? value.split(",").filter(Boolean) : [])),
	productIds: z
		.string({ invalid_type_error: "Tipo não válido para produtos." })
		.optional()
		.nullable()
		.transform((value) => (value ? value.split(",").filter(Boolean) : [])),
	supplierIds: z
		.string({ invalid_type_error: "Tipo não válido para fornecedores." })
		.optional()
		.nullable()
		.transform((value) => (value ? value.split(",").filter(Boolean) : [])),
	status: z
		.string({ invalid_type_error: "Tipo não válido para situação." })
		.optional()
		.nullable()
		.transform((value) => (value ? value.split(",").filter(Boolean) : []))
		.pipe(z.array(ReplenishmentStatusEnum)),
	abcClasses: z
		.string({ invalid_type_error: "Tipo não válido para curva ABC." })
		.optional()
		.nullable()
		.transform((value) => (value ? value.split(",").filter(Boolean) : []))
		.pipe(z.array(z.enum(["A", "B", "C"]))),
	// É o filtro central da tela: "me mostre tudo que tem menos de N dias de estoque".
	coberturaMaximaDias: z
		.string({ invalid_type_error: "Tipo não válido para cobertura máxima." })
		.optional()
		.nullable()
		.transform((value) => (value ? Number(value) : null)),
	coberturaMinimaDias: z
		.string({ invalid_type_error: "Tipo não válido para cobertura mínima." })
		.optional()
		.nullable()
		.transform((value) => (value ? Number(value) : null)),
	apenasSugestoes: z
		.string({ invalid_type_error: "Tipo não válido para apenas sugestões." })
		.optional()
		.nullable()
		.transform((value) => value === "true"),
	incluirSobressalentes: z
		.string({ invalid_type_error: "Tipo não válido para incluir sobressalentes." })
		.optional()
		.nullable()
		.transform((value) => value !== "false"),
	incluirDescontinuados: z
		.string({ invalid_type_error: "Tipo não válido para incluir descontinuados." })
		.optional()
		.nullable()
		.transform((value) => value === "true"),
	origemEstoque: z
		.string({ invalid_type_error: "Tipo não válido para origem do estoque." })
		.optional()
		.nullable()
		.transform((value) => (value ? StockPositionSourceEnum.parse(value) : null)),
	orderByField: z
		.enum(["prioridade", "cobertura", "perdaPotencial", "valorSugestao", "nome", "codigo", "estoque", "demanda"], {
			invalid_type_error: "Tipo não válido para ordenação.",
		})
		.optional()
		.nullable()
		.transform((value) => value ?? "prioridade"),
	orderByDirection: z
		.enum(["asc", "desc"], { invalid_type_error: "Tipo não válido para direção da ordenação." })
		.optional()
		.nullable()
		.transform((value) => value ?? "desc"),
	// Simulações: sobrescrevem a política salva apenas para esta leitura.
	janelaAnaliseDias: z
		.string({ invalid_type_error: "Tipo não válido para janelaAnaliseDias." })
		.optional()
		.nullable()
		.transform((value) => parseBoundedInteger(value, { min: 30, max: 365 })),
	leadTimeDiasPadrao: z
		.string({ invalid_type_error: "Tipo não válido para leadTimeDiasPadrao." })
		.optional()
		.nullable()
		.transform((value) => parseBoundedInteger(value, { min: 0, max: 365 })),
	diasCoberturaAlvo: z
		.string({ invalid_type_error: "Tipo não válido para diasCoberturaAlvo." })
		.optional()
		.nullable()
		.transform((value) => parseBoundedInteger(value, { min: 1, max: 365 })),
	nivelServico: z
		.string({ invalid_type_error: "Tipo não válido para nivelServico." })
		.optional()
		.nullable()
		.transform((value) => parseBoundedNumber(value, { min: 0.5, max: 0.999 })),
	diasExcessoLimite: z
		.string({ invalid_type_error: "Tipo não válido para diasExcessoLimite." })
		.optional()
		.nullable()
		.transform((value) => parseBoundedInteger(value, { min: 1, max: 720 })),
});

export type TGetReplenishmentInput = z.infer<typeof GetReplenishmentInputSchema>;

export function buildReplenishmentAnalysisInput(input: TGetReplenishmentInput, pageSize: number | null): TGetReplenishmentAnalysisInput {
	return {
		search: input.search,
		groups: input.groups,
		productIds: input.productIds,
		supplierIds: input.supplierIds,
		status: input.status,
		abcClasses: input.abcClasses,
		coberturaMaximaDias: input.coberturaMaximaDias,
		coberturaMinimaDias: input.coberturaMinimaDias,
		apenasSugestoes: input.apenasSugestoes,
		incluirSobressalentes: input.incluirSobressalentes,
		incluirDescontinuados: input.incluirDescontinuados,
		orderByField: input.orderByField,
		orderByDirection: input.orderByDirection,
		page: input.page,
		pageSize,
	};
}

export function parseReplenishmentSearchParams(searchParams: URLSearchParams) {
	return GetReplenishmentInputSchema.parse({
		page: searchParams.get("page"),
		search: searchParams.get("search"),
		groups: searchParams.get("groups"),
		productIds: searchParams.get("productIds"),
		supplierIds: searchParams.get("supplierIds"),
		status: searchParams.get("status"),
		abcClasses: searchParams.get("abcClasses"),
		coberturaMaximaDias: searchParams.get("coberturaMaximaDias"),
		coberturaMinimaDias: searchParams.get("coberturaMinimaDias"),
		apenasSugestoes: searchParams.get("apenasSugestoes"),
		incluirSobressalentes: searchParams.get("incluirSobressalentes"),
		incluirDescontinuados: searchParams.get("incluirDescontinuados"),
		origemEstoque: searchParams.get("origemEstoque"),
		orderByField: searchParams.get("orderByField"),
		orderByDirection: searchParams.get("orderByDirection"),
		janelaAnaliseDias: searchParams.get("janelaAnaliseDias"),
		leadTimeDiasPadrao: searchParams.get("leadTimeDiasPadrao"),
		diasCoberturaAlvo: searchParams.get("diasCoberturaAlvo"),
		nivelServico: searchParams.get("nivelServico"),
		diasExcessoLimite: searchParams.get("diasExcessoLimite"),
	});
}

export async function resolveReplenishmentContext({ input, session }: { input: TGetReplenishmentInput; session: TAuthUserSession }) {
	const organizationId = session.membership?.organizacao.id;
	if (!organizationId) throw new createHttpError.Unauthorized("Você precisa estar vinculado a uma organização para acessar esse recurso.");
	if (!session.membership?.permissoes.compras.visualizar)
		throw new createHttpError.Unauthorized("Você não possui permissão para acessar esse recurso.");

	const stored = await getReplenishmentSettings({ organizationId });
	const settings = resolveEffectiveSettings({
		stored,
		overrides: {
			janelaAnaliseDias: input.janelaAnaliseDias,
			leadTimeDiasPadrao: input.leadTimeDiasPadrao,
			diasCoberturaAlvo: input.diasCoberturaAlvo,
			nivelServico: input.nivelServico,
			diasExcessoLimite: input.diasExcessoLimite,
			origemEstoquePadrao: input.origemEstoque ?? undefined,
		},
	});

	return { organizationId, settings };
}

async function getReplenishment({ input, session }: { input: TGetReplenishmentInput; session: TAuthUserSession }) {
	const { organizationId, settings } = await resolveReplenishmentContext({ input, session });

	const analysis = await getReplenishmentAnalysis({
		input: buildReplenishmentAnalysisInput(input, PAGE_SIZE),
		organizationId,
		settings,
	});

	return { data: analysis, message: "Análise de reposição calculada com sucesso." };
}

export type TGetReplenishmentOutput = Awaited<ReturnType<typeof getReplenishment>>;

async function getReplenishmentRoute(request: NextRequest) {
	const session = await getCurrentSessionUncached();
	if (!session) throw new createHttpError.Unauthorized("Você não está autenticado.");

	const input = parseReplenishmentSearchParams(request.nextUrl.searchParams);
	const result = await getReplenishment({ input, session });

	return NextResponse.json(result);
}

export const GET = appApiHandler({ GET: getReplenishmentRoute });
