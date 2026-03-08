import DateInput from "@/components/Inputs/DateInput";
import NumberInput from "@/components/Inputs/NumberInput";
import SelectInput from "@/components/Inputs/SelectInput";
import TimeInput from "@/components/Inputs/TimeInput";
import type { TDelayNodeConfigComponentProps } from "./types";

export function DelayConfig({ node, updateConfig }: TDelayNodeConfigComponentProps) {
	switch (node.subtipo) {
		case "ESPERAR-DURACAO":
			return (
				<div className="flex flex-col gap-2">
					<NumberInput label="VALOR" value={node.configuracao.valor} handleChange={(value) => updateConfig({ valor: value })} placeholder="1" />
					<SelectInput
						label="MEDIDA"
						value={node.configuracao.medida}
						handleChange={(value) => updateConfig({ medida: value as "DIAS" | "SEMANAS" | "MESES" | "HORAS" })}
						onReset={() => updateConfig({ medida: "DIAS" })}
						resetOptionLabel="SELECIONE A MEDIDA"
						options={[
							{ id: 1, value: "HORAS", label: "Horas" },
							{ id: 2, value: "DIAS", label: "Dias" },
							{ id: 3, value: "SEMANAS", label: "Semanas" },
							{ id: 4, value: "MESES", label: "Meses" },
						]}
					/>
				</div>
			);

		case "ESPERAR-ATE-HORARIO":
			return <TimeInput label="HORARIO" value={node.configuracao.horario} handleChange={(value) => updateConfig({ horario: value ?? "" })} />;

		case "ESPERAR-ATE-DATA":
			return (
				<div className="flex flex-col gap-2">
					<DateInput label="DATA" value={node.configuracao.data} handleChange={(value) => updateConfig({ data: value ?? "" })} />
					<p className="text-xs text-muted-foreground">A execucao aguardara ate o fim do dia local da data selecionada.</p>
				</div>
			);

		default:
			return <p className="text-xs text-muted-foreground italic">Delay sem configuracao adicional.</p>;
	}
}
