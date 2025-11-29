import TextInput from "@/components/Inputs/TextInput";
import ResponsiveMenu from "@/components/Utils/ResponsiveMenu";
import { getErrorMessage } from "@/lib/errors";
import { createUtil } from "@/lib/mutations/utils";
import type { TUtilsSalesPromoCampaignConfig } from "@/schemas/utils";
import { useMutation } from "@tanstack/react-query";
import dayjs from "dayjs";
import { useCallback, useState } from "react";
import { toast } from "sonner";
import SalesPromoCampaignItemsBlock from "./Blocks/Items";
import SalesPromoCampaignStatsBlock from "./Blocks/Stats";

type NewSalesPromoCampaignProps = {
	callbacks?: {
		onMutate?: () => void;
		onSuccess?: () => void;
		onError?: () => void;
		onSettled?: () => void;
	};
	closeModal: () => void;
};
export default function NewSalesPromoCampaign({ callbacks, closeModal }: NewSalesPromoCampaignProps) {
	const [infoHolder, setInfoHolder] = useState<TUtilsSalesPromoCampaignConfig>({
		identificador: "SALES_PROMO_CAMPAIGN",
		valor: {
			identificador: "SALES_PROMO_CAMPAIGN",
			dados: {
				titulo: "",
				periodoEstatistico: {
					inicio: dayjs().startOf("week").toISOString(),
					fim: dayjs().endOf("week").toISOString(),
				},
				itens: [],
				rastrearRankingVendedores: false,
				rastrearRankingProdutos: false,
				rastrearRankingParceiros: false,
			},
		},
	});

	const updateUtil = useCallback((changes: Partial<TUtilsSalesPromoCampaignConfig["valor"]["dados"]>) => {
		setInfoHolder((prev) => ({
			...prev,
			valor: {
				...prev.valor,
				dados: { ...prev.valor.dados, ...changes },
			},
		}));
	}, []);
	const addUtilItem = useCallback((item: TUtilsSalesPromoCampaignConfig["valor"]["dados"]["itens"][number]) => {
		setInfoHolder((prev) => ({
			...prev,
			valor: { ...prev.valor, dados: { ...prev.valor.dados, itens: [...prev.valor.dados.itens, item] } },
		}));
	}, []);
	const updateUtilItem = useCallback((index: number, changes: Partial<TUtilsSalesPromoCampaignConfig["valor"]["dados"]["itens"][number]>) => {
		setInfoHolder((prev) => ({
			...prev,
			valor: {
				...prev.valor,
				dados: { ...prev.valor.dados, itens: prev.valor.dados.itens.map((item, i) => (i === index ? { ...item, ...changes } : item)) },
			},
		}));
	}, []);
	const deleteUtilItem = useCallback((index: number) => {
		setInfoHolder((prev) => ({
			...prev,
			valor: { ...prev.valor, dados: { ...prev.valor.dados, itens: prev.valor.dados.itens.filter((_, i) => i !== index) } },
		}));
	}, []);

	const { mutate: handleCreateSalesPromoCampaignMutation, isPending } = useMutation({
		mutationKey: ["create-sales-promo-campaign"],
		mutationFn: createUtil,
		onMutate: async () => {
			if (callbacks?.onMutate) callbacks.onMutate();
			return;
		},
		onSuccess: async (data) => {
			if (callbacks?.onSuccess) callbacks.onSuccess();
			return toast.success(data.message);
		},
		onError: async (error) => {
			if (callbacks?.onError) callbacks.onError();
			return toast.error(getErrorMessage(error));
		},
	});
	return (
		<ResponsiveMenu
			menuTitle="NOVA CAMPANHA DE PROMOÇÃO DE VENDAS"
			menuDescription="Preencha os campos abaixo para criar uma nova campanha de promoção de vendas"
			menuActionButtonText="CRIAR CAMPANHA"
			menuCancelButtonText="CANCELAR"
			actionFunction={() => handleCreateSalesPromoCampaignMutation({ util: infoHolder })}
			actionIsLoading={isPending}
			stateIsLoading={false}
			stateError={null}
			closeMenu={closeModal}
		>
			<TextInput
				label="TÍTULO"
				value={infoHolder.valor.dados.titulo}
				placeholder="Digite o título da campanha de promoção de vendas"
				handleChange={(value) => updateUtil({ titulo: value })}
			/>
			<SalesPromoCampaignStatsBlock utilData={infoHolder.valor.dados} updateUtilData={updateUtil} />
			<SalesPromoCampaignItemsBlock items={infoHolder.valor.dados.itens} addItem={addUtilItem} updateItem={updateUtilItem} deleteItem={deleteUtilItem} />
		</ResponsiveMenu>
	);
}
