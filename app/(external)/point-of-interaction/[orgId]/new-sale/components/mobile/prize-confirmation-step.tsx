"use client";

import { Button } from "@/components/ui/button";
import { formatToMoney } from "@/lib/formatting";
import type { TPrize } from "../../../_shared/types";
import { Gift, ShieldCheck } from "lucide-react";
import Image from "next/image";

type MobilePrizeConfirmationStepProps = {
	clientName: string;
	selectedPrize: TPrize | null;
	availableBalance: number;
	onSubmit: () => void;
};

export function MobilePrizeConfirmationStep({ clientName, selectedPrize, availableBalance, onSubmit }: MobilePrizeConfirmationStepProps) {
	return (
		<div className="space-y-5 animate-in fade-in slide-in-from-bottom-4">
			<div className="space-y-2 text-center">
				<p className="text-xs font-bold uppercase tracking-[0.25em] text-brand/70">Aprovação do operador</p>
				<h2 className="text-2xl font-black tracking-tight">Confira o resgate antes de enviar</h2>
				<p className="text-sm text-muted-foreground">O operador confirma este resgate direto no painel da loja.</p>
			</div>

			{selectedPrize ? (
				<div className="flex items-center gap-4 rounded-3xl border border-amber-200 bg-amber-50 p-4">
					<div className="relative h-16 w-16 overflow-hidden rounded-2xl bg-amber-100">
						{selectedPrize.imagemCapaUrl ? (
							<Image src={selectedPrize.imagemCapaUrl} alt={selectedPrize.titulo} fill className="object-cover" />
						) : (
							<div className="flex h-full w-full items-center justify-center text-amber-700">
								<Gift className="h-6 w-6" />
							</div>
						)}
					</div>
					<div className="min-w-0 flex-1">
						<p className="truncate text-base font-black uppercase tracking-tight">{selectedPrize.titulo}</p>
						<p className="text-lg font-black text-amber-700">{formatToMoney(selectedPrize.valor)}</p>
					</div>
				</div>
			) : null}

			<div className="rounded-3xl border border-brand/15 bg-card p-5 shadow-sm space-y-4">
				<div className="flex items-center justify-between gap-3 rounded-2xl bg-brand/5 px-4 py-3">
					<span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Cliente</span>
					<span className="text-sm font-black text-brand text-right">{clientName}</span>
				</div>
				<div className="flex items-center justify-between gap-3 rounded-2xl bg-brand/5 px-4 py-3">
					<span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Saldo atual</span>
					<span className="text-sm font-black">{formatToMoney(availableBalance)}</span>
				</div>
				<div className="flex items-start gap-3 rounded-2xl bg-slate-50 px-4 py-3 text-sm">
					<ShieldCheck className="mt-0.5 h-4 w-4 text-brand" />
					<p>Assim que o operador aprovar, o resgate aparece concluído nesta tela.</p>
				</div>
			</div>

			<Button onClick={onSubmit} size="lg" className="h-14 w-full rounded-2xl text-sm font-black uppercase tracking-[0.2em]">
				Enviar para aprovação
			</Button>
		</div>
	);
}
