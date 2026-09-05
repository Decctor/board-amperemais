"use client";

import ResponsiveMenu from "@/components/Utils/ResponsiveMenu";
import { getErrorMessage } from "@/lib/errors";
import { returnFiscalDocumentMutation } from "@/lib/mutations/fiscal";
import type { TFiscalDocumentTypeEnum } from "@/schemas/enums";
import { useMutation } from "@tanstack/react-query";
import { ArrowLeftRight, Boxes, KeyRound, LockOpen, Undo2 } from "lucide-react";
import { toast } from "sonner";
import { useFiscalDocumentInvalidation } from "./use-fiscal-document-invalidation";

type ReturnFiscalDocumentProps = {
	document: { id: string; tipo: TFiscalDocumentTypeEnum; numero: string | null; chaveAcesso: string | null };
	closeMenu: () => void;
	onSuccess?: () => void;
};

export default function ReturnFiscalDocument({ document, closeMenu, onSuccess }: ReturnFiscalDocumentProps) {
	const invalidate = useFiscalDocumentInvalidation(document.id);

	const { mutate, isPending } = useMutation({
		mutationKey: ["return-fiscal-document", document.id],
		mutationFn: returnFiscalDocumentMutation,
		onSuccess: async (data) => {
			toast.success(data.message);
			await invalidate();
			onSuccess?.();
			closeMenu();
		},
		onError: (error) => toast.error(getErrorMessage(error)),
	});

	const originLabel = `${document.tipo === "NFCE" ? "NFC-e" : document.tipo === "NFE" ? "NF-e" : document.tipo}${document.numero ? ` nº ${document.numero}` : ""}`;

	return (
		<ResponsiveMenu
			menuTitle="GERAR NF-E DE DEVOLUÇÃO"
			menuDescription={`Emite uma nova NF-e de entrada (finalidade DEVOLUÇÃO) referenciando a ${originLabel}.`}
			menuActionButtonText="GERAR DEVOLUÇÃO"
			menuCancelButtonText="VOLTAR"
			actionFunction={() => mutate({ documentId: document.id })}
			actionIsLoading={isPending}
			stateIsLoading={false}
			closeMenu={closeMenu}
			lockClose={isPending}
		>
			<div className="space-y-3">
				<div className="flex items-start gap-3 rounded-lg border bg-muted/20 p-3">
					<ArrowLeftRight className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
					<div className="text-sm">
						<p className="font-semibold">Gera um documento novo — a nota original continua autorizada.</p>
						<p className="mt-1 text-xs text-muted-foreground">
							A NF-e de devolução usa o perfil de operação DEVOLUÇÃO ativo da organização e estorna o efeito fiscal da nota referenciada. É a saída correta
							quando a janela de cancelamento já fechou.
						</p>
					</div>
				</div>

				<div className="flex items-start gap-3 rounded-lg border bg-muted/20 p-3">
					<KeyRound className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
					<div className="min-w-0 text-sm">
						<p className="font-semibold">Chave de acesso referenciada</p>
						<p className="mt-1 break-all font-mono text-xs text-muted-foreground">{document.chaveAcesso ?? "—"}</p>
					</div>
				</div>

				<div className="flex items-start gap-3 rounded-lg border border-amber-500/50 bg-amber-50/60 p-3 dark:border-amber-800/60 dark:bg-amber-950/20">
					<Boxes className="mt-0.5 h-4 w-4 shrink-0 text-amber-700 dark:text-amber-400" />
					<div className="text-sm">
						<p className="font-semibold text-amber-900 dark:text-amber-200">Não movimenta estoque nem financeiro sozinha.</p>
						<p className="mt-1 text-xs text-amber-800/90 dark:text-amber-300/90">
							A devolução fiscal registra apenas o efeito tributário. O retorno dos itens ao estoque e o estorno do pagamento seguem pelo fluxo de devolução
							da venda.
						</p>
					</div>
				</div>

				<div className="flex items-start gap-3 rounded-lg border bg-muted/20 p-3">
					<LockOpen className="mt-0.5 h-4 w-4 shrink-0 text-green-600" />
					<div className="text-sm">
						<p className="font-semibold">Quando autorizada, libera o cancelamento da venda.</p>
						<p className="mt-1 text-xs text-muted-foreground">
							Enquanto a devolução não for autorizada pela SEFAZ, a venda vinculada continua travada pelo documento original.
						</p>
					</div>
				</div>

				<p className="flex items-center gap-1.5 text-xs text-muted-foreground">
					<Undo2 className="h-3.5 w-3.5" />O novo documento aparece na lista como derivado desta nota e entra na fila de envio.
				</p>
			</div>
		</ResponsiveMenu>
	);
}
