"use client";
import ErrorComponent from "@/components/Layouts/ErrorComponent";
import LoadingComponent from "@/components/Layouts/LoadingComponent";
import { useOrganizations } from "@/lib/queries/admin";
import AdminOrganizationCard from "./AdminOrganizationCard";
import type { TAuthUserSession } from "@/lib/authentication/types";
import { useQueryClient } from "@tanstack/react-query";

type TAdminOrganizationsBlockProps = {
	user: TAuthUserSession["user"];
};
export default function AdminOrganizationsBlock({ user }: TAdminOrganizationsBlockProps) {
	const queryClient = useQueryClient();
	const { data, isLoading, error, queryKey } = useOrganizations();

	const handleOnMutate = async () => await queryClient.cancelQueries({ queryKey });
	const handleOnSettled = async () => await queryClient.invalidateQueries({ queryKey });
	if (isLoading) return <LoadingComponent />;
	if (error) return <ErrorComponent msg="Erro ao carregar organizações" />;

	return (
		<div className="w-full flex flex-col gap-3">
			<h2 className="text-lg font-semibold tracking-tight uppercase">Organizações Cadastradas</h2>
			{data?.organizations && data.organizations.length > 0 ? (
				<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
					{data.organizations.map((org) => (
						<AdminOrganizationCard
							key={org.id}
							sessionUser={user}
							organization={org}
							callbacks={{ onMutate: handleOnMutate, onSettled: handleOnSettled }}
						/>
					))}
				</div>
			) : (
				<div className="bg-card border-border flex w-full flex-col items-center justify-center gap-2 rounded-xl border p-8">
					<p className="text-sm text-foreground/60">Nenhuma organização cadastrada ainda.</p>
				</div>
			)}
		</div>
	);
}
