"use client";

import TextInput from "@/components/Inputs/TextInput";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { getErrorMessage } from "@/lib/errors";
import { updateIntegration } from "@/lib/mutations/integrations";
import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";

type MetaCapiSettingsModalProps = {
	integrationId: string;
	initialPixelId?: string;
	initialTestEventCode?: string;
	initialPurchaseEnabled: boolean;
	closeModal: () => void;
	onSaved: () => void;
};

export function MetaCapiSettingsModal({
	integrationId,
	initialPixelId,
	initialTestEventCode,
	initialPurchaseEnabled,
	closeModal,
	onSaved,
}: MetaCapiSettingsModalProps) {
	const [pixelId, setPixelId] = useState<string>(initialPixelId ?? "");
	const [testEventCode, setTestEventCode] = useState<string>(initialTestEventCode ?? "");
	const [purchaseEnabled, setPurchaseEnabled] = useState<boolean>(initialPurchaseEnabled);

	const { mutate, isPending } = useMutation({
		mutationKey: ["update-integration-capi", integrationId],
		mutationFn: updateIntegration,
		onSuccess: (data) => {
			toast.success(data.message);
			onSaved();
			closeModal();
		},
		onError: (error) => toast.error(getErrorMessage(error)),
	});

	function handleSave() {
		if (purchaseEnabled && !pixelId.trim()) {
			toast.error("Informe o ID do Pixel para enviar conversões.");
			return;
		}
		mutate({
			id: integrationId,
			capiConfig: {
				pixelId: pixelId.trim() || null,
				capiTestEventCode: testEventCode.trim() || null,
				eventosCapi: purchaseEnabled ? ["purchase"] : [],
			},
		});
	}

	return (
		<Dialog open onOpenChange={(open) => !open && closeModal()}>
			<DialogContent className="max-w-lg">
				<DialogHeader>
					<DialogTitle className="text-left text-base">API DE CONVERSÕES (CAPI)</DialogTitle>
					<DialogDescription className="text-left">
						Envie as compras do RecompraCRM direto para a Meta, melhorando a otimização com dados first-party.
					</DialogDescription>
				</DialogHeader>

				<div className="flex w-full flex-col gap-3">
					<TextInput label="ID do Pixel / Dataset" value={pixelId} placeholder="Ex.: 1234567890" handleChange={setPixelId} />
					<TextInput
						label="CÓDIGO DE TESTE (Events Manager)"
						value={testEventCode}
						placeholder="Opcional — TEST12345 (só para validação)"
						handleChange={setTestEventCode}
					/>
					<div className="flex items-center justify-between rounded-lg border border-border p-3">
						<div className="flex flex-col">
							<span className="text-sm font-medium text-foreground/80">ENVIAR CONVERSÕES DE VENDAS</span>
							<span className="text-xs text-muted-foreground">Dispara o evento Purchase para cada venda (PDV, loja e ERP).</span>
						</div>
						<Switch checked={purchaseEnabled} onCheckedChange={setPurchaseEnabled} />
					</div>
				</div>

				<DialogFooter>
					<Button variant="ghost" onClick={closeModal} disabled={isPending}>
						CANCELAR
					</Button>
					<Button onClick={handleSave} disabled={isPending}>
						{isPending ? "SALVANDO..." : "SALVAR"}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
