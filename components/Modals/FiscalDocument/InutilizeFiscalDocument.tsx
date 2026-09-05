"use client";

import ResponsiveMenu from "@/components/Utils/ResponsiveMenu";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { getErrorMessage } from "@/lib/errors";
import { formatDateAsLocale } from "@/lib/formatting";
import { inutilizeFiscalDocumentMutation } from "@/lib/mutations/fiscal";
import { cn } from "@/lib/utils";
import type { TFiscalDocumentTypeEnum } from "@/schemas/enums";
import { useMutation } from "@tanstack/react-query";
import { AlertTriangle, CalendarClock } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useFiscalDeadline } from "./use-fiscal-deadline";
import { useFiscalDocumentInvalidation } from "./use-fiscal-document-invalidation";

const JUSTIFICATION_MIN_LENGTH = 15;
const JUSTIFICATION_MAX_LENGTH = 255;

type InutilizeFiscalDocumentProps = {
	document: { id: string; tipo: TFiscalDocumentTypeEnum; serie: string | null; numero: string | null };
	// `prazoLimite` da acao INUTILIZAR (dia limite do mes seguinte a reserva).
	prazoLimite: Date | string | null | undefined;
	closeMenu: () => void;
	onSuccess?: () => void;
};

export default function InutilizeFiscalDocument({ document, prazoLimite, closeMenu, onSuccess }: InutilizeFiscalDocumentProps) {
	const invalidate = useFiscalDocumentInvalidation(document.id);
	const deadline = useFiscalDeadline(prazoLimite, 60_000);
	const [justification, setJustification] = useState("");
	const normalizedJustification = justification.trim();
	const justificationIsValid =
		normalizedJustification.length >= JUSTIFICATION_MIN_LENGTH && normalizedJustification.length <= JUSTIFICATION_MAX_LENGTH;
	const canSubmit = justificationIsValid && !deadline.expired;

	const { mutate, isPending } = useMutation({
		mutationKey: ["inutilize-fiscal-document", document.id],
		mutationFn: inutilizeFiscalDocumentMutation,
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
			menuTitle="INUTILIZAR NUMERAÇÃO"
			menuDescription={`Comunica à SEFAZ que o número ${document.numero ?? "—"}${document.serie ? ` da série ${document.serie}` : ""} (${document.tipo}) não será usado.`}
			menuActionButtonText="INUTILIZAR NUMERAÇÃO"
			menuActionButtonVariant="destructive"
			menuActionButtonDisabled={!canSubmit}
			menuCancelButtonText="VOLTAR"
			actionFunction={() => {
				if (!canSubmit) return;
				mutate({ documentId: document.id, justificativa: normalizedJustification });
			}}
			actionIsLoading={isPending}
			stateIsLoading={false}
			closeMenu={closeMenu}
			lockClose={isPending}
		>
			<div className="space-y-4">
				<div className="flex items-start gap-2 rounded-lg border border-destructive/40 bg-destructive/5 p-3 text-sm">
					<AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
					<div>
						<p className="font-semibold text-destructive">A numeração é queimada e o documento é encerrado.</p>
						<p className="mt-1 text-xs text-muted-foreground">
							Depois disso não há reenvio com este número. Use apenas quando desistiu de emitir este documento; se ainda pretende corrigir a causa e
							reenviar, feche este menu.
						</p>
					</div>
				</div>

				{deadline.deadline ? (
					<div
						className={cn(
							"flex items-start gap-2 rounded-lg border p-3 text-xs",
							deadline.expired ? "border-destructive/40 bg-destructive/5 text-destructive" : "border-border bg-muted/30 text-muted-foreground",
						)}
					>
						<CalendarClock className="mt-0.5 h-4 w-4 shrink-0" />
						<span>
							{deadline.expired
								? `Prazo de inutilização encerrado em ${formatDateAsLocale(deadline.deadline, true)}. Fale com o contador.`
								: `Prazo para inutilizar: até ${formatDateAsLocale(deadline.deadline, true)} (${deadline.label}).`}
						</span>
					</div>
				) : null}

				<div className="space-y-2">
					<div className="flex items-center justify-between gap-3">
						<Label htmlFor="fiscal-inutilize-justification">JUSTIFICATIVA</Label>
						<span
							className={cn("text-xs tabular-nums text-muted-foreground", normalizedJustification.length > 0 && !justificationIsValid && "text-destructive")}
						>
							{normalizedJustification.length}/{JUSTIFICATION_MAX_LENGTH}
						</span>
					</div>
					<Textarea
						id="fiscal-inutilize-justification"
						value={justification}
						onChange={(event) => setJustification(event.target.value)}
						maxLength={JUSTIFICATION_MAX_LENGTH}
						rows={4}
						aria-invalid={normalizedJustification.length > 0 && !justificationIsValid}
						placeholder="Ex.: Número reservado por falha de comunicação; documento não será emitido."
					/>
					<p className="text-xs text-muted-foreground">Mínimo de {JUSTIFICATION_MIN_LENGTH} caracteres. A justificativa é transmitida à SEFAZ.</p>
				</div>
			</div>
		</ResponsiveMenu>
	);
}
