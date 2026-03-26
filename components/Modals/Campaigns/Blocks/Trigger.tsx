import MultipleSelectInput from "@/components/Inputs/MultipleSelectInput";
import NumberInput from "@/components/Inputs/NumberInput";
import SelectInput from "@/components/Inputs/SelectInput";
import ResponsiveMenuSection from "@/components/Utils/ResponsiveMenuSection";
import { useCampaignUtilPreviewWorstSalesDay } from "@/lib/queries/campaigns";
import type { TCampaignState } from "@/schemas/campaigns";
import type { TCampaignTriggerTypeEnum, TRecurrenceFrequencyEnum, TTimeDurationUnitsEnum } from "@/schemas/enums";
import { CampaignTriggerTypeOptions, DaysOfWeekOptions, RecurrenceFrequencyOptions, TimeDurationUnitsOptions } from "@/utils/select-options";
import { Loader2, SparklesIcon } from "lucide-react";
import { useMemo } from "react";

const DaysOfMonthOptions = Array.from({ length: 31 }, (_, i) => ({
	id: i + 1,
	label: String(i + 1),
	value: String(i + 1),
}));

function parseDaysJson(value: string | null | undefined): string[] {
	if (!value) return [];
	try {
		const parsed = JSON.parse(value);
		return Array.isArray(parsed) ? parsed.map(String) : [];
	} catch {
		return [];
	}
}

