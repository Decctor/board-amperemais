import SelectInput from "@/components/Inputs/SelectInput";
import ResponsiveMenuSection from "@/components/Utils/ResponsiveMenuSection";
import type { TUseUserState } from "@/hooks/use-user-state";
import { useSaleQueryFilterOptions } from "@/lib/queries/stats/utils";
import { UsersRound } from "lucide-react";

type UsersSellerBlockProps = {
	infoHolder: TUseUserState["state"]["user"];
	updateInfoHolder: TUseUserState["updateUser"];
};

export default function UsersSellerBlock({ infoHolder, updateInfoHolder }: UsersSellerBlockProps) {
	const { data: filterOptions } = useSaleQueryFilterOptions();

	return (
		<ResponsiveMenuSection title="VENDEDOR" icon={<UsersRound className="h-4 min-h-4 w-4 min-w-4" />}>
			<SelectInput
				value={infoHolder.vendedor}
				options={filterOptions?.sellers.map((seller, index) => ({ id: index + 1, label: seller, value: seller })) || []}
				label="VENDEDOR VINCULADO"
				selectedItemLabel="NÃO DEFINIDO"
				onReset={() => updateInfoHolder({ vendedor: "" })}
				handleChange={(value) => updateInfoHolder({ vendedor: value })}
				width="100%"
			/>
		</ResponsiveMenuSection>
	);
}
