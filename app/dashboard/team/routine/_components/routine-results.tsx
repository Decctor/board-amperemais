"use client";

import StatUnitCard from "@/components/Stats/StatUnitCard";
import { Button } from "@/components/ui/button";
import { SectionWrapper } from "@/components/ui/section-wrapper";
import ErrorComponent from "@/components/Layouts/ErrorComponent";
import LoadingComponent from "@/components/Layouts/LoadingComponent";
import { getErrorMessage } from "@/lib/errors";
import { formatDecimalPlaces, formatToMoney } from "@/lib/formatting";
import { useSellerStats } from "@/lib/queries/sellers";
import dayjs from "dayjs";
import { BadgeDollarSign, ChartColumn, ShoppingCart, Target, Ticket } from "lucide-react";
import Link from "next/link";

type RoutineResultsProps = {
	vendedorId: string;
};

// Visão "primeira pessoa" dos resultados: reaproveita as consultas que o gestor já usa
// (getSellerStats), filtradas para o vendedor logado e para o mês corrente.
export function RoutineResults({ vendedorId }: RoutineResultsProps) {
	const { data, isLoading, error } = useSellerStats({
		sellerId: vendedorId,
		initialFilters: {
			periodAfter: dayjs().startOf("month").toISOString(),
			periodBefore: dayjs().endOf("day").toISOString(),
		},
	});

	if (isLoading) return <LoadingComponent />;
	if (error) return <ErrorComponent msg={getErrorMessage(error)} />;
	if (!data) return null;

	return (
		<div className="flex w-full flex-col gap-3">
			<div className="grid w-full grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
				<StatUnitCard
					title="VENDIDO NO MÊS"
					icon={<BadgeDollarSign className="h-4 w-4 min-h-4 min-w-4" />}
					current={{ value: data.faturamentoBrutoTotal || 0, format: (n) => formatToMoney(n) }}
				/>
				<StatUnitCard
					title="META DO MÊS"
					icon={<Target className="h-4 w-4 min-h-4 min-w-4" />}
					current={{ value: data.faturamentoMeta || 0, format: (n) => formatToMoney(n) }}
					footer={
						data.faturamentoMeta > 0 ? (
							<div className="flex w-full flex-col gap-1">
								<div className="h-1.5 w-full overflow-hidden rounded-full bg-secondary">
									<div className="h-full rounded-full bg-primary" style={{ width: `${Math.min(100, Math.round(data.faturamentoMetaPorcentagem || 0))}%` }} />
								</div>
								<span className="text-[0.65rem] text-muted-foreground">{formatDecimalPlaces(data.faturamentoMetaPorcentagem || 0)}% atingido</span>
							</div>
						) : null
					}
				/>
				<StatUnitCard
					title="VENDAS NO MÊS"
					icon={<ShoppingCart className="h-4 w-4 min-h-4 min-w-4" />}
					current={{ value: data.qtdeVendas || 0, format: (n) => formatDecimalPlaces(n) }}
				/>
				<StatUnitCard
					title="TICKET MÉDIO"
					icon={<Ticket className="h-4 w-4 min-h-4 min-w-4" />}
					current={{ value: data.ticketMedio || 0, format: (n) => formatToMoney(n) }}
				/>
			</div>
			<SectionWrapper title="Painel completo" icon={<ChartColumn className="h-4 w-4 min-h-4 min-w-4" />}>
				<div className="flex flex-col items-start gap-2">
					<p className="text-sm text-muted-foreground">
						Gráficos por dia da semana, top clientes e top produtos ficam no seu painel detalhado de vendedor.
					</p>
					<Button asChild variant="outline" size="sm">
						<Link href={`/dashboard/team/sellers/id/${vendedorId}`}>Ver painel completo</Link>
					</Button>
				</div>
			</SectionWrapper>
		</div>
	);
}
