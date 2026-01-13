"use client";
import ErrorComponent from "@/components/Layouts/ErrorComponent";
import LoadingComponent from "@/components/Layouts/LoadingComponent";
import { useOrganizations } from "@/lib/queries/admin";
import AdminOrganizationCard from "./AdminOrganizationCard";

export default function AdminOrganizationsBlock() {
	const { data, isLoading, error } = useOrganizations();

	if (isLoading) return <LoadingComponent />;
	if (error) return <ErrorComponent msg="Erro ao carregar organizações" />;

	return (
		<div className="w-full flex flex-col gap-3">
			<h2 className="text-lg font-semibold tracking-tight uppercase">Organizações Cadastradas</h2>
			{data?.data && data.data.length > 0 ? (
				<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
					{data.data.map((org) => (
						<AdminOrganizationCard
							key={org.id}
							id={org.id}
							nome={org.nome}
							cnpj={org.cnpj}
							logoUrl={org.logoUrl}
							userCount={org.userCount}
							dataInsercao={org.dataInsercao}
						/>
					))}
				</div>
			) : (
				<div className="bg-card border-primary/20 flex w-full flex-col items-center justify-center gap-2 rounded-xl border p-8">
					<p className="text-sm text-primary/60">Nenhuma organização cadastrada ainda.</p>
				</div>
			)}
		</div>
	);
}
