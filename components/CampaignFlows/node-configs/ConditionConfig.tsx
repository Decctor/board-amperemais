import MultipleSelectInput from "@/components/Inputs/MultipleSelectInput";
import NumberInput from "@/components/Inputs/NumberInput";
import SelectInput from "@/components/Inputs/SelectInput";
import TextInput from "@/components/Inputs/TextInput";
import { RFM_SEGMENT_OPTIONS, WHATSAPP_STATUS_OPTIONS } from "./shared";
import type { TNodeConfigComponentProps } from "./types";

type TAttributeField = {
	id: string;
	value: string;
	label: string;
	type: "text" | "number" | "rfm";
	operators: string[];
};

const ATTRIBUTE_FIELDS: TAttributeField[] = [
	{ id: "nome", value: "nome", label: "Nome", type: "text", operators: ["IGUAL", "DIFERENTE", "CONTEM"] },
	{ id: "email", value: "email", label: "Email", type: "text", operators: ["IGUAL", "DIFERENTE", "CONTEM"] },
	{ id: "telefone", value: "telefone", label: "Telefone", type: "text", operators: ["IGUAL", "DIFERENTE", "CONTEM"] },
	{
		id: "analise_rfm",
		value: "analiseRFMTitulo",
		label: "Segmento RFM",
		type: "rfm",
		operators: ["IGUAL", "DIFERENTE"],
	},
	{
		id: "total_compras",
		value: "metadataTotalCompras",
		label: "Total de compras",
		type: "number",
		operators: ["IGUAL", "DIFERENTE", "MAIOR", "MENOR"],
	},
	{
		id: "valor_total_compras",
		value: "metadataValorTotalCompras",
		label: "Valor total de compras",
		type: "number",
		operators: ["IGUAL", "DIFERENTE", "MAIOR", "MENOR"],
	},
];

const OPERATOR_LABELS: Record<string, string> = {
	IGUAL: "IGUAL A",
	DIFERENTE: "DIFERENTE DE",
	MAIOR: "MAIOR QUE",
	MENOR: "MENOR QUE",
	CONTEM: "CONTEM",
};

export function ConditionConfig({ node, config, updateConfig }: TNodeConfigComponentProps) {
	switch (node.subtipo) {
		case "VERIFICAR-ATRIBUTO-CLIENTE":
			return <VerifyClientAttributeConfig config={config} updateConfig={updateConfig} />;

		case "VERIFICAR-COMPRA-RECENTE":
			return (
				<div className="flex flex-col gap-2">
					<NumberInput
						label="DIAS ATRAS"
						value={config.diasAtras as number | null | undefined}
						handleChange={(value) => updateConfig("diasAtras", Number(value) || 30)}
						placeholder="30"
					/>
					<NumberInput
						label="VALOR MINIMO"
						value={config.valorMinimo as number | null | undefined}
						handleChange={(value) => updateConfig("valorMinimo", value)}
						placeholder="0.00"
					/>
				</div>
			);

		case "VERIFICAR-INTERACAO-ANTERIOR":
			return (
				<SelectInput
					label="STATUS ESPERADO"
					value={(config.statusEsperado as string | undefined) ?? undefined}
					handleChange={(value) => updateConfig("statusEsperado", value)}
					onReset={() => updateConfig("statusEsperado", "ENVIADO")}
					resetOptionLabel="SELECIONE O STATUS"
					options={WHATSAPP_STATUS_OPTIONS}
				/>
			);

		case "VERIFICAR-SEGMENTO-RFM":
			return (
				<MultipleSelectInput
					label="SEGMENTOS"
					selected={(config.segmentos as string[] | undefined) ?? []}
					handleChange={(values) => updateConfig("segmentos", values)}
					options={RFM_SEGMENT_OPTIONS}
					resetOptionLabel="Nenhum segmento"
					onReset={() => updateConfig("segmentos", [])}
				/>
			);

		case "VERIFICAR-CASHBACK-SALDO":
			return (
				<NumberInput
					label="VALOR MINIMO"
					value={config.valorMinimo as number | null | undefined}
					handleChange={(value) => updateConfig("valorMinimo", value)}
					placeholder="0.00"
				/>
			);

		default:
			return <p className="text-xs text-muted-foreground italic">Condicao sem configuracao adicional.</p>;
	}
}

function VerifyClientAttributeConfig({
	config,
	updateConfig,
}: { config: Record<string, unknown>; updateConfig: TNodeConfigComponentProps["updateConfig"] }) {
	const selectedField = ATTRIBUTE_FIELDS.find((field) => field.value === (config.campo as string));
	const operators = (selectedField?.operators ?? ["IGUAL", "DIFERENTE", "MAIOR", "MENOR", "CONTEM"]).map((operator, index) => ({
		id: index + 1,
		value: operator,
		label: OPERATOR_LABELS[operator] ?? operator,
	}));

	return (
		<div className="flex flex-col gap-2">
			<SelectInput
				label="CAMPO"
				value={(config.campo as string | undefined) ?? undefined}
				handleChange={(value) => {
					updateConfig("campo", value);
					updateConfig("valor", "");
				}}
				onReset={() => {
					updateConfig("campo", "");
					updateConfig("valor", "");
				}}
				resetOptionLabel="SELECIONE O CAMPO"
				options={ATTRIBUTE_FIELDS}
			/>

			<SelectInput
				label="OPERADOR"
				value={(config.operador as string | undefined) ?? "IGUAL"}
				handleChange={(value) => updateConfig("operador", value)}
				onReset={() => updateConfig("operador", "IGUAL")}
				resetOptionLabel="SELECIONE O OPERADOR"
				options={operators}
			/>

			{selectedField?.type === "number" ? (
				<NumberInput
					label="VALOR"
					value={typeof config.valor === "number" ? config.valor : null}
					handleChange={(value) => updateConfig("valor", value)}
					placeholder="Preencha o valor"
				/>
			) : null}

			{selectedField?.type === "rfm" ? (
				<SelectInput
					label="VALOR"
					value={(config.valor as string | undefined) ?? undefined}
					handleChange={(value) => updateConfig("valor", value)}
					onReset={() => updateConfig("valor", "")}
					resetOptionLabel="SELECIONE O SEGMENTO"
					options={RFM_SEGMENT_OPTIONS}
				/>
			) : null}

			{selectedField?.type === "text" ? (
				<TextInput
					label="VALOR"
					value={(config.valor as string) ?? ""}
					handleChange={(value) => updateConfig("valor", value)}
					placeholder="Preencha o valor esperado"
				/>
			) : null}
		</div>
	);
}
