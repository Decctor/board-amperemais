"use client";
import ErrorComponent from "@/components/Layouts/ErrorComponent";
import LoadingComponent from "@/components/Layouts/LoadingComponent";
import StatUnitCard from "@/components/Stats/StatUnitCard";
import { Badge } from "@/components/ui/badge";
import type { TAuthUserSession } from "@/lib/authentication/types";
import { getErrorMessage } from "@/lib/errors";
import { formatDateAsLocale, formatDecimalPlaces, formatToMoney } from "@/lib/formatting";
import { useCampaignStats } from "@/lib/queries/campaign-stats";
import { cn } from "@/lib/utils";
import { Award, BadgeDollarSign, Calendar, CirclePlus, PackageCheck, ShoppingCart, Store, Trophy, Users } from "lucide-react";

type CampaignResultPageProps = {
	user: TAuthUserSession["user"];
	campaignId: string;
};

export default function CampaignResultPage({ user, campaignId }: CampaignResultPageProps) {
	const { data: campaignStats, isLoading, isError, isSuccess, error } = useCampaignStats({ campaignId });

	if (isLoading) return <LoadingComponent />;
	if (isError) return <ErrorComponent msg={getErrorMessage(error)} />;
	if (!isSuccess || !campaignStats) return <ErrorComponent msg="Erro ao carregar estatísticas da campanha." />;

	return (
		<div className="w-full h-full flex flex-col gap-6 p-6">
			{/* Campaign Header */}
			<div className="w-full flex flex-col gap-2">
				<div className="flex items-center gap-3">
					<Trophy className="w-8 h-8 text-primary" />
					<h1 className="text-2xl font-bold tracking-tight">{campaignStats.campaign.titulo}</h1>
				</div>
				<div className="flex items-center gap-2 text-sm text-primary/70">
					<Calendar className="w-4 h-4" />
					<span>
						{formatDateAsLocale(campaignStats.campaign.periodo.inicio)} até {formatDateAsLocale(campaignStats.campaign.periodo.fim)}
					</span>
				</div>
			</div>

			{/* Total Sales Stats Cards */}
			<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
				<StatUnitCard
					title="Total de Vendas (Quantidade)"
					icon={<ShoppingCart className="w-5 h-5 text-primary" />}
					current={{
						value: campaignStats.totalSales.quantidade,
						format: (n) => n.toString(),
					}}
				/>
				<StatUnitCard
					title="Total de Vendas (Valor)"
					icon={<BadgeDollarSign className="w-5 h-5 text-primary" />}
					current={{
						value: campaignStats.totalSales.valor,
						format: (n) => formatToMoney(n),
					}}
				/>
			</div>

			{/* Campaign Products Performance */}
			<div className="bg-card border-primary/20 flex w-full flex-col gap-3 rounded-xl border px-3 py-4 shadow-2xs">
				<div className="flex items-center justify-between">
					<h2 className="text-xs font-medium tracking-tight uppercase">Desempenho dos Produtos da Campanha</h2>
					<PackageCheck className="w-4 h-4 min-w-4 min-h-4" />
				</div>
				<div className="grid grid-cols-1 gap-3">
					{campaignStats.productsPerformance.length > 0 ? (
						campaignStats.productsPerformance.map((product) => (
							<div key={product.produtoId} className={cn("flex w-full flex-col gap-3 rounded-lg border border-primary/20 px-4 py-3 hover:bg-primary/5 transition-colors duration-300")}>
								<div className="w-full flex items-center justify-between gap-2 flex-wrap">
									<div className="flex items-center gap-2 flex-wrap">
										<h3 className="text-sm font-bold tracking-tight">{product.produtoNome}</h3>
									</div>
									<div className="flex items-center gap-2 flex-wrap">
										<div  className="flex items-center gap-1.5 px-2 py-1 line-through text-primary text-xs">
											DE: {formatToMoney(product.valorBase)}
										</div>
										<div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-green-100 text-green-600 text-xs font-bold">
											POR: {formatToMoney(product.valorPromocional)}
										</div>
									</div>
								</div>
								<div className="w-full flex items-center gap-3 flex-wrap">
									<div className={cn("flex items-center gap-1.5 rounded-md px-2 py-1.5 text-[0.65rem] font-bold bg-primary/10 text-primary")}>
										<CirclePlus className="w-3 min-w-3 h-3 min-h-3" />
										<p className="text-xs font-bold tracking-tight uppercase">QTDE: {formatDecimalPlaces(product.quantidadeVendida)}</p>
									</div>
									<div className={cn("flex items-center gap-1.5 rounded-md px-2 py-1.5 text-[0.65rem] font-bold bg-primary/10 text-primary")}>
										<BadgeDollarSign className="w-3 min-w-3 h-3 min-h-3" />
										<p className="text-xs font-bold tracking-tight uppercase">VALOR: {formatToMoney(product.valorVendido)}</p>
									</div>
								</div>
							</div>
						))
					) : (
						<p className="text-sm text-center text-primary/60">Nenhum produto da campanha teve vendas no período.</p>
					)}
				</div>
			</div>

			{/* Rankings Section */}
			<div className="w-full grid grid-cols-1 lg:grid-cols-3 gap-6">
				{/* Seller Ranking */}
				<div className="bg-card border-primary/20 flex w-full flex-col gap-3 rounded-xl border px-3 py-4 shadow-2xs h-full">
					<div className="flex items-center justify-between">
						<h2 className="text-xs font-medium tracking-tight uppercase">Top 5 Vendedores</h2>
						<Users className="w-4 h-4 min-w-4 min-h-4" />
					</div>
					<div className="flex flex-col gap-2">
						{campaignStats.rankingVendedores.length > 0 ? (
							campaignStats.rankingVendedores.map((seller) => (
								<div key={seller.vendedorId || seller.vendedorNome} className="w-full flex items-center justify-between gap-2 hover:bg-primary/5 transition-colors duration-300 px-2 py-1 rounded-lg">
									<div className="flex items-center gap-2 flex-1 min-w-0">
										<div
											className={cn(
												"flex items-center justify-center w-6 h-6 min-w-6 min-h-6 rounded-full text-xs font-bold",
												seller.posicao === 1
													? "bg-yellow-500 text-white"
													: seller.posicao === 2
														? "bg-gray-400 text-white"
														: seller.posicao === 3
															? "bg-orange-600 text-white"
															: "bg-primary/20 text-primary",
											)}
										>
											{seller.posicao}
										</div>
										<div className="flex flex-col flex-1 min-w-0">
											<p className="text-xs font-semibold truncate">{seller.vendedorNome}</p>
											<p className="text-[0.65rem] text-primary/60">{seller.vendasQtde} vendas</p>
										</div>
									</div>
									<div className="text-xs font-bold text-primary">{formatToMoney(seller.vendasValor)}</div>
								</div>
							))
						) : (
							<p className="text-xs text-center text-primary/60">Nenhuma venda registrada.</p>
						)}
					</div>
				</div>

				{/* Partner Ranking */}
				<div className="bg-card border-primary/20 flex w-full flex-col gap-3 rounded-xl border px-3 py-4 shadow-2xs h-full">
					<div className="flex items-center justify-between">
						<h2 className="text-xs font-medium tracking-tight uppercase">Top 5 Parceiros</h2>
						<Store className="w-4 h-4 min-w-4 min-h-4" />
					</div>
					<div className="flex flex-col gap-2">
						{campaignStats.rankingParceiros.length > 0 ? (
							campaignStats.rankingParceiros.map((partner) => (
								<div key={partner.parceiroId || partner.parceiroNome} className="w-full flex items-center justify-between gap-2 hover:bg-primary/5 transition-colors duration-300 px-2 py-1 rounded-lg">
									<div className="flex items-center gap-2 flex-1 min-w-0">
										<div
											className={cn(
												"flex items-center justify-center w-6 h-6 min-w-6 min-h-6 rounded-full text-xs font-bold",
												partner.posicao === 1
													? "bg-yellow-500 text-white"
													: partner.posicao === 2
														? "bg-gray-400 text-white"
														: partner.posicao === 3
															? "bg-orange-600 text-white"
															: "bg-primary/20 text-primary",
											)}
										>
											{partner.posicao}
										</div>
										<div className="flex flex-col flex-1 min-w-0">
											<p className="text-xs font-semibold truncate">{partner.parceiroNome}</p>
											<p className="text-[0.65rem] text-primary/60">{partner.vendasQtde} vendas</p>
										</div>
									</div>
									<div className="text-xs font-bold text-primary">{formatToMoney(partner.vendasValor)}</div>
								</div>
							))
						) : (
							<p className="text-xs text-center text-primary/60">Nenhuma venda registrada.</p>
						)}
					</div>
				</div>

				{/* Product Ranking */}
				<div className="bg-card border-primary/20 flex w-full flex-col gap-3 rounded-xl border px-3 py-4 shadow-2xs h-full">
					<div className="flex items-center justify-between">
						<h2 className="text-xs font-medium tracking-tight uppercase">Top 5 Produtos</h2>
						<Award className="w-4 h-4 min-w-4 min-h-4" />
					</div>
					<div className="flex flex-col gap-2">
						{campaignStats.rankingProdutos.length > 0 ? (
							campaignStats.rankingProdutos.map((product) => (
								<div key={product.produtoId} className="w-full flex items-center justify-between gap-2 hover:bg-primary/5 transition-colors duration-300 px-2 py-1 rounded-lg">
									<div className="flex items-center gap-2 flex-1 min-w-0">
										<div
											className={cn(
												"flex items-center justify-center w-6 h-6 min-w-6 min-h-6 rounded-full text-xs font-bold",
												product.posicao === 1
													? "bg-yellow-500 text-white"
													: product.posicao === 2
														? "bg-gray-400 text-white"
														: product.posicao === 3
															? "bg-orange-600 text-white"
															: "bg-primary/20 text-primary",
											)}
										>
											{product.posicao}
										</div>
										<div className="flex flex-col flex-1 min-w-0">
											<p className="text-xs font-semibold truncate">{product.produtoNome}</p>
											<p className="text-[0.65rem] text-primary/60">{formatDecimalPlaces(product.quantidadeVendida)} unidades</p>
										</div>
									</div>
									<div className="text-xs font-bold text-primary">{formatToMoney(product.valorVendido)}</div>
								</div>
							))
						) : (
							<p className="text-xs text-center text-primary/60">Nenhuma venda registrada.</p>
						)}
					</div>
				</div>
			</div>
		</div>
	);
}
