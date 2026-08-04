"use client";

import type { TGetCreditCardInvoiceOutput } from "@/app/api/finances/credit-card-invoices/route";
import NewCreditCardPayment from "@/components/Modals/Finances/NewCreditCardPayment";
import ErrorComponent from "@/components/Layouts/ErrorComponent";
import LoadingComponent from "@/components/Layouts/LoadingComponent";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { Button } from "@/components/ui/button";
import { formatDateAsLocale, formatToMoney } from "@/lib/formatting";
import { useCreditCardInvoices, useFinancesAccounts } from "@/lib/queries/finances";
import { getErrorMessage } from "@/lib/errors";
import dayjs from "dayjs";
import { CreditCard, ReceiptText } from "lucide-react";
import { useMemo, useState } from "react";

export default function FinancesCreditCardInvoicesView({ canCreatePayments = false }: { canCreatePayments?: boolean }) {
	const [selectedInvoice, setSelectedInvoice] = useState<TGetCreditCardInvoiceOutput | null>(null);
	const { data: accountsData } = useFinancesAccounts({ initialFilters: { activeOnly: true, stats: false } });
	const cardAccounts = useMemo(() => (accountsData?.accounts ?? []).filter((account) => account.tipo === "CARTAO_CREDITO"), [accountsData?.accounts]);
	const period = useMemo(
		() => ({ periodAfter: dayjs().subtract(6, "month").startOf("month").toDate(), periodBefore: dayjs().add(12, "month").endOf("month").toDate() }),
		[],
	);
	const { data, isLoading, isError, error, isSuccess } = useCreditCardInvoices(period);
	const invoices = data?.default ?? [];
	const selectedCard = selectedInvoice ? cardAccounts.find((account) => account.id === selectedInvoice.contaFinanceiraId) : null;

	return (
		<div className="flex w-full flex-col gap-3">
			{isLoading ? <LoadingComponent /> : null}
			{isError ? <ErrorComponent msg={getErrorMessage(error)} /> : null}
			{isSuccess && invoices.length === 0 ? (
				<Empty>
					<EmptyHeader>
						<EmptyMedia variant="icon">
							<ReceiptText />
						</EmptyMedia>
						<EmptyTitle>Nenhuma fatura derivada encontrada</EmptyTitle>
						<EmptyDescription>As faturas são agrupadas a partir das transações previstas nos cartões de crédito.</EmptyDescription>
					</EmptyHeader>
				</Empty>
			) : null}
			{isSuccess && invoices.length > 0 ? (
				<div className="grid w-full gap-3 lg:grid-cols-2">
					{invoices.map((invoice) => (
						<InvoiceCard
							key={`${invoice.contaFinanceiraId}-${invoice.dataVencimento}`}
							invoice={invoice}
							canCreatePayments={canCreatePayments}
							onPay={() => setSelectedInvoice(invoice)}
						/>
					))}
				</div>
			) : null}
			{selectedInvoice && selectedCard ? (
				<NewCreditCardPayment
					invoice={selectedInvoice}
					cardAccount={selectedCard}
					accounts={accountsData?.accounts ?? []}
					closeMenu={() => setSelectedInvoice(null)}
				/>
			) : null}
		</div>
	);
}

function InvoiceCard({ invoice, canCreatePayments, onPay }: { invoice: TGetCreditCardInvoiceOutput; canCreatePayments: boolean; onPay: () => void }) {
	const canPay = canCreatePayments && invoice.saldoAberto > 0.02 && invoice.status !== "CREDORA";
	return (
		<div className="bg-card border-border flex flex-col gap-3 rounded-xl border px-4 py-4 shadow-2xs">
			<div className="flex items-start justify-between gap-3">
				<div className="flex items-center gap-2">
					<CreditCard className="h-4 w-4" />
					<div>
						<h2 className="text-sm font-semibold">{invoice.contaFinanceiraNome}</h2>
						<p className="text-xs text-muted-foreground">Vencimento: {formatDateAsLocale(new Date(`${invoice.dataVencimento}T12:00:00`))}</p>
					</div>
				</div>
				<span className="rounded-full bg-muted px-2 py-1 text-[0.65rem] font-semibold">{invoice.status.replaceAll("_", " ")}</span>
			</div>
			<div className="grid grid-cols-3 gap-2 text-xs">
				<div>
					<span className="text-muted-foreground">Faturado</span>
					<strong className="block">{formatToMoney(invoice.valorFaturado)}</strong>
				</div>
				<div>
					<span className="text-muted-foreground">Pago</span>
					<strong className="block">{formatToMoney(invoice.valorPago)}</strong>
				</div>
				<div>
					<span className="text-muted-foreground">Em aberto</span>
					<strong className="block">{formatToMoney(invoice.saldoAberto)}</strong>
				</div>
			</div>
			{canPay ? (
				<Button size="sm" onClick={onPay}>
					PAGAR FATURA
				</Button>
			) : null}
		</div>
	);
}
