import { formatDateAsLocale, formatToMoney } from "@/lib/formatting";
import type { TGetSellersDefaultInput } from "@/pages/api/sellers";
import { X } from "lucide-react";

type SalesTeamFilterShowcaseProps = {
	queryParams: TGetSellersDefaultInput;
	updateQueryParams: (params: Partial<TGetSellersDefaultInput>) => void;
};
function SalesTeamFilterShowcase({ queryParams, updateQueryParams }: SalesTeamFilterShowcaseProps) {
	const FilterTag = ({
		label,
		value,
		onRemove,
	}: {
		label: string;
		value: string;
		onRemove?: () => void;
	}) => (
		<div className="flex items-center gap-1 bg-secondary text-[0.65rem] rounded-lg px-2 py-1">
			<p className="text-primary/80">
				{label}: <strong>{value}</strong>
			</p>
			{onRemove && (
				<button type="button" onClick={onRemove} className="bg-transparent text-primary hover:bg-primary/20 rounded-lg p-1">
					<X size={12} />
				</button>
			)}
		</div>
	);

	const ORDERING_FIELDS_MAP = {
		nome: "NOME",
		dataInsercao: "DATA DE INSERÇÃO",
		vendasValorTotal: "VALOR TOTAL DE VENDAS",
		vendasQtdeTotal: "QUANTIDADE TOTAL DE VENDAS",
	};

	const ORDERING_DIRECTION_MAP = {
		asc: "CRESCENTE",
		desc: "DECRESCENTE",
	};

	return (
		<div className="flex items-center justify-center lg:justify-end flex-wrap gap-2">
			{queryParams.search && queryParams.search.trim().length > 0 && (
				<FilterTag label="TÍTULO" value={queryParams.search} onRemove={() => updateQueryParams({ search: "" })} />
			)}

			{queryParams.statsPeriodAfter && queryParams.statsPeriodBefore && (
				<FilterTag
					label="PERÍODO DAS ESTASTÍCAS"
					value={`${formatDateAsLocale(queryParams.statsPeriodAfter)} a ${formatDateAsLocale(queryParams.statsPeriodBefore)}`}
					onRemove={() => updateQueryParams({ statsPeriodAfter: null, statsPeriodBefore: null })}
				/>
			)}
			{queryParams.orderByField && queryParams.orderByDirection && (
				<FilterTag
					label="ORDENAÇÃO"
					value={`${ORDERING_FIELDS_MAP[queryParams.orderByField]} - ${ORDERING_DIRECTION_MAP[queryParams.orderByDirection]}`}
					onRemove={() => updateQueryParams({ orderByField: null, orderByDirection: null })}
				/>
			)}
		</div>
	);
}

export default SalesTeamFilterShowcase;
