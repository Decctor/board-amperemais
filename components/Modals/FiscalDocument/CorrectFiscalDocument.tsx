"use client";

import ResponsiveMenu from "@/components/Utils/ResponsiveMenu";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { getErrorMessage } from "@/lib/errors";
import { correctFiscalDocumentMutation } from "@/lib/mutations/fiscal";
import { cn } from "@/lib/utils";
import { useMutation } from "@tanstack/react-query";
import { Ban, CheckCircle2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useFiscalDocumentInvalidation } from "./use-fiscal-document-invalidation";

const CORRECTION_MIN_LENGTH = 15;
const CORRECTION_MAX_LENGTH = 1000;

const NOT_CORRECTABLE = [
	"Valores (preço, desconto, total, impostos)",
	"Quantidades",
	"Datas de emissão ou de saída",
	"Partes envolvidas (emitente, destinatário)",
	"Itens (incluir, remover ou trocar produtos)",
	"CFOP que muda a natureza da operação",
];

const CORRECTABLE = [
	"Endereço e dados de transporte",
	"Observações e informações complementares",
	"Descrição descritiva de itens (sem mudar o produto)",
];

type CorrectFiscalDocumentProps = {
	document: { id: string; numero: string | null };
	closeMenu: () => void;
	onSuccess?: () => void;
};

export default function CorrectFiscalDocument({ document, closeMenu, onSuccess }: CorrectFiscalDocumentProps) {
	const invalidate = useFiscalDocumentInvalidation(document.id);
	const [correction, setCorrection] = useState("");
	const normalizedCorrection = correction.trim();
	const correctionIsValid = normalizedCorrection.length >= CORRECTION_MIN_LENGTH && normalizedCorrection.length <= CORRECTION_MAX_LENGTH;

	const { mutate, isPending } = useMutation({
		mutationKey: ["correct-fiscal-document", document.id],
		mutationFn: correctFiscalDocumentMutation,
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
			menuTitle="CARTA DE CORREÇÃO"
			menuDescription={`Registre uma correção descritiva para a NF-e${document.numero ? ` nº ${document.numero}` : ""}. A nota continua válida com os mesmos valores.`}
			menuActionButtonText="REGISTRAR CORREÇÃO"
			menuActionButtonDisabled={!correctionIsValid}
			menuCancelButtonText="VOLTAR"
			actionFunction={() => {
				if (!correctionIsValid) return;
				mutate({ documentId: document.id, correcao: normalizedCorrection });
			}}
			actionIsLoading={isPending}
			stateIsLoading={false}
			closeMenu={closeMenu}
			lockClose={isPending}
		>
			<div className="space-y-4">
				<div className="grid gap-3 md:grid-cols-2">
					<div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3">
						<p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-tight text-destructive">
							<Ban className="h-3.5 w-3.5" />O que a carta de correção NÃO corrige
						</p>
						<ul className="mt-2 space-y-1 text-xs text-foreground/80">
							{NOT_CORRECTABLE.map((item) => (
								<li key={item} className="flex items-start gap-1.5">
									<span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-destructive" />
									{item}
								</li>
							))}
						</ul>
						<p className="mt-2 text-[11px] text-muted-foreground">Para esses casos, cancele dentro do prazo ou gere uma NF-e de devolução.</p>
					</div>
					<div className="rounded-lg border bg-muted/20 p-3">
						<p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-tight text-foreground/80">
							<CheckCircle2 className="h-3.5 w-3.5 text-green-600" />O que ela corrige
						</p>
						<ul className="mt-2 space-y-1 text-xs text-foreground/80">
							{CORRECTABLE.map((item) => (
								<li key={item} className="flex items-start gap-1.5">
									<span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-green-600" />
									{item}
								</li>
							))}
						</ul>
						<p className="mt-2 text-[11px] text-muted-foreground">Limite legal de 20 cartas por nota; a última substitui as anteriores.</p>
					</div>
				</div>

				<div className="space-y-2">
					<div className="flex items-center justify-between gap-3">
						<Label htmlFor="fiscal-correction-text">TEXTO DA CORREÇÃO</Label>
						<span className={cn("text-xs tabular-nums text-muted-foreground", normalizedCorrection.length > 0 && !correctionIsValid && "text-destructive")}>
							{normalizedCorrection.length}/{CORRECTION_MAX_LENGTH}
						</span>
					</div>
					<Textarea
						id="fiscal-correction-text"
						value={correction}
						onChange={(event) => setCorrection(event.target.value)}
						maxLength={CORRECTION_MAX_LENGTH}
						rows={5}
						aria-invalid={normalizedCorrection.length > 0 && !correctionIsValid}
						placeholder="Ex.: Onde se lê 'Rua das Flores, 10', leia-se 'Rua das Flores, 100'."
					/>
					<p className="text-xs text-muted-foreground">Mínimo de {CORRECTION_MIN_LENGTH} caracteres. Descreva o dado errado e o dado correto.</p>
				</div>
			</div>
		</ResponsiveMenu>
	);
}
