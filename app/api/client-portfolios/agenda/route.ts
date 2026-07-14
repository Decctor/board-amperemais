import { appApiHandler } from "@/lib/app-api";
import { getCurrentSessionUncached } from "@/lib/authentication/session";
import type { TAuthUserSession } from "@/lib/authentication/types";
import { getDayFollowUps } from "@/lib/client-portfolios/queue";
import { resolveClientPortfolioSeller } from "@/lib/client-portfolios/resolve-seller";
import { db } from "@/services/drizzle";
import { interactions } from "@/services/drizzle/schema";
import dayjs from "dayjs";
import { and, count, eq, gte, inArray, isNotNull, lt, lte } from "drizzle-orm";
import createHttpError from "http-errors";
import { type NextRequest, NextResponse } from "next/server";
import z from "zod";

const GetAgendaInputSchema = z
	.object({
		vendedorId: z
			.string({ invalid_type_error: "Tipo inválido para o ID do vendedor." })
			.optional()
			.nullable()
			.transform((v) => v || null),
		// Modo dia: lista de follow-ups do dia informado (YYYY-MM-DD).
		date: z
			.string({ invalid_type_error: "Tipo inválido para a data." })
			.optional()
			.nullable()
			.transform((v) => (v ? new Date(`${v}T12:00:00`) : null)),
		// Modo calendário: interações agrupadas por dia no intervalo do mês visível.
		monthStart: z
			.string({ invalid_type_error: "Tipo inválido para o início do mês." })
			.optional()
			.nullable()
			.transform((v) => (v ? new Date(v) : null)),
		monthEnd: z
			.string({ invalid_type_error: "Tipo inválido para o fim do mês." })
			.optional()
			.nullable()
			.transform((v) => (v ? new Date(v) : null)),
	})
	.refine((input) => input.date || (input.monthStart && input.monthEnd), {
		message: "Informe uma data (modo dia) ou um intervalo de mês (modo calendário).",
	});
export type TGetAgendaInput = z.infer<typeof GetAgendaInputSchema>;

async function getAgendaCalendar({ organizacaoId, vendedorId, monthStart, monthEnd }: { organizacaoId: string; vendedorId: string; monthStart: Date; monthEnd: Date }) {
	const startOfToday = dayjs().startOf("day").toDate();

	const rows = await db.query.interactions.findMany({
		where: and(
			eq(interactions.organizacaoId, organizacaoId),
			eq(interactions.vendedorId, vendedorId),
			inArray(interactions.status, ["PLANEJADA", "REALIZADA"]),
			isNotNull(interactions.dataInteracao),
			gte(interactions.dataInteracao, monthStart),
			lte(interactions.dataInteracao, monthEnd),
		),
		columns: { id: true, titulo: true, status: true, dataInteracao: true },
	});

	// Agrupamento server-side por dia (mesmo formato do calendário de atividades do Control).
	const days: Record<string, { id: string; titulo: string; status: string }[]> = {};
	let planejadasMes = 0;
	let realizadasMes = 0;
	for (const row of rows) {
		if (!row.dataInteracao) continue;
		const key = dayjs(row.dataInteracao).format("YYYY-MM-DD");
		days[key] = days[key] ?? [];
		days[key].push({ id: row.id, titulo: row.titulo, status: row.status ?? "PLANEJADA" });
		if (row.status === "REALIZADA") realizadasMes += 1;
		else planejadasMes += 1;
	}

	// Atrasadas é débito real: PLANEJADA vencida, independente do mês visível.
	const [overdue] = await db
		.select({ qtde: count(interactions.id) })
		.from(interactions)
		.where(
			and(
				eq(interactions.organizacaoId, organizacaoId),
				eq(interactions.vendedorId, vendedorId),
				eq(interactions.status, "PLANEJADA"),
				isNotNull(interactions.dataInteracao),
				lt(interactions.dataInteracao, startOfToday),
			),
		);

	return {
		days,
		stats: {
			planejadasMes,
			realizadasMes,
			atrasadas: Number(overdue?.qtde ?? 0),
		},
	};
}

async function getAgenda({ input, session }: { input: TGetAgendaInput; session: TAuthUserSession }) {
	const { organizacaoId, seller } = await resolveClientPortfolioSeller({ session, explicitSellerId: input.vendedorId });

	if (input.date) {
		const day = await getDayFollowUps({ organizacaoId, vendedorId: seller.id, date: input.date });
		return { data: { day, calendar: null }, message: "Agenda do dia carregada com sucesso." };
	}

	if (!input.monthStart || !input.monthEnd) throw new createHttpError.BadRequest("Intervalo de mês não informado.");
	const calendar = await getAgendaCalendar({ organizacaoId, vendedorId: seller.id, monthStart: input.monthStart, monthEnd: input.monthEnd });
	return { data: { day: null, calendar }, message: "Calendário carregado com sucesso." };
}
export type TGetAgendaOutput = Awaited<ReturnType<typeof getAgenda>>;

async function getAgendaRoute(request: NextRequest) {
	const session = await getCurrentSessionUncached();
	if (!session) throw new createHttpError.Unauthorized("Você não está autenticado.");
	if (!session.membership) throw new createHttpError.Unauthorized("Você precisa estar vinculado a uma organização.");
	if (!session.membership.organizacao.configuracao.preferencias.carteirasClientes?.habilitado)
		throw new createHttpError.Forbidden("O módulo de carteira de clientes não está habilitado para esta organização.");

	const { searchParams } = new URL(request.url);
	const input = GetAgendaInputSchema.parse({
		vendedorId: searchParams.get("vendedorId"),
		date: searchParams.get("date"),
		monthStart: searchParams.get("monthStart"),
		monthEnd: searchParams.get("monthEnd"),
	});
	const result = await getAgenda({ input, session });
	return NextResponse.json(result, { status: 200 });
}

export const GET = appApiHandler({ GET: getAgendaRoute });
