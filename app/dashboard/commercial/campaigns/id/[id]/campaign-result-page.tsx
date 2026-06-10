"use client";
import type { TGetCampaignStatsOutput } from "@/app/api/campaigns/stats/by-campaign/route";
import type { TGetCampaignInteractionsOutputItems } from "@/app/api/campaigns/interactions/route";
import type { TGetConversionQualityOutput } from "@/app/api/campaigns/stats/conversion-quality/route";
import { CampaignConversionCard, CONVERSION_TYPE_CONFIG } from "@/components/Campaigns/CampaignConversionCard";
import CampaignsGraphs from "@/components/Campaigns/CampaignsGraphs";
import ClientHoverCard from "@/components/Clients/ClientHoverCard";
import { InteractionCard } from "@/components/Interactions/InteractionCard";
import DateIntervalInput from "@/components/Inputs/DateIntervalInput";
import ErrorComponent from "@/components/Layouts/ErrorComponent";
import LoadingComponent from "@/components/Layouts/LoadingComponent";
import StatUnitCard from "@/components/Stats/StatUnitCard";
import GeneralPaginationComponent from "@/components/Utils/Pagination";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import type { TAuthUserSession } from "@/lib/authentication/types";
import { getErrorMessage } from "@/lib/errors";
import { formatDateAsLocale, formatDecimalPlaces, formatToMoney } from "@/lib/formatting";
import { retryCampaignInteraction } from "@/lib/mutations/campaigns";
import {
	useCampaignById,
	useCampaignInteractionsLogs,
	useCampaignStats,
	useCampaignsConversions,
	useConversionQuality,
} from "@/lib/queries/campaigns";
import { cn } from "@/lib/utils";
import type { TCampaignTriggerTypeEnum } from "@/schemas/enums";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import dayjs from "dayjs";
import {
	ArrowLeft,
	BadgeDollarSign,
	CalendarCheck,
	CalendarClock,
	CircleCheck,
	CircleX,
	Clock,
	Diamond,
	Grid3x3,
	MessageCircle,
	MousePointerClick,
	Pencil,
	RefreshCw,
	Rocket,
	Send,
	ShieldAlert,
	ShoppingCart,
	Ticket,
	TrendingUp,
	UserPlus,
	UserRound,
	UserRoundCheck,
	Users,
	Zap,
} from "lucide-react";
import Link from "next/link";
import { memo, useEffect, useState } from "react";
import { toast } from "sonner";
import { InteractionsSentStatusOptions } from "@/utils/select-options";

type CampaignResultPageProps = {
	campaignId: string;
	user: TAuthUserSession["user"];
	membership: NonNullable<TAuthUserSession["membership"]>;
};

const TRIGGER_TYPE_LABELS: Record<TCampaignTriggerTypeEnum, string> = {
	"NOVA-COMPRA": "Nova Compra",
	"PRIMEIRA-COMPRA": "Primeira Compra",
	"PERMANÊNCIA-SEGMENTAÇÃO": "Permanência em Segmentação",
	"ENTRADA-SEGMENTAÇÃO": "Entrada em Segmentação",
	"CASHBACK-ACUMULADO": "Cashback Acumulado",
	"CASHBACK-EXPIRANDO": "Cashback Expirando",
	ANIVERSARIO_CLIENTE: "Aniversário do Cliente",
	"QUANTIDADE-TOTAL-COMPRAS": "Qtd. Total de Compras",
	"VALOR-TOTAL-COMPRAS": "Valor Total de Compras",
	"PIOR-DIA-VENDAS": "Pior Dia de Vendas",
	RECORRENTE: "Recorrente",
	"USO-UNICO": "Uso Único",
};

const ATTRIBUTION_MODEL_LABELS: Record<string, string> = {
	LAST_TOUCH: "Último Toque",
	FIRST_TOUCH: "Primeiro Toque",
	LINEAR: "Linear",
};