type CampaignsTriggerBlockProps = {
	campaign: TCampaignState["campaign"];
	updateCampaign: (changes: Partial<TCampaignState["campaign"]>) => void;
};
export default function CampaignsTriggerBlock({ campaign, updateCampaign }: CampaignsTriggerBlockProps) {
	const selectedDiasSemana = useMemo(() => parseDaysJson(campaign.recorrenciaDiasSemana), [campaign.recorrenciaDiasSemana]);
	const selectedDiasMes = useMemo(() => parseDaysJson(campaign.recorrenciaDiasMes), [campaign.recorrenciaDiasMes]);

	function handleTriggerTypeChange(value: TCampaignTriggerTypeEnum) {
		if (value !== "CASHBACK-EXPIRANDO") {
			updateCampaign({ gatilhoTipo: value });
			return;
		}

		const shouldPrefillAntecedenciaValor =
			typeof campaign.gatilhoCashbackExpirandoAntecedenciaValor !== "number" || campaign.gatilhoCashbackExpirandoAntecedenciaValor <= 0;
		const shouldPrefillAntecedenciaMedida = !campaign.gatilhoCashbackExpirandoAntecedenciaMedida;

		updateCampaign({
			gatilhoTipo: value,
			...(shouldPrefillAntecedenciaValor ? { gatilhoCashbackExpirandoAntecedenciaValor: 3 } : {}),
			...(shouldPrefillAntecedenciaMedida ? { gatilhoCashbackExpirandoAntecedenciaMedida: "DIAS" } : {}),
		});
	}

	return (
		<ResponsiveMenuSection title="TRIGGER" icon={<SparklesIcon className="h-4 min-h-4 w-4 min-w-4" />}>
			<SelectInput
				label="TIPO DE GATILHO"
				value={campaign.gatilhoTipo}
				resetOptionLabel="SELECIONE O TIPO"
				options={CampaignTriggerTypeOptions}
				handleChange={(value) => handleTriggerTypeChange(value as TCampaignTriggerTypeEnum)}
				onReset={() => updateCampaign({ gatilhoTipo: "NOVA-COMPRA" })}
				width="100%"
			/>
			{campaign.gatilhoTipo === "RECORRENTE" ? (
				<div className="w-full flex flex-col gap-2">
					<p className="text-center text-sm tracking-tight text-muted-foreground">Configure o agendamento recorrente da campanha.</p>
					<SelectInput
						label="FREQUÊNCIA"
						value={campaign.recorrenciaTipo}
						resetOptionLabel="SELECIONE A FREQUÊNCIA"
						options={RecurrenceFrequencyOptions}
						handleChange={(value) => updateCampaign({ recorrenciaTipo: value as TRecurrenceFrequencyEnum })}
						onReset={() => updateCampaign({ recorrenciaTipo: null })}
						width="100%"
					/>
					<NumberInput
						label={`A CADA (${campaign.recorrenciaTipo === "DIARIO" ? "DIAS" : campaign.recorrenciaTipo === "SEMANAL" ? "SEMANAS" : campaign.recorrenciaTipo === "MENSAL" ? "MESES" : "UNIDADES"})`}
						value={campaign.recorrenciaIntervalo ?? 1}
						placeholder="Ex: 1 para toda semana, 2 para a cada 2 semanas..."
						handleChange={(value) => updateCampaign({ recorrenciaIntervalo: value })}
						width="100%"
					/>
					{campaign.recorrenciaTipo === "SEMANAL" ? (
						<MultipleSelectInput
							label="DIAS DA SEMANA"
							selected={selectedDiasSemana}
							resetOptionLabel="SELECIONE OS DIAS"
							options={DaysOfWeekOptions.map((o) => ({ ...o, value: String(o.value) }))}
							handleChange={(values) => updateCampaign({ recorrenciaDiasSemana: JSON.stringify(values.map(Number)) })}
							onReset={() => updateCampaign({ recorrenciaDiasSemana: null })}
							width="100%"
						/>
					) : null}
					{campaign.recorrenciaTipo === "MENSAL" ? (
						<MultipleSelectInput
							label="DIAS DO MÊS"
							selected={selectedDiasMes}
							resetOptionLabel="SELECIONE OS DIAS"
							options={DaysOfMonthOptions}
							handleChange={(values) => updateCampaign({ recorrenciaDiasMes: JSON.stringify(values.map(Number)) })}
							onReset={() => updateCampaign({ recorrenciaDiasMes: null })}
							width="100%"
						/>
					) : null}
				</div>
			) : null}
			{campaign.gatilhoTipo === "PERMANÊNCIA-SEGMENTAÇÃO" ? (
				<div className="w-full flex flex-col gap-2 items-center lg:flex-row">
					<div className="w-full lg:w-1/2">
						<SelectInput
							label="TEMPO DE PERMANÊNCIA (MEDIDA)"
							value={campaign.gatilhoTempoPermanenciaMedida}
							resetOptionLabel="SELECIONE A MEDIDA"
							options={TimeDurationUnitsOptions}
							handleChange={(value) => updateCampaign({ gatilhoTempoPermanenciaMedida: value as TTimeDurationUnitsEnum })}
							onReset={() => updateCampaign({ gatilhoTempoPermanenciaMedida: null })}
							width="100%"
						/>
					</div>
					<div className="w-full lg:w-1/2">
						<NumberInput
							label="TEMPO DE PERMANÊNCIA (VALOR)"
							value={campaign.gatilhoTempoPermanenciaValor ?? null}
							placeholder="Preencha aqui o valor do tempo de permanência..."
							handleChange={(value) => updateCampaign({ gatilhoTempoPermanenciaValor: value })}
							width="100%"
						/>
					</div>
				</div>
			) : null}
			{campaign.gatilhoTipo === "CASHBACK-ACUMULADO" ? (
				<div className="w-full flex flex-col gap-2 items-center lg:flex-row">
					<div className="w-full lg:w-1/2">
						<NumberInput
							label="VALOR MÍNIMO DE NOVO CASHBACK ACUMULADO"
							value={campaign.gatilhoNovoCashbackAcumuladoValorMinimo ?? null}
							placeholder="Preencha aqui o valor mínimo de total cashback acumulado..."
							handleChange={(value) => updateCampaign({ gatilhoNovoCashbackAcumuladoValorMinimo: value })}
							width="100%"
						/>
					</div>
					<div className="w-full lg:w-1/2">
						<NumberInput
							label="VALOR MÍNIMO DE TOTAL CASHBACK ACUMULADO"
							value={campaign.gatilhoTotalCashbackAcumuladoValorMinimo ?? null}
							placeholder="Preencha aqui o valor mínimo de total cashback acumulado..."
							handleChange={(value) => updateCampaign({ gatilhoTotalCashbackAcumuladoValorMinimo: value })}
							width="100%"
						/>
					</div>
				</div>
			) : null}
			{campaign.gatilhoTipo === "CASHBACK-EXPIRANDO" ? (
				<div className="w-full flex flex-col gap-2 items-center lg:flex-row">
					<div className="w-full lg:w-1/2">
						<SelectInput
							label="ANTECEDÊNCIA DE AVISO (MEDIDA)"
							value={campaign.gatilhoCashbackExpirandoAntecedenciaMedida}
							resetOptionLabel="SELECIONE A MEDIDA"
							options={TimeDurationUnitsOptions}
							handleChange={(value) => updateCampaign({ gatilhoCashbackExpirandoAntecedenciaMedida: value as TTimeDurationUnitsEnum })}
							onReset={() => updateCampaign({ gatilhoCashbackExpirandoAntecedenciaMedida: null })}
							width="100%"
						/>
					</div>
					<div className="w-full lg:w-1/2">
						<NumberInput
							label="ANTECEDÊNCIA DE AVISO (VALOR)"
							value={campaign.gatilhoCashbackExpirandoAntecedenciaValor ?? null}
							placeholder="Ex: 3 para avisar 3 dias antes de expirar..."
							handleChange={(value) => updateCampaign({ gatilhoCashbackExpirandoAntecedenciaValor: value })}
							width="100%"
						/>
					</div>
				</div>
			) : null}
			{campaign.gatilhoTipo === "NOVA-COMPRA" ? (
				<NumberInput
					label="VALOR MÍNIMO DE NOVA COMPRA"
					value={campaign.gatilhoNovaCompraValorMinimo ?? null}
					placeholder="Preencha aqui o valor mínimo de nova compra..."
					handleChange={(value) => updateCampaign({ gatilhoNovaCompraValorMinimo: value })}
					width="100%"
				/>
			) : null}
			{campaign.gatilhoTipo === "QUANTIDADE-TOTAL-COMPRAS" ? (
				<NumberInput
					label="QUANTIDADE TOTAL DE COMPRAS (GATILHO)"
					value={campaign.gatilhoQuantidadeTotalCompras ?? null}
					placeholder="Ex: 2 para segunda compra, 3 para terceira compra..."
					handleChange={(value) => updateCampaign({ gatilhoQuantidadeTotalCompras: value })}
					width="100%"
				/>
			) : null}
			{campaign.gatilhoTipo === "PIOR-DIA-VENDAS" ? (
				<div className="w-full flex flex-col gap-2">
					<p className="text-center text-sm tracking-tight text-muted-foreground">
						A campanha será disparada automaticamente no dia da semana com menor volume de vendas, calculado com base nas últimas 8 semanas de histórico.
					</p>
					<UtilsPreviewWorstSalesDayShowcase campaign={campaign} />
				</div>
			) : null}
			{campaign.gatilhoTipo === "VALOR-TOTAL-COMPRAS" ? (
				<NumberInput
					label="VALOR TOTAL DE COMPRAS (GATILHO)"
					value={campaign.gatilhoValorTotalCompras ?? null}
					placeholder="Ex: 1000 para disparar quando cliente atingir R$ 1.000 em compras..."
					handleChange={(value) => updateCampaign({ gatilhoValorTotalCompras: value })}
					width="100%"
				/>
			) : null}
		</ResponsiveMenuSection>
	);
}

