import { appApiHandler } from "@/lib/app-api";
import { getCurrentSessionUncached } from "@/lib/authentication/session";
import type { TAuthUserSession } from "@/lib/authentication/types";
import { resolveResultsScopeSellerIds } from "@/lib/permissions/results-scope";
import { db } from "@/services/drizzle";
import { sales } from "@/services/drizzle/schema";
import dayjs from "dayjs";
import { and, eq, gte, inArray, lte, sql } from "drizzle-orm";
import createHttpError from "http-errors";
import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const MAX_DAYS = 31;

/**
 * Pulso de vendas do dashboard: hoje, o mesmo dia da semana anterior e a série diária dos últimos N
 * dias, em uma única consulta. O cliente manda o início do "hoje" no seu fuso; os dias são
 * cortados em blocos de 24h a partir dele, para que o balcão em Brasília veja o dia de Brasília.
 */
const GetSalesPulseInputSchema = z.object({
	dayStart: z
		.string({ required_error: "Início do dia não informado.", invalid_type_error: "Tipo inválido para o início do dia." })
		.datetime({ message: "Tipo inválido para o início do dia." })
		.transform((v) => new Date(v)),
	days: z
		.string({ invalid_type_error: "Tipo inválido para a quantidade de dias." })
		.optional()
		.nullable()
		.transform((v) => (v ? Math.min(Math.max(Number(v), 1), MAX_DAYS) : 7)),
});
export type TGetSalesPulseInput = z.infer<typeof GetSalesPulseInputSchema>;

type TDailyBucket = { faturamento: number; qtdeVendas: number };

async function getSalesPulse({ input, session }: { input: TGetSalesPulseInput; session: TAuthUserSession }) {
	const membership = session.membership;
	if (!membership) throw new createHttpError.Unauthorized("Você precisa estar vinculado a uma organização para acessar esse recurso.");
	if (!membership.permissoes.resultados.visualizar) throw new createHttpError.Forbidden("Você não possui permissão para visualizar resultados.");
	const organizacaoId = membership.organizacao.id;

	const dayStart = dayjs(input.dayStart);
	const dayEnd = dayStart.add(1, "day");
	// Uma semana a mais para trás: o deslocamento -7 é o mesmo dia da semana anterior.
	const windowStart = dayStart.subtract(7, "day");

	const scopeSellersIds = await resolveResultsScopeSellerIds({ organizacaoId, resultsScope: membership.permissoes.resultados.escopo });
	const buckets = new Map<number, TDailyBucket>();

	// Escopo restrito sem vendedores vinculados: não há o que somar (e `inArray([])` seria inválido).
	if (scopeSellersIds === null || scopeSellersIds.length > 0) {
		const conditions = [
			eq(sales.organizacaoId, organizacaoId),
			eq(sales.statusVenda, "CONFIRMADA"),
			gte(sales.dataVenda, windowStart.toDate()),
			lte(sales.dataVenda, dayEnd.toDate()),
		];
		if (scopeSellersIds) conditions.push(inArray(sales.vendedorId, scopeSellersIds));

		// Deslocamento em dias a partir do início de hoje (negativo = dias anteriores). Ambos os lados são
		// instantes UTC gravados como timestamp sem fuso, como no restante das consultas de vendas.
		const dayOffset = sql<number>`floor(extract(epoch from (${sales.dataVenda} - ${dayStart.toISOString()}::timestamp)) / 86400)::int`;
		const rows = await db
			.select({
				offset: dayOffset,
				faturamento: sql<number>`coalesce(sum(${sales.valorTotal}), 0)`,
				qtdeVendas: sql<number>`count(*)`,
			})
			.from(sales)
			.where(and(...conditions))
			.groupBy(dayOffset);

		for (const row of rows) buckets.set(Number(row.offset), { faturamento: Number(row.faturamento), qtdeVendas: Number(row.qtdeVendas) });
	}

	const bucketAt = (offset: number): TDailyBucket => buckets.get(offset) ?? { faturamento: 0, qtdeVendas: 0 };
	const hoje = bucketAt(0);
	const serie = Array.from({ length: input.days }, (_, index) => {
		const offset = index - (input.days - 1);
		const day = dayStart.add(offset, "day");
		return { dia: day.toISOString(), rotulo: day.format("DD/MM"), ...bucketAt(offset) };
	});

	return {
		data: {
			hoje: { ...hoje, ticketMedio: hoje.qtdeVendas > 0 ? hoje.faturamento / hoje.qtdeVendas : 0 },
			mesmoDiaSemanaAnterior: bucketAt(-7),
			serie,
		},
		message: "Pulso de vendas recuperado com sucesso.",
	};
}
export type TGetSalesPulseOutput = Awaited<ReturnType<typeof getSalesPulse>>;

async function getSalesPulseRoute(request: NextRequest) {
	const session = await getCurrentSessionUncached();
	if (!session) throw new createHttpError.Unauthorized("Você não está autenticado.");
	const searchParams = request.nextUrl.searchParams;
	const input = GetSalesPulseInputSchema.parse({ dayStart: searchParams.get("dayStart"), days: searchParams.get("days") });
	const result = await getSalesPulse({ input, session });
	return NextResponse.json(result);
}

export const GET = appApiHandler({ GET: getSalesPulseRoute });
