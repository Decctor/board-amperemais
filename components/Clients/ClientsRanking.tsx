"use client";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { formatDecimalPlaces, formatToMoney } from "@/lib/formatting";
import { useClientsRanking } from "@/lib/queries/clients";
import { cn } from "@/lib/utils";
import type { TGetClientsRankingInput } from "@/pages/api/clients/stats/ranking";
import { ArrowDown, ArrowUp, BadgeDollarSign, CirclePlus, Crown, Mail, Minus, Phone } from "lucide-react";
import { useState } from "react";

type ClientsRankingProps = {
	periodAfter: Date | null;
	periodBefore: Date | null;
	comparingPeriodAfter?: Date | null;
	comparingPeriodBefore?: Date | null;
};

export default function ClientsRanking({ periodAfter, periodBefore, comparingPeriodAfter, comparingPeriodBefore }: ClientsRankingProps) {
	const [rankingBy, setRankingBy] = useState<TGetClientsRankingInput["rankingBy"]>("purchases-total-value");

	const { data: rankingData, isLoading: rankingLoading } = useClientsRanking({
		rankingBy,
		periodAfter: periodAfter ?? null,
		periodBefore: periodBefore ?? null,
		comparingPeriodAfter: comparingPeriodAfter ?? null,
		comparingPeriodBefore: comparingPeriodBefore ?? null,
	});

	return (
		<div className="w-full flex flex-col gap-2 py-2 h-full">
			<div className="bg-card border-primary/20 flex w-full h-full flex-col gap-3 rounded-xl border px-3 py-4 shadow-2xs">
				<div className="flex items-center justify-between gap-2 flex-wrap shrink-0">
					<h1 className="text-xs font-medium tracking-tight uppercase">RANKING DE CLIENTES - TOP 10</h1>
					<div className="flex items-center gap-2">
						<TooltipProvider>
							<Tooltip>
								<TooltipTrigger asChild>
									<Button
										variant={rankingBy === "purchases-total-value" ? "default" : "ghost"}
										size="fit"
										className="rounded-lg p-2"
										onClick={() => setRankingBy("purchases-total-value")}
									>
										<BadgeDollarSign className="h-4 min-h-4 w-4 min-w-4" />
									</Button>
								</TooltipTrigger>
								<TooltipContent>
									<p>Ordenar por Valor Total</p>
								</TooltipContent>
							</Tooltip>
							<Tooltip>
								<TooltipTrigger asChild>
									<Button
										variant={rankingBy === "purchases-total-qty" ? "default" : "ghost"}
										size="fit"
										className="rounded-lg p-2"
										onClick={() => setRankingBy("purchases-total-qty")}
									>
										<CirclePlus className="h-4 min-h-4 w-4 min-w-4" />
									</Button>
								</TooltipTrigger>
								<TooltipContent>
									<p>Ordenar por Quantidade de Compras</p>
								</TooltipContent>
							</Tooltip>
						</TooltipProvider>
					</div>
				</div>
				<div className="flex w-full flex-1 flex-col gap-2 overflow-auto scrollbar-thin scrollbar-track-primary/10 scrollbar-thumb-primary/30 min-h-0">
					{rankingLoading ? (
						<div className="flex w-full items-center justify-center py-8">
							<p className="text-sm text-muted-foreground">Carregando ranking...</p>
						</div>
					) : rankingData && rankingData.length > 0 ? (
						rankingData.map((client) => (
							<div
								key={client.clienteId}
								className={cn(
									"bg-card border-primary/20 flex w-full flex-col gap-2 rounded-xl border px-3 py-3 shadow-2xs",
									client.rank === 1 && "border-yellow-500/50 bg-yellow-500/5",
									client.rank === 2 && "border-gray-400/50 bg-gray-400/5",
									client.rank === 3 && "border-orange-600/50 bg-orange-600/5",
								)}
							>
								<div className="w-full flex items-start justify-between gap-2 flex-wrap">
									<div className="flex items-center gap-2 flex-wrap">
										{client.rank <= 3 ? (
											<Crown
												className={cn(
													"w-5 h-5 min-w-5 min-h-5",
													client.rank === 1 && "text-yellow-500",
													client.rank === 2 && "text-gray-400",
													client.rank === 3 && "text-orange-600",
												)}
											/>
										) : (
											<div className="w-6 h-6 min-w-6 min-h-6 rounded-full bg-primary/10 flex items-center justify-center">
												<span className="text-xs font-bold">{client.rank}</span>
											</div>
										)}
										<div className="flex items-start flex-col gap-1">
											<div className="flex items-center gap-2">
												<h1 className="text-xs font-bold tracking-tight lg:text-sm">{client.nome}</h1>
												{client.rankDelta !== null && client.rankDelta !== 0 && (
													<div
														className={cn(
															"flex items-center gap-0.5 rounded-md px-1.5 py-0.5 text-[0.65rem] font-bold",
															client.rankDelta > 0 && "bg-green-500/10 text-green-600 dark:text-green-400",
															client.rankDelta < 0 && "bg-red-500/10 text-red-600 dark:text-red-400",
														)}
													>
														{client.rankDelta > 0 ? (
															<>
																<ArrowUp className="w-3 h-3 min-w-3 min-h-3" />
																<span>+{client.rankDelta}</span>
															</>
														) : (
															<>
																<ArrowDown className="w-3 h-3 min-w-3 min-h-3" />
																<span>{client.rankDelta}</span>
															</>
														)}
													</div>
												)}
												{client.rankDelta === 0 && (
													<div className="flex items-center gap-0.5 rounded-md px-1.5 py-0.5 text-[0.65rem] font-bold bg-gray-500/10 text-gray-600 dark:text-gray-400">
														<Minus className="w-3 h-3 min-w-3 min-h-3" />
													</div>
												)}
											</div>
											<div className="flex items-center gap-1">
												<Phone className="w-4 h-4 min-w-4 min-h-4" />
												<h1 className="py-0.5 text-center text-[0.65rem] font-medium italic text-primary/80">{client.telefone}</h1>
											</div>
										</div>
									</div>
									<div className="flex items-center gap-3">
										{rankingBy === "purchases-total-value" ? (
											<div className="flex flex-col items-end gap-1">
												<div className={cn("flex items-center gap-1.5 rounded-md px-2 py-1.5 text-[0.65rem] font-bold bg-primary/10 text-primary")}>
													<BadgeDollarSign className="w-3 min-w-3 h-3 min-h-3" />
													<p className="text-xs font-bold tracking-tight uppercase">{formatToMoney(client.totalValue)}</p>
												</div>
												{client.totalValueComparison !== null && (
													<p className="text-[0.60rem] text-muted-foreground">
														Anterior: {formatToMoney(client.totalValueComparison)}
													</p>
												)}
											</div>
										) : null}
										{rankingBy === "purchases-total-qty" ? (
											<div className="flex flex-col items-end gap-1">
												<div className={cn("flex items-center gap-1.5 rounded-md px-2 py-1.5 text-[0.65rem] font-bold bg-primary/10 text-primary")}>
													<CirclePlus className="w-3 min-w-3 h-3 min-h-3" />
													<p className="text-xs font-bold tracking-tight uppercase">{formatDecimalPlaces(client.totalPurchases)}</p>
												</div>
												{client.totalPurchasesComparison !== null && (
													<p className="text-[0.60rem] text-muted-foreground">
														Anterior: {formatDecimalPlaces(client.totalPurchasesComparison)}
													</p>
												)}
											</div>
										) : null}
									</div>
								</div>
							</div>
						))
					) : (
						<div className="flex w-full items-center justify-center py-8">
							<p className="text-sm text-muted-foreground">Nenhum cliente encontrado para o período selecionado.</p>
						</div>
					)}
				</div>
			</div>
		</div>
	);
}
