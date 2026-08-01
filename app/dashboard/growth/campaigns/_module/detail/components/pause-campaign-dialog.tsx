"use client";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

type PauseCampaignDialogProps = {
	open: boolean;
	isPending: boolean;
	onCancel: () => void;
	onConfirm: () => void;
};

export default function PauseCampaignDialog({ open, isPending, onCancel, onConfirm }: PauseCampaignDialogProps) {
	return (
		<Dialog
			open={open}
			onOpenChange={(isOpen) => {
				if (!isOpen) onCancel();
			}}
		>
			<DialogContent className="max-w-md">
				<DialogHeader>
					<DialogTitle>PAUSAR CAMPANHA?</DialogTitle>
					<DialogDescription>Pausar esta campanha interrompe os próximos envios. Deseja continuar?</DialogDescription>
				</DialogHeader>
				<DialogFooter>
					<Button variant="outline" onClick={onCancel} disabled={isPending}>
						CANCELAR
					</Button>
					<Button variant="destructive" onClick={onConfirm} disabled={isPending}>
						{isPending ? "PAUSANDO..." : "PAUSAR CAMPANHA"}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
