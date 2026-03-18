"use client";
import ResponsiveMenu from "@/components/Utils/ResponsiveMenu";
import { getErrorMessage } from "@/lib/errors";
import { updatePurchase as updatePurchaseMutation } from "@/lib/mutations/purchases";
import { usePurchaseById } from "@/lib/queries/purchases";
import { usePurchaseState } from "@/state-hooks/use-purchase-state";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { toast } from "sonner";

import PurchaseDeliveryBlock from "./Blocks/Delivery";
import PurchaseGeneralBlock from "./Blocks/General";
import PurchaseItemsBlock from "./Blocks/Items";
import PurchaseOrderBlock from "./Blocks/Order";
import PurchaseTransportBlock from "./Blocks/Transport";

type ControlPurchaseProps = {
	purchaseId: string;
	closeModal: () => void;
	callbacks?: {
		onMutate?: () => void;
		onSuccess?: () => void;
		onError?: () => void;
		onSettled?: () => void;
	};
};
export default function ControlPurchase({ purchaseId, closeModal, callbacks }: ControlPurchaseProps) {
	const queryClient = useQueryClient();
	const { state, updatePurchase, addPurchaseItem, updatePurchaseItem, removePurchaseItem, redefineState } = usePurchaseState();

	const { data: purchase, queryKey, isLoading, error } = usePurchaseById({ id: purchaseId });

	useEffect(() => {
		if (!purchase) return;
		redefineState({
			purchase: {
				titulo: purchase.titulo,
				status: purchase.status,
				lancamentoContabilId: purchase.lancamentoContabilId,
				pedidoData: purchase.pedidoData,
				pedidoFornecedorNome: purchase.pedidoFornecedorNome,
				pedidoFornecedorCnpj: purchase.pedidoFornecedorCnpj,
				pedidoFornecedorTelefone: purchase.pedidoFornecedorTelefone,
				pedidoFornecedorEmail: purchase.pedidoFornecedorEmail,
				transporteTransportadoraNome: purchase.transporteTransportadoraNome,
				transporteTransportadoraCnpj: purchase.transporteTransportadoraCnpj,
				transporteTransportadoraTelefone: purchase.transporteTransportadoraTelefone,
				transporteTransportadoraEmail: purchase.transporteTransportadoraEmail,
				transporteLinkRastreio: purchase.transporteLinkRastreio,
				entregaDataEnvio: purchase.entregaDataEnvio,
				entregaDataRecebimentoPrevisao: purchase.entregaDataRecebimentoPrevisao,
				entregaDataRecebimentoEfetivacao: purchase.entregaDataRecebimentoEfetivacao,
				dataEfetivacao: purchase.dataEfetivacao,
			},
			purchaseItems: purchase.itens.map((item) => ({
				id: item.id,
				produtoId: item.produtoId,
				produtoVarianteId: item.produtoVarianteId,
				snapshotProdutoDescricao: item.snapshotProdutoDescricao,
				snapshotProdutoCodigo: item.snapshotProdutoCodigo,
				quantidade: item.quantidade,
				valorUnitarioBruto: item.valorUnitarioBruto,
				valorUnitarioLiquido: item.valorUnitarioLiquido,
				valorTotalBruto: item.valorTotalBruto,
				valorTotalLiquido: item.valorTotalLiquido,
				descontosTotal: item.descontosTotal,
				acrescimosTotal: item.acrescimosTotal,
				externoQtde: item.externoQtde,
				externoValor: item.externoValor,
				externoUnidade: item.externoUnidade,
				externoFatorConversao: item.externoFatorConversao,
				anotacoes: item.anotacoes,
				produto: {
					descricao: item.produto.descricao,
					imagemCapaUrl: item.produto.imagemCapaUrl,
					codigo: item.produto.codigo,
					unidade: item.produto.unidade,
				},
				produtoVariante: item.produtoVariante
					? {
							nome: item.produtoVariante.nome,
							codigo: item.produtoVariante.codigo,
							imagemCapaUrl: item.produtoVariante.imagemCapaUrl,
						}
					: undefined,
			})),
		});
	}, [purchase, redefineState]);

	const { mutate: handleUpdatePurchaseMutation, isPending } = useMutation({
		mutationKey: ["update-purchase", purchaseId],
		mutationFn: updatePurchaseMutation,
		onMutate: async () => {
			await queryClient.cancelQueries({ queryKey });
			if (callbacks?.onMutate) callbacks.onMutate();
		},
		onSuccess: async (data) => {
			if (callbacks?.onSuccess) callbacks.onSuccess();
			toast.success(data.message);
			closeModal();
		},
		onError: async (err) => {
			if (callbacks?.onError) callbacks.onError();
			toast.error(getErrorMessage(err));
		},
		onSettled: async () => {
			if (callbacks?.onSettled) callbacks.onSettled();
			await queryClient.invalidateQueries({ queryKey });
		},
	});

	return (
		<ResponsiveMenu
			menuTitle="EDITAR COMPRA"
			menuDescription="Atualize os campos abaixo para editar a compra."
			menuActionButtonText="ATUALIZAR COMPRA"
			menuCancelButtonText="CANCELAR"
			actionFunction={() =>
				handleUpdatePurchaseMutation({
					id: purchaseId,
					purchase: state.purchase,
					purchaseItems: state.purchaseItems,
				})
			}
			actionIsLoading={isPending}
			stateIsLoading={isLoading}
			stateError={error ? getErrorMessage(error) : null}
			closeMenu={closeModal}
			dialogVariant="md"
		>
			<PurchaseGeneralBlock purchase={state.purchase} updatePurchase={updatePurchase} />
			<PurchaseItemsBlock
				purchaseItems={state.purchaseItems}
				addPurchaseItem={addPurchaseItem}
				updatePurchaseItem={updatePurchaseItem}
				removePurchaseItem={removePurchaseItem}
			/>
			<PurchaseOrderBlock purchase={state.purchase} updatePurchase={updatePurchase} />
			<PurchaseTransportBlock purchase={state.purchase} updatePurchase={updatePurchase} />
			<PurchaseDeliveryBlock purchase={state.purchase} updatePurchase={updatePurchase} />
		</ResponsiveMenu>
	);
}
