import DateInput from "@/components/Inputs/DateInput";
import MultipleSelectInput from "@/components/Inputs/MultipleSelectInput";
import NumberInput from "@/components/Inputs/NumberInput";
import SelectInput from "@/components/Inputs/SelectInput";
import TextInput from "@/components/Inputs/TextInput";
import ResponsiveMenuSection from "@/components/Utils/ResponsiveMenuSection";
import { Button } from "@/components/ui/button";
import type { TFilterCondition, TFilterTree } from "@/schemas/campaign-audiences";
import { RFMLabels } from "@/utils/rfm";
import { Filter, Plus, Trash2 } from "lucide-react";

const FILTER_TYPE_OPTIONS = [
	{ id: "SEGMENTO-RFM", value: "SEGMENTO-RFM", label: "Segmento RFM" },
	{ id: "LOCALIZACAO-CIDADE", value: "LOCALIZACAO-CIDADE", label: "Cidade" },
	{ id: "LOCALIZACAO-ESTADO", value: "LOCALIZACAO-ESTADO", label: "Estado" },
	{ id: "FAIXA-ETARIA", value: "FAIXA-ETARIA", label: "Faixa Etária" },
	{ id: "TOTAL-COMPRAS-QUANTIDADE", value: "TOTAL-COMPRAS-QUANTIDADE", label: "Qtd. de Compras" },
	{ id: "TOTAL-COMPRAS-VALOR", value: "TOTAL-COMPRAS-VALOR", label: "Valor Total de Compras" },
	{ id: "TOP-N-COMPRADORES", value: "TOP-N-COMPRADORES", label: "Top N Compradores" },
	{ id: "ULTIMA-COMPRA", value: "ULTIMA-COMPRA", label: "Última Compra" },
	{ id: "PRIMEIRA-COMPRA", value: "PRIMEIRA-COMPRA", label: "Primeira Compra" },
	{ id: "TEM-TELEFONE", value: "TEM-TELEFONE", label: "Tem Telefone" },
	{ id: "TEM-EMAIL", value: "TEM-EMAIL", label: "Tem E-mail" },
	{ id: "SALDO-CASHBACK", value: "SALDO-CASHBACK", label: "Saldo de Cashback" },
];

type FiltersBlockProps = {
	filtros: TFilterTree;
	setFilters: (filtros: TFilterTree) => void;
};

export default function FiltersBlock({ filtros, setFilters }: FiltersBlockProps) {
	function addCondition() {
		setFilters({
			...filtros,
			condicoes: [...filtros.condicoes, { tipo: "", configuracao: {} }],
		});
	}

	function updateCondition(index: number, condition: TFilterCondition) {
		const newCondicoes = [...filtros.condicoes];
		newCondicoes[index] = condition;
		setFilters({ ...filtros, condicoes: newCondicoes });
	}

	function removeCondition(index: number) {
		setFilters({
			...filtros,
			condicoes: filtros.condicoes.filter((_, i) => i !== index),
		});
	}

	function toggleLogic() {
		setFilters({ ...filtros, logica: filtros.logica === "AND" ? "OR" : "AND" });
	}

	return (
		<ResponsiveMenuSection title="FILTROS" icon={<Filter className="w-4 h-4" />}>
			<div className="flex items-center gap-2 mb-2">
				<span className="text-xs text-muted-foreground">Combinar filtros com:</span>
				<Button type="button" variant="outline" size="sm" className="text-xs h-7" onClick={toggleLogic}>
					{filtros.logica === "AND" ? "E (todos)" : "OU (qualquer)"}
				</Button>
			</div>

			<div className="flex flex-col gap-3">
				{filtros.condicoes.map((condition, index) => (
					<FilterConditionRow
						key={index}
						condition={condition}
						onUpdate={(updated) => updateCondition(index, updated)}
						onRemove={() => removeCondition(index)}
					/>
				))}
			</div>

			<Button type="button" variant="outline" size="sm" className="w-fit" onClick={addCondition}>
				<Plus className="w-4 h-4 mr-1" />
				Adicionar Filtro
			</Button>
		</ResponsiveMenuSection>
	);
}

