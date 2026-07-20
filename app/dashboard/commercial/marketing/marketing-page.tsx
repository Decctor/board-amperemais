"use client";

import ErrorComponent from "@/components/Layouts/ErrorComponent";
import LoadingComponent from "@/components/Layouts/LoadingComponent";
import { useOrgColors } from "@/components/Providers/OrgColorsProvider";
import { StatEmptyState } from "@/components/SalesStats/StatEmptyState";
import { Button } from "@/components/ui/button";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { TAuthUserSession } from "@/lib/authentication/types";
import { formatToMoney } from "@/lib/formatting";
import type { TMetaAdsLibraryAd } from "@/lib/integrations/meta/ads/types";
import { useIntegrations } from "@/lib/queries/integrations";
import { useMetaAdsInsights, useMetaAdsLibrary, useMetaAdsSpendSeries } from "@/lib/queries/meta-ads";
import { cn } from "@/lib/utils";
import { useQueryClient } from "@tanstack/react-query";
import { Settings2, Target } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Area, CartesianGrid, ComposedChart, XAxis, YAxis } from "recharts";
import { MetaAdDetailModal } from "./_components/MetaAdDetailModal";
import { MetaCapiSettingsModal } from "./_components/MetaCapiSettingsModal";
import { getMetaAdEffectiveStatusConfig } from "./_components/meta-ad-status";
import dayjs from "dayjs";

const PERIOD_OPTIONS = [
	{ value: "7", label: "Últimos 7 dias" },
	{ value: "30", label: "Últimos 30 dias" },
	{ value: "90", label: "Últimos 90 dias" },
] as const;

const LIBRARY_STATUS_OPTIONS = [
	{ value: "all", label: "Todos" },
	{ value: "active", label: "Ativos" },
	{ value: "paused", label: "Pausados" },
] as const;

const SPEND_CHART_CONFIG = { spend: { label: "Investimento", color: "#ffb900" } } as const;

const CONNECT_URL = "/api/integrations/meta/ads/auth?redirectTo=/dashboard/commercial/marketing";

function formatInt(value: number) {
	return new Intl.NumberFormat("pt-BR").format(Math.round(value));
}

type MarketingPageProps = {
	user: TAuthUserSession["user"];
};

