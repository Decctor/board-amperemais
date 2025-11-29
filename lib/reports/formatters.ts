import dayjs from "dayjs";
import "dayjs/locale/pt-br";

dayjs.locale("pt-br");

export function formatCurrency(value: number): string {
	return new Intl.NumberFormat("pt-BR", {
		style: "currency",
		currency: "BRL",
	}).format(value);
}

export function formatPercentage(value: number, decimals = 1): string {
	return `${value.toFixed(decimals)}%`;
}

export function formatPeriodComparison(current: number, previous: number | undefined): string {
	if (!previous || previous === 0) {
		return "N/A";
	}

	const diff = current - previous;
	const percentage = (diff / previous) * 100;

	if (percentage > 0) {
		return `+${formatPercentage(percentage)}`;
	}
	if (percentage < 0) {
		return formatPercentage(percentage);
	}
	return "0%";
}

export function formatComparisonWithEmoji(current: number, previous: number | undefined): string {
	if (!previous || previous === 0) {
		return "➖ N/A";
	}

	const diff = current - previous;
	const percentage = (diff / previous) * 100;

	if (percentage > 0) {
		return `📈 +${formatPercentage(percentage)}`;
	}
	if (percentage < 0) {
		return `📉 ${formatPercentage(percentage)}`;
	}
	return "➖ 0%";
}

export function formatDate(date: Date, format = "DD/MM/YYYY"): string {
	return dayjs(date).format(format);
}

export function formatDateRange(start: Date, end: Date): string {
	return `${formatDate(start)} a ${formatDate(end)}`;
}

export function formatNumber(value: number): string {
	return new Intl.NumberFormat("pt-BR").format(value);
}

export function getDateRangeLabel(start: Date, end: Date): string {
	const diffDays = dayjs(end).diff(dayjs(start), "days");

	if (diffDays === 0) {
		return formatDate(start, "DD/MM/YYYY");
	}
	if (diffDays <= 1) {
		return `Dia ${formatDate(start, "DD/MM")}`;
	}
	if (diffDays <= 7) {
		return `Semana ${formatDate(start, "DD/MM")} - ${formatDate(end, "DD/MM")}`;
	}
	if (diffDays <= 31) {
		return dayjs(start).format("MMMM/YYYY");
	}

	return formatDateRange(start, end);
}

export function truncateText(text: string, maxLength: number): string {
	if (text.length <= maxLength) {
		return text;
	}
	return `${text.substring(0, maxLength - 3)}...`;
}
