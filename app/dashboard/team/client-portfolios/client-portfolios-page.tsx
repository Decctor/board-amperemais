"use client";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import StatUnitCard from "@/components/Stats/StatUnitCard";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import ErrorComponent from "@/components/Layouts/ErrorComponent";
import LoadingComponent from "@/components/Layouts/LoadingComponent";
import { getErrorMessage } from "@/lib/errors";
import { formatDecimalPlaces, formatToMoney } from "@/lib/formatting";
import { useClientPortfolio, useClientPortfolioStats } from "@/lib/queries/client-portfolios";
import { useSellersSimplified } from "@/lib/queries/sellers";
import { useQueryClient } from "@tanstack/react-query";
import { CalendarCheck, ChartColumn, ListChecks, RefreshCw, ShoppingCart, Target, UserRound, Wallet } from "lucide-react";
import { useState } from "react";
import { PortfolioAgenda } from "./_components/agenda";
import { Portfolio } from "./_components/portfolio";
import { QueueSection } from "./_components/queue-section";
import { Results } from "./_components/results";

type ClientPortfoliosPageProps = {
	boundSellerId: string | null;
	canPickSeller: boolean;
};

export default function ClientPortfoliosPage({ boundSellerId, canPickSeller }: ClientPortfoliosPageProps) {
	const [pickedSellerId, setPickedSellerId] = useState<string | null>(null);
	const effectiveSellerId = boundSellerId ?? pickedSellerId;

	const queryClient = useQueryClient();
	const { data: sellersSimplified } = useSellersSimplified();

	const portfolioQuery = useClientPortfolio({ vendedorId: effectiveSellerId && !boundSellerId ? effectiveSellerId : null });
	const statsQuery = useClientPortfolioStats({ vendedorId: effectiveSellerId && !boundSellerId ? effectiveSellerId : null });

	function refreshPortfolio() {
		queryClient.invalidateQueries({ queryKey: ["client-portfolios"] });
		queryClient.invalidateQueries({ queryKey: ["client-portfolios-stats"] });
		// Snooze/registro criam interações PLANEJADA que aparecem na agenda.
		queryClient.invalidateQueries({ queryKey: ["client-portfolios-agenda-day"] });
		queryClient.invalidateQueries({ queryKey: ["client-portfolios-agenda-calendar"] });
	}

	// Usuário sem vínculo com vendedor e sem permissão de ver resultados: nada a mostrar.
	if (!boundSellerId && !canPickSeller) {
		return (
			<Empty>
				<EmptyHeader>
					<EmptyMedia variant="icon">
						<UserRound />
					</EmptyMedia>
					<EmptyTitle>Seu usuário não está vinculado a um vendedor</EmptyTitle>
					<EmptyDescription>Peça a um administrador para vincular seu usuário a um vendedor nas configurações de usuários.</EmptyDescription>
				</EmptyHeader>
			</Empty>
		);
	}

	// Gestor sem vínculo: escolhe qual carteira visualizar ("ver como").
	if (!effectiveSellerId) {
		return (
			<div className="flex w-full flex-col items-center gap-4 py-12">
				<Empty className="pb-4">
					<EmptyHeader>
						<EmptyMedia variant="icon">
							<CalendarCheck />
						</EmptyMedia>
						<EmptyTitle>Escolha um vendedor</EmptyTitle>
						<EmptyDescription>Seu usuário não está vinculado a um vendedor — selecione de quem você quer visualizar a carteira.</EmptyDescription>
					</EmptyHeader>
				</Empty>
				<div className="w-full max-w-xs">
					<Select onValueChange={(value) => setPickedSellerId(value)}>
						<SelectTrigger className="w-full">
							<SelectValue placeholder="Selecione um vendedor" />
						</SelectTrigger>
						<SelectContent>
							{(sellersSimplified ?? []).map((seller) => (
								<SelectItem key={seller.id} value={seller.id}>
									{seller.nome}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				</div>
			</div>
		);
	}

	const stats = statsQuery.data;
	const clientPortfolio = portfolioQuery.data;
	const abordagensPlanejadas = (stats?.abordagensHoje ?? 0) + (clientPortfolio?.fila.length ?? 0);

	return (
		<div className="flex h-full w-full flex-col gap-3">
			{!boundSellerId && canPickSeller ? (
				<div className="flex w-full items-center justify-end">
					<div className="w-full max-w-60">
						<Select value={effectiveSellerId} onValueChange={(value) => setPickedSellerId(value)}>
							<SelectTrigger className="w-full">
								<SelectValue placeholder="Selecione um vendedor" />
							</SelectTrigger>
							<SelectContent>
								{(sellersSimplified ?? []).map((seller) => (
									<SelectItem key={seller.id} value={seller.id}>
										{seller.nome}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>
				</div>
			) : null}

			<div className="grid w-full grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
				<StatUnitCard
					variant="horizontal"
					title="META DO DIA"
					icon={<Target className="h-4 w-4 min-h-4 min-w-4" />}
					current={{ value: stats?.vendasHoje.valor ?? 0, format: (n) => formatToMoney(n) }}
					subtitle={stats && stats.metaDia > 0 ? `de ${formatToMoney(stats.metaDia)}` : undefined}
					footer={
						stats && stats.metaDia > 0 ? (
							<div className="flex w-full flex-col gap-1">
								<div className="h-1.5 w-full overflow-hidden rounded-full bg-secondary">
									<div
										className="h-full rounded-full bg-primary transition-all"
										style={{ width: `${Math.min(100, Math.round((stats.vendasHoje.valor / stats.metaDia) * 100))}%` }}
									/>
								</div>
								<span className="text-[0.65rem] text-muted-foreground">
									{stats.vendasHoje.valor >= stats.metaDia ? "Meta do dia batida! 🎉" : `Faltam ${formatToMoney(stats.metaDia - stats.vendasHoje.valor)}`}
								</span>
							</div>
						) : null
					}
				/>
				<StatUnitCard
					variant="horizontal"
					title="ABORDAGENS HOJE"
					icon={<ListChecks className="h-4 w-4 min-h-4 min-w-4" />}
					current={{
						value: stats?.abordagensHoje ?? 0,
						format: (n) => (abordagensPlanejadas > 0 ? `${formatDecimalPlaces(n)} / ${abordagensPlanejadas}` : formatDecimalPlaces(n)),
					}}
					subtitle={
						clientPortfolio ? (clientPortfolio.fila.length > 0 ? `${clientPortfolio.fila.length} clientes na fila` : "Fila concluída!") : undefined
					}
				/>
				<StatUnitCard
					variant="horizontal"
					title="VENDAS HOJE"
					icon={<ShoppingCart className="h-4 w-4 min-h-4 min-w-4" />}
					current={{ value: stats?.vendasHoje.qtde ?? 0, format: (n) => formatDecimalPlaces(n) }}
					subtitle={stats && stats.vendasHoje.qtde > 0 ? `Ticket médio ${formatToMoney(stats.vendasHoje.ticketMedio)}` : undefined}
				/>
				<StatUnitCard
					variant="horizontal"
					title="VENDAS INFLUENCIADAS NO MÊS"
					icon={<RefreshCw className="h-4 w-4 min-h-4 min-w-4" />}
					current={{ value: stats?.influenciadasMes.qtde ?? 0, format: (n) => formatDecimalPlaces(n) }}
					subtitle={stats ? `${formatToMoney(stats.influenciadasMes.valor)} após suas abordagens` : undefined}
					className="border-brand/40 bg-brand/10"
				/>
			</div>

			<Tabs defaultValue="dia" className="w-full">
				<TabsList variant="page">
					<TabsTrigger value="dia">
						<CalendarCheck className="h-4 w-4" /> Meu dia
					</TabsTrigger>
					<TabsTrigger value="carteira">
						<Wallet className="h-4 w-4" /> Minha carteira
					</TabsTrigger>
					<TabsTrigger value="resultados">
						<ChartColumn className="h-4 w-4" /> Meus resultados
					</TabsTrigger>
				</TabsList>

				<TabsContent value="dia">
					{portfolioQuery.isLoading ? <LoadingComponent /> : null}
					{portfolioQuery.error ? <ErrorComponent msg={getErrorMessage(portfolioQuery.error)} /> : null}
					{clientPortfolio ? (
						<div className="grid w-full grid-cols-1 items-start gap-3 xl:grid-cols-[3fr_2fr]">
							<QueueSection
								fila={clientPortfolio.fila}
								totalEmDebito={clientPortfolio.totalEmDebito}
								carteiraTotal={clientPortfolio.carteiraTotal}
								vendedorId={effectiveSellerId}
								onRegistered={refreshPortfolio}
							/>
							<PortfolioAgenda vendedorId={effectiveSellerId && !boundSellerId ? effectiveSellerId : null} onChanged={refreshPortfolio} />
						</div>
					) : null}
				</TabsContent>

				<TabsContent value="carteira">
					<Portfolio vendedorId={effectiveSellerId && !boundSellerId ? effectiveSellerId : null} />
				</TabsContent>

				<TabsContent value="resultados">
					<Results vendedorId={effectiveSellerId} />
				</TabsContent>
			</Tabs>
		</div>
	);
}