const DAY_NAMES = ["Domingo", "Segunda-feira", "Terça-feira", "Quarta-feira", "Quinta-feira", "Sexta-feira", "Sábado"];

function UtilsPreviewWorstSalesDayShowcase({ campaign }: { campaign: TCampaignState["campaign"] }) {
	const { data: worstSalesDay, isLoading, isError, isSuccess } = useCampaignUtilPreviewWorstSalesDay();

	const delayLabel = useMemo(() => {
		const valor = campaign.execucaoAgendadaValor;
		const medida = campaign.execucaoAgendadaMedida;
		const direcao = campaign.execucaoAgendadaDirecao;
		if (!valor || !medida) return null;
		const dir = direcao === "ANTES" ? "antes" : "depois";
		return `${valor} ${valor > 1 ? medida.toLowerCase() : medida.toLowerCase().slice(0, -1)} ${dir}`;
	}, [campaign.execucaoAgendadaValor, campaign.execucaoAgendadaMedida, campaign.execucaoAgendadaDirecao]);

	if (isLoading)
		return (
			<div className="w-full rounded-md border border-amber-300 bg-amber-100 px-3 py-2.5 flex flex-col gap-2">
				<p className="text-amber-600 animate-pulse text-sm tracking-tight font-medium text-center">Carregando informações do pior dia de vendas...</p>
			</div>
		);
	if (isError)
		return (
			<div className="w-full rounded-md border border-red-300 bg-red-100 px-3 py-2.5 flex flex-col gap-2">
				<p className="text-red-600 text-sm tracking-tight font-medium text-center">Erro ao carregar informações do pior dia de vendas.</p>
			</div>
		);
	if (isSuccess && worstSalesDay != null)
		return (
			<div className="w-full rounded-md border border-amber-300 bg-amber-100 px-3 py-2.5 flex flex-col gap-2">
				<p className="text-amber-600 text-sm tracking-tight font-medium text-center">
					O pior dia previsto de vendas da semana é o{" "}
					<strong className="px-2 py-1 rounded-lg bg-amber-600 text-amber-100">{DAY_NAMES[worstSalesDay].toUpperCase()}</strong>. Enviaremos a mensagem{" "}
					{delayLabel}, às {campaign.execucaoAgendadaBloco}.
				</p>
			</div>
		);

	if (isSuccess && worstSalesDay == null)
		return (
			<div className="w-full rounded-md border border-red-300 bg-red-100 px-3 py-2.5 flex flex-col gap-2">
				<p className="text-red-600 text-sm tracking-tight font-medium text-center">Não foi possível carregar informações do pior dia de vendas.</p>
			</div>
		);
	return <></>;
}
