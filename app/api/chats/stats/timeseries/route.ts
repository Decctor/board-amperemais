import { appApiHandler } from "@/lib/app-api";
import { getCurrentSessionUncached } from "@/lib/authentication/session";
import type { TAuthUserSession } from "@/lib/authentication/types";
import { CHAT_ANALYTICS_TIMEZONE, inOperationTimezone, naiveUtcParam, resolveGranularity } from "@/lib/chats/analytics";
import { assertChatAccess } from "@/lib/chats/access";
import { db } from "@/services/drizzle";
import { chatAssignments, chatMessages, chats } from "@/services/drizzle/schema/chats";
import { and, between, eq, sql } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";

// ============= GET - Série temporal e carga por hora =============

const dateField = (label: string) =>
	z
		.string({ invalid_type_error: `Tipo inválido para ${label}.` })
		.datetime({ message: `Tipo inválido para ${label}.` })
		.optional()
		.nullable()
		.transform((v) => (v ? new Date(v) : null));

const GetChatsStatsTimeseriesInputSchema = z.object({
	startDate: dateField("período"),
	endDate: dateField("período"),
	whatsappConexaoTelefoneId: z.string({ invalid_type_error: "Tipo inválido para o ID do telefone da conexão." }).optional().nullable(),
});
export type TGetChatsStatsTimeseriesInput = z.infer<typeof GetChatsStatsTimeseriesInputSchema>;

type TSeriesRow = { bucket: string; abertos: number; encerrados: number; resolvidos: number; primeiraRespostaMediana: number | null };
type THeatmapRow = { diaSemana: number; hora: number; mensagensRecebidas: number; atendimentosAbertos: number };

/**
 * Série por bucket, com os dias sem movimento preenchidos por `generate_series`.
 *
 * Sem o `generate_series`, um dia sem atendimento simplesmente não voltaria, e o gráfico
 * ligaria segunda a quarta como se terça não tivesse existido — a leitura vira otimista
 * justamente nos buracos, que são o que interessa observar.
 *
 * As três contagens saem de coortes diferentes (abertura, encerramento, resolução), então
 * cada uma é agregada na sua própria CTE e ligada ao bucket por `left join`. Somá-las numa
 * agregação só exigiria uma data única por linha, que não existe.
 */
async function fetchSeries({
	organizacaoId,
	whatsappConexaoTelefoneId,
	startDate,
	endDate,
	granularidade,
}: {
	organizacaoId: string;
	whatsappConexaoTelefoneId?: string | null;
	startDate: Date;
	endDate: Date;
	granularidade: "DIA" | "SEMANA";
}) {
	const step = granularidade === "SEMANA" ? sql.raw("'1 week'") : sql.raw("'1 day'");
	const unit = granularidade === "SEMANA" ? sql.raw("'week'") : sql.raw("'day'");
	const phoneFilter = whatsappConexaoTelefoneId ? sql`and c.whatsapp_conexao_telefone_id = ${whatsappConexaoTelefoneId}` : sql``;
	// Datas viram parâmetros tipados: um `Date` cru dentro do template estoura no driver.
	const inicio = naiveUtcParam(startDate);
	const fim = naiveUtcParam(endDate);

	const result = await db.execute<TSeriesRow>(sql`
		with buckets as (
			select generate_series(
				date_trunc(${unit}, ${inOperationTimezone(inicio)}),
				date_trunc(${unit}, ${inOperationTimezone(fim)}),
				${step}::interval
			) as bucket
		),
		aberturas as (
			select
				date_trunc(${unit}, a.data_insercao at time zone 'UTC' at time zone ${CHAT_ANALYTICS_TIMEZONE}) as bucket,
				count(*)::int as abertos,
				(percentile_cont(0.5) within group (
					order by extract(epoch from (a.data_primeira_resposta - a.data_insercao))::float8
				))::float8 as primeira_resposta_mediana
			from ampmais_chat_assignments a
			join ampmais_chats c on c.id = a.chat_id
			where a.organizacao_id = ${organizacaoId}
				and a.data_insercao between ${inicio} and ${fim}
				${phoneFilter}
			group by 1
		),
		encerramentos as (
			select date_trunc(${unit}, a.data_encerramento at time zone 'UTC' at time zone ${CHAT_ANALYTICS_TIMEZONE}) as bucket, count(*)::int as encerrados
			from ampmais_chat_assignments a
			join ampmais_chats c on c.id = a.chat_id
			where a.organizacao_id = ${organizacaoId}
				and a.data_encerramento between ${inicio} and ${fim}
				${phoneFilter}
			group by 1
		),
		resolucoes as (
			select date_trunc(${unit}, a.data_resolucao at time zone 'UTC' at time zone ${CHAT_ANALYTICS_TIMEZONE}) as bucket, count(*)::int as resolvidos
			from ampmais_chat_assignments a
			join ampmais_chats c on c.id = a.chat_id
			where a.organizacao_id = ${organizacaoId}
				and a.data_resolucao between ${inicio} and ${fim}
				${phoneFilter}
			group by 1
		)
		select
			b.bucket,
			coalesce(ab.abertos, 0) as "abertos",
			coalesce(en.encerrados, 0) as "encerrados",
			coalesce(re.resolvidos, 0) as "resolvidos",
			ab.primeira_resposta_mediana as "primeiraRespostaMediana"
		from buckets b
		left join aberturas ab on ab.bucket = b.bucket
		left join encerramentos en on en.bucket = b.bucket
		left join resolucoes re on re.bucket = b.bucket
		order by b.bucket asc
	`);

	return [...result].map((row) => ({
		data: new Date(row.bucket),
		abertos: Number(row.abertos ?? 0),
		encerrados: Number(row.encerrados ?? 0),
		resolvidos: Number(row.resolvidos ?? 0),
		primeiraRespostaMediana: row.primeiraRespostaMediana === null ? null : Number(row.primeiraRespostaMediana),
	}));
}

