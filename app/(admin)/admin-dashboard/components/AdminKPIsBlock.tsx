"use client";
import StatUnitCard from "@/components/Stats/StatUnitCard";
import { formatDecimalPlaces } from "@/lib/formatting";
import { useAdminStats } from "@/lib/queries/admin";
import { Building2, Users } from "lucide-react";

export default function AdminKPIsBlock() {
	const { data: stats, isLoading } = useAdminStats();

	return (
		<div className="w-full flex flex-col gap-2 py-2">
			<div className="flex w-full flex-col items-center justify-around gap-2 lg:flex-row">
				<StatUnitCard
					title="Total de Organizações"
					icon={<Building2 className="w-4 h-4 min-w-4 min-h-4" />}
					current={{ value: stats?.data.totalOrganizations || 0, format: (n) => formatDecimalPlaces(n) }}
					className="w-full lg:w-1/2"
				/>
				<StatUnitCard
					title="Total de Usuários"
					icon={<Users className="w-4 h-4 min-w-4 min-h-4" />}
					current={{ value: stats?.data.totalUsers || 0, format: (n) => formatDecimalPlaces(n) }}
					className="w-full lg:w-1/2"
				/>
			</div>
		</div>
	);
}
