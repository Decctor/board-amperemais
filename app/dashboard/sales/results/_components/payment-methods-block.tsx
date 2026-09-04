"use client";

import type { TSalesResults } from "@/lib/sales/results";
import { formatDecimalPlaces, formatToMoney } from "@/lib/formatting";
import { formatPaymentMethod } from "@/lib/payments/labels";
import { buildSalesHistoryHref, type TSalesHistoryUrlState } from "@/lib/sales/history-url-state";
import { Wallet } from "lucide-react";
import Link from "next/link";

type PaymentMethodsBlockProps = {
	porMetodo: TSalesResults["porMetodo"];
	faturamento: number;
	/** Recorte do relatório (período, vendedores, status) que cada linha carrega para o histórico. */
	historyFilters: Partial<TSalesHistoryUrlState>;
};

export function PaymentMethodsBlock({ porMetodo, faturamento, historyFilters }: PaymentMethodsBlockProps) {
	const { linhas, totalRecebido, cobertura } = porMetodo;
	const totalPendente = linhas.reduce((acc, linha) => acc + linha.valorPendente, 0);

	return (
		<section className="bg-card border-border flex w-full flex-col gap-3 rounded-xl border px-3 py-4 shadow-2xs">
			<div className="flex items-center justify-between gap-2">
				<div className="flex items-center gap-2">
					<div className="flex h-7 w-7 items-center justify-center rounded-full bg-green-200 p-1 text-green-600">
						<Wallet className="h-4 w-4 min-h-4 min-w-4" />
					</div>
					<h1 className="text-xs font-medium leading-none tracking-tight">RECEBIMENTOS POR MÉTODO</h1>
				</div>
				<span className="text-sm font-medium tabular-nums">{formatToMoney(totalRecebido)}</span>
			</div>

			{linhas.length === 0 ? (
				<span className="text-xs text-muted-foreground">Nenhum recebimento registrado para as vendas do período.</span>
			) : (
				<div className="flex flex-col gap-2">
					{linhas.map((linha) => (
						<Link
							key={linha.metodo}
							href={buildSalesHistoryHref({ ...historyFilters, paymentMethods: [linha.metodo] })}
							title="Ver as vendas deste método no histórico"
							className="flex flex-col gap-1 rounded-md -mx-1 px-1 py-0.5 transition-colors hover:bg-muted/60"
						>
							<div className="flex items-center justify-between gap-2 text-xs">
								<span className="font-semibold">{formatPaymentMethod(linha.metodo)}</span>
								<div className="flex items-center gap-3 tabular-nums">
									<span className="text-muted-foreground">
										{linha.qtdeVendas} {linha.qtdeVendas === 1 ? "venda" : "vendas"}
									</span>
									{linha.valorPendente > 0 ? <span className="text-amber-700 dark:text-amber-400">a receber {formatToMoney(linha.valorPendente)}</span> : null}
									{linha.valorTaxas > 0 ? <span className="text-muted-foreground">taxas {formatToMoney(linha.valorTaxas)}</span> : null}
									<span className="font-medium">{formatToMoney(linha.valor)}</span>
									<span className="w-12 text-right text-muted-foreground">{formatDecimalPlaces(linha.participacaoPercentual, 1, 1)}%</span>
								</div>
							</div>
							<div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
								<div className="h-full rounded-full bg-primary" style={{ width: `${Math.min(100, Math.max(0, linha.participacaoPercentual))}%` }} />
							</div>
						</Link>
					))}
				</div>
			)}

			<div className="flex flex-col gap-1 border-t border-border pt-2 text-[11px] text-muted-foreground">
				{totalPendente > 0 ? <span>{formatToMoney(totalPendente)} ainda a receber (parcelas, boletos e prazos), atribuídos à data da venda.</span> : null}
				{cobertura.vendasSemPagamento > 0 ? (
					<span>
						{cobertura.vendasSemPagamento} {cobertura.vendasSemPagamento === 1 ? "venda" : "vendas"} ({formatToMoney(cobertura.valorSemPagamento)}) sem
						registro de pagamento, por isso os recebimentos não fecham com o faturamento de {formatToMoney(faturamento)}.
					</span>
				) : null}
			</div>
		</section>
	);
}
