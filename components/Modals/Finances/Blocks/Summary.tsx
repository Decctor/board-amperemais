"use client";

import type { TGetFinancialTransactionsOutputById } from "@/app/api/finances/financial-transactions/route";
import ResponsiveMenuSection from "@/components/Utils/ResponsiveMenuSection";
import { formatDateAsLocale, formatToMoney } from "@/lib/formatting";
import { cn } from "@/lib/utils";
import { FinancialTransactionTypeOptions, SalePaymentMethodsOptions } from "@/utils/select-options";
import { AlertCircle, CheckCircle2, Clock, Receipt } from "lucide-react";
import { useMemo } from "react";
import DetailField from "./DetailField";

type FinancialTransactionSummaryBlockProps = {
	transaction: TGetFinancialTransactionsOutputById;
};

export default function FinancialTransactionSummaryBlock({ transaction }: FinancialTransactionSummaryBlockProps) {
	const typeConfig = useMemo(() => FinancialTransactionTypeOptions.find((o) => o.value === transaction.tipo) ?? null, [transaction.tipo]);
	const paymentMethodConfig = useMemo(() => SalePaymentMethodsOptions.find((o) => o.value === transaction.metodo) ?? null, [transaction.metodo]);

	const now = new Date();
	const isEffective = !!transaction.dataEfetivacao;
	const isOverdue = !isEffective && transaction.dataPrevisao && new Date(transaction.dataPrevisao) < now;

	const statusConfig = useMemo(() => {
		return {
			label: isEffective ? "EFETIVADA" : isOverdue ? "EM ATRASO" : "PENDENTE",
			className: isEffective ? "bg-green-100 text-green-700" : isOverdue ? "bg-red-100 text-red-700" : "bg-blue-100 text-blue-700",
			icon: isEffective ? <CheckCircle2 className="h-3 w-3" /> : isOverdue ? <AlertCircle className="h-3 w-3" /> : <Clock className="h-3 w-3" />,
		};
	}, [isEffective, isOverdue]);

	return (
		<ResponsiveMenuSection title="RESUMO" icon={<Receipt className="h-4 w-4 min-h-4 min-w-4" />}>
			<div className="border-border bg-muted/30 flex w-full min-w-0 flex-col gap-3 rounded-xl border px-4 py-3">
				<div className="flex w-full min-w-0 flex-col gap-2">
					{typeConfig ? (
						<span className={cn("flex w-fit items-center gap-1.5 rounded-xl px-3 py-1 text-[0.65rem] font-bold", typeConfig.colors.background, typeConfig.colors.text)}>
							{typeConfig.icon}
							{typeConfig.label}
						</span>
					) : null}
					<h2 className="text-sm font-extrabold tracking-tight break-words">{transaction.titulo || "Título não definido"}</h2>
					<p className="text-lg font-extrabold tracking-tight tabular-nums">{formatToMoney(transaction.valor)}</p>
				</div>

				{statusConfig ? (
					<span className={cn("flex w-fit items-center gap-1.5 rounded-xl px-3 py-1 text-[0.65rem] font-bold", statusConfig.className)}>
						{statusConfig.icon}
						{statusConfig.label}
					</span>
				) : null}
			</div>

			<div className="flex w-full min-w-0 flex-col">
				{transaction.dataPrevisao ? <DetailField label="Previsão" value={formatDateAsLocale(transaction.dataPrevisao)} /> : null}
				{transaction.dataEfetivacao ? <DetailField label="Efetivação" value={formatDateAsLocale(transaction.dataEfetivacao)} /> : null}
				{paymentMethodConfig ? (
					<DetailField label="Método">
						<span className="flex items-center gap-1.5 text-sm font-medium">
							{paymentMethodConfig.icon}
							{paymentMethodConfig.label}
						</span>
					</DetailField>
				) : null}
				{transaction.totalParcelas && transaction.totalParcelas > 1 ? (
					<DetailField label="Parcela" value={`${transaction.parcela ?? 1} de ${transaction.totalParcelas}`} />
				) : null}
			</div>
		</ResponsiveMenuSection>
	);
}