export default function CampaignResultPage({ campaignId, membership: _membership, user: _user }: CampaignResultPageProps) {
	const initialStartDate = dayjs().startOf("month").toDate();
	const initialEndDate = dayjs().endOf("month").toDate();

	const [filters, setFilters] = useState<{ startDate: Date; endDate: Date }>({
		startDate: initialStartDate,
		endDate: initialEndDate,
	});
	const [comparingFilters, setComparingFilters] = useState<{ startDate: Date; endDate: Date }>({
		startDate: dayjs().startOf("month").subtract(1, "month").toDate(),
		endDate: dayjs().endOf("month").subtract(1, "month").toDate(),
	});

	const { data: campaign, isLoading: campaignLoading, isError: campaignError } = useCampaignById({ id: campaignId });

	const { data: performance } = useCampaignStats({
		campaignId,
		startDate: filters.startDate,
		endDate: filters.endDate,
	});

	const { data: qualityData } = useConversionQuality({
		campanhaId: campaignId,
		startDate: filters.startDate,
		endDate: filters.endDate,
	});

	const aquisicoes = qualityData?.distribuicaoTipos.find((t) => t.tipo === "AQUISICAO");
	const reativacoes = qualityData?.distribuicaoTipos.find((t) => t.tipo === "REATIVACAO");
	const aceleracoes = qualityData?.distribuicaoTipos.find((t) => t.tipo === "ACELERACAO");

	const handleDateChange = (value: { after?: Date; before?: Date }) => {
		const newStart = value.after ? new Date(value.after) : filters.startDate;
		const newEnd = value.before ? new Date(value.before) : filters.endDate;
		setFilters({ startDate: newStart, endDate: newEnd });
		const diffDays = dayjs(newEnd).diff(dayjs(newStart), "day");
		setComparingFilters({
			startDate: dayjs(newStart)
				.subtract(diffDays + 1, "day")
				.toDate(),
			endDate: dayjs(newStart).subtract(1, "day").toDate(),
		});
	};

	if (campaignLoading) return <LoadingComponent />;
	if (campaignError || !campaign) return <ErrorComponent msg="Campanha não encontrada." />;

	return (
		<div className="w-full flex flex-col gap-4">
			{/* Header */}
			<div className="w-full flex flex-col gap-2">
				<div className="flex items-center gap-2">
					<Button variant="ghost" size="sm" asChild className="flex items-center gap-1.5 px-2">
						<Link href="/dashboard/commercial/campaigns">
							<ArrowLeft className="w-4 h-4 min-w-4 min-h-4" />
							VOLTAR
						</Link>
					</Button>
				</div>
				<div className="w-full flex items-center lg:items-start justify-between gap-3 flex-col lg:flex-row">
					<div className="flex flex-col gap-1.5">
						<div className="flex items-center gap-3 flex-wrap">
							<h1 className="text-xl font-bold tracking-tight">{campaign.titulo}</h1>
							<div
								className={cn("flex items-center gap-1.5 rounded-xl px-3 py-1 text-white text-xs font-bold", {
									"bg-green-500 dark:bg-green-600": campaign.ativo,
									"bg-gray-500 dark:bg-gray-600": !campaign.ativo,
								})}
							>
								<CircleCheck className="w-3.5 h-3.5 min-w-3.5 min-h-3.5" />
								{campaign.ativo ? "ATIVA" : "INATIVA"}
							</div>
						</div>
						{campaign.descricao && <p className="text-sm text-muted-foreground">{campaign.descricao}</p>}
						<div className="flex items-center gap-2 flex-wrap mt-1">
							<div className="flex items-center gap-1.5 bg-secondary rounded-lg px-2 py-1 text-xs font-medium">
								<Zap className="w-3.5 h-3.5 min-w-3.5 min-h-3.5" />
								{TRIGGER_TYPE_LABELS[campaign.gatilhoTipo as TCampaignTriggerTypeEnum] ?? campaign.gatilhoTipo}
							</div>
							<div className="flex items-center gap-1.5 bg-secondary rounded-lg px-2 py-1 text-xs font-medium">
								<TrendingUp className="w-3.5 h-3.5 min-w-3.5 min-h-3.5" />
								{ATTRIBUTION_MODEL_LABELS[campaign.atribuicaoModelo ?? "LAST_TOUCH"] ?? campaign.atribuicaoModelo}
							</div>
							{campaign.atribuicaoJanelaDias && (
								<div className="flex items-center gap-1.5 bg-secondary rounded-lg px-2 py-1 text-xs font-medium">
									<Clock className="w-3.5 h-3.5 min-w-3.5 min-h-3.5" />
									Janela: {campaign.atribuicaoJanelaDias} dias
								</div>
							)}
							{campaign.segmentacoes && campaign.segmentacoes.length > 0 && (
								<TooltipProvider>
									<Tooltip>
										<TooltipTrigger asChild>
											<div className="flex items-center gap-1.5 bg-secondary rounded-lg px-2 py-1 text-xs font-medium cursor-default">
												<Grid3x3 className="w-3.5 h-3.5 min-w-3.5 min-h-3.5" />
												{campaign.segmentacoes.length} {campaign.segmentacoes.length === 1 ? "segmentação" : "segmentações"}
											</div>
										</TooltipTrigger>
										<TooltipContent className="max-w-xs">{campaign.segmentacoes.map((s) => s.segmentacao).join(", ")}</TooltipContent>
									</Tooltip>
								</TooltipProvider>
							)}
						</div>
					</div>
					<div className="flex items-center gap-3">
						<DateIntervalInput
							label="Período"
							labelClassName="hidden"
							className="hover:bg-accent hover:text-accent-foreground border-none shadow-none shrink-0"
							value={{
								after: filters.startDate,
								before: filters.endDate,
							}}
							handleChange={handleDateChange}
						/>
						<Button size="sm" className="flex items-center gap-2" asChild>
							<Link href={`/dashboard/commercial/campaigns/builder?campaignId=${campaignId}`}>
								<Pencil className="w-4 h-4 min-w-4 min-h-4" />
								EDITAR
							</Link>
						</Button>
					</div>
				</div>
			</div>

			{/* Section A — Core KPIs */}
			<div className="w-full flex items-start flex-col lg:flex-row gap-3">
				<StatUnitCard
					title="INTERAÇÕES ENVIADAS"
					icon={<MessageCircle className="w-4 h-4 min-w-4 min-h-4" />}
					current={{ value: performance?.interacoesEnviadas ?? 0, format: (n) => formatDecimalPlaces(n) }}
				/>
				<StatUnitCard
					title="CONVERSÕES"
					icon={<MousePointerClick className="w-4 h-4 min-w-4 min-h-4" />}
					current={{ value: performance?.conversoes ?? 0, format: (n) => formatDecimalPlaces(n) }}
				/>
				<StatUnitCard
					title="TAXA DE CONVERSÃO"
					icon={<TrendingUp className="w-4 h-4 min-w-4 min-h-4" />}
					current={{ value: performance?.taxaConversao ?? 0, format: (n) => `${formatDecimalPlaces(n)}%` }}
				/>
				<StatUnitCard
					title="RECEITA ATRIBUÍDA"
					icon={<BadgeDollarSign className="w-4 h-4 min-w-4 min-h-4" />}
					current={{ value: performance?.receitaAtribuida ?? 0, format: (n) => formatToMoney(n) }}
				/>
				<StatUnitCard
					title="TEMPO MÉDIO DE CONVERSÃO"
					icon={<Clock className="w-4 h-4 min-w-4 min-h-4" />}
					current={{
						value: performance?.tempoMedioConversaoHoras ?? 0,
						format: (n) => `${formatDecimalPlaces(n, 1, 1)} horas`,
					}}
				/>
			</div>

			{/* Section B — Delivery & Reach KPIs */}
			<div className="w-full flex items-start flex-col lg:flex-row gap-3">
				<StatUnitCard
					title="CLIENTES ALCANÇADOS"
					icon={<Users className="w-4 h-4 min-w-4 min-h-4" />}
					current={{ value: performance?.clientesAlcancados ?? 0, format: (n) => formatDecimalPlaces(n) }}
				/>
				<StatUnitCard
					title="CLIENTES CONVERTIDOS"
					icon={<UserRoundCheck className="w-4 h-4 min-w-4 min-h-4" />}
					current={{ value: performance?.clientesConvertidos ?? 0, format: (n) => formatDecimalPlaces(n) }}
				/>
				<StatUnitCard
					title="MENSAGENS ENTREGUES"
					icon={<Send className="w-4 h-4 min-w-4 min-h-4" />}
					current={{ value: performance?.totalEntregues ?? 0, format: (n) => formatDecimalPlaces(n) }}
				/>
				<StatUnitCard
					title="FALHAS DE ENVIO"
					icon={<CircleX className="w-4 h-4 min-w-4 min-h-4" />}
					current={{ value: performance?.totalFalhas ?? 0, format: (n) => formatDecimalPlaces(n) }}
					lowerIsBetter
				/>
				<StatUnitCard
					title="TICKET MÉDIO DAS CONVERSÕES"
					icon={<BadgeDollarSign className="w-4 h-4 min-w-4 min-h-4" />}
					current={{ value: performance?.ticketMedioConversao ?? 0, format: (n) => formatToMoney(n) }}
				/>
			</div>

			{/* Section C — Conversion Quality KPIs */}
			<div className="w-full flex items-start flex-col lg:flex-row gap-3">
				<StatUnitCard
					title="AQUISIÇÕES"
					icon={<UserPlus className="w-4 h-4 min-w-4 min-h-4" />}
					current={{ value: aquisicoes?.quantidade ?? 0, format: (n) => formatDecimalPlaces(n) }}
				/>
				<StatUnitCard
					title="REATIVAÇÕES"
					icon={<RefreshCw className="w-4 h-4 min-w-4 min-h-4" />}
					current={{ value: reativacoes?.quantidade ?? 0, format: (n) => formatDecimalPlaces(n) }}
				/>
				<StatUnitCard
					title="ACELERAÇÕES"
					icon={<Zap className="w-4 h-4 min-w-4 min-h-4" />}
					current={{ value: aceleracoes?.quantidade ?? 0, format: (n) => formatDecimalPlaces(n) }}
				/>
				<StatUnitCard
					title="ANTECIPAÇÃO MÉDIA"
					icon={<TrendingUp className="w-4 h-4 min-w-4 min-h-4" />}
					current={{
						value: qualityData?.impactoFrequencia?.mediasDiasAntecipados ?? 0,
						format: (n) => `${formatDecimalPlaces(n, 1, 1)} dias`,
					}}
				/>
				<StatUnitCard
					title="IMPACTO NO TICKET"
					icon={<BadgeDollarSign className="w-4 h-4 min-w-4 min-h-4" />}
					current={{
						value: qualityData?.impactoMonetario?.deltaMonetarioPercentualMedio ?? 0,
						format: (n) => `${n > 0 ? "+" : ""}${formatDecimalPlaces(n)}%`,
					}}
				/>
			</div>

			{/* Section D — Time-Series Chart */}
			<WeeklyLimitSection performance={performance} />
			<div className="w-full lg:h-[480px]">
				<CampaignsGraphs
					startDate={filters.startDate}
					endDate={filters.endDate}
					comparingStartDate={comparingFilters.startDate}
					comparingEndDate={comparingFilters.endDate}
					campaignId={campaignId}
				/>
			</div>

			{/* Section E — Conversion Type Distribution */}
			{qualityData ? (
				<>
					<CampaignConversionTypeDistributionSection distribution={qualityData.distribuicaoTipos} />
					<div className="w-full flex flex-col lg:flex-row gap-3">
						<div className="w-full lg:w-1/2">
							<CampaignFrequencyImpactSection frequency={qualityData.impactoFrequencia} />
						</div>
						<div className="w-full lg:w-1/2">
							<CampaignMonetaryImpactSection monetary={qualityData.impactoMonetario} />
						</div>
					</div>
				</>
			) : (
				<div className="w-full flex flex-col gap-3">
					<p className="text-sm text-muted-foreground">Não há dados de qualidade das conversões para exibir.</p>
				</div>
			)}

			<div className="w-full flex flex-col lg:flex-row gap-3">
				<div className="w-full lg:w-1/2">
					<InteractionsSection campaignId={campaignId} />
				</div>
				<div className="w-full lg:w-1/2">
					<ConversionsSection campaignId={campaignId} startDate={filters.startDate} endDate={filters.endDate} />
				</div>
			</div>
		</div>
	);
}

