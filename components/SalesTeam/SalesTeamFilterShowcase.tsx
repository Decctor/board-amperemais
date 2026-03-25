import { FiltersShowcase } from "@/components/ui/filters-showcase";
import { formatDateAsLocale, formatToMoney } from "@/lib/formatting";
import type { TGetSellersDefaultInput } from "@/pages/api/sellers";

type SalesTeamFilterShowcaseProps = {
	queryParams: TGetSellersDefaultInput;
	updateQueryParams: (params: Partial<TGetSellersDefaultInput>) => void;
};
function SalesTeamFilterShowcase({ queryParams, updateQueryParams }: SalesTeamFilterShowcaseProps) {
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
		<FiltersShowcase.Root>
			{queryParams.search && queryParams.search.trim().length > 0 && (
				<FiltersShowcase.Item label="TÍTULO" value={queryParams.search} onRemove={() => updateQueryParams({ search: "" })} />
			)}

			{queryParams.statsPeriodAfter && queryParams.statsPeriodBefore && (
				<FiltersShowcase.Item
					label="PERÍODO DAS ESTASTÍCAS"
					value={`${formatDateAsLocale(queryParams.statsPeriodAfter)} a ${formatDateAsLocale(queryParams.statsPeriodBefore)}`}
					onRemove={() => updateQueryParams({ statsPeriodAfter: null, statsPeriodBefore: null })}
				/>
			)}
			{queryParams.orderByField && queryParams.orderByDirection && (
				<FiltersShowcase.Item
					label="ORDENAÇÃO"
					value={`${ORDERING_FIELDS_MAP[queryParams.orderByField]} - ${ORDERING_DIRECTION_MAP[queryParams.orderByDirection]}`}
					onRemove={() => updateQueryParams({ orderByField: null, orderByDirection: null })}
				/>
			)}
		</FiltersShowcase.Root>
	);
}

export default SalesTeamFilterShowcase;
