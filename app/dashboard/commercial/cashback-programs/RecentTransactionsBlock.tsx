"use client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { formatDateAsLocale, formatNameAsInitials, formatToMoney } from "@/lib/formatting";
import { useCashbackProgramTransactions } from "@/lib/queries/cashback-programs";
import { cn } from "@/lib/utils";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useState } from "react";

type RecentTransactionsBlockProps = {
	period?: { after: string; before: string };
};

export default function RecentTransactionsBlock({ period }: RecentTransactionsBlockProps) {
	const [page, setPage] = useState(1);
	const limit = 10;

	const { data, isLoading } = useCashbackProgramTransactions({
		period,
		page,
		limit,
	});

	const transactions = data?.transactions || [];
	const pagination = data?.pagination;

	const canGoPrevious = page > 1;
	const canGoNext = pagination ? page < pagination.totalPages : false;

	const getTransactionTypeBadge = (tipo: "ACÚMULO" | "RESGATE" | "EXPIRAÇÃO") => {
		switch (tipo) {
			case "ACÚMULO":
				return (
					<span className="inline-flex items-center rounded-md px-2 py-1 text-xs font-medium bg-green-100 text-green-700 border border-green-200">
						ACÚMULO
					</span>
				);
			case "RESGATE":
				return (
					<span className="inline-flex items-center rounded-md px-2 py-1 text-xs font-medium bg-blue-100 text-blue-700 border border-blue-200">
						RESGATE
					</span>
				);
			case "EXPIRAÇÃO":
				return (
					<span className="inline-flex items-center rounded-md px-2 py-1 text-xs font-medium bg-red-100 text-red-700 border border-red-200">
						EXPIRAÇÃO
					</span>
				);
		}
	};

	return (
		<div className="bg-card border-primary/20 flex w-full flex-col gap-3 rounded-xl border px-3 py-4 shadow-2xs h-full">
			<div className="flex items-center justify-between">
				<h1 className="text-xs font-medium tracking-tight uppercase">TRANSAÇÕES RECENTES</h1>
			</div>

			<div className="flex flex-col gap-2">
				{isLoading ? (
					<div className="text-sm text-muted-foreground text-center py-8">Carregando...</div>
				) : transactions.length === 0 ? (
					<div className="text-sm text-muted-foreground text-center py-8">Nenhuma transação encontrada</div>
				) : (
					transactions.map((transaction) => (
						<div key={transaction.id} className="flex items-center gap-3 p-3 rounded-lg border border-primary/10 hover:bg-primary/5 transition-colors">
							<Avatar className="h-10 w-10 min-h-10 min-w-10">
								<AvatarFallback className="font-bold text-primary">{formatNameAsInitials(transaction.cliente.nome)}</AvatarFallback>
							</Avatar>

							<div className="flex-1 flex flex-col gap-1">
								<div className="flex items-center gap-2">
									<span className="text-sm font-medium">{transaction.cliente.nome}</span>
									{getTransactionTypeBadge(transaction.tipo)}
								</div>
								<div className="flex items-center gap-2 text-xs text-muted-foreground">
									<span>{formatDateAsLocale(transaction.dataInsercao)}</span>
									{transaction.venda && <span>• Venda: {transaction.venda.id}</span>}
									{transaction.expiracaoData && <span>• Expira: {formatDateAsLocale(transaction.expiracaoData)}</span>}
								</div>
							</div>

							<div className={cn("text-sm font-bold", transaction.tipo === "RESGATE" ? "text-red-600" : "text-green-600")}>
								{transaction.tipo === "RESGATE" ? "-" : "+"} {formatToMoney(transaction.valor)}
							</div>
						</div>
					))
				)}
			</div>

			{pagination && pagination.totalPages > 1 && (
				<div className="flex items-center justify-between pt-2 border-t border-primary/10">
					<div className="text-xs text-muted-foreground">
						Página {pagination.page} de {pagination.totalPages} ({pagination.total} transações)
					</div>
					<div className="flex items-center gap-2">
						<Button variant="outline" size="sm" onClick={() => setPage((p) => p - 1)} disabled={!canGoPrevious}>
							<ChevronLeft className="h-4 w-4" />
						</Button>
						<Button variant="outline" size="sm" onClick={() => setPage((p) => p + 1)} disabled={!canGoNext}>
							<ChevronRight className="h-4 w-4" />
						</Button>
					</div>
				</div>
			)}
		</div>
	);
}