function CampaignConversionTypeDistributionSection({ distribution }: { distribution: TGetConversionQualityOutput["data"]["distribuicaoTipos"] }) {
	const ConversionTypeDistributionItem = memo(
		function ConversionTypeDistributionItem({ item }: { item: TGetConversionQualityOutput["data"]["distribuicaoTipos"][number] }) {
			const config = CONVERSION_TYPE_CONFIG[item.tipo ?? ""] ?? {
				label: item.tipo,
				bgClass: "bg-gray-400",
				textClass: "text-gray-600",
			};
			return (
				<div key={item.tipo} className="flex flex-col gap-1">
					<div className="flex items-center justify-between gap-2">
						<div className="flex items-center gap-2">
							<div className={cn("w-2.5 h-2.5 rounded-full shrink-0", config.bgClass)} />
							<span className="text-xs font-medium">{config.label}</span>
						</div>
						<div className="flex items-center gap-3">
							<span className="text-xs text-muted-foreground">{formatDecimalPlaces(item.quantidade)} conv.</span>
							<span className={cn("text-xs font-bold", config.textClass)}>{formatDecimalPlaces(item.percentual)}%</span>
							<span className="text-xs text-muted-foreground">{formatToMoney(item.receita)}</span>
						</div>
					</div>
					<div className="w-full bg-secondary rounded-full h-2">
						<div className={cn("h-2 rounded-full", config.bgClass)} style={{ width: `${Math.min(item.percentual, 100)}%` }} />
					</div>
				</div>
			);
		},
		(prev, next) => prev.item.tipo === next.item.tipo,
	);
	return (
		<div className={cn("bg-card border-border flex w-full flex-col gap-3 rounded-xl border px-3 py-4 shadow-2xs")}>
			<div className="flex items-center justify-between">
				<div className="flex flex-col">
					<h1 className="text-xs font-medium tracking-tight uppercase">CONVERSÕES POR TIPO</h1>
				</div>
				<div className="flex items-center gap-2">
					<Diamond className="w-4 h-4 min-w-4 min-h-4" />
				</div>
			</div>
			<div className="flex w-full flex-col gap-1">
				{distribution.map((item) => (
					<ConversionTypeDistributionItem key={item.tipo} item={item} />
				))}
			</div>
		</div>
	);
}