type FilterConditionRowProps = {
	condition: TFilterCondition;
	onUpdate: (condition: TFilterCondition) => void;
	onRemove: () => void;
};

function FilterConditionRow({ condition, onUpdate, onRemove }: FilterConditionRowProps) {
	return (
		<div className="flex items-start gap-2 rounded-lg border p-3">
			<div className="flex-1 flex flex-col gap-2">
				<SelectInput
					label="TIPO DE FILTRO"
					value={condition.tipo || null}
					options={FILTER_TYPE_OPTIONS}
					handleChange={(value) => onUpdate({ ...condition, tipo: value, configuracao: {} })}
					onReset={() => onUpdate({ ...condition, tipo: "", configuracao: {} })}
					resetOptionLabel="Selecione o filtro..."
				/>
				<FilterConfigFields condition={condition} onUpdate={onUpdate} />
			</div>
			<Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-destructive shrink-0 mt-6" onClick={onRemove}>
				<Trash2 className="w-4 h-4" />
			</Button>
		</div>
	);
}

function FilterConfigFields({ condition, onUpdate }: { condition: TFilterCondition; onUpdate: (c: TFilterCondition) => void }) {
	const config = condition.configuracao as Record<string, any>;

	switch (condition.tipo) {
		case "SEGMENTO-RFM":
			return (
				<MultipleSelectInput
					label="SEGMENTOS"
					selected={(config.segmentos as string[] | undefined) ?? []}
					handleChange={(segmentos) => onUpdate({ ...condition, configuracao: { segmentos } })}
					options={RFMLabels.map((s, index) => ({ id: index + 1, label: s.text, value: s.text }))}
					resetOptionLabel="Selecione os segmentos"
					onReset={() => onUpdate({ ...condition, configuracao: { segmentos: [] } })}
				/>
			);
		case "LOCALIZACAO-CIDADE":
			return (
				<TextInput
					label="CIDADES (separadas por vírgula)"
					value={(config.cidades as string[] | undefined)?.join(", ") ?? ""}
					placeholder="São Paulo, Rio de Janeiro..."
					handleChange={(value) =>
						onUpdate({
							...condition,
							configuracao: {
								cidades: value
									.split(",")
									.map((s) => s.trim())
									.filter(Boolean),
							},
						})
					}
					width="100%"
				/>
			);
		case "LOCALIZACAO-ESTADO":
			return (
				<TextInput
					label="ESTADOS (separados por vírgula)"
					value={(config.estados as string[] | undefined)?.join(", ") ?? ""}
					placeholder="SP, RJ, MG..."
					handleChange={(value) =>
						onUpdate({
							...condition,
							configuracao: {
								estados: value
									.split(",")
									.map((s) => s.trim())
									.filter(Boolean),
							},
						})
					}
					width="100%"
				/>
			);
		case "FAIXA-ETARIA":
			return (
				<div className="flex gap-2">
					<NumberInput
						label="IDADE MÍNIMA"
						value={config.idadeMinima ?? null}
						placeholder="18"
						handleChange={(value) => onUpdate({ ...condition, configuracao: { ...config, idadeMinima: value } })}
					/>
					<NumberInput
						label="IDADE MÁXIMA"
						value={config.idadeMaxima ?? null}
						placeholder="65"
						handleChange={(value) => onUpdate({ ...condition, configuracao: { ...config, idadeMaxima: value } })}
					/>
				</div>
			);
		case "TOTAL-COMPRAS-QUANTIDADE":
		case "TOTAL-COMPRAS-VALOR":
		case "SALDO-CASHBACK":
			return (
				<div className="flex gap-2">
					<SelectInput
						label="OPERADOR"
						value={config.operador ?? null}
						options={[
							{ id: "MAIOR", value: "MAIOR", label: "Maior que" },
							{ id: "MENOR", value: "MENOR", label: "Menor que" },
							{ id: "IGUAL", value: "IGUAL", label: "Igual a" },
						]}
						handleChange={(value) => onUpdate({ ...condition, configuracao: { ...config, operador: value } })}
						onReset={() => onUpdate({ ...condition, configuracao: { ...config, operador: undefined } })}
						resetOptionLabel="Selecione..."
					/>
					<NumberInput
						label="VALOR"
						value={config.valor ?? null}
						placeholder="0"
						handleChange={(value) => onUpdate({ ...condition, configuracao: { ...config, valor: value } })}
					/>
				</div>
			);
		case "ULTIMA-COMPRA":
		case "PRIMEIRA-COMPRA":
			return (
				<div className="flex flex-col gap-2">
					<SelectInput
						label="OPERADOR"
						value={config.operador ?? null}
						options={[
							{ id: "ULTIMOS_N_DIAS", value: "ULTIMOS_N_DIAS", label: "Ultimos N dias" },
							{ id: "ANTES", value: "ANTES", label: "Antes de" },
							{ id: "DEPOIS", value: "DEPOIS", label: "Depois de" },
							{ id: "ENTRE", value: "ENTRE", label: "Entre datas" },
						]}
						handleChange={(value) => onUpdate({ ...condition, configuracao: { ...config, operador: value, valor: undefined, valorMax: undefined } })}
						onReset={() => onUpdate({ ...condition, configuracao: { ...config, operador: undefined, valor: undefined, valorMax: undefined } })}
						resetOptionLabel="Selecione..."
					/>

					{config.operador === "ULTIMOS_N_DIAS" ? (
						<NumberInput
							label="DIAS"
							value={(config.valor as number | undefined) ?? null}
							placeholder="30"
							handleChange={(value) => onUpdate({ ...condition, configuracao: { ...config, valor: value } })}
						/>
					) : null}

					{config.operador === "ANTES" || config.operador === "DEPOIS" ? (
						<DateInput
							label="DATA"
							value={(config.valor as string | undefined) ?? undefined}
							handleChange={(value) => onUpdate({ ...condition, configuracao: { ...config, valor: value } })}
						/>
					) : null}

					{config.operador === "ENTRE" ? (
						<div className="flex gap-2">
							<DateInput
								label="DATA INICIAL"
								value={(config.valor as string | undefined) ?? undefined}
								handleChange={(value) => onUpdate({ ...condition, configuracao: { ...config, valor: value } })}
							/>
							<DateInput
								label="DATA FINAL"
								value={(config.valorMax as string | undefined) ?? undefined}
								handleChange={(value) => onUpdate({ ...condition, configuracao: { ...config, valorMax: value } })}
							/>
						</div>
					) : null}
				</div>
			);
		case "TOP-N-COMPRADORES":
			return (
				<div className="flex gap-2">
					<NumberInput
						label="QUANTIDADE (TOP N)"
						value={config.quantidade ?? null}
						placeholder="10"
						handleChange={(value) => onUpdate({ ...condition, configuracao: { ...config, quantidade: value } })}
					/>
					<SelectInput
						label="CRITÉRIO"
						value={config.criterio ?? null}
						options={[
							{ id: "VALOR", value: "VALOR", label: "Por Valor" },
							{ id: "QUANTIDADE", value: "QUANTIDADE", label: "Por Quantidade" },
						]}
						handleChange={(value) => onUpdate({ ...condition, configuracao: { ...config, criterio: value } })}
						onReset={() => onUpdate({ ...condition, configuracao: { ...config, criterio: undefined } })}
						resetOptionLabel="Selecione..."
					/>
				</div>
			);
		case "TEM-TELEFONE":
		case "TEM-EMAIL":
			return <p className="text-xs text-muted-foreground">Nenhuma configuração adicional necessária.</p>;
		default:
			return null;
	}
}
