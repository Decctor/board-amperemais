"use client";

import NumberInput from "@/components/Inputs/NumberInput";
import TextareaInput from "@/components/Inputs/TextareaInput";
import ResponsiveMenu from "@/components/Utils/ResponsiveMenu";
import ResponsiveMenuSection from "@/components/Utils/ResponsiveMenuSection";
import { getErrorMessage } from "@/lib/errors";
import { formatDecimalPlaces } from "@/lib/formatting";
import { applyStockRecount } from "@/lib/mutations/stock-recount";
import { useStockRecountRowsByProductId } from "@/lib/queries/stock-recount";
import { stockRecountEntryKey } from "@/state-hooks/use-stock-recount-draft";
import { useMutation } from "@tanstack/react-query";
import { ClipboardList, MessageSquareText } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

type RecountProductProps = {
	productId: string;
	closeModal: () => void;
	callbacks?: {
		onMutate?: (variables: Parameters<typeof applyStockRecount>[0]) => void;
		onSuccess?: () => void;
		onError?: (error: Error) => void;
		onSettled?: () => void;
	};
};

/**
 * Recontagem rápida de um único produto (e suas variantes rastreadas), aplicada imediatamente —
 * sem passar pelo rascunho da página de recontagem. Campos não alterados resultam em delta zero
 * e não geram movimentação.
 */
export default function RecountProduct({ productId, closeModal, callbacks }: RecountProductProps) {
	const { data: rows, isLoading, error } = useStockRecountRowsByProductId({ productId });
	// Contagens digitadas, por chave da entidade. Entidades não tocadas usam o saldo atual.
	const [countedQuantities, setCountedQuantities] = useState<Record<string, number>>({});
	const [reason, setReason] = useState("");

	const { mutate, isPending } = useMutation({
		mutationKey: ["apply-stock-recount", productId],
		mutationFn: applyStockRecount,
		onMutate: (variables) => callbacks?.onMutate?.(variables),
		onSuccess: (data) => {
			callbacks?.onSuccess?.();
			toast.success(data.message);
			closeModal();
		},
		onError: (mutationError) => {
			callbacks?.onError?.(mutationError);
			toast.error(getErrorMessage(mutationError));
		},
		onSettled: () => callbacks?.onSettled?.(),
	});

	function handleApply() {
		if (!rows || rows.length === 0) return;
		mutate({
			itens: rows.map((row) => {
				const key = stockRecountEntryKey(row.produtoId, row.produtoVarianteId);
				return {
					produtoId: row.produtoId,
					produtoVarianteId: row.produtoVarianteId,
					quantidadeContada: countedQuantities[key] ?? row.quantidade,
				};
			}),
			motivo: reason,
		});
	}

	return (
		<ResponsiveMenu
			menuTitle="RECONTAR ESTOQUE"
			menuDescription="Informe a quantidade física contada; o sistema calcula a diferença e registra o ajuste."
			menuActionButtonText="APLICAR RECONTAGEM"
			menuActionButtonDisabled={!rows || rows.length === 0}
			menuCancelButtonText="CANCELAR"
			actionFunction={handleApply}
			actionIsLoading={isPending}
			stateIsLoading={isLoading}
			stateError={error ? getErrorMessage(error) : null}
			closeMenu={closeModal}
			dialogVariant="sm"
			drawerVariant="sm"
			lockClose={isPending}
		>
			<ResponsiveMenuSection title="Contagem" icon={<ClipboardList className="h-4 w-4" />}>
				{rows && rows.length > 0 ? (
					<div className="flex flex-col gap-3">
						{rows.map((row) => {
							const key = stockRecountEntryKey(row.produtoId, row.produtoVarianteId);
							const counted = countedQuantities[key] ?? row.quantidade;
							const delta = counted - row.quantidade;
							return (
								<div key={key} className="flex flex-col gap-1">
									<NumberInput
										label={row.varianteNome ? `${row.nome} — ${row.varianteNome}` : row.nome}
										placeholder="Quantidade contada"
										value={counted}
										handleChange={(value) => setCountedQuantities((prev) => ({ ...prev, [key]: value }))}
									/>
									<p className="text-muted-foreground text-xs tabular-nums">
										Saldo atual: {formatDecimalPlaces(row.quantidade)} {row.unidade}
										{delta !== 0 ? ` · ajuste de ${delta > 0 ? "+" : "-"}${formatDecimalPlaces(Math.abs(delta))}` : " · sem diferença"}
									</p>
								</div>
							);
						})}
					</div>
				) : (
					<p className="text-muted-foreground text-xs">Este produto não possui rastreamento de estoque ativo (nem em variantes).</p>
				)}
			</ResponsiveMenuSection>

			<ResponsiveMenuSection title="Motivo" icon={<MessageSquareText className="h-4 w-4" />}>
				<TextareaInput label="Motivo" placeholder="Recontagem de estoque" value={reason} handleChange={setReason} />
				<p className="text-muted-foreground text-xs">Itens sem diferença não geram movimentação de estoque.</p>
			</ResponsiveMenuSection>
		</ResponsiveMenu>
	);
}
