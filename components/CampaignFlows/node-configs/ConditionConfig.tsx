import MultipleSelectInput from "@/components/Inputs/MultipleSelectInput";
import NumberInput from "@/components/Inputs/NumberInput";
import SelectInput from "@/components/Inputs/SelectInput";
import TextInput from "@/components/Inputs/TextInput";
import { RFM_SEGMENT_OPTIONS, WHATSAPP_STATUS_OPTIONS } from "./shared";
import type { TConditionNodeConfigComponentProps } from "./types";

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

export function ConditionConfig({ node, updateConfig }: TConditionNodeConfigComponentProps) {
	switch (node.subtipo) {
		case "VERIFICAR-ATRIBUTO-CLIENTE":
			return <VerifyClientAttributeConfig node={node} updateConfig={updateConfig} />;

		case "VERIFICAR-COMPRA-RECENTE":
			return (
				<div className="flex flex-col gap-2">
					<NumberInput
						label="DIAS ATRAS"
						value={node.configuracao.diasAtras}
						handleChange={(value) => updateConfig({ diasAtras: Number(value) || 30 })}
						placeholder="30"
					/>
					<NumberInput
						label="VALOR MINIMO"
						value={node.configuracao.valorMinimo}
						handleChange={(value) => updateConfig({ valorMinimo: value })}
						placeholder="0.00"
					/>
				</div>
			);

		case "VERIFICAR-INTERACAO-ANTERIOR":
			return (
				<SelectInput
					label="STATUS ESPERADO"
					value={node.configuracao.statusEsperado}
					handleChange={(value) => updateConfig({ statusEsperado: value as "ENTREGUE" | "LIDO" | "FALHOU" })}
					onReset={() => updateConfig({ statusEsperado: "ENTREGUE" })}
					resetOptionLabel="SELECIONE O STATUS"
					options={WHATSAPP_STATUS_OPTIONS}
				/>
			);

		case "VERIFICAR-SEGMENTO-RFM":
			return (
				<MultipleSelectInput
					label="SEGMENTOS"
					selected={node.configuracao.segmentos ?? []}
					handleChange={(values) => updateConfig({ segmentos: values })}
					options={RFM_SEGMENT_OPTIONS}
					resetOptionLabel="Nenhum segmento"
					onReset={() => updateConfig({ segmentos: [] })}
				/>
			);

		case "VERIFICAR-CASHBACK-SALDO":
			return (
				<NumberInput
					label="VALOR MINIMO"
					value={node.configuracao.valorMinimo}
					handleChange={(value) => updateConfig({ valorMinimo: value })}
					placeholder="0.00"
				/>
			);

		default:
			return <p className="text-xs text-muted-foreground italic">Condicao sem configuracao adicional.</p>;
	}
}

function VerifyClientAttributeConfig({
	node,
	updateConfig,
}: {
	node: Extract<TConditionNodeConfigComponentProps["node"], { subtipo: "VERIFICAR-ATRIBUTO-CLIENTE" }>;
	updateConfig: TConditionNodeConfigComponentProps["updateConfig"];
}) {
	const selectedField = ATTRIBUTE_FIELDS.find((field) => field.value === node.configuracao.campo);
	const operators = (selectedField?.operators ?? ["IGUAL", "DIFERENTE", "MAIOR", "MENOR", "CONTEM"]).map((operator, index) => ({
		id: index + 1,
		value: operator,
		label: OPERATOR_LABELS[operator] ?? operator,
	}));

	return (
		<div className="flex flex-col gap-2">
			<SelectInput
				label="CAMPO"
				value={node.configuracao.campo || undefined}
				handleChange={(value) => {
					updateConfig({
						campo: value,
						valor: "",
					});
				}}
				onReset={() => {
					updateConfig({
						campo: "",
						valor: "",
					});
				}}
				resetOptionLabel="SELECIONE O CAMPO"
				options={ATTRIBUTE_FIELDS}
			/>

			<SelectInput
				label="OPERADOR"
				value={node.configuracao.operador ?? "IGUAL"}
				handleChange={(value) => updateConfig({ operador: value as "IGUAL" | "DIFERENTE" | "MAIOR" | "MENOR" | "CONTEM" })}
				onReset={() => updateConfig({ operador: "IGUAL" })}
				resetOptionLabel="SELECIONE O OPERADOR"
				options={operators}
			/>

			{selectedField?.type === "number" ? (
				<NumberInput
					label="VALOR"
					value={typeof node.configuracao.valor === "number" ? node.configuracao.valor : null}
					handleChange={(value) => updateConfig({ valor: value })}
					placeholder="Preencha o valor"
				/>
			) : null}

			{selectedField?.type === "rfm" ? (
				<SelectInput
					label="VALOR"
					value={typeof node.configuracao.valor === "string" ? node.configuracao.valor : undefined}
					handleChange={(value) => updateConfig({ valor: value })}
					onReset={() => updateConfig({ valor: "" })}
					resetOptionLabel="SELECIONE O SEGMENTO"
					options={RFM_SEGMENT_OPTIONS}
				/>
			) : null}

			{selectedField?.type === "text" ? (
				<TextInput
					label="VALOR"
					value={typeof node.configuracao.valor === "string" ? node.configuracao.valor : ""}
					handleChange={(value) => updateConfig({ valor: value })}
					placeholder="Preencha o valor esperado"
				/>
			) : null}
		</div>
	);
}
