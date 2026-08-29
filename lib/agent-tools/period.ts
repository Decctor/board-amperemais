import dayjs from "dayjs";
import z from "zod";

/**
 * Período padrão quando o modelo não informa um.
 *
 * Ter um default explícito e documentado na descrição de cada ferramenta é o que faz os números
 * baterem entre clientes: sem isso, Claude assume "este mês", ChatGPT assume "últimos 7 dias", e
 * o lojista recebe dois faturamentos diferentes para a mesma pergunta.
 */
export const DEFAULT_PERIOD_DAYS = 30;

export const PERIOD_DESCRIPTION = `Período de análise em datas ISO (YYYY-MM-DD ou datetime completo). Quando omitido, usa os últimos ${DEFAULT_PERIOD_DAYS} dias.`;

export const PeriodInputSchema = z
	.object({
		inicio: z.string({ invalid_type_error: "Tipo inválido para o início do período." }).optional().nullable(),
		fim: z.string({ invalid_type_error: "Tipo inválido para o fim do período." }).optional().nullable(),
	})
	.optional()
	.nullable();

export type TPeriodInput = z.infer<typeof PeriodInputSchema>;

export type TResolvedPeriod = {
	after: Date;
	before: Date;
	inicio: string;
	fim: string;
};

/**
 * `fim` sempre fecha no fim do dia: o modelo escreve "até 31/03" querendo dizer o dia 31 inteiro,
 * e um `2026-03-31T00:00:00` cortaria fora um dia inteiro de vendas sem nenhum aviso.
 */
export function resolvePeriod(period: TPeriodInput): TResolvedPeriod {
	const rawEnd = period?.fim ? dayjs(period.fim) : dayjs();
	const end = rawEnd.isValid() ? rawEnd.endOf("day") : dayjs().endOf("day");

	const rawStart = period?.inicio ? dayjs(period.inicio) : end.subtract(DEFAULT_PERIOD_DAYS, "days");
	const start = (rawStart.isValid() ? rawStart : end.subtract(DEFAULT_PERIOD_DAYS, "days")).startOf("day");

	// Intervalo invertido é erro de digitação do modelo, não intenção: normaliza em vez de
	// devolver zero vendas e deixar o agente concluir que a loja não vendeu nada.
	const [after, before] = start.isAfter(end) ? [end.startOf("day"), start.endOf("day")] : [start, end];

	return {
		after: after.toDate(),
		before: before.toDate(),
		inicio: after.toISOString(),
		fim: before.toISOString(),
	};
}
