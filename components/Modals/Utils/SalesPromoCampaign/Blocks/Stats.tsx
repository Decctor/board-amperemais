import CheckboxInput from "@/components/Inputs/CheckboxInput";
import DateInput from "@/components/Inputs/DateInput";
import ResponsiveMenuSection from "@/components/Utils/ResponsiveMenuSection";
import { formatDateForInputValue, formatDateOnInputChange } from "@/lib/formatting";
import type { TUtilsSalesPromoCampaignConfig } from "@/schemas/utils";
import { ChartPie } from "lucide-react";

type SalesPromoCampaignStatsBlockProps = {
	utilData: TUtilsSalesPromoCampaignConfig["valor"]["dados"];
	updateUtilData: (changes: Partial<TUtilsSalesPromoCampaignConfig["valor"]["dados"]>) => void;
};
export default function SalesPromoCampaignStatsBlock({ utilData, updateUtilData }: SalesPromoCampaignStatsBlockProps) {
	return (
		<ResponsiveMenuSection title="ESTÁTISTICAS" icon={<ChartPie className="h-4 min-h-4 w-4 min-w-4" />}>
			<div className="w-full flex items-center gap-2 flex-col lg:flex-row">
				<div className="w-full lg:w-1/2">
					<DateInput
						label="INÍCIO"
						value={formatDateForInputValue(utilData.periodoEstatistico.inicio)}
						handleChange={(value) =>
							updateUtilData({
								periodoEstatistico: {
									...utilData.periodoEstatistico,
									inicio: formatDateOnInputChange(value, "string") ?? utilData.periodoEstatistico.inicio,
								},
							})
						}
						width="100%"
					/>
				</div>
				<div className="w-full lg:w-1/2">
					<DateInput
						label="FIM"
						value={formatDateForInputValue(utilData.periodoEstatistico.fim)}
						handleChange={(value) =>
							updateUtilData({
								periodoEstatistico: {
									...utilData.periodoEstatistico,
									fim: formatDateOnInputChange(value, "string") ?? utilData.periodoEstatistico.fim,
								},
							})
						}
						width="100%"
					/>
				</div>
			</div>
			<CheckboxInput
				labelTrue="RASTREAR RANKING DE VENDEDORES"
				labelFalse="RASTREAR RANKING DE VENDEDORES"
				checked={utilData.rastrearRankingVendedores}
				handleChange={(value) => updateUtilData({ rastrearRankingVendedores: value })}
			/>
			<CheckboxInput
				labelTrue="RASTREAR RANKING DE PRODUTOS"
				labelFalse="RASTREAR RANKING DE PRODUTOS"
				checked={utilData.rastrearRankingProdutos}
				handleChange={(value) => updateUtilData({ rastrearRankingProdutos: value })}
			/>
			<CheckboxInput
				labelTrue="RASTREAR RANKING DE PARCEIROS"
				labelFalse="RASTREAR RANKING DE PARCEIROS"
				checked={utilData.rastrearRankingParceiros}
				handleChange={(value) => updateUtilData({ rastrearRankingParceiros: value })}
			/>
		</ResponsiveMenuSection>
	);
}
