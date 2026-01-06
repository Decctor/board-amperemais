import TextInput from "@/components/Inputs/TextInput";
import ResponsiveMenu from "@/components/Utils/ResponsiveMenu";
import { getErrorMessage } from "@/lib/errors";
import { updateUtil as updateUtilMutation } from "@/lib/mutations/utils";
import { useUtilsById } from "@/lib/queries/utils";
import type { TUtilsSalesPromoCampaignConfig } from "@/schemas/utils";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import dayjs from "dayjs";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import SalesPromoCampaignItemsBlock from "./Blocks/Items";
import SalesPromoCampaignStatsBlock from "./Blocks/Stats";
type ControlSalesPromoCampaignProps = {
	salesPromoCampaignId: string;
	callbacks?: {
		onMutate?: () => void;
		onSuccess?: () => void;
		onError?: () => void;
		onSettled?: () => void;
	};
	closeModal: () => void;
};
export default function ControlSalesPromoCampaign({ salesPromoCampaignId, callbacks, closeModal }: ControlSalesPromoCampaignProps) {
	const queryClient = useQueryClient();
	const { data: salesPromoCampaign, queryKey, isLoading, isError, isSuccess, error } = useUtilsById({ id: salesPromoCampaignId });
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
	const addMultipleUtilItems = useCallback((items: TUtilsSalesPromoCampaignConfig["valor"]["dados"]["itens"][number][]) => {
		setInfoHolder((prev) => ({
			...prev,
			valor: { ...prev.valor, dados: { ...prev.valor.dados, itens: [...prev.valor.dados.itens, ...items] } },
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

	const { mutate: handleUpdateSalesPromoCampaignMutation, isPending } = useMutation({
		mutationKey: ["update-sales-promo-campaign"],
		mutationFn: updateUtilMutation,
		onMutate: async () => {
			await queryClient.cancelQueries({ queryKey });
			if (callbacks?.onMutate) callbacks.onMutate();
			return;
		},
		onSuccess: async (data) => {
			if (callbacks?.onSuccess) callbacks.onSuccess();
			return toast.success(data.message);
		},
		onSettled: async () => {
			await queryClient.invalidateQueries({ queryKey });
			if (callbacks?.onSettled) callbacks.onSettled();
		},
		onError: async (error) => {
			if (callbacks?.onError) callbacks.onError();
			return toast.error(getErrorMessage(error));
		},
	});
	useEffect(() => {
		if (salesPromoCampaign) {
			if (salesPromoCampaign.valor.identificador !== "SALES_PROMO_CAMPAIGN") return;
			setInfoHolder({
				identificador: "SALES_PROMO_CAMPAIGN",
				valor: {
					identificador: "SALES_PROMO_CAMPAIGN",
					dados: salesPromoCampaign.valor.dados,
				},
			});
		}
	}, [salesPromoCampaign, setInfoHolder]);
	return (
		<ResponsiveMenu
			menuTitle="EDITAR CAMPANHA DE PROMOÇÃO DE VENDAS"
			menuDescription="Preencha os campos abaixo para atualizar a campanha de promoção de vendas"
			menuActionButtonText="ATUALIZAR CAMPANHA"
			menuCancelButtonText="CANCELAR"
			actionFunction={() => handleUpdateSalesPromoCampaignMutation({ utilId: salesPromoCampaignId, util: infoHolder })}
			actionIsLoading={isPending}
			stateIsLoading={isLoading}
			stateError={error ? getErrorMessage(error) : null}
			closeMenu={closeModal}
			dialogVariant="md"
		>
			<TextInput
				label="TÍTULO"
				value={infoHolder.valor.dados.titulo}
				placeholder="Digite o título da campanha de promoção de vendas"
				handleChange={(value) => updateUtil({ titulo: value })}
			/>
			<SalesPromoCampaignStatsBlock utilData={infoHolder.valor.dados} updateUtilData={updateUtil} />
			<SalesPromoCampaignItemsBlock
				items={infoHolder.valor.dados.itens}
				addItem={addUtilItem}
				addMultipleItems={addMultipleUtilItems}
				updateItem={updateUtilItem}
				deleteItem={deleteUtilItem}
			/>
		</ResponsiveMenu>
	);
}
