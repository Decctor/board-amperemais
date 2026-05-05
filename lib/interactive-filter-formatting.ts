import type { InteractiveFilterOption } from "@/components/ui/interactive-filter";
import { formatDateAsLocale, formatToMoney } from "@/lib/formatting";

export function formatInteractiveOptionSummary<T extends string | number>(options: InteractiveFilterOption<T>[], values: T[]) {
	if (values.length === 0) return "TODOS";
	const labels = options.filter((option) => values.includes(option.value)).map((option) => option.label);
	if (labels.length === 0) return `${values.length} selecionado(s)`;
	if (labels.length <= 2) return labels.join(", ");
	return `${labels.length} selecionado(s)`;
}

export function formatInteractiveDateRangeSummary(after?: Date | string | null, before?: Date | string | null, emptyLabel = "TODO PERÍODO") {
	if (!after && !before) return emptyLabel;
	if (after && before) return `${formatDateAsLocale(after)} a ${formatDateAsLocale(before)}`;
	if (after) return `A partir de ${formatDateAsLocale(after)}`;
	return `Até ${formatDateAsLocale(before)}`;
}

export function formatInteractiveNumberRangeSummary(min?: number | null, max?: number | null, emptyLabel = "TODOS") {
	if (min == null && max == null) return emptyLabel;
	if (min != null && max != null) return `${formatToMoney(min)} a ${formatToMoney(max)}`;
	if (min != null) return `A partir de ${formatToMoney(min)}`;
	return `Até ${formatToMoney(max ?? 0)}`;
}

export function formatInteractiveCountSummary(values: unknown[] | null | undefined, emptyLabel = "TODOS") {
	if (!values || values.length === 0) return emptyLabel;
	return `${values.length} selecionado(s)`;
}
