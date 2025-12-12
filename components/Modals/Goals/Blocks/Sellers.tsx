import ResponsiveMenuSection from "@/components/Utils/ResponsiveMenuSection";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { getErrorMessage } from "@/lib/errors";
import { formatNameAsInitials } from "@/lib/formatting";
import { useSellers } from "@/lib/queries/sellers";
import type { TGetSellersOutputDefault } from "@/pages/api/sellers";
import type { TUseGoalsState } from "@/state-hooks/use-goal-state";
import { UsersRound } from "lucide-react";
import { memo, useCallback } from "react";

type GoalSellersProps = {
	goalTotalValue: number;
	goalSellers: TUseGoalsState["state"]["goalSellers"];
	updateGoalSeller: TUseGoalsState["updateGoalSeller"];
	updateManyGoalSellers: TUseGoalsState["updateManyGoalSellers"];
};
function GoalSellers({ goalTotalValue, goalSellers, updateGoalSeller, updateManyGoalSellers }: GoalSellersProps) {
	const { data: sellers, isLoading, isError, isSuccess, error } = useSellers({});

	const goalSellersTotalValue = goalSellers.reduce((acc, goalSeller) => acc + goalSeller.objetivoValor, 0);

	const distributeValueAcrossSellers = useCallback(
		({ valueToDistribute, sellers }: { valueToDistribute: number; sellers: TGetSellersOutputDefault[number][] }) => {
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

	console.log("[INFO] [GOAL SELLERS]", {
		goalTotalValue,
		goalSellersTotalValue,
		goalSellers,
	});
	return (
		<ResponsiveMenuSection title="VENDEDORES" icon={<UsersRound className="h-4 min-h-4 w-4 min-w-4" />}>
			{Math.abs(goalTotalValue - goalSellersTotalValue) > 1 ? (
				<div className="w-full flex justify-end">
					<Button
						size="fit"
						variant="ghost"
						className="text-xs px-2 py-0.5"
						onClick={() => distributeValueAcrossSellers({ valueToDistribute: goalTotalValue - goalSellersTotalValue, sellers: sellers ?? [] })}
					>
						DISTRIBUIR VALOR
					</Button>
				</div>
			) : null}
			{isLoading ? <p className="w-full text-center text-sm text-muted-foreground animate-pulse">Carregando vendedores...</p> : null}
			{isError ? <p className="w-full text-center text-sm text-destructive">{getErrorMessage(error)}</p> : null}
			{isSuccess ? (
				<div className="w-full flex flex-col gap-2">
					{sellers.map((seller) => (
						<GoalSellerCard
							key={seller.id}
							seller={seller}
							goalSeller={
								goalSellers.find((goalSeller) => goalSeller.vendedorId === seller.id) ?? { vendedorId: seller.id, objetivoValor: 0, vendedor: seller }
							}
							updateGoalSeller={updateGoalSeller}
						/>
					))}
				</div>
			) : null}
		</ResponsiveMenuSection>
	);
}

type GoalSellerCardProps = {
	seller: TGetSellersOutputDefault[number];
	goalSeller: TUseGoalsState["state"]["goalSellers"][number];
	updateGoalSeller: TUseGoalsState["updateGoalSeller"];
};
const GoalSellerCard = memo(
	function GoalSellerCard({ seller, goalSeller, updateGoalSeller }: GoalSellerCardProps) {
		console.log("[INFO] [GOAL SELLER CARD]", {
			seller,
			goalSeller,
		});
		return (
			<div className="w-full flex items-center justify-between gap-2 p-2 border border-primary/20 rounded-md">
				<div className="flex items-center gap-2">
					<Avatar className="w-6 h-6 min-w-6 min-h-6">
						<AvatarImage src={seller.avatarUrl ?? undefined} />
						<AvatarFallback>{formatNameAsInitials(seller.nome)}</AvatarFallback>
					</Avatar>
					<h1 className="w-full text-sm font-medium">{seller.nome}</h1>
				</div>
				<input
					type="number"
					placeholder="Preencha aqui o valor da meta..."
					value={goalSeller.objetivoValor}
					onChange={(e) => updateGoalSeller({ ...goalSeller, objetivoValor: Number(e.target.value) })}
					className="w-24 text-xs rounded-md border border-primary/20 p-1"
				/>
			</div>
		);
	},
	(prevProps, nextProps) => {
		return prevProps.seller.id === nextProps.seller.id && prevProps.goalSeller.objetivoValor === nextProps.goalSeller.objetivoValor;
	},
);

export default GoalSellers;
