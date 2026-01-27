import { OrgColorsProvider } from "@/components/Providers/OrgColorsProvider";
import { Button } from "@/components/ui/button";
import { formatToMoney } from "@/lib/formatting";
import { cn } from "@/lib/utils";
import { db } from "@/services/drizzle";
import { sales } from "@/services/drizzle/schema";
import dayjs from "dayjs";
import { and, count, desc, eq, gte, lte, sql } from "drizzle-orm";
import { ArrowLeft, Award, Crown, Medal, Trophy } from "lucide-react";
import Link from "next/link";

type RankingSeller = {
	posicao: number;
	vendedorNome: string;
	totalVendas: number;
	numeroVendas: number;
};

function getRankIcon(position: number) {
	switch (position) {
		case 1:
			return <Crown className="w-8 h-8 text-yellow-500" />;
		case 2:
			return <Medal className="w-8 h-8 text-gray-400" />;
		case 3:
			return <Award className="w-8 h-8 text-amber-700" />;
		default:
			return null;
	}
}

function getRankBgColor(position: number) {
	switch (position) {
		case 1:
			return "bg-gradient-to-r from-yellow-500/10 to-yellow-600/10 border-yellow-500/50 shadow-yellow-500/10";
		case 2:
			return "bg-gradient-to-r from-slate-400/10 to-slate-500/10 border-slate-400/50 shadow-slate-400/10";
		case 3:
			return "bg-gradient-to-r from-amber-700/10 to-amber-800/10 border-amber-700/50 shadow-amber-700/10";
		default:
			return "bg-card border-brand/10 hover:border-brand/30 hover:bg-brand/5";
	}
}

export default async function SellersRankingPage({ params }: { params: Promise<{ orgId: string }> }) {
	const { orgId } = await params;

	// Fetch organization for colors
	const org = await db.query.organizations.findFirst({
		where: (fields, { eq }) => eq(fields.id, orgId),
		columns: {
			corPrimaria: true,
			corPrimariaForeground: true,
			corSecundaria: true,
			corSecundariaForeground: true,
		},
	});

	// Get current month start and end dates
	const monthStart = dayjs().startOf("month").toDate();
	const monthEnd = dayjs().endOf("month").toDate();

	// Query sellers grouped by vendedorNome with aggregated sales for current month
	const ranking = await db
		.select({
			vendedorNome: sales.vendedorNome,
			totalVendas: sql<number>`COALESCE(SUM(${sales.valorTotal}), 0)`,
			numeroVendas: count(sales.id),
		})
		.from(sales)
		.where(and(eq(sales.organizacaoId, orgId), gte(sales.dataVenda, monthStart), lte(sales.dataVenda, monthEnd), eq(sales.natureza, "SN01")))
		.groupBy(sales.vendedorNome)
		.orderBy(desc(count(sales.id)))
		.limit(50);

	// Add position to each seller
	const rankingWithPosition: RankingSeller[] = ranking.map((seller, index) => ({
		posicao: index + 1,
		vendedorNome: seller.vendedorNome,
		totalVendas: Number(seller.totalVendas),
		numeroVendas: seller.numeroVendas,
	}));

	const currentMonth = new Date().toLocaleDateString("pt-BR", { month: "long", year: "numeric" });

	return (
		<OrgColorsProvider 
			corPrimaria={org?.corPrimaria} 
			corPrimariaForeground={org?.corPrimariaForeground}
			corSecundaria={org?.corSecundaria}
			corSecundariaForeground={org?.corSecundariaForeground}
		>
		<div className="w-full min-h-full flex-1 p-6 md:p-10 flex flex-col items-center">
			<div className="w-full max-w-4xl flex flex-col gap-6">
				{/* Header */}
				<div className="flex items-center gap-4">
					<Button variant="ghost" size="fit" asChild className="rounded-full hover:bg-brand/10 flex items-center gap-1.5 px-2 py-4">
						<Link href={`/point-of-interaction/${orgId}`}>
							<ArrowLeft className="w-6 h-6" />
							VOLTAR
						</Link>
					</Button>
					<div className="flex items-center gap-3">
						<div className="p-3 bg-brand rounded-2xl text-brand-foreground shadow-lg shadow-brand/20">
							<Trophy className="w-6 h-6 md:w-8 md:h-8" />
						</div>
						<div>
							<h1 className="text-2xl md:text-3xl font-black tracking-tighter uppercase italic">RANKING DE VENDEDORES</h1>
							<p className="text-[0.6rem] md:text-xs text-muted-foreground font-bold uppercase tracking-widest opacity-70">
								TOP VENDEDORES EM {currentMonth}
							</p>
						</div>
					</div>
				</div>

				{/* Empty State */}
				{rankingWithPosition.length === 0 && (
					<div className="text-center py-20 bg-card rounded-[2.5rem] border border-brand/10 shadow-sm">
						<div className="bg-brand/5 w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6">
							<Trophy className="w-10 h-10 text-brand/20" />
						</div>
						<h3 className="text-xl font-black text-brand uppercase italic">Ranking Vazio</h3>
						<p className="text-sm font-bold text-muted-foreground mt-2 max-w-xs mx-auto">Nenhuma venda registrada neste mês.</p>
					</div>
				)}

				{/* Ranking List */}
				{rankingWithPosition.length > 0 && (
					<div className="space-y-3">
						{rankingWithPosition.map((seller) => (
							<div
								key={`${seller.vendedorNome}-${seller.posicao}`}
								className={cn(
									"relative rounded-3xl p-5 md:p-6 shadow-sm border transition-all hover:scale-[1.01] hover:shadow-md",
									getRankBgColor(seller.posicao),
								)}
							>
								<div className="flex items-center justify-between gap-4">
									{/* Left: Position and Icon */}
									<div className="flex items-center gap-4 md:gap-6 min-w-0 flex-1">
										<div className="shrink-0 flex items-center justify-center w-12 md:w-16">
											{seller.posicao <= 3 ? (
												<div className="relative">
													{getRankIcon(seller.posicao)}
													<span className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-brand text-brand-foreground text-[0.6rem] font-black px-2 py-0.5 rounded-full shadow-sm">
														#{seller.posicao}
													</span>
												</div>
											) : (
												<span className="text-2xl md:text-3xl font-black text-muted-foreground/30 italic">#{seller.posicao}</span>
											)}
										</div>
										<div className="min-w-0 flex-1">
											<h3 className="text-lg md:text-xl font-black truncate tracking-tight uppercase italic text-black">{seller.vendedorNome}</h3>
										</div>
									</div>

									{/* Right: Total Sales */}
									<div className="text-right shrink-0">
										<div
											className={cn(
												"px-4 py-2 md:px-6 md:py-3 rounded-2xl",
												seller.posicao <= 3 ? "bg-brand text-brand-foreground shadow-lg shadow-brand/20" : "bg-brand/5 text-brand",
											)}
										>
											<p className="text-lg md:text-2xl font-black">
												{seller.numeroVendas} {seller.numeroVendas === 1 ? "venda" : "vendas"}
											</p>
										</div>
									</div>
								</div>
							</div>
						))}
					</div>
				)}
			</div>
		</div>
		</OrgColorsProvider>
	);
}
