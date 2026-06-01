import type { TShopSettingsConfiguration, TShopTimeRange } from "@/schemas/shop";
import type { TShopWeekdayEnum } from "@/schemas/enums";

export const DEFAULT_SHOP_TIME_ZONE = "America/Sao_Paulo";

export type TShopAvailability = {
	status: "ABERTA" | "FECHADA" | "INDISPONIVEL";
	motivo: "ATIVA" | "INATIVA" | "SEM_HORARIO" | "FORA_DO_HORARIO";
	mensagem: string | null;
	proximaAbertura: Date | null;
};

const WEEKDAYS: TShopWeekdayEnum[] = ["DOMINGO", "SEGUNDA", "TERCA", "QUARTA", "QUINTA", "SEXTA", "SABADO"];
const WEEKDAY_INDEX_BY_SHORT_NAME: Record<string, number> = {
	Sun: 0,
	Mon: 1,
	Tue: 2,
	Wed: 3,
	Thu: 4,
	Fri: 5,
	Sat: 6,
};

function getDateParts(date: Date, timeZone: string) {
	const parts = new Intl.DateTimeFormat("en-CA", {
		timeZone,
		year: "numeric",
		month: "2-digit",
		day: "2-digit",
		hour: "2-digit",
		minute: "2-digit",
		hour12: false,
	}).formatToParts(date);
	const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
	const weekdayShortName = new Intl.DateTimeFormat("en-US", { timeZone, weekday: "short" }).format(date);
	const dayIndex = WEEKDAY_INDEX_BY_SHORT_NAME[weekdayShortName] ?? 0;

	return {
		date: `${values.year}-${values.month}-${values.day}`,
		time: `${values.hour === "24" ? "00" : values.hour}:${values.minute}`,
		weekday: WEEKDAYS[dayIndex],
	};
}

function getRangesForDate(config: TShopSettingsConfiguration, date: Date, timeZone: string) {
	const parts = getDateParts(date, timeZone);
	const exception = config.operacao.excecoesHorarios.find((item) => item.data === parts.date);
	if (exception) return { ranges: exception.periodos, message: exception.mensagem };
	return {
		ranges: config.operacao.horarios.find((item) => item.dia === parts.weekday)?.periodos ?? [],
		message: null,
	};
}

function isWithinRanges(time: string, ranges: TShopTimeRange[]) {
	return ranges.some((range) => time >= range.inicio && time < range.fim);
}

function findNextOpening(config: TShopSettingsConfiguration, now: Date, timeZone: string) {
	const cursor = new Date(now);
	cursor.setSeconds(0, 0);

	for (let minutes = 1; minutes <= 60 * 24 * 14; minutes += 1) {
		cursor.setMinutes(cursor.getMinutes() + 1);
		const parts = getDateParts(cursor, timeZone);
		const { ranges } = getRangesForDate(config, cursor, timeZone);
		if (ranges.some((range) => range.inicio === parts.time)) return new Date(cursor);
	}

	return null;
}

export function getShopAvailability({
	ativo,
	configuracoes,
	now = new Date(),
	timeZone = DEFAULT_SHOP_TIME_ZONE,
}: {
	ativo: boolean;
	configuracoes: TShopSettingsConfiguration;
	now?: Date;
	timeZone?: string;
}): TShopAvailability {
	if (!ativo) {
		return { status: "INDISPONIVEL", motivo: "INATIVA", mensagem: null, proximaAbertura: null };
	}

	const hasConfiguredSchedule = configuracoes.operacao.horarios.some((schedule) => schedule.periodos.length > 0);
	if (!hasConfiguredSchedule) {
		return { status: "FECHADA", motivo: "SEM_HORARIO", mensagem: null, proximaAbertura: null };
	}

	const parts = getDateParts(now, timeZone);
	const { ranges, message } = getRangesForDate(configuracoes, now, timeZone);
	if (isWithinRanges(parts.time, ranges)) {
		return { status: "ABERTA", motivo: "ATIVA", mensagem: message, proximaAbertura: null };
	}

	return {
		status: "FECHADA",
		motivo: "FORA_DO_HORARIO",
		mensagem: message,
		proximaAbertura: findNextOpening(configuracoes, now, timeZone),
	};
}
