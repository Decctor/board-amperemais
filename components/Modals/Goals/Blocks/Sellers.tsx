import ResponsiveMenuSection from "@/components/Utils/ResponsiveMenuSection";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { getErrorMessage } from "@/lib/errors";
import { formatNameAsInitials } from "@/lib/formatting";
import { useSellers } from "@/lib/queries/sellers";
import type { TGetSellersOutputDefault } from "@/app/api/sellers/route";
import type { TUseGoalsState } from "@/state-hooks/use-goal-state";
import { UsersRound } from "lucide-react";
import { memo, useCallback } from "react";

type GoalSellersProps = {
	goalTotalValue: number;
	goalQtdeVendas?: number | null;
	goalNovosClientes?: number | null;
	goalSellers: TUseGoalsState["state"]["goalSellers"];
	updateGoalSeller: TUseGoalsState["updateGoalSeller"];
	updateManyGoalSellers: TUseGoalsState["updateManyGoalSellers"];
};
function GoalSellers({ goalTotalValue, goalQtdeVendas, goalNovosClientes, goalSellers, updateGoalSeller, updateManyGoalSellers }: GoalSellersProps) {
	const { data: sellers, isLoading, isError, isSuccess, error } = useSellers({});

	const goalSellersTotalValue = goalSellers.reduce((acc, goalSeller) => acc + goalSeller.objetivoValor, 0);

	const distributeValueAcrossSellers = useCallback(
		({ valueToDistribute, sellers }: { valueToDistribute: number; sellers: TGetSellersOutputDefault["sellers"][number][] }) => {
			const sellersQty = sellers?.length ?? 0;
			const valuePerSeller = valueToDistribute / sellersQty;
			const updatedGoalSellers =
				sellers?.map((seller) => {
					const isExistingGoalSeller = goalSellers.find((goalSeller) => goalSeller.vendedorId === seller.id);
					if (!isExistingGoalSeller) return { vendedorId: seller.id, vendedor: seller, objetivoValor: valuePerSeller };
					return { ...isExistingGoalSeller, objetivoValor: valuePerSeller };
				}) ?? [];
			return updateManyGoalSellers(updatedGoalSellers);
		},
		[goalSellers, updateManyGoalSellers],
	);

	return (
		<ResponsiveMenuSection title="VENDEDORES" icon={<UsersRound className="h-4 min-h-4 w-4 min-w-4" />}>
			{Math.abs(goalTotalValue - goalSellersTotalValue) > 1 ? (
				<div className="w-full flex justify-end">
					<Button
						size="fit"
						variant="ghost"
						className="text-xs px-2 py-0.5"
						onClick={() => distributeValueAcrossSellers({ valueToDistribute: goalTotalValue - goalSellersTotalValue, sellers: sellers?.sellers ?? [] })}
					>
						DISTRIBUIR VALOR
					</Button>
				</div>
			) : null}
			{isLoading ? <p className="w-full text-center text-sm text-muted-foreground animate-pulse">Carregando vendedores...</p> : null}
			{isError ? <p className="w-full text-center text-sm text-destructive">{getErrorMessage(error)}</p> : null}
			{isSuccess ? (
				<div className="w-full flex flex-col gap-2">
					{sellers.sellers.map((seller) => (
						<GoalSellerCard
							key={seller.id}
							seller={seller}
							goalSeller={
								goalSellers.find((goalSeller) => goalSeller.vendedorId === seller.id) ?? { vendedorId: seller.id, objetivoValor: 0, vendedor: seller }
							}
							hasQtdeVendas={!!goalQtdeVendas}
							hasNovosClientes={!!goalNovosClientes}
							updateGoalSeller={updateGoalSeller}
						/>
					))}
				</div>
			) : null}
		</ResponsiveMenuSection>
	);
}

type GoalSellerCardProps = {
	seller: TGetSellersOutputDefault["sellers"][number];
	goalSeller: TUseGoalsState["state"]["goalSellers"][number];
	hasQtdeVendas: boolean;
	hasNovosClientes: boolean;
	updateGoalSeller: TUseGoalsState["updateGoalSeller"];
};
const GoalSellerCard = memo(
	function GoalSellerCard({ seller, goalSeller, hasQtdeVendas, hasNovosClientes, updateGoalSeller }: GoalSellerCardProps) {
		return (
			<div className="w-full flex flex-col gap-2 p-2 border border-border rounded-md">
				<div className="flex items-center gap-2">
					<Avatar className="w-6 h-6 min-w-6 min-h-6">
						<AvatarImage src={seller.avatarUrl ?? undefined} />
						<AvatarFallback>{formatNameAsInitials(seller.nome)}</AvatarFallback>
					</Avatar>
					<h1 className="w-full text-sm font-medium">{seller.nome}</h1>
				</div>
				<div className="flex flex-wrap items-center gap-2">
					<div className="flex flex-col gap-0.5 min-w-[120px]">
						<p className="text-[0.6rem] text-muted-foreground uppercase font-medium tracking-tight">Meta de Valor (R$)</p>
						<input
							type="number"
							placeholder="0"
							value={goalSeller.objetivoValor}
							onChange={(e) => updateGoalSeller({ ...goalSeller, objetivoValor: Number(e.target.value) })}
							className="w-full text-xs rounded-md border border-border p-1"
						/>
					</div>
					{hasQtdeVendas ? (
						<div className="flex flex-col gap-0.5 min-w-[120px]">
							<p className="text-[0.6rem] text-muted-foreground uppercase font-medium tracking-tight">Meta de Qtde Vendas</p>
							<input
								type="number"
								placeholder="0"
								value={goalSeller.objetivoQtdeVendas ?? ""}
								onChange={(e) => updateGoalSeller({ ...goalSeller, objetivoQtdeVendas: Number(e.target.value) || null })}
								className="w-full text-xs rounded-md border border-border p-1"
							/>
						</div>
					) : null}
					{hasNovosClientes ? (
						<div className="flex flex-col gap-0.5 min-w-[120px]">
							<p className="text-[0.6rem] text-muted-foreground uppercase font-medium tracking-tight">Meta de Novos Clientes</p>
							<input
								type="number"
								placeholder="0"
								value={goalSeller.objetivoNovosClientes ?? ""}
								onChange={(e) => updateGoalSeller({ ...goalSeller, objetivoNovosClientes: Number(e.target.value) || null })}
								className="w-full text-xs rounded-md border border-border p-1"
							/>
						</div>
					) : null}
				</div>
			</div>
		);
	},
	(prevProps, nextProps) => {
		return (
			prevProps.seller.id === nextProps.seller.id &&
			prevProps.goalSeller.objetivoValor === nextProps.goalSeller.objetivoValor &&
			prevProps.goalSeller.objetivoQtdeVendas === nextProps.goalSeller.objetivoQtdeVendas &&
			prevProps.goalSeller.objetivoNovosClientes === nextProps.goalSeller.objetivoNovosClientes &&
			prevProps.hasQtdeVendas === nextProps.hasQtdeVendas &&
			prevProps.hasNovosClientes === nextProps.hasNovosClientes
		);
	},
);

export default GoalSellers;