function CampaignFrequencyImpactSection({ frequency }: { frequency: TGetConversionQualityOutput["data"]["impactoFrequencia"] }) {
	return (
		<div className={cn("bg-card border-border flex w-full flex-col gap-3 rounded-xl border px-3 py-4 shadow-2xs")}>
			<div className="flex items-center justify-between">
				<div className="flex flex-col">
					<h1 className="text-xs font-medium tracking-tight uppercase">IMPACTO NA FREQUÊNCIA</h1>
				</div>
				<div className="flex items-center gap-2">
					<Rocket className="w-4 h-4 min-w-4 min-h-4" />
				</div>
			</div>
			<div className="flex w-full flex-col gap-1">
				<div className="flex flex-col gap-2">
					<ImpactRow label="Compras aceleradas" value={formatDecimalPlaces(frequency.totalAceleradas)} positive />
					<ImpactRow label="Compras atrasadas" value={formatDecimalPlaces(frequency.totalAtrasadas)} positive={false} />
					<ImpactRow label="Antecipação média" value={`${formatDecimalPlaces(frequency.mediasDiasAntecipados, 1, 1)} dias`} positive />
				</div>
			</div>
		</div>
	);
}
function CampaignMonetaryImpactSection({ monetary }: { monetary: TGetConversionQualityOutput["data"]["impactoMonetario"] }) {
	return (
		<div className={cn("bg-card border-border flex w-full flex-col gap-3 rounded-xl border px-3 py-4 shadow-2xs")}>
			<div className="flex items-center justify-between">
				<div className="flex flex-col">
					<h1 className="text-xs font-medium tracking-tight uppercase">IMPACTO NO TICKET</h1>
				</div>
				<div className="flex items-center gap-2">
					<Ticket className="w-4 h-4 min-w-4 min-h-4" />
				</div>
			</div>
			<div className="flex w-full flex-col gap-3">
				<div className="flex flex-col gap-2">
					<ImpactRow label="Compras acima do ticket médio" value={formatDecimalPlaces(monetary.totalAcimaTicket)} positive />
					<ImpactRow label="Compras abaixo do ticket médio" value={formatDecimalPlaces(monetary.totalAbaixoTicket)} positive={false} />
					<ImpactRow
						label="Variação média"
						value={`${monetary.deltaMonetarioPercentualMedio > 0 ? "+" : ""}${formatDecimalPlaces(monetary.deltaMonetarioPercentualMedio)}%`}
						positive={monetary.deltaMonetarioPercentualMedio >= 0}
					/>
				</div>
			</div>
		</div>
	);
}

