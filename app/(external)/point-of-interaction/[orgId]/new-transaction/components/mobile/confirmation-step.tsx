"use client";

import { Button } from "@/components/ui/button";
import { formatToMoney } from "@/lib/formatting";
import { CheckCircle2, Clock3, ShieldCheck } from "lucide-react";

type MobileConfirmationStepProps = {
	clientName: string;
	finalValue: number;
	onSubmit: () => void;
};

export function MobileConfirmationStep({ clientName, finalValue, onSubmit }: MobileConfirmationStepProps) {
	return (
		<div className="space-y-5 animate-in fade-in slide-in-from-bottom-4">
			<div className="space-y-2 text-center">
				<p className="text-xs font-bold uppercase tracking-[0.25em] text-brand/70">Aprovação do operador</p>
				<h2 className="text-2xl font-black tracking-tight">Confirme os dados antes de enviar</h2>
				<p className="text-sm text-muted-foreground">O operador aprova a transação no painel da loja e você acompanha por aqui.</p>
			</div>

			<div className="rounded-3xl border border-brand/15 bg-card p-5 shadow-sm space-y-4">
				<div className="rounded-2xl bg-brand/5 p-4 space-y-3">
					<div className="flex items-center justify-between gap-3">
						<span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Cliente</span>
						<span className="text-sm font-black text-brand text-right">{clientName}</span>
					</div>
					<div className="flex items-center justify-between gap-3">
						<span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Valor final</span>
						<span className="text-2xl font-black text-foreground">{formatToMoney(finalValue)}</span>
					</div>
				</div>

				<div className="space-y-3 text-sm">
					<div className="flex items-start gap-3 rounded-2xl bg-primary-foreground text-primary px-4 py-3">
						<ShieldCheck className="mt-0.5 min-h-4 min-w-4 w-4 h-4" />
						<p className="font-bold">O pedido vai para a fila de aprovação da equipe.</p>
					</div>
					<div className="flex items-start gap-3 rounded-2xl bg-primary-foreground text-primary px-4 py-3">
						<Clock3 className="mt-0.5 min-h-4 min-w-4 w-4 h-4" />
						<p className="font-bold">Você recebe a atualização automaticamente assim que o operador responder.</p>
					</div>
					<div className="flex items-start gap-3 rounded-2xl bg-primary-foreground text-primary px-4 py-3">
						<CheckCircle2 className="mt-0.5 min-h-4 min-w-4 w-4 h-4" />
						<p className="font-bold">Depois da aprovação, mostramos o resultado da compra na mesma tela.</p>
					</div>
				</div>
			</div>

			<Button onClick={onSubmit} size="lg" className="h-14 w-full rounded-2xl text-sm font-black uppercase tracking-[0.2em]">
				Enviar para aprovação
			</Button>
		</div>
	);
}
