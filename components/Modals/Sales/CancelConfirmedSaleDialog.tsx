"use client";

import { LoadingButton } from "@/components/loading-button";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { getErrorMessage } from "@/lib/errors";
import { appRoutes } from "@/lib/navigation/routes";
import { formatToMoney } from "@/lib/formatting";
import { cancelConfirmedSale } from "@/lib/mutations/pos";
import { SALES_FULFILLMENT_QUERY_KEY } from "@/lib/queries/sales-fulfillment";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, FileWarning } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";

type CancelConfirmedSaleDialogProps = {
	saleId: string;
	idExterno: string;
	valorTotal: number;
	clienteNome?: string | null;
	// Documento fiscal vivo: o cancelamento da venda exige cancelar/inutilizar a nota primeiro.
	exigeCancelamentoFiscal: boolean;
	closeModal: () => void;
	onSuccess?: () => void;
};

/**
 * Cancelamento com estorno de venda CONFIRMADA. Não é exclusão: a venda permanece no histórico
 * como CANCELADA, com estorno contábil espelhado, transações canceladas/estornadas, devolução de
 * estoque e reversão de cashback/cupons — tudo feito pelo fluxo existente no servidor.
 */
export function CancelConfirmedSaleDialog({
	saleId,
	idExterno,
	valorTotal,
	clienteNome,
	exigeCancelamentoFiscal,
	closeModal,
	onSuccess,
}: CancelConfirmedSaleDialogProps) {
	const queryClient = useQueryClient();
	const [reason, setReason] = useState("");
	const reasonIsValid = reason.trim().length >= 3;

	const { mutate: cancelSale, isPending } = useMutation({
		mutationKey: ["cancel-confirmed-sale", saleId],
		mutationFn: cancelConfirmedSale,
		onSuccess: async (data) => {
			await Promise.all([
				queryClient.invalidateQueries({ queryKey: ["sales"] }),
				queryClient.invalidateQueries({ queryKey: ["sales-by-id", saleId] }),
				queryClient.invalidateQueries({ queryKey: SALES_FULFILLMENT_QUERY_KEY }),
				queryClient.invalidateQueries({ queryKey: ["sales-fulfillment-by-id", saleId] }),
			]);
			toast.success(data.message);
			onSuccess?.();
			closeModal();
		},
		onError: (error) => {
			toast.error(getErrorMessage(error));
		},
	});

	return (
		<Dialog open onOpenChange={(open) => (!isPending && !open ? closeModal() : null)}>
			<DialogContent className="max-w-lg">
				<DialogHeader>
					<div className="flex items-center gap-2 text-destructive">
						<AlertTriangle className="h-5 w-5" />
						<DialogTitle>Cancelar venda?</DialogTitle>
					</div>
					<DialogDescription>
						O cancelamento estorna o lançamento contábil, cancela ou estorna os recebimentos, devolve o estoque entregue e reverte cashback e
						cupons. A venda permanece no histórico como CANCELADA.
					</DialogDescription>
				</DialogHeader>

				<div className="flex flex-col gap-3 rounded-2xl border border-destructive/20 bg-destructive/5 p-4">
					<div className="flex items-center justify-between gap-3 text-sm">
						<span className="text-muted-foreground">Identificador</span>
						<span className="font-bold">{idExterno}</span>
					</div>
					<div className="flex items-center justify-between gap-3 text-sm">
						<span className="text-muted-foreground">Valor</span>
						<span className="font-bold">{formatToMoney(valorTotal)}</span>
					</div>
					<div className="flex items-center justify-between gap-3 text-sm">
						<span className="text-muted-foreground">Cliente</span>
						<span className="font-bold">{clienteNome ?? "AO CONSUMIDOR"}</span>
					</div>
				</div>

				{exigeCancelamentoFiscal ? (
					<div className="flex flex-col gap-3 rounded-2xl border border-border bg-muted/40 p-4 text-sm">
						<div className="flex items-center gap-2 font-bold">
							<FileWarning className="h-4 w-4 text-destructive" />
							Cancele primeiro o documento fiscal
						</div>
						<p className="text-muted-foreground">
							Esta venda possui nota fiscal emitida. O cancelamento da nota precisa ser feito antes do cancelamento da venda — sem isso os valores
							fiscais ficariam dessincronizados.
						</p>
						<Button variant="outline" asChild>
							<Link href={appRoutes.sales.details(saleId)}>VER DOCUMENTOS DA VENDA</Link>
						</Button>
					</div>
				) : (
					<div className="flex flex-col gap-2">
						<label htmlFor="cancel-sale-reason" className="text-xs font-bold uppercase tracking-wide">
							Motivo do cancelamento
						</label>
						<Textarea
							id="cancel-sale-reason"
							placeholder="Descreva o motivo do cancelamento (mínimo 3 caracteres)..."
							value={reason}
							onChange={(event) => setReason(event.target.value)}
							disabled={isPending}
						/>
					</div>
				)}

				<DialogFooter>
					<Button variant="outline" disabled={isPending} onClick={closeModal}>
						VOLTAR
					</Button>
					{!exigeCancelamentoFiscal ? (
						<LoadingButton
							variant="destructive"
							loading={isPending}
							disabled={!reasonIsValid}
							onClick={() => cancelSale({ id: saleId, reason: reason.trim() })}
						>
							CANCELAR VENDA E ESTORNAR
						</LoadingButton>
					) : null}
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
