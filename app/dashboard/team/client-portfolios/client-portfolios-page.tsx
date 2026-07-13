"use client";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import StatUnitCard from "@/components/Stats/StatUnitCard";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import ErrorComponent from "@/components/Layouts/ErrorComponent";
import LoadingComponent from "@/components/Layouts/LoadingComponent";
import { getErrorMessage } from "@/lib/errors";
import { formatDecimalPlaces, formatToMoney } from "@/lib/formatting";
import { useRoutine, useRoutineStats } from "@/lib/queries/routine";
import { useSellersSimplified } from "@/lib/queries/sellers";
import { useQueryClient } from "@tanstack/react-query";
import { CalendarCheck, ChartColumn, ListChecks, RefreshCw, ShoppingCart, Target, UserRound, Wallet } from "lucide-react";
import { useState } from "react";
import { RoutineFollowUps } from "./_components/routine-follow-ups";
import { RoutinePortfolio } from "./_components/routine-portfolio";
import { RoutineQueueSection } from "./_components/routine-queue-section";
import { RoutineResults } from "./_components/routine-results";

type RoutinePageProps = {
	boundSellerId: string | null;
	canPickSeller: boolean;
};

export default function RoutinePage({ boundSellerId, canPickSeller }: RoutinePageProps) {
	const [pickedSellerId, setPickedSellerId] = useState<string | null>(null);
	const effectiveSellerId = boundSellerId ?? pickedSellerId;

	const queryClient = useQueryClient();
	const { data: sellersSimplified } = useSellersSimplified();

	const routineQuery = useRoutine({ vendedorId: effectiveSellerId && !boundSellerId ? effectiveSellerId : null });
	const statsQuery = useRoutineStats({ vendedorId: effectiveSellerId && !boundSellerId ? effectiveSellerId : null });

	function refreshRoutine() {
		queryClient.invalidateQueries({ queryKey: ["routine"] });
		queryClient.invalidateQueries({ queryKey: ["routine-stats"] });
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

	// Gestor sem vínculo: escolhe qual rotina visualizar ("ver como").
	if (!effectiveSellerId) {
		return (
			<div className="flex w-full flex-col items-center gap-4 py-12">
				<Empty className="pb-4">
					<EmptyHeader>
						<EmptyMedia variant="icon">
							<CalendarCheck />
						</EmptyMedia>
						<EmptyTitle>Escolha um vendedor</EmptyTitle>
						<EmptyDescription>Seu usuário não está vinculado a um vendedor — selecione de quem você quer visualizar a rotina.</EmptyDescription>
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
	const routine = routineQuery.data;
	const abordagensPlanejadas = (stats?.abordagensHoje ?? 0) + (routine?.fila.length ?? 0);

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
					title="ABORDAGENS HOJE"
					icon={<ListChecks className="h-4 w-4 min-h-4 min-w-4" />}
					current={{
						value: stats?.abordagensHoje ?? 0,
						format: (n) => (abordagensPlanejadas > 0 ? `${formatDecimalPlaces(n)} / ${abordagensPlanejadas}` : formatDecimalPlaces(n)),
					}}
					subtitle={routine ? (routine.fila.length > 0 ? `${routine.fila.length} clientes na fila` : "Fila concluída!") : undefined}
				/>
				<StatUnitCard
					title="VENDAS HOJE"
					icon={<ShoppingCart className="h-4 w-4 min-h-4 min-w-4" />}
					current={{ value: stats?.vendasHoje.qtde ?? 0, format: (n) => formatDecimalPlaces(n) }}
					subtitle={stats && stats.vendasHoje.qtde > 0 ? `Ticket médio ${formatToMoney(stats.vendasHoje.ticketMedio)}` : undefined}
				/>
				<StatUnitCard
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
					{routineQuery.isLoading ? <LoadingComponent /> : null}
					{routineQuery.error ? <ErrorComponent msg={getErrorMessage(routineQuery.error)} /> : null}
					{routine ? (
						<div className="grid w-full grid-cols-1 items-start gap-3 xl:grid-cols-[2fr_1fr]">
							<RoutineQueueSection
								fila={routine.fila}
								totalEmDebito={routine.totalEmDebito}
								carteiraTotal={routine.carteiraTotal}
								vendedorId={effectiveSellerId}
								onRegistered={refreshRoutine}
							/>
							<RoutineFollowUps followUps={routine.followUps} onResolved={refreshRoutine} />
						</div>
					) : null}
				</TabsContent>

				<TabsContent value="carteira">
					<RoutinePortfolio vendedorId={effectiveSellerId && !boundSellerId ? effectiveSellerId : null} />
				</TabsContent>

				<TabsContent value="resultados">
					<RoutineResults vendedorId={effectiveSellerId} />
				</TabsContent>
			</Tabs>
		</div>
	);
}
