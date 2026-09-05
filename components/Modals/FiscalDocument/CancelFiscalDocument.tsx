"use client";

import ResponsiveMenu from "@/components/Utils/ResponsiveMenu";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { getErrorMessage } from "@/lib/errors";
import { cancelFiscalDocumentMutation } from "@/lib/mutations/fiscal";
import { cn } from "@/lib/utils";
import type { TFiscalDocumentTypeEnum } from "@/schemas/enums";
import { useMutation } from "@tanstack/react-query";
import { AlertTriangle, Clock, Info } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useFiscalDeadline } from "./use-fiscal-deadline";
import { useFiscalDocumentInvalidation } from "./use-fiscal-document-invalidation";

const CANCEL_REASON_MIN_LENGTH = 15;
const CANCEL_REASON_MAX_LENGTH = 255;

type CancelFiscalDocumentProps = {
	document: { id: string; tipo: TFiscalDocumentTypeEnum; numero: string | null };
	// `prazoLimite` da acao CANCELAR. null quando o provedor e MANUAL ou nao ha janela.
	prazoLimite: Date | string | null | undefined;
	closeMenu: () => void;
	onSuccess?: () => void;
};

export default function CancelFiscalDocument({ document, prazoLimite, closeMenu, onSuccess }: CancelFiscalDocumentProps) {
	const invalidate = useFiscalDocumentInvalidation(document.id);
	const deadline = useFiscalDeadline(prazoLimite);
	const [reason, setReason] = useState("");
	const [acknowledged, setAcknowledged] = useState(false);
	const normalizedReason = reason.trim();
	const reasonIsValid = normalizedReason.length >= CANCEL_REASON_MIN_LENGTH && normalizedReason.length <= CANCEL_REASON_MAX_LENGTH;
	const requiresAcknowledgement = deadline.urgent;
	const canSubmit = reasonIsValid && !deadline.expired && (!requiresAcknowledgement || acknowledged);
	const documentLabel = `${document.tipo === "NFCE" ? "NFC-e" : document.tipo === "NFE" ? "NF-e" : document.tipo}${document.numero ? ` nº ${document.numero}` : ""}`;

	const { mutate, isPending } = useMutation({
		mutationKey: ["cancel-fiscal-document", document.id],
		mutationFn: cancelFiscalDocumentMutation,
		onSuccess: async (data) => {
			toast.success(data.message);
			await invalidate();
			onSuccess?.();
			closeMenu();
		},
		onError: (error) => toast.error(getErrorMessage(error)),
	});

	return (
		<ResponsiveMenu
			menuTitle="CANCELAR DOCUMENTO FISCAL"
			menuDescription={`O cancelamento de ${documentLabel} será enviado à SEFAZ e não pode ser desfeito.`}
			menuActionButtonText="CONFIRMAR CANCELAMENTO"
			menuActionButtonVariant="destructive"
			menuActionButtonDisabled={!canSubmit}
			menuCancelButtonText="VOLTAR"
			actionFunction={() => {
				if (!canSubmit) return;
				mutate({ documentId: document.id, reason: normalizedReason });
			}}
			actionIsLoading={isPending}
			stateIsLoading={false}
			closeMenu={closeMenu}
			lockClose={isPending}
		>
			<div className="space-y-4">
				{deadline.deadline ? (
					<div
						className={cn(
							"flex items-start gap-2 rounded-lg border p-3 text-sm",
							deadline.expired
								? "border-destructive/40 bg-destructive/5 text-destructive"
								: deadline.urgent
									? "border-amber-500/60 bg-amber-50/70 text-amber-900 dark:border-amber-800/70 dark:bg-amber-950/30 dark:text-amber-200"
									: "border-border bg-muted/30 text-foreground",
						)}
					>
						<Clock className="mt-0.5 h-4 w-4 shrink-0" />
						<div>
							<p className="font-semibold">
								{deadline.expired ? "Prazo de cancelamento encerrado." : `Cancelamento disponível por mais ${deadline.label}.`}
							</p>
							<p className="mt-0.5 text-xs opacity-80">
								{deadline.expired
									? "A SEFAZ não aceita mais o cancelamento deste documento. Feche este menu e use a devolução."
									: "Depois desse prazo a SEFAZ recusa o cancelamento e a saída passa a ser a NF-e de devolução."}
							</p>
						</div>
					</div>
				) : null}

				<div className="space-y-2">
					<div className="flex items-center justify-between gap-3">
						<Label htmlFor="fiscal-cancel-reason">MOTIVO DO CANCELAMENTO</Label>
						<span className={cn("text-xs tabular-nums text-muted-foreground", normalizedReason.length > 0 && !reasonIsValid && "text-destructive")}>
							{normalizedReason.length}/{CANCEL_REASON_MAX_LENGTH}
						</span>
					</div>
					<Textarea
						id="fiscal-cancel-reason"
						value={reason}
						onChange={(event) => setReason(event.target.value)}
						maxLength={CANCEL_REASON_MAX_LENGTH}
						rows={4}
						aria-invalid={normalizedReason.length > 0 && !reasonIsValid}
						placeholder="Ex.: Venda registrada em duplicidade pelo operador do caixa."
					/>
					<p className="text-xs text-muted-foreground">
						Mínimo de {CANCEL_REASON_MIN_LENGTH} caracteres. O motivo é transmitido à SEFAZ e fica no histórico do documento.
					</p>
				</div>

				<div className="flex items-start gap-2 rounded-lg border bg-muted/20 p-3 text-xs text-muted-foreground">
					<Info className="mt-0.5 h-4 w-4 shrink-0" />
					<span>A venda continuará confirmada; para cancelar a venda, faça isso depois pelo fluxo de cancelamento.</span>
				</div>

				{requiresAcknowledgement ? (
					<div className="flex items-start gap-3 rounded-lg border border-amber-500/40 bg-amber-50/40 p-3 dark:border-amber-800/60 dark:bg-amber-950/20">
						<Checkbox id="fiscal-cancel-acknowledge" checked={acknowledged} onCheckedChange={(checked) => setAcknowledged(checked === true)} />
						<Label htmlFor="fiscal-cancel-acknowledge" className="cursor-pointer text-sm font-normal leading-5">
							<AlertTriangle className="mr-1 inline h-3.5 w-3.5 text-amber-700 dark:text-amber-400" />
							Estou ciente de que faltam menos de 5 minutos e que, se a SEFAZ responder após o prazo, o cancelamento será recusado.
						</Label>
					</div>
				) : null}
			</div>
		</ResponsiveMenu>
	);
}
