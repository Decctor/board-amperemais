import CheckboxInput from "@/components/Inputs/CheckboxInput";
import SelectInput from "@/components/Inputs/SelectInput";
import ResponsiveMenuSection from "@/components/Utils/ResponsiveMenuSection";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { formatNameAsInitials } from "@/lib/formatting";
import { useSellersSimplified } from "@/lib/queries/sellers";
import type { TUseOrganizationMembershipInvitationState } from "@/state-hooks/use-organization-membership-invitation-state";
import { Link, PlusIcon, UsersRound } from "lucide-react";
import { useState } from "react";

type OrganizationsMembershipInvitationsSellerBlockProps = {
	invitation: TUseOrganizationMembershipInvitationState["state"]["invitation"];
	updateInvitation: TUseOrganizationMembershipInvitationState["updateInvitation"];
};

export default function OrganizationsMembershipInvitationsSellerBlock({
	invitation,
	updateInvitation,
}: OrganizationsMembershipInvitationsSellerBlockProps) {
	const [attributionType, setAttributionType] = useState<"new" | "existing">("new");
	const { data: sellers } = useSellersSimplified();
	return (
		<ResponsiveMenuSection title="VENDEDOR" icon={<UsersRound className="h-4 min-h-4 w-4 min-w-4" />}>
			<div className="w-full flex items-center justify-center">
				<CheckboxInput
					checked={invitation.vendedorAplicavel}
					labelTrue="ATRIBUIR VENDEDOR"
					labelFalse="ATRIBUIR VENDEDOR"
					handleChange={(value) => updateInvitation({ vendedorAplicavel: value, vendedorId: !value ? null : invitation.vendedorId })}
				/>
			</div>
			{invitation.vendedorAplicavel ? (
				<>
					<div className="w-full flex items-center justify-center gap-2 flex-wrap">
						<Button
							type="button"
							variant={attributionType === "new" ? "default" : "ghost"}
							onClick={() => {
								setAttributionType("new");
								updateInvitation({ vendedorId: null });
							}}
							className="flex items-center gap-1 px-2 py-1 text-xs font-medium"
							size={"fit"}
						>
							<PlusIcon className="w-4 h-4 min-w-4 min-h-4" />
							CRIAR NOVO
						</Button>
						<Button
							type="button"
							variant={attributionType === "existing" ? "default" : "ghost"}
							onClick={() => {
								setAttributionType("existing");
							}}
							className="flex items-center gap-1 px-2 py-1 text-xs font-medium"
							size={"fit"}
						>
							<Link className="w-4 h-4 min-w-4 min-h-4" />
							VINCULAR EXISTENTE
						</Button>
					</div>
					{attributionType === "existing" ? (
						<SelectInput
							value={invitation.vendedorId}
							options={
								sellers?.map((seller) => ({
									id: seller.id,
									label: seller.nome,
									value: seller.id,
									startContent: (
										<Avatar className="w-5 h-5 min-w-5 min-h-5">
											<AvatarImage src={seller.avatarUrl ?? undefined} />
											<AvatarFallback className="text-xs">{formatNameAsInitials(seller.nome)}</AvatarFallback>
										</Avatar>
									),
								})) || []
							}
							label="VENDEDOR VINCULADO"
							resetOptionLabel="NÃO DEFINIDO"
							onReset={() => updateInvitation({ vendedorId: null })}
							handleChange={(value) => updateInvitation({ vendedorId: value })}
							width="100%"
						/>
					) : (
						<p className="text-xs text-muted-foreground text-center">
							Um novo vendedor será criado. A senha de operador padrão seguirá a sequência conforme o número de vendedores (ex: 00001, 00002, 00003, etc.).
						</p>
					)}
				</>
			) : null}
		</ResponsiveMenuSection>
	);
}