function ImpactRow({ label, value, positive }: { label: string; value: string; positive: boolean }) {
	return (
		<div className="flex items-center justify-between gap-2">
			<span className="text-xs font-medium">{label}</span>
			<span className={cn("text-xs font-bold", positive ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400")}>{value}</span>
		</div>
	);
}

function WeeklyLimitSection({ performance }: { performance: TGetCampaignStatsOutput["data"] | undefined }) {
	const weeklyLimit = performance?.limiteSemanal;
	if (!weeklyLimit) return null;

	return (
		<div className="w-full flex flex-col gap-3">
			<div className="w-full flex items-start flex-col lg:flex-row gap-3">
				<StatUnitCard
					title="LIMITE SEMANAL EFETIVO"
					icon={<CalendarClock className="w-4 h-4 min-w-4 min-h-4" />}
					current={{
						value: weeklyLimit.campaignEffectiveWeeklyLimit ?? 0,
						format: () => formatWeeklyLimitValue(weeklyLimit.campaignEffectiveWeeklyLimit),
					}}
				/>
				<StatUnitCard
					title="USADO NESTA SEMANA"
					icon={<Send className="w-4 h-4 min-w-4 min-h-4" />}
					current={{
						value: weeklyLimit.campaignUsedThisWeek,
						format: (n) => formatDecimalPlaces(n),
					}}
				/>
				<StatUnitCard
					title="SALDO SEMANAL"
					icon={<Clock className="w-4 h-4 min-w-4 min-h-4" />}
					current={{
						value: weeklyLimit.campaignRemainingThisWeek ?? 0,
						format: () => formatWeeklyLimitValue(weeklyLimit.campaignRemainingThisWeek),
					}}
				/>
				<StatUnitCard
					title="LIMITE SEMANAL DA ORGANIZAÇÃO"
					icon={<ShieldAlert className="w-4 h-4 min-w-4 min-h-4" />}
					current={{
						value: weeklyLimit.organizationWeeklyLimit ?? 0,
						format: () => formatWeeklyLimitValue(weeklyLimit.organizationWeeklyLimit),
					}}
				/>
			</div>
		</div>
	);
}

function formatWeeklyLimitValue(value: number | null | undefined) {
	if (value == null) return "N/A";
	return formatDecimalPlaces(value);
}

function ConversionsSection({ campaignId, startDate, endDate }: { campaignId: string; startDate: Date; endDate: Date }) {
	const [selectedTypes, setSelectedTypes] = useState<string[]>([]);

	const {
		data: conversionsData,
		isLoading,
		isError,
		isSuccess,
		error,
		filters,
		updateFilters,
	} = useCampaignsConversions({
		initialFilters: {
			campaignId,
			page: 1,
			search: "",
			types: [],
			periodAfter: startDate,
			periodBefore: endDate,
		},
	});

	// Sync parent date filter changes into the hook's internal state
	useEffect(() => {
		updateFilters({ periodAfter: startDate, periodBefore: endDate, page: 1 });
	}, [startDate.toISOString(), endDate.toISOString()]);

	const items = conversionsData?.items ?? [];
	const conversionsMatched = conversionsData?.conversionsMatched ?? 0;
	const totalPages = conversionsData?.totalPages ?? 0;

	const conversionTypeOptions = Object.entries(CONVERSION_TYPE_CONFIG).map(([key, val]) => ({
		key,
		label: val.label,
		bgClass: val.bgClass,
	}));

	const toggleType = (key: string) => {
		const next = selectedTypes.includes(key) ? selectedTypes.filter((k) => k !== key) : [...selectedTypes, key];
		setSelectedTypes(next);
		updateFilters({ types: next as typeof filters.types, page: 1 });
	};

	return (
		<div className={cn("bg-card border-border flex w-full flex-col gap-3 rounded-xl border px-3 py-4 shadow-2xs")}>
			<div className="flex items-center justify-between">
				<div className="flex flex-col">
					<h1 className="text-xs font-medium tracking-tight uppercase">CONVERSÕES</h1>
				</div>
				<div className="flex items-center gap-2">
					<ShoppingCart className="w-4 h-4 min-w-4 min-h-4" />
				</div>
			</div>
			<div className="flex w-full flex-col gap-3">
				<div className="w-full flex flex-col gap-1.5">
					<Input
						value={filters.search ?? ""}
						placeholder="Pesquisar por cliente..."
						onChange={(e) => updateFilters({ search: e.target.value, page: 1 })}
						className="grow rounded-xl"
					/>
					<div className="w-full flex items-center gap-1.5 flex-wrap">
						{conversionTypeOptions.map((opt) => (
							<button
								key={opt.key}
								type="button"
								onClick={() => toggleType(opt.key)}
								className={cn(
									"flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-[0.65rem] font-bold uppercase transition-colors border",
									selectedTypes.includes(opt.key)
										? `${opt.bgClass} text-white border-transparent`
										: "bg-secondary text-foreground border-transparent hover:bg-secondary/80",
								)}
							>
								{opt.label}
							</button>
						))}
					</div>
				</div>
				<GeneralPaginationComponent
					activePage={filters.page ?? 1}
					queryLoading={isLoading}
					selectPage={(page) => updateFilters({ page })}
					totalPages={totalPages}
					itemsMatchedText={`${conversionsMatched} ${conversionsMatched === 1 ? "conversão encontrada." : "conversões encontradas."}`}
					itemsShowingText={`${items.length} ${items.length === 1 ? "conversão exibida." : "conversões exibidas."}`}
				/>
				<div className="w-full flex flex-col gap-1.5 max-h-[500px] overflow-y-auto overscroll-y-auto scrollbar-thin scrollbar-track-primary/10 scrollbar-thumb-primary/30 px-2">
					{isLoading ? <LoadingComponent /> : null}
					{isError ? <ErrorComponent msg={getErrorMessage(error)} /> : null}
					{isSuccess ? (
						<div className="w-full flex flex-col gap-1.5">
							{items.length > 0 ? (
								items.map((conversion) => <CampaignConversionCard key={conversion.id} conversion={conversion} />)
							) : (
								<p className="w-full flex items-center justify-center text-sm text-muted-foreground py-4">Nenhuma conversão encontrada para este período.</p>
							)}
						</div>
					) : null}
				</div>
			</div>
		</div>
	);
}

function InteractionsSection({ campaignId }: { campaignId: string }) {
	const {
		data: interactionsResult,
		isLoading,
		isError,
		isSuccess,
		error,
		filters,
		updateFilters,
	} = useCampaignInteractionsLogs({
		initialFilters: {
			page: 1,
			search: "",
			status: [],
			orderByField: "agendamentoData",
			orderByDirection: "desc",
			campanhaId: campaignId,
		},
	});

	const items = interactionsResult?.items ?? [];
	const interactionsMatched = interactionsResult?.interactionsMatched ?? 0;
	const totalPages = interactionsResult?.totalPages ?? 0;

	return (
		<div className={cn("bg-card border-border flex w-full flex-col gap-3 rounded-xl border px-3 py-4 shadow-2xs")}>
			<div className="flex items-center justify-between">
				<div className="flex flex-col">
					<h1 className="text-xs font-medium tracking-tight uppercase">INTERAÇÕES</h1>
				</div>
				<div className="flex items-center gap-2">
					<MessageCircle className="w-4 h-4 min-w-4 min-h-4" />
				</div>
			</div>
			<div className="flex w-full flex-col gap-3">
				<div className="w-full flex flex-col gap-1.5">
					<Input
						value={filters.search ?? ""}
						placeholder="Pesquisar interações (título, descrição, cliente)..."
						onChange={(e) => updateFilters({ search: e.target.value, page: 1 })}
						className="grow rounded-xl"
					/>
					<div className="w-full flex items-center gap-1.5 flex-wrap">
						{InteractionsSentStatusOptions.map((opt) => {
							const isSelected = filters.status.includes(opt.value);
							return (
								<button
									key={opt.id}
									type="button"
									onClick={() =>
										updateFilters({
											status: isSelected ? filters.status.filter((s) => s !== opt.value) : [...filters.status, opt.value],
											page: 1,
										})
									}
									className={cn(
										"flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-[0.65rem] font-bold uppercase transition-colors border",
										isSelected && opt.className,
									)}
								>
									{opt.label}
								</button>
							);
						})}
					</div>
				</div>
				<GeneralPaginationComponent
					activePage={filters.page ?? 1}
					queryLoading={isLoading}
					selectPage={(page) => updateFilters({ page })}
					totalPages={totalPages}
					itemsMatchedText={`${interactionsMatched} ${interactionsMatched === 1 ? "interação encontrada." : "interações encontradas."}`}
					itemsShowingText={`${items.length} ${items.length === 1 ? "interação exibida." : "interações exibidas."}`}
				/>
				<div className="w-full flex flex-col gap-1.5 max-h-[500px] overflow-y-auto overscroll-y-auto scrollbar-thin scrollbar-track-primary/10 scrollbar-thumb-primary/30 px-2">
					{isLoading ? <LoadingComponent /> : null}
					{isError ? <ErrorComponent msg={getErrorMessage(error)} /> : null}
					{isSuccess ? (
						items.length > 0 ? (
							items.map((interaction) => <InteractionLogCard key={interaction.id} interaction={interaction} />)
						) : (
							<p className="w-full flex items-center justify-center text-sm text-muted-foreground py-4">Nenhuma interação encontrada.</p>
						)
					) : null}
				</div>
			</div>
		</div>
	);
}

function InteractionLogCard({ interaction }: { interaction: TGetCampaignInteractionsOutputItems[number] }) {
	const queryClient = useQueryClient();
	const { mutate: handleRetryInteraction, isPending: retryIsPending } = useMutation({
		mutationKey: ["retry-campaign-interaction", interaction.id],
		mutationFn: async () => await retryCampaignInteraction({ interactionId: interaction.id }),
		onSuccess: async (response) => {
			toast.success(response.message);
			await queryClient.invalidateQueries({ queryKey: ["campaign-interactions-logs"] });
		},
		onError: (error) => {
			toast.error(getErrorMessage(error));
		},
	});
	const executionStatus = interaction.dataExecucao ? "EXECUTADA" : "AGENDADA";
	const scheduleDateText = interaction.agendamentoDataReferencia ? dayjs(interaction.agendamentoDataReferencia).format("DD/MM/YYYY") : "Não definido";
	const scheduleBlockText = interaction.agendamentoBlocoReferencia ?? "--:--";
	const executionDateText = interaction.dataExecucao ? formatDateAsLocale(interaction.dataExecucao, true) : "Não executada";

	return (
		<InteractionCard.Provider interaction={interaction}>
			<div className="bg-card border-border flex w-full flex-col gap-2 rounded-xl border px-3 py-4 shadow-2xs">
				<div className="w-full flex flex-col gap-0.5">
					<div className="w-full flex items-center justify-between gap-2">
						<div className="flex items-center gap-3 flex-wrap">
							<ClientHoverCard clientId={interaction.cliente.id}>
								<div className="flex items-center gap-1.5 bg-secondary rounded-xl px-3 py-1.5 cursor-pointer">
									<UserRound className="w-4 h-4 min-w-4 min-h-4" />
									<p className="text-[0.65rem] font-medium tracking-tight uppercase">{interaction.cliente.nome ?? "NÃO INFORMADO"}</p>
								</div>
							</ClientHoverCard>
						</div>
						<div className="flex items-center gap-3">
							<InteractionCard.DataForNerds />
							{interaction.erroEnvio ? (
								<TooltipProvider>
									<Tooltip>
										<TooltipTrigger asChild>
											<div className="flex items-center gap-1.5 rounded-md px-1.5 py-1.5 text-[0.65rem] font-bold bg-red-500 text-white">
												<CircleX className="w-4 min-w-4 h-4 min-h-4" />
												<p className="text-[0.65rem] font-medium tracking-tight">FALHOU</p>
											</div>
										</TooltipTrigger>
										<TooltipContent>
											<p className="text-xs font-medium tracking-tight text-red-500">{interaction.erroEnvio}</p>
										</TooltipContent>
									</Tooltip>
								</TooltipProvider>
							) : null}
							<div
								className={cn("flex items-center gap-1.5 rounded-md px-1.5 py-1.5 text-[0.65rem] font-bold", {
									"bg-blue-500 text-white": executionStatus === "AGENDADA",
									"bg-green-500 text-white": executionStatus === "EXECUTADA",
								})}
							>
								<CircleCheck className="w-4 min-w-4 h-4 min-h-4" />
								<p className="text-xs font-bold tracking-tight uppercase">{executionStatus}</p>
							</div>
							{interaction.erroEnvio && !interaction.dataExecucao ? (
								<Button
									size="sm"
									variant="outline"
									onClick={() => handleRetryInteraction()}
									disabled={retryIsPending}
									className="h-7 text-[0.65rem] font-semibold"
								>
									<RefreshCw className={cn("w-3.5 h-3.5 min-w-3.5 min-h-3.5", { "animate-spin": retryIsPending })} />
									{retryIsPending ? "REENVIANDO..." : "TENTAR NOVAMENTE"}
								</Button>
							) : null}
						</div>
					</div>
					{interaction.descricao && <p className="text-xs font-medium tracking-tight text-muted-foreground">{interaction.descricao}</p>}
				</div>
				<div className="w-full flex items-center justify-end gap-2 flex-wrap">
					<div className="flex items-center gap-2">
						<div className="flex items-center gap-1">
							<CalendarClock className="w-4 h-4 min-w-4 min-h-4" />
							<h1 className="py-0.5 text-center text-[0.65rem] font-medium italic">
								AGENDADO PARA: {scheduleDateText} ({scheduleBlockText})
							</h1>
						</div>
						{interaction.dataExecucao ? (
							<div
								className={cn("flex items-center gap-1", {
									"text-green-500 dark:text-green-400": !!interaction.dataExecucao,
								})}
							>
								<CalendarCheck className="w-4 h-4 min-w-4 min-h-4" />
								<h1 className="py-0.5 text-center text-[0.65rem] font-medium italic">{executionDateText}</h1>
							</div>
						) : null}
					</div>
				</div>
			</div>
		</InteractionCard.Provider>
	);
}
