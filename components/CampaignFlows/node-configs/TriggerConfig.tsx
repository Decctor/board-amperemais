import MultipleSelectInput from "@/components/Inputs/MultipleSelectInput";
import NumberInput from "@/components/Inputs/NumberInput";
import { RFM_SEGMENT_OPTIONS } from "./shared";
import type { TNodeConfigComponentProps } from "./types";

export function TriggerConfig({ node, config, updateConfig }: TNodeConfigComponentProps) {
	switch (node.subtipo) {
		case "NOVA-COMPRA":
			return (
				<NumberInput
					label="VALOR MINIMO DA NOVA COMPRA"
					value={config.valorMinimo as number | null | undefined}
					handleChange={(value) => updateConfig("valorMinimo", value)}
					placeholder="Ex: 100"
				/>
			);

		case "QUANTIDADE-TOTAL-COMPRAS":
			return (
				<NumberInput
					label="QUANTIDADE TOTAL DE COMPRAS"
					value={config.quantidade as number | null | undefined}
					handleChange={(value) => updateConfig("quantidade", value)}
					placeholder="Ex: 2"
				/>
			);

		case "VALOR-TOTAL-COMPRAS":
			return (
				<NumberInput
					label="VALOR TOTAL DE COMPRAS"
					value={config.valor as number | null | undefined}
					handleChange={(value) => updateConfig("valor", value)}
					placeholder="Ex: 1000"
				/>
			);

		case "ENTRADA-SEGMENTACAO":
		case "PERMANENCIA-SEGMENTACAO":
			return (
				<MultipleSelectInput
					label="SEGMENTOS RFM"
					selected={(config.segmentos as string[] | undefined) ?? []}
					handleChange={(values) => updateConfig("segmentos", values)}
					options={RFM_SEGMENT_OPTIONS}
					resetOptionLabel="Nenhum segmento"
					onReset={() => updateConfig("segmentos", [])}
				/>
			);

		case "CASHBACK-ACUMULADO":
			return (
				<div className="flex flex-col gap-2">
					<NumberInput
						label="VALOR MINIMO DO NOVO CASHBACK"
						value={config.valorMinimoNovo as number | null | undefined}
						handleChange={(value) => updateConfig("valorMinimoNovo", value)}
						placeholder="Ex: 5"
					/>
					<NumberInput
						label="VALOR MINIMO DE CASHBACK TOTAL"
						value={config.valorMinimoTotal as number | null | undefined}
						handleChange={(value) => updateConfig("valorMinimoTotal", value)}
						placeholder="Ex: 50"
					/>
				</div>
			);

		default:
			return <p className="text-xs text-muted-foreground italic">Este gatilho nao possui configuracoes adicionais.</p>;
	}
}
