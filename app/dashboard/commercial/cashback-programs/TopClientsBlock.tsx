"use client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { Progress } from "@/components/ui/progress";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { formatNameAsInitials, formatToMoney } from "@/lib/formatting";
import { useTopCashbackClients } from "@/lib/queries/cashback-programs";
import { BadgeDollarSign, CirclePlus } from "lucide-react";
import { useMemo, useState } from "react";

export default function TopClientsBlock() {
	const [sortBy, setSortBy] = useState<"cumulative" | "rescued">("cumulative");

	const { data: clients, isLoading } = useTopCashbackClients({
		sortBy,
		limit: 10,
	});

	const maxValue = useMemo(() => {
		if (!clients || clients.length === 0) return 0;
		return Math.max(...clients.map((client) => (sortBy === "cumulative" ? client.saldoValorAcumuladoTotal : client.saldoValorResgatadoTotal)));
	}, [clients, sortBy]);

	return (
		<div className="bg-card border-primary/20 flex w-full flex-col gap-3 rounded-xl border px-3 py-4 shadow-2xs h-full">
			<div className="flex items-center justify-between">
				<h1 className="text-xs font-medium tracking-tight uppercase">RANKING DE CLIENTES</h1>
				<div className="flex items-center gap-2">
					<TooltipProvider>
						<Tooltip>
							<TooltipTrigger asChild>
								<Button variant={sortBy === "cumulative" ? "default" : "ghost"} size="fit" className="rounded-lg p-2" onClick={() => setSortBy("cumulative")}>
									<CirclePlus className="h-4 min-h-4 w-4 min-w-4" />
								</Button>
							</TooltipTrigger>
							<TooltipContent>
								<p>Total Acumulado</p>
							</TooltipContent>
						</Tooltip>
						<Tooltip>
							<TooltipTrigger asChild>
								<Button variant={sortBy === "rescued" ? "default" : "ghost"} size="fit" className="rounded-lg p-2" onClick={() => setSortBy("rescued")}>
									<BadgeDollarSign className="h-4 min-h-4 w-4 min-w-4" />
								</Button>
							</TooltipTrigger>
							<TooltipContent>
								<p>Total Resgatado</p>
							</TooltipContent>
						</Tooltip>
					</TooltipProvider>
				</div>
			</div>

			<div className="flex flex-col gap-3">
				{isLoading ? (
					<div className="text-sm text-muted-foreground text-center py-8">Carregando...</div>
				) : !clients || clients.length === 0 ? (
					<div className="text-sm text-muted-foreground text-center py-8">Nenhum cliente encontrado</div>
				) : (
					clients.map((client, index) => {
						const value = sortBy === "cumulative" ? client.saldoValorAcumuladoTotal : client.saldoValorResgatadoTotal;
						const percentage = maxValue > 0 ? (value / maxValue) * 100 : 0;

						return (
							<HoverCard key={client.id}>
								<HoverCardTrigger asChild>
									<div className="flex items-center gap-4 w-full group hover:bg-primary/5 rounded-lg transition-colors p-2">
										<div className="flex items-center gap-3 w-[200px] min-w-[200px]">
											<span className="text-xs font-bold text-muted-foreground w-6">#{index + 1}</span>

											<div className="flex items-center gap-2 cursor-pointer">
												<Avatar className="h-9 w-9 border-2 border-transparent group-hover:border-primary transition-colors">
													<AvatarFallback className="font-bold text-primary">{formatNameAsInitials(client.cliente.nome)}</AvatarFallback>
												</Avatar>
												<div className="flex flex-col">
													<span className="text-sm font-medium truncate max-w-[100px] leading-none" title={client.cliente.nome}>
														{client.cliente.nome}
													</span>
												</div>
											</div>
										</div>

										<div className="flex-1 flex flex-col justify-center h-full">
											<Progress value={percentage} className="h-2 w-full" />
										</div>

										<div className="w-[100px] text-right font-bold text-sm">{formatToMoney(value)}</div>
									</div>
								</HoverCardTrigger>
								<HoverCardContent className="flex flex-col w-80">
									<div className="w-full flex items-center gap-2">
										<Avatar className="h-12 w-12 min-h-12 min-w-12">
											<AvatarFallback>{formatNameAsInitials(client.cliente.nome)}</AvatarFallback>
										</Avatar>
										<h2 className="text-sm font-semibold">{client.cliente.nome}</h2>
									</div>
									<div className="w-full flex flex-col gap-1">
										<div className="w-full flex items-center gap-2 justify-between">
											<p className="text-xs text-muted-foreground">IDENTIFICADOR</p>
											<p className="text-xs font-medium">{client.cliente.id}</p>
										</div>
										<div className="w-full flex items-center gap-2 justify-between">
											<p className="text-xs text-muted-foreground">TOTAL ACUMULADO</p>
											<p className="text-xs font-medium">{formatToMoney(client.saldoValorAcumuladoTotal)}</p>
										</div>
										<div className="w-full flex items-center gap-2 justify-between">
											<p className="text-xs text-muted-foreground">TOTAL RESGATADO</p>
											<p className="text-xs font-medium">{formatToMoney(client.saldoValorResgatadoTotal)}</p>
										</div>
										<div className="w-full flex items-center gap-2 justify-between">
											<p className="text-xs text-muted-foreground">SALDO DISPONÍVEL</p>
											<p className="text-xs font-medium text-green-600">{formatToMoney(client.saldoValorDisponivel)}</p>
										</div>
									</div>
								</HoverCardContent>
							</HoverCard>
						);
					})
				)}
			</div>
		</div>
	);
}
