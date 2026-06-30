"use client";

import type { TGetProductStockLotsOutputDefault } from "@/app/api/products/stock-lots/route";
import NumberInput from "@/components/Inputs/NumberInput";
import TextareaInput from "@/components/Inputs/TextareaInput";
import ResponsiveMenu from "@/components/Utils/ResponsiveMenu";
import ResponsiveMenuSection from "@/components/Utils/ResponsiveMenuSection";
import { getErrorMessage } from "@/lib/errors";
import { discardProductStockLot } from "@/lib/mutations/product-stock-lots";
import { useMutation } from "@tanstack/react-query";
import { PackageX, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

type DiscardStockLotProps = {
	stockLot: TGetProductStockLotsOutputDefault["stockLots"][number];
	closeModal: () => void;
	callbacks?: {
		onMutate?: (variables: Parameters<typeof discardProductStockLot>[0]) => void;
		onSuccess?: () => void;
		onError?: (error: Error) => void;
		onSettled?: () => void;
	};
};

export default function DiscardStockLot({ stockLot, closeModal, callbacks }: DiscardStockLotProps) {
	const [quantity, setQuantity] = useState(stockLot.quantidadeAtual);
	const [reason, setReason] = useState("");
	const productName = stockLot.produtoVariante?.nome ?? stockLot.produto?.nome ?? "Produto sem nome";

	const { mutate, isPending } = useMutation({
		mutationKey: ["discard-product-stock-lot", stockLot.id],
		mutationFn: discardProductStockLot,
		onMutate: (variables) => callbacks?.onMutate?.(variables),
		onSuccess: (data) => {
			callbacks?.onSuccess?.();
			toast.success(data.message);
			closeModal();
		},
		onError: (error) => {
			callbacks?.onError?.(error);
			toast.error(getErrorMessage(error));
		},
		onSettled: () => callbacks?.onSettled?.(),
	});

	return (
		<ResponsiveMenu
			menuTitle="DESCARTAR LOTE"
			menuDescription="Registre a perda ou descarte de uma quantidade disponível neste lote."
			menuActionButtonText="REGISTRAR DESCARTE"
			menuActionButtonClassName="bg-destructive text-destructive-foreground hover:bg-destructive/90"
			menuCancelButtonText="CANCELAR"
			actionFunction={() => mutate({ loteId: stockLot.id, quantidade: quantity, motivo: reason.trim() })}
			actionIsLoading={isPending}
			stateIsLoading={false}
			stateError={null}
			closeMenu={closeModal}
			dialogVariant="sm"
			drawerVariant="sm"
			lockClose={isPending}
		>
			<ResponsiveMenuSection title="Lote" icon={<PackageX className="h-4 w-4" />}>
				<div className="rounded-xl border border-border bg-muted/30 p-3">
					<p className="text-sm font-semibold tracking-tight">{productName}</p>
					<p className="text-xs text-muted-foreground">
						{stockLot.codigoLote ? `Lote ${stockLot.codigoLote}` : "Lote sem código"} · Saldo atual: {stockLot.quantidadeAtual}
					</p>
				</div>
			</ResponsiveMenuSection>

			<ResponsiveMenuSection title="Descarte" icon={<Trash2 className="h-4 w-4" />}>
				<NumberInput label="Quantidade" placeholder="Informe a quantidade descartada" value={quantity} handleChange={setQuantity} required />
				<TextareaInput label="Motivo" placeholder="Ex.: Produto vencido, perda operacional, avaria..." value={reason} handleChange={setReason} required />
			</ResponsiveMenuSection>
		</ResponsiveMenu>
	);
}
