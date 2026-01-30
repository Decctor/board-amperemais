import SelectInput from "@/components/Inputs/SelectInput";
import ResponsiveMenuSection from "@/components/Utils/ResponsiveMenuSection";
import { useSellers } from "@/lib/queries/sellers";
import type { TUseUserState } from "@/state-hooks/use-user-state";
import { UsersRound } from "lucide-react";

type UsersSellerBlockProps = {
	membershipHolder: TUseUserState["state"]["membership"];
	updateMembership: TUseUserState["updateMembership"];
};

export default function UsersSellerBlock({ membershipHolder, updateMembership }: UsersSellerBlockProps) {
	const { data: sellers } = useSellers({ initialFilters: { search: "" } });
	const sellersOptions = sellers?.sellers.map((seller) => ({ id: seller.id, label: seller.nome, value: seller.id })) || [];
	return (
		<ResponsiveMenuSection title="VENDEDOR" icon={<UsersRound className="h-4 min-h-4 w-4 min-w-4" />}>
			<SelectInput
				value={membershipHolder.usuarioVendedorId}
				options={sellersOptions}
				label="VENDEDOR VINCULADO"
				resetOptionLabel="NÃO DEFINIDO"
				onReset={() => updateMembership({ usuarioVendedorId: "" })}
				handleChange={(value) => updateMembership({ usuarioVendedorId: value })}
				width="100%"
			/>
		</ResponsiveMenuSection>
	);
}
