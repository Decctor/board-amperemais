"use client";

import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";

type UnsavedChangesPromptProps = {
	open: boolean;
	onCancel: () => void;
	onConfirm: () => void;
};
export default function UnsavedChangesPrompt({ open, onCancel, onConfirm }: UnsavedChangesPromptProps) {
	return (
		<Dialog
			open={open}
			onOpenChange={(o) => {
				if (!o) onCancel();
			}}
		>
			<DialogContent className="max-w-md">
				<DialogHeader>
					<DialogTitle>Sair sem salvar?</DialogTitle>
					<DialogDescription>
						Você tem alterações não salvas. Se sair agora, todas as edições serão perdidas.
					</DialogDescription>
				</DialogHeader>
				<DialogFooter>
					<Button variant="outline" onClick={onCancel}>
						Continuar editando
					</Button>
					<Button variant="destructive" onClick={onConfirm}>
						Sair sem salvar
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
