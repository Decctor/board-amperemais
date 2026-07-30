import { IFOOD_DAYS_OF_WEEK, type TIfoodDayOfWeek } from "./merchant-types";

/**
 * Matemática dos horários de funcionamento do iFood.
 *
 * A API ancora cada turno num dia da semana e guarda a duração em minutos (até 1440), então um
 * turno pode atravessar a meia-noite e invadir o dia seguinte — sexta 18:00 por 8h termina sábado
 * às 02:00. Por isso a detecção de sobreposição não pode ser feita dia a dia: os turnos são
 * projetados num círculo de 10080 minutos (a semana inteira) onde domingo encosta em segunda.
 */

const MINUTES_IN_DAY = 24 * 60;
const MINUTES_IN_WEEK = 7 * MINUTES_IN_DAY;

/** Um turno como ele viaja no payload do iFood. */
export type TOpeningShift = {
	diaSemana: TIfoodDayOfWeek;
	inicio: string;
	duracaoMinutos: number;
};

/** Intervalo em minutos absolutos da semana; `fim` pode passar de 10080 quando o turno envolve. */
type TWeekInterval = { start: number; end: number };

/** "HH:MM:SS" (ou "HH:MM") → "HH:MM", o valor aceito por um input `type="time"`. */
export function toTimeInputValue(time: string) {
	return time.slice(0, 5);
}

/** "HH:MM" → minutos desde a meia-noite. */
export function toMinutes(time: string) {
	const [hours, minutes] = toTimeInputValue(time).split(":").map(Number);
	return (hours || 0) * 60 + (minutes || 0);
}

/** Minutos desde a meia-noite → "HH:MM", envolvendo o dia quando passa de 24h. */
export function toTimeLabel(minutes: number) {
	const normalized = ((minutes % MINUTES_IN_DAY) + MINUTES_IN_DAY) % MINUTES_IN_DAY;
	return `${String(Math.floor(normalized / 60)).padStart(2, "0")}:${String(normalized % 60).padStart(2, "0")}`;
}

/** Início "HH:MM" + duração em minutos → fim "HH:MM" (pode virar o dia). */
export function computeEndTime(inicio: string, duracaoMinutos: number) {
	return toTimeLabel(toMinutes(inicio) + duracaoMinutos);
}

/**
 * Início e fim "HH:MM" → duração em minutos. Fim menor que o início vira o dia; fim igual ao início
 * significa 24 horas — a leitura possível já que a API não aceita turno de duração zero.
 */
export function computeDuration(inicio: string, fim: string) {
	const start = toMinutes(inicio);
	const end = toMinutes(fim);
	return end > start ? end - start : MINUTES_IN_DAY - start + end;
}

/** O turno termina no dia seguinte? */
export function crossesMidnight(inicio: string, duracaoMinutos: number) {
	return toMinutes(inicio) + duracaoMinutos > MINUTES_IN_DAY;
}

/** Duração em minutos → rótulo compacto ("10h", "4h30", "45min"). */
export function formatDuration(duracaoMinutos: number) {
	if (duracaoMinutos <= 0) return "0min";
	const hours = Math.floor(duracaoMinutos / 60);
	const minutes = duracaoMinutos % 60;
	if (!hours) return `${minutes}min`;
	if (!minutes) return `${hours}h`;
	return `${hours}h${String(minutes).padStart(2, "0")}`;
}

/** Projeta o turno no eixo absoluto da semana, com segunda-feira na origem. */
function toWeekInterval(shift: TOpeningShift): TWeekInterval {
	const dayIndex = IFOOD_DAYS_OF_WEEK.indexOf(shift.diaSemana);
	const start = dayIndex * MINUTES_IN_DAY + toMinutes(shift.inicio);
	return { start, end: start + shift.duracaoMinutos };
}

/**
 * Quebra o intervalo nos segmentos que cabem dentro da semana. Um turno de domingo à noite que
 * atravessa a meia-noite vira dois segmentos: o fim de domingo e o começo de segunda.
 */
function toWeekSegments({ start, end }: TWeekInterval): TWeekInterval[] {
	const normalizedStart = ((start % MINUTES_IN_WEEK) + MINUTES_IN_WEEK) % MINUTES_IN_WEEK;
	const normalizedEnd = normalizedStart + (end - start);
	if (normalizedEnd <= MINUTES_IN_WEEK) return [{ start: normalizedStart, end: normalizedEnd }];
	return [
		{ start: normalizedStart, end: MINUTES_IN_WEEK },
		{ start: 0, end: normalizedEnd - MINUTES_IN_WEEK },
	];
}

/** Dois turnos dividem algum minuto da semana? Encostar (um termina onde o outro começa) não conta. */
export function shiftsOverlap(a: TOpeningShift, b: TOpeningShift) {
	const segmentsA = toWeekSegments(toWeekInterval(a));
	const segmentsB = toWeekSegments(toWeekInterval(b));
	return segmentsA.some((segmentA) => segmentsB.some((segmentB) => segmentA.start < segmentB.end && segmentB.start < segmentA.end));
}

/**
 * Índice de cada turno em conflito → índices com que ele conflita. Vazio significa conjunto válido
 * para o iFood.
 */
export function findOverlappingShifts(turnos: TOpeningShift[]): Map<number, number[]> {
	const conflicts = new Map<number, number[]>();

	for (let i = 0; i < turnos.length; i++) {
		for (let j = i + 1; j < turnos.length; j++) {
			if (!shiftsOverlap(turnos[i], turnos[j])) continue;
			conflicts.set(i, [...(conflicts.get(i) ?? []), j]);
			conflicts.set(j, [...(conflicts.get(j) ?? []), i]);
		}
	}

	return conflicts;
}

/** Resumo semanal para o cabeçalho da seção. */
export function summarizeOpeningHours(turnos: TOpeningShift[]) {
	const openDays = new Set(turnos.map((turno) => turno.diaSemana)).size;
	const weeklyMinutes = turnos.reduce((total, turno) => total + turno.duracaoMinutos, 0);
	return { openDays, weeklyMinutes };
}
