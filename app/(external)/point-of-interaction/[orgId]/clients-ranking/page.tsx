import { Button } from "@/components/ui/button";
import { formatToMoney } from "@/lib/formatting";
import { cn } from "@/lib/utils";
import { db } from "@/services/drizzle";
import { cashbackProgramBalances, clients } from "@/services/drizzle/schema";
import { desc, eq } from "drizzle-orm";
import { ArrowLeft, Award, Crown, Medal, Trophy } from "lucide-react";
import Link from "next/link";

type RankingClient = {
	posicao: number;
	clienteId: string;
	clienteNome: string;
	saldoAcumuladoTotal: number;
	saldoDisponivel: number;
};

function getRankIcon(position: number) {
	switch (position) {
		case 1:
			return <Crown className="w-8 h-8 text-yellow-500" />;

		case 2:
			return <Award className="w-8 h-8 text-gray-400" />;
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
			return "bg-card border-primary/10 hover:border-primary/30 hover:bg-primary/5";
	}
}

export default async function ClientsRankingPage({ params }: { params: Promise<{ orgId: string }> }) {
	const { orgId } = await params;

	// Query clients with their balances, ordered by accumulated total
	const ranking = await db
		.select({
			clienteId: clients.id,
			clienteNome: clients.nome,
			saldoAcumuladoTotal: cashbackProgramBalances.saldoValorAcumuladoTotal,
			saldoDisponivel: cashbackProgramBalances.saldoValorDisponivel,
		})
		.from(clients)
		.innerJoin(cashbackProgramBalances, eq(clients.id, cashbackProgramBalances.clienteId))
		.where(eq(clients.organizacaoId, orgId))
		.orderBy(desc(cashbackProgramBalances.saldoValorAcumuladoTotal))
		.limit(50);

	// Add position to each client
	const rankingWithPosition: RankingClient[] = ranking.map((client, index) => ({
		posicao: index + 1,
		...client,
	}));

	return (
		<div className="w-full min-h-screen bg-secondary p-6 md:p-10 flex flex-col items-center">
			<div className="w-full max-w-4xl flex flex-col gap-6">
				{/* Header */}
				<div className="flex items-center gap-4">
					<Button variant="ghost" size="icon" asChild className="rounded-full hover:bg-primary/10">
						<Link href={`/point-of-interaction/${orgId}`}>
							<ArrowLeft className="w-6 h-6" />
						</Link>
					</Button>
					<div className="flex items-center gap-3">
						<div className="p-3 bg-primary rounded-2xl text-primary-foreground shadow-lg shadow-primary/20">
							<Trophy className="w-6 h-6 md:w-8 md:h-8" />
						</div>
						<div>
							<h1 className="text-2xl md:text-3xl font-black tracking-tighter uppercase italic">RANKING DE CLIENTES</h1>
							<p className="text-[0.6rem] md:text-xs text-muted-foreground font-bold uppercase tracking-widest opacity-70">
								TOP CLIENTES POR CASHBACK ACUMULADO
							</p>
						</div>
					</div>
				</div>

				{/* Empty State */}
				{rankingWithPosition.length === 0 && (
					<div className="text-center py-20 bg-card rounded-[2.5rem] border border-primary/10 shadow-sm">
						<div className="bg-primary/5 w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6">
							<Trophy className="w-10 h-10 text-primary/20" />
						</div>
						<h3 className="text-xl font-black text-primary uppercase italic">Ranking Vazio</h3>
						<p className="text-sm font-bold text-muted-foreground mt-2 max-w-xs mx-auto">Nenhum cliente no ranking ainda.</p>
					</div>
				)}

				{/* Ranking List */}
				{rankingWithPosition.length > 0 && (
					<div className="space-y-3">
						{rankingWithPosition.map((client) => (
							<div
								key={client.clienteId}
								className={cn(
									"relative rounded-3xl p-5 md:p-6 shadow-sm border transition-all hover:scale-[1.01] hover:shadow-md",
									getRankBgColor(client.posicao),
								)}
							>
								<div className="flex items-center justify-between gap-4">
									{/* Left: Position and Icon */}
									<div className="flex items-center gap-4 md:gap-6 min-w-0 flex-1">
										<div className="shrink-0 flex items-center justify-center w-12 md:w-16">
											{client.posicao <= 3 ? (
												<div className="relative">
													{getRankIcon(client.posicao)}
													<span className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground text-[0.6rem] font-black px-2 py-0.5 rounded-full shadow-sm">
														#{client.posicao}
													</span>
												</div>
											) : (
												<span className="text-2xl md:text-3xl font-black text-muted-foreground/30 italic">#{client.posicao}</span>
											)}
										</div>
										<div className="min-w-0 flex-1">
											<h3 className="text-lg md:text-xl font-black truncate tracking-tight uppercase italic text-primary">{client.clienteNome}</h3>
										</div>
									</div>

									{/* Right: Total Accumulated */}
									<div className="text-right shrink-0">
										<div
											className={cn(
												"px-4 py-2 md:px-6 md:py-3 rounded-2xl",
												client.posicao <= 3 ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20" : "bg-primary/5 text-primary",
											)}
										>
											<p className="text-lg md:text-2xl font-black">{formatToMoney(client.saldoAcumuladoTotal)}</p>
										</div>
									</div>
								</div>
							</div>
						))}
					</div>
				)}
			</div>
		</div>
	);
}