export default function MarketingPage({ user: _user }: MarketingPageProps) {
	const queryClient = useQueryClient();
	const { data: integrations, isLoading, isError, error, queryKey } = useIntegrations({ tipo: "META_ADS" });

	const [selectedIntegrationId, setSelectedIntegrationId] = useState<string | null>(null);
	const [periodDays, setPeriodDays] = useState<string>("30");
	const [libraryStatus, setLibraryStatus] = useState<"all" | "active" | "paused">("all");
	const [selectedAd, setSelectedAd] = useState<TMetaAdsLibraryAd | null>(null);
	const [capiModalOpen, setCapiModalOpen] = useState<boolean>(false);

	const metaAccounts = integrations ?? [];
	const selectedAccount = metaAccounts.find((account) => account.id === selectedIntegrationId) ?? null;
	const selectedCapiConfig = selectedAccount?.configuracao?.tipo === "META_ADS" ? selectedAccount.configuracao : null;

	useEffect(() => {
		if (!selectedIntegrationId && metaAccounts.length > 0) setSelectedIntegrationId(metaAccounts[0].id);
	}, [metaAccounts, selectedIntegrationId]);

	const { since, until } = useMemo(
		// Janela inclusiva nas duas pontas na Meta: "Últimos N dias" = [hoje-(N-1) … hoje], somando N dias.
		() => ({ since: dayjs().subtract(Number(periodDays) - 1, "day").format("YYYY-MM-DD"), until: dayjs().format("YYYY-MM-DD") }),
		[periodDays],
	);

	if (isLoading) return <LoadingComponent />;
	if (isError) return <ErrorComponent msg={error instanceof Error ? error.message : "Erro ao carregar integrações."} />;

	return (
		<div className="flex w-full flex-col gap-4 p-2 lg:p-4">
			{metaAccounts.length === 0 ? (
				<ConnectEmptyState />
			) : (
				<>
					<div className="flex w-full flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
						<Select value={selectedIntegrationId ?? undefined} onValueChange={setSelectedIntegrationId}>
							<SelectTrigger className="w-full sm:w-[280px]">
								<SelectValue placeholder="Selecione a conta" />
							</SelectTrigger>
							<SelectContent>
								{metaAccounts.map((account) => (
									<SelectItem key={account.id} value={account.id}>
										{account.apelido ?? (account.configuracao?.tipo === "META_ADS" ? account.configuracao.adAccountName : account.id)}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
						<div className="flex w-full items-center gap-2 sm:w-auto">
							<Select value={periodDays} onValueChange={setPeriodDays}>
								<SelectTrigger className="w-full sm:w-[200px]">
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									{PERIOD_OPTIONS.map((option) => (
										<SelectItem key={option.value} value={option.value}>
											{option.label}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
							<Button variant="outline" size="icon" title="Conversions API" onClick={() => setCapiModalOpen(true)} disabled={!selectedIntegrationId}>
								<Settings2 className="h-4 w-4" />
							</Button>
						</div>
					</div>

					{selectedIntegrationId ? (
						<MetaAdsDashboard
							integrationId={selectedIntegrationId}
							since={since}
							until={until}
							libraryStatus={libraryStatus}
							onLibraryStatusChange={setLibraryStatus}
							onSelectAd={setSelectedAd}
						/>
					) : null}
				</>
			)}

			{selectedAd && selectedIntegrationId ? (
				<MetaAdDetailModal ad={selectedAd} integrationId={selectedIntegrationId} since={since} until={until} closeModal={() => setSelectedAd(null)} />
			) : null}

			{capiModalOpen && selectedIntegrationId ? (
				<MetaCapiSettingsModal
					integrationId={selectedIntegrationId}
					initialPixelId={selectedCapiConfig?.pixelId}
					initialTestEventCode={selectedCapiConfig?.capiTestEventCode}
					initialPurchaseEnabled={(selectedCapiConfig?.eventosCapi ?? []).map((event) => event.toLowerCase()).includes("purchase")}
					closeModal={() => setCapiModalOpen(false)}
					onSaved={() => queryClient.invalidateQueries({ queryKey })}
				/>
			) : null}
		</div>
	);
}

type MetaAdsDashboardProps = {
	integrationId: string;
	since: string;
	until: string;
	libraryStatus: "all" | "active" | "paused";
	onLibraryStatusChange: (status: "all" | "active" | "paused") => void;
	onSelectAd: (ad: TMetaAdsLibraryAd) => void;
};

function MetaAdsDashboard({ integrationId, since, until, libraryStatus, onLibraryStatusChange, onSelectAd }: MetaAdsDashboardProps) {
	const accountQuery = useMetaAdsInsights({ integrationId, since, until, level: "account" });
	const spendQuery = useMetaAdsSpendSeries({ integrationId, since, until });
	const adInsightsQuery = useMetaAdsInsights({ integrationId, since, until, level: "ad" });
	const libraryQuery = useMetaAdsLibrary({ integrationId, status: libraryStatus });

	const account = accountQuery.data?.account ?? null;
	const spendSeries = (spendQuery.data ?? []).map((point) => ({ date: point.date.slice(5), spend: point.spend }));

	const adMetricsById = useMemo(() => {
		const map = new Map<string, { spend: number; purchases: number; purchaseValue: number; purchaseRoas: number | null }>();
		for (const row of adInsightsQuery.data?.ads ?? []) {
			map.set(row.adId, { spend: row.spend, purchases: row.purchases, purchaseValue: row.purchaseValue, purchaseRoas: row.purchaseRoas });
		}
		return map;
	}, [adInsightsQuery.data]);

	if (accountQuery.isLoading) return <LoadingComponent />;
	if (accountQuery.isError)
		return <ErrorComponent msg={accountQuery.error instanceof Error ? accountQuery.error.message : "Erro ao carregar métricas."} />;

	return (
		<div className="flex w-full flex-col gap-2 py-2">
			<div className="grid grid-cols-2 gap-2 md:grid-cols-4">
				<MetricCard label="Investimento" value={formatToMoney(account?.spend ?? 0)} highlight />
				<MetricCard label="ROAS" value={account?.purchaseRoas != null ? `${account.purchaseRoas.toFixed(2)}x` : "—"} highlight />
				<MetricCard label="Compras" value={formatInt(account?.purchases ?? 0)} />
				<MetricCard label="Receita" value={formatToMoney(account?.purchaseValue ?? 0)} />
				<MetricCard label="Leads" value={formatInt(account?.leads ?? 0)} />
				<MetricCard label="Impressões" value={formatInt(account?.impressions ?? 0)} />
				<MetricCard label="Cliques" value={formatInt(account?.clicks ?? 0)} />
				<MetricCard label="CTR" value={account?.ctr != null ? `${account.ctr.toFixed(2)}%` : "—"} />
			</div>

			<div className="bg-card border-border flex w-full flex-col gap-3 overflow-hidden rounded-xl border px-3 py-4 shadow-2xs">
				<div className="flex items-center justify-between gap-2 flex-wrap shrink-0">
					<h1 className="text-xs font-medium tracking-tight uppercase">Investimento no período</h1>
				</div>
				{spendQuery.isLoading ? (
					<div className="flex h-[240px] w-full items-center justify-center sm:h-[280px] lg:h-full">
						<LoadingComponent />
					</div>
				) : spendSeries.length > 0 ? (
					<div className="flex h-[240px] w-full min-w-0 items-center justify-center sm:h-[280px] lg:h-full lg:min-h-[280px]">
						<ChartContainer config={SPEND_CHART_CONFIG} className="aspect-auto h-full w-full min-h-0 min-w-0">
							<ComposedChart data={spendSeries} margin={{ top: 15, right: 15, left: 0, bottom: 0 }}>
								<defs>
									<linearGradient id="accountSpendGradient" x1="0" y1="0" x2="0" y2="1">
										<stop offset="10%" stopColor="var(--color-spend)" stopOpacity={0.9} />
										<stop offset="90%" stopColor="var(--color-spend)" stopOpacity={0.1} />
									</linearGradient>
								</defs>
								<CartesianGrid vertical={false} />
								<XAxis
									dataKey="date"
									tickLine={false}
									axisLine={false}
									tickMargin={10}
									minTickGap={24}
									tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
								/>
								<YAxis
									orientation="left"
									tickLine={false}
									axisLine={false}
									tickFormatter={(value) => formatToMoney(Number(value))}
									stroke="var(--color-spend)"
									width={70}
									tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
								/>
								<ChartTooltip cursor={false} content={<ChartTooltipContent />} />
								<Area dataKey="spend" type="monotone" fill="url(#accountSpendGradient)" stroke="var(--color-spend)" />
							</ComposedChart>
						</ChartContainer>
					</div>
				) : (
					<div className="flex h-[240px] w-full items-center justify-center sm:h-[280px] lg:h-full">
						<p className="text-sm text-muted-foreground">Nenhum investimento disponível para o período selecionado.</p>
					</div>
				)}
			</div>

			<div className="flex w-full flex-col gap-3">
				<div className="flex w-full items-center justify-between gap-2 flex-wrap">
					<h1 className="text-xs font-medium tracking-tight uppercase">Biblioteca de anúncios</h1>
					<Select value={libraryStatus} onValueChange={(value) => onLibraryStatusChange(value as "all" | "active" | "paused")}>
						<SelectTrigger className="w-full sm:w-[160px]">
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							{LIBRARY_STATUS_OPTIONS.map((option) => (
								<SelectItem key={option.value} value={option.value}>
									{option.label}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				</div>

				{libraryQuery.isLoading ? (
					<div className="flex w-full items-center justify-center py-8">
						<LoadingComponent />
					</div>
				) : libraryQuery.isError ? (
					<ErrorComponent msg={libraryQuery.error instanceof Error ? libraryQuery.error.message : "Erro ao carregar a biblioteca."} />
				) : (libraryQuery.data ?? []).length === 0 ? (
					<StatEmptyState
						className="min-h-[220px]"
						icon={Target}
						title="Nenhum anúncio encontrado"
						description="Não há anúncios para o filtro selecionado. Ajuste o status ou conecte outra conta do Meta Ads."
					/>
				) : (
					<div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
						{(libraryQuery.data ?? []).map((ad) => (
							<AdLibraryCard key={ad.id} ad={ad} metrics={adMetricsById.get(ad.id)} onClick={() => onSelectAd(ad)} />
						))}
					</div>
				)}
			</div>
		</div>
	);
}

function MetricCard({ label, value, highlight = false }: { label: string; value: string; highlight?: boolean }) {
	const { colors } = useOrgColors();
	return (
		<div
			className={cn(
				"bg-card border-border flex w-full flex-col gap-1 rounded-xl border px-3 py-4 shadow-2xs",
				highlight ? "ring-1 ring-brand/30" : null,
			)}
		>
			<h1 className="text-xs font-medium tracking-tight uppercase">{label}</h1>
			<span className="text-2xl font-bold tracking-tight tabular-nums" style={{ color: colors.secondary }}>
				{value}
			</span>
		</div>
	);
}

function AdLibraryCard({
	ad,
	metrics,
	onClick,
}: {
	ad: TMetaAdsLibraryAd;
	metrics?: { spend: number; purchases: number; purchaseValue: number; purchaseRoas: number | null };
	onClick: () => void;
}) {
	const status = getMetaAdEffectiveStatusConfig(ad.effectiveStatus);
	const contextLine = [ad.campaignName, ad.adsetName].filter(Boolean).join(" · ");

	return (
		<button
			type="button"
			onClick={onClick}
			className={cn(
				"group flex w-full flex-col gap-3 rounded-2xl border border-border bg-card p-4 text-left shadow-2xs",
				"transition-all duration-200 ease-out hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-sm",
				"focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20",
			)}
		>
			<div className="flex items-start gap-3">
				{ad.thumbnailUrl || ad.imageUrl ? (
					// eslint-disable-next-line @next/next/no-img-element
					<img src={ad.thumbnailUrl ?? ad.imageUrl} alt={ad.name} className="h-16 w-16 shrink-0 rounded-xl object-cover ring-1 ring-border" />
				) : (
					<div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl bg-muted text-muted-foreground ring-1 ring-border">
						<Target className="h-5 w-5" />
					</div>
				)}
				<div className="flex min-w-0 flex-1 flex-col gap-1.5">
					<div className="flex items-start justify-between gap-2">
						<span className="line-clamp-2 text-sm font-bold leading-snug tracking-tight text-foreground">{ad.name}</span>
						<span className={cn("shrink-0 rounded-full px-2 py-0.5 text-[0.65rem] font-semibold", status.className)}>{status.label}</span>
					</div>
					{contextLine ? <span className="truncate text-xs text-muted-foreground">{contextLine}</span> : null}
				</div>
			</div>

			<div className="grid grid-cols-3 gap-2 border-t border-border pt-3">
				<AdMetric label="Investido" value={formatToMoney(metrics?.spend ?? 0)} />
				<AdMetric label="Compras" value={formatInt(metrics?.purchases ?? 0)} />
				<AdMetric label="ROAS" value={metrics?.purchaseRoas != null ? `${metrics.purchaseRoas.toFixed(2)}x` : "—"} />
			</div>
		</button>
	);
}

function AdMetric({ label, value }: { label: string; value: string }) {
	return (
		<div className="flex flex-col gap-0.5">
			<span className="text-[0.65rem] font-bold tracking-tight uppercase text-muted-foreground">{label}</span>
			<span className="text-sm font-bold tabular-nums tracking-tight text-foreground">{value}</span>
		</div>
	);
}

function ConnectEmptyState() {
	return (
		<div className="flex w-full flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-border p-10 text-center">
			<div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
				<Target className="h-6 w-6" />
			</div>
			<div className="flex flex-col gap-1">
				<h2 className="text-base font-bold text-foreground">Conecte sua conta do Meta Ads</h2>
				<p className="max-w-md text-sm text-muted-foreground">
					Visualize a performance dos seus anúncios, a biblioteca de criativos e prepare o terreno para conversões e públicos.
				</p>
			</div>
			<Button asChild className="mt-2">
				<a href={CONNECT_URL}>CONECTAR COM O META</a>
			</Button>
		</div>
	);
}

// Helpers de data (evita importar dayjs no client bundle só para duas contas simples).
function today() {
	return new Date().toISOString().slice(0, 10);
}
function dayjsSubtract(days: number) {
	const date = new Date();
	date.setDate(date.getDate() - days);
	return date.toISOString().slice(0, 10);
}
