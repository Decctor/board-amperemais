import dayjs from "dayjs";

export type TCreditCardForecastConfiguration = {
	categoria: "CARTAO_CREDITO";
	diaFechamentoFatura: number;
	diaVencimentoFatura: number;
};

function clampBillingDay(month: dayjs.Dayjs, day: number) {
	return Math.min(Math.max(Math.trunc(day), 1), month.daysInMonth());
}

function dateOnMonth(base: dayjs.Dayjs, day: number) {
	const month = base.startOf("month");
	return month.date(clampBillingDay(month, day));
}

/**
 * Returns the due date of the invoice containing a transaction on referenceDate.
 * The closing and due days are clamped to the last day of shorter months.
 */
export function getCreditCardForecastDate(referenceDate: Date, config: TCreditCardForecastConfiguration) {
	const reference = dayjs(referenceDate);
	const closingThisMonth = dateOnMonth(reference, config.diaFechamentoFatura);
	const closingMonth = reference.isAfter(closingThisMonth, "day") ? reference.add(1, "month") : reference;
	const dueMonth = config.diaVencimentoFatura > config.diaFechamentoFatura ? closingMonth : closingMonth.add(1, "month");

	return dateOnMonth(dueMonth, config.diaVencimentoFatura).toDate();
}
