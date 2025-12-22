"use client";
import StatUnitCard from "@/components/Stats/StatUnitCard";
import { formatDecimalPlaces, formatToMoney } from "@/lib/formatting";
import { useCashbackProgramStats } from "@/lib/queries/cashback-programs";
import { BadgeDollarSign, CirclePlus, Clock, Percent, XCircle } from "lucide-react";
import { useEffect, useState } from "react";
import { useDebounce } from "use-debounce";

type CashbackStatsBlockProps = {
	period: { after: string; before: string };
};

export default function CashbackStatsBlock({ period }: CashbackStatsBlockProps) {
	const [queryPeriod, setQueryPeriod] = useState(period);
	const [debouncedPeriod] = useDebounce(queryPeriod, 1000);

	const { data: stats, isLoading } = useCashbackProgramStats(debouncedPeriod);

	useEffect(() => {
		setQueryPeriod(period);
	}, [period]);

	return (
		<div className="w-full flex flex-col gap-2 py-2">
			<div className="flex w-full flex-col items-center justify-around gap-2 lg:flex-row">
				<StatUnitCard
					title="Cashback Gerado"
					icon={<CirclePlus className="w-4 h-4 min-w-4 min-h-4" />}
					current={{ value: stats?.totalCashbackGenerated.atual || 0, format: (n) => formatToMoney(n) }}
					previous={
						stats?.totalCashbackGenerated.anterior ? { value: stats.totalCashbackGenerated.anterior || 0, format: (n) => formatToMoney(n) } : undefined
					}
					className="w-full lg:w-1/5"
				/>
				<StatUnitCard
					title="Cashback Resgatado"
					icon={<BadgeDollarSign className="w-4 h-4 min-w-4 min-h-4" />}
					current={{ value: stats?.totalCashbackRescued.atual || 0, format: (n) => formatToMoney(n) }}
					previous={
						stats?.totalCashbackRescued.anterior ? { value: stats.totalCashbackRescued.anterior || 0, format: (n) => formatToMoney(n) } : undefined
					}
					className="w-full lg:w-1/5"
				/>
				<StatUnitCard
					title="Taxa de Resgate"
					icon={<Percent className="w-4 h-4 min-w-4 min-h-4" />}
					current={{ value: stats?.redemptionRate.atual || 0, format: (n) => `${formatDecimalPlaces(n)}%` }}
					previous={
						stats?.redemptionRate.anterior ? { value: stats.redemptionRate.anterior || 0, format: (n) => `${formatDecimalPlaces(n)}%` } : undefined
					}
					className="w-full lg:w-1/5"
				/>
				<StatUnitCard
					title="Cashback Expirado"
					icon={<XCircle className="w-4 h-4 min-w-4 min-h-4" />}
					current={{ value: stats?.totalExpiredCashback.atual || 0, format: (n) => formatToMoney(n) }}
					previous={
						stats?.totalExpiredCashback.anterior ? { value: stats.totalExpiredCashback.anterior || 0, format: (n) => formatToMoney(n) } : undefined
					}
					className="w-full lg:w-1/5"
					lowerIsBetter={true}
				/>
				<StatUnitCard
					title="Cashback Expirando"
					icon={<Clock className="w-4 h-4 min-w-4 min-h-4" />}
					current={{ value: stats?.totalExpiringCashback.atual || 0, format: (n) => formatToMoney(n) }}
					previous={
						stats?.totalExpiringCashback.anterior ? { value: stats.totalExpiringCashback.anterior || 0, format: (n) => formatToMoney(n) } : undefined
					}
					className="w-full lg:w-1/5"
					lowerIsBetter={true}
				/>
			</div>
		</div>
	);
}
