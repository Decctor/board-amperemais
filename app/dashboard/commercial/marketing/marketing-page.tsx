"use client";

import ErrorComponent from "@/components/Layouts/ErrorComponent";
import LoadingComponent from "@/components/Layouts/LoadingComponent";
import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { TAuthUserSession } from "@/lib/authentication/types";
import { formatToMoney } from "@/lib/formatting";
import { useIntegrations } from "@/lib/queries/integrations";
import { useMetaAdsInsights, useMetaAdsLibrary, useMetaAdsSpendSeries } from "@/lib/queries/meta-ads";
import type { TMetaAdsLibraryAd } from "@/lib/integrations/meta/ads/types";
import { cn } from "@/lib/utils";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { useQueryClient } from "@tanstack/react-query";
import { Settings2, Target } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Area, CartesianGrid, ComposedChart, XAxis, YAxis } from "recharts";
import { MetaAdDetailModal } from "./_components/MetaAdDetailModal";
import { MetaCapiSettingsModal } from "./_components/MetaCapiSettingsModal";

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

	const { since, until } = useMemo(() => ({ since: dayjsSubtract(Number(periodDays)), until: today() }), [periodDays]);

	if (isLoading) return <LoadingComponent />;
	if (isError) return <ErrorComponent msg={error instanceof Error ? error.message : "Erro ao carregar integrações."} />;

	return (
		<div className="flex w-full flex-col gap-4 p-2 lg:p-4">
			<div className="flex w-full flex-col gap-1">
				<h1 className="flex items-center gap-2 text-xl font-black tracking-tight text-foreground">
					<Target className="h-5 w-5 text-primary" /> Meta Ads
				</h1>
				<p className="text-sm text-muted-foreground">Performance dos seus anúncios e biblioteca de criativos.</p>
			</div>

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
		<div className="flex w-full flex-col gap-4">
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

			<div className="flex w-full flex-col gap-2 rounded-xl border border-border p-3">
				<h2 className="text-sm font-bold text-primary">Investimento no período</h2>
				{spendQuery.isLoading ? (
					<div className="flex h-[240px] items-center justify-center">
						<LoadingComponent />
					</div>
				) : spendSeries.length > 0 ? (
					<div className="flex h-[240px] w-full items-center justify-center">
						<ChartContainer config={SPEND_CHART_CONFIG} className="aspect-auto h-[240px] w-full">
							<ComposedChart data={spendSeries} margin={{ top: 8, right: 12, left: 12, bottom: 0 }}>
								<defs>
									<linearGradient id="accountSpendGradient" x1="0" y1="0" x2="0" y2="1">
										<stop offset="10%" stopColor="var(--color-spend)" stopOpacity={0.9} />
										<stop offset="90%" stopColor="var(--color-spend)" stopOpacity={0.1} />
									</linearGradient>
								</defs>
								<CartesianGrid vertical={false} />
								<XAxis dataKey="date" tickLine={false} axisLine={false} tickMargin={8} minTickGap={24} />
								<YAxis orientation="left" tickFormatter={(value) => formatToMoney(Number(value))} stroke="var(--color-spend)" width={70} />
								<ChartTooltip cursor={false} content={<ChartTooltipContent />} />
								<Area dataKey="spend" type="monotone" fill="url(#accountSpendGradient)" stroke="var(--color-spend)" />
							</ComposedChart>
						</ChartContainer>
					</div>
				) : (
					<p className="py-8 text-center text-sm italic text-muted-foreground">Sem investimento no período.</p>
				)}
			</div>

			<div className="flex w-full flex-col gap-2">
				<div className="flex w-full flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
					<h2 className="text-sm font-bold text-primary">Biblioteca de anúncios</h2>
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
					<LoadingComponent />
				) : libraryQuery.isError ? (
					<ErrorComponent msg={libraryQuery.error instanceof Error ? libraryQuery.error.message : "Erro ao carregar a biblioteca."} />
				) : (libraryQuery.data ?? []).length === 0 ? (
					<p className="py-8 text-center text-sm italic text-muted-foreground">Nenhum anúncio encontrado.</p>
				) : (
					<div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
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
	return (
		<div className={cn("flex flex-col gap-1 rounded-xl border border-border p-3", highlight ? "bg-brand/10" : "bg-muted/30")}>
			<span className="text-[0.65rem] font-bold uppercase tracking-wide text-muted-foreground">{label}</span>
			<span className="text-lg font-black tabular-nums text-foreground">{value}</span>
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
	const isActive = ad.effectiveStatus === "ACTIVE";
	return (
		<button
			type="button"
			onClick={onClick}
			className="flex w-full flex-col gap-2 rounded-xl border border-border bg-card p-3 text-left transition-colors hover:border-primary/40"
		>
			<div className="flex items-start gap-2">
				{ad.thumbnailUrl || ad.imageUrl ? (
					// eslint-disable-next-line @next/next/no-img-element
					<img src={ad.thumbnailUrl ?? ad.imageUrl} alt={ad.name} className="h-14 w-14 shrink-0 rounded-md object-cover" />
				) : (
					<div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
						<Target className="h-5 w-5" />
					</div>
				)}
				<div className="flex min-w-0 flex-col items-start gap-1">
					<span className="truncate text-sm font-bold text-foreground">{ad.name}</span>
					{ad.campaignName ? <span className="truncate text-xs text-muted-foreground">{ad.campaignName}</span> : null}
					<Chip.Root variant={isActive ? "success" : "muted"} size="xs" shape="pill">
						<Chip.Label caps weight="bold">
							{ad.effectiveStatus}
						</Chip.Label>
					</Chip.Root>
				</div>
			</div>
			{metrics ? (
				<div className="grid grid-cols-3 gap-1 border-t border-border pt-2">
					<AdMetric label="Investido" value={formatToMoney(metrics.spend)} />
					<AdMetric label="Compras" value={formatInt(metrics.purchases)} />
					<AdMetric label="ROAS" value={metrics.purchaseRoas != null ? `${metrics.purchaseRoas.toFixed(2)}x` : "—"} />
				</div>
			) : null}
		</button>
	);
}

function AdMetric({ label, value }: { label: string; value: string }) {
	return (
		<div className="flex flex-col">
			<span className="text-[0.55rem] font-bold uppercase tracking-wide text-muted-foreground">{label}</span>
			<span className="text-xs font-bold tabular-nums text-foreground">{value}</span>
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
				<a href={CONNECT_URL}>Conectar com o Meta</a>
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
