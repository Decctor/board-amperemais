import DateInput from "@/components/Inputs/DateInput";
import NumberInput from "@/components/Inputs/NumberInput";
import SelectInput from "@/components/Inputs/SelectInput";
import TimeInput from "@/components/Inputs/TimeInput";
import type { TNodeConfigComponentProps } from "./types";

export function DelayConfig({ node, config, updateConfig }: TNodeConfigComponentProps) {
	switch (node.subtipo) {
		case "ESPERAR-DURACAO":
			return (
				<div className="flex flex-col gap-2">
					<NumberInput
						label="VALOR"
						value={config.valor as number | null | undefined}
						handleChange={(value) => updateConfig("valor", value)}
						placeholder="1"
					/>
					<SelectInput
						label="MEDIDA"
						value={(config.medida as string | undefined) ?? undefined}
						handleChange={(value) => updateConfig("medida", value)}
						onReset={() => updateConfig("medida", "DIAS")}
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
			return (
				<TimeInput
					label="HORARIO"
					value={(config.horario as string | undefined) ?? undefined}
					handleChange={(value) => updateConfig("horario", value ?? "")}
				/>
			);

		case "ESPERAR-ATE-DATA":
			return (
				<div className="flex flex-col gap-2">
					<DateInput label="DATA" value={(config.data as string | undefined) ?? undefined} handleChange={(value) => updateConfig("data", value ?? "")} />
					<p className="text-xs text-muted-foreground">A execucao aguardara ate o fim do dia local da data selecionada.</p>
				</div>
			);

		default:
			return <p className="text-xs text-muted-foreground italic">Delay sem configuracao adicional.</p>;
	}
}
