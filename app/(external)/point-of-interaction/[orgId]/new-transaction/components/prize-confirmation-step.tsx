"use client";

import { formatCashbackValue, formatToMoney } from "@/lib/formatting";
import type { TCashbackProgramTerminologyEnum } from "@/schemas/enums";
import { OperatorConfirmationInput } from "../../_shared/components/operator-confirmation-input";
import { SaleValueConfirmationInput } from "../../_shared/components/sale-value-confirmation-input";
import type { TPrize } from "../../_shared/types";
import { ArrowRight, Gift } from "lucide-react";
import Image from "next/image";

type PrizeConfirmationStepProps = {
	clientName: string;
	selectedPrize: TPrize | null;
	availableBalance: number;
	terminology: TCashbackProgramTerminologyEnum;
	operatorIdentifier: string;
	onOperatorIdentifierChange: (identifier: string) => void;
	requiresSaleValueConfirmation: boolean;
	operatorConfirmedSaleValue: number | null;
	onOperatorConfirmedSaleValueChange: (value: number | null) => void;
	onSubmit: () => void;
};

export function PrizeConfirmationStep({
	clientName,
	selectedPrize,
	availableBalance,
	terminology,
	operatorIdentifier,
	onOperatorIdentifierChange,
	requiresSaleValueConfirmation,
	operatorConfirmedSaleValue,
	onOperatorConfirmedSaleValueChange,
	onSubmit,
}: PrizeConfirmationStepProps) {
	const balanceAfter = selectedPrize ? availableBalance - selectedPrize.valor : availableBalance;
	const commercialValue = selectedPrize?.valorVenda ?? 0;
	const finalValue = Math.max(0, commercialValue - (selectedPrize?.valor ?? 0));
	return (
		<form
			className="space-y-8 short:space-y-2 animate-in fade-in slide-in-from-bottom-4"
			onSubmit={(e) => {
				e.preventDefault();
				onSubmit();
			}}
		>
			<div className="text-center space-y-2 short:space-y-0.5">
				<h2 className="text-xl short:text-lg font-extrabold tracking-tight">Confirmar resgate</h2>
				<p className="text-muted-foreground short:text-xs">Confira os dados e digite a senha do operador.</p>
			</div>

			{/* Prize compact card */}
			{selectedPrize && (
				<div className="bg-amber-50 border border-amber-200 rounded-2xl short:rounded-xl p-4 short:p-2 flex items-center gap-4 short:gap-2">
					<div className="relative w-16 h-16 short:w-10 short:h-10 min-w-16 short:min-w-10 rounded-xl short:rounded-lg overflow-hidden">
						{selectedPrize.imagemCapaUrl ? (
							<Image src={selectedPrize.imagemCapaUrl} alt={selectedPrize.titulo} fill className="object-cover" />
						) : (
							<div className="flex h-full w-full items-center justify-center bg-amber-200 text-amber-700">
								<Gift className="w-6 h-6 short:w-4 short:h-4" />
							</div>
						)}
					</div>
					<div className="flex-1 min-w-0">
						<h3 className="font-bold text-sm short:text-xs tracking-tight truncate">{selectedPrize.titulo}</h3>
						<p className="font-black text-lg short:text-base text-amber-700">{formatCashbackValue(selectedPrize.valor, terminology)}</p>
						<p className="text-xs short:text-[0.65rem] text-muted-foreground">Valor comercial: {formatToMoney(selectedPrize.valorVenda)}</p>
					</div>
				</div>
			)}

			<div className="bg-brand/5 rounded-3xl short:rounded-xl p-6 short:p-2.5 space-y-3 short:space-y-1.5 border border-brand/20">
				<div className="flex justify-between">
					<span className="text-muted-foreground font-bold text-xs short:text-[0.7rem] uppercase">Cliente</span>
					<span className="font-black text-brand short:text-xs">{clientName}</span>
				</div>
				<div className="flex justify-between items-center">
					<span className="text-muted-foreground font-bold text-xs short:text-[0.7rem] uppercase">Saldo</span>
					<div className="flex items-center gap-2 short:gap-1">
						<span className="font-bold text-sm short:text-xs text-muted-foreground">{formatCashbackValue(availableBalance, terminology)}</span>
						<ArrowRight className="w-3 h-3 text-muted-foreground" />
						<span className="font-black text-sm short:text-xs text-brand">{formatCashbackValue(Math.max(0, balanceAfter), terminology)}</span>
					</div>
				</div>
				<div className="flex justify-between">
					<span className="text-muted-foreground font-bold text-xs short:text-[0.7rem] uppercase">Valor do produto</span>
					<span className="font-black short:text-xs">{formatToMoney(commercialValue)}</span>
				</div>
				<div className="flex justify-between">
					<span className="text-muted-foreground font-bold text-xs short:text-[0.7rem] uppercase">Valor final</span>
					<span className="font-black text-brand short:text-xs">{formatToMoney(finalValue)}</span>
				</div>
			</div>

			{requiresSaleValueConfirmation ? (
				<SaleValueConfirmationInput value={operatorConfirmedSaleValue} onChange={onOperatorConfirmedSaleValueChange} useVirtualKeyboard />
			) : null}
			<OperatorConfirmationInput value={operatorIdentifier} onChange={onOperatorIdentifierChange} useVirtualKeyboard />
		</form>
	);
}