/**
 * Carga por dia da semana × hora, no fuso da operação.
 *
 * Responde "quando precisamos de gente na linha" — a única pergunta da aba que dimensiona
 * escala, e que nenhuma série diária responde: dois dias com o mesmo total podem ter
 * concentrações completamente diferentes.
 */
async function fetchHeatmap({
	organizacaoId,
	whatsappConexaoTelefoneId,
	startDate,
	endDate,
}: {
	organizacaoId: string;
	whatsappConexaoTelefoneId?: string | null;
	startDate: Date;
	endDate: Date;
}) {
	const phoneCondition = whatsappConexaoTelefoneId ? eq(chats.whatsappConexaoTelefoneId, whatsappConexaoTelefoneId) : undefined;
	const localMessageDate = inOperationTimezone(chatMessages.dataEnvio);
	const localAssignmentDate = inOperationTimezone(chatAssignments.dataInsercao);

	const [mensagens, aberturas] = await Promise.all([
		db
			.select({
				diaSemana: sql<number>`extract(dow from ${localMessageDate})::int`,
				hora: sql<number>`extract(hour from ${localMessageDate})::int`,
				quantidade: sql<number>`count(*)::int`,
			})
			.from(chatMessages)
			.innerJoin(chats, eq(chatMessages.chatId, chats.id))
			.where(
				and(
					eq(chatMessages.organizacaoId, organizacaoId),
					eq(chatMessages.autorTipo, "CLIENTE"),
					between(chatMessages.dataEnvio, startDate, endDate),
					phoneCondition,
				),
			)
			.groupBy(sql`1`, sql`2`),
		db
			.select({
				diaSemana: sql<number>`extract(dow from ${localAssignmentDate})::int`,
				hora: sql<number>`extract(hour from ${localAssignmentDate})::int`,
				quantidade: sql<number>`count(*)::int`,
			})
			.from(chatAssignments)
			.innerJoin(chats, eq(chatAssignments.chatId, chats.id))
			.where(and(eq(chatAssignments.organizacaoId, organizacaoId), between(chatAssignments.dataInsercao, startDate, endDate), phoneCondition))
			.groupBy(sql`1`, sql`2`),
	]);

	// A grade completa (7 × 24) sai daqui, não do SQL: um heatmap com buracos não é um
	// heatmap, e preencher 168 células em memória é mais barato que um cross join.
	const mensagensPorCelula = new Map(mensagens.map((row) => [`${row.diaSemana}-${row.hora}`, row.quantidade]));
	const aberturasPorCelula = new Map(aberturas.map((row) => [`${row.diaSemana}-${row.hora}`, row.quantidade]));

	const carga: THeatmapRow[] = [];
	for (let diaSemana = 0; diaSemana < 7; diaSemana++) {
		for (let hora = 0; hora < 24; hora++) {
			const chave = `${diaSemana}-${hora}`;
			carga.push({
				diaSemana,
				hora,
				mensagensRecebidas: mensagensPorCelula.get(chave) ?? 0,
				atendimentosAbertos: aberturasPorCelula.get(chave) ?? 0,
			});
		}
	}

	return carga;
}

async function getChatsStatsTimeseries({ session, input }: { session: TAuthUserSession; input: TGetChatsStatsTimeseriesInput }) {
	const { organizacaoId } = assertChatAccess({ session, permission: "visualizar" });

	const endDate = input.endDate ?? new Date();
	const startDate = input.startDate ?? new Date(endDate.getTime() - 30 * 24 * 60 * 60 * 1000);
	const granularidade = resolveGranularity({ startDate, endDate });

	const [serie, carga] = await Promise.all([
		fetchSeries({ organizacaoId, whatsappConexaoTelefoneId: input.whatsappConexaoTelefoneId, startDate, endDate, granularidade }),
		fetchHeatmap({ organizacaoId, whatsappConexaoTelefoneId: input.whatsappConexaoTelefoneId, startDate, endDate }),
	]);

	return {
		data: { granularidade, serie, carga },
		message: "Série de atendimentos carregada com sucesso.",
	};
}
export type TGetChatsStatsTimeseriesOutput = Awaited<ReturnType<typeof getChatsStatsTimeseries>>;

async function getChatsStatsTimeseriesRoute(req: NextRequest) {
	const session = await getCurrentSessionUncached();
	const searchParams = req.nextUrl.searchParams;
	const input = GetChatsStatsTimeseriesInputSchema.parse({
		startDate: searchParams.get("startDate"),
		endDate: searchParams.get("endDate"),
		whatsappConexaoTelefoneId: searchParams.get("whatsappConexaoTelefoneId"),
	});

	const result = await getChatsStatsTimeseries({ session: session as TAuthUserSession, input });
	return NextResponse.json(result, { status: 200 });
}

// ============= Export handlers =============

export const GET = appApiHandler({ GET: getChatsStatsTimeseriesRoute });
