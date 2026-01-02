import SelectInput from "@/components/Inputs/SelectInput";
import ResponsiveMenuSection from "@/components/Utils/ResponsiveMenuSection";
import { useSellers } from "@/lib/queries/sellers";
import type { TUseUserState } from "@/state-hooks/use-user-state";
import { UsersRound } from "lucide-react";

type UsersSellerBlockProps = {
	infoHolder: TUseUserState["state"]["user"];
	updateInfoHolder: TUseUserState["updateUser"];
};

export default function UsersSellerBlock({ infoHolder, updateInfoHolder }: UsersSellerBlockProps) {
	const { data: sellers } = useSellers({ initialFilters: { search: "" } });
	const sellersOptions = sellers?.sellers.map((seller) => ({ id: seller.id, label: seller.nome, value: seller.id })) || [];
	return (
		<ResponsiveMenuSection title="VENDEDOR" icon={<UsersRound className="h-4 min-h-4 w-4 min-w-4" />}>
			<SelectInput
				value={infoHolder.vendedorId}
				options={sellersOptions}
				label="VENDEDOR VINCULADO"
				selectedItemLabel="NÃO DEFINIDO"
				onReset={() => updateInfoHolder({ vendedorId: "" })}
				handleChange={(value) => updateInfoHolder({ vendedorId: value })}
				width="100%"
			/>
		</ResponsiveMenuSection>
	);
}
