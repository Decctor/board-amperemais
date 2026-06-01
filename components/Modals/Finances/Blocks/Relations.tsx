"use client";

import type { TGetFinancialTransactionsOutputById } from "@/app/api/finances/financial-transactions/route";
import ResponsiveMenuSection from "@/components/Utils/ResponsiveMenuSection";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { CHIP_XS_ICON_CLASS, Chip } from "@/components/ui/chip";
import { formatNameAsInitials, formatToMoney } from "@/lib/formatting";
import { cn } from "@/lib/utils";
import { FinancialAccountTypeOptions } from "@/utils/select-options";
import { BookOpen, Landmark } from "lucide-react";
import { useMemo } from "react";

type FinancialTransactionRelationsBlockProps = {
	transaction: TGetFinancialTransactionsOutputById;
};

export default function FinancialTransactionRelationsBlock({ transaction }: FinancialTransactionRelationsBlockProps) {
	const financialAccountTypeConfig = useMemo(
		() => FinancialAccountTypeOptions.find((o) => o.value === transaction.contaFinanceira?.tipo) ?? null,
		[transaction.contaFinanceira?.tipo],
	);

	const hasRelations = transaction.contaFinanceira || transaction.autor || transaction.lancamentoContabil;

	if (!hasRelations) {
		return (
			<ResponsiveMenuSection title="VÍNCULOS" icon={<BookOpen className="h-4 w-4 min-h-4 min-w-4" />}>
				<p className="text-muted-foreground text-sm">Nenhum vínculo cadastrado para esta movimentação.</p>
			</ResponsiveMenuSection>
		);
	}

	return (
		<ResponsiveMenuSection title="VÍNCULOS" icon={<BookOpen className="h-4 w-4 min-h-4 min-w-4" />}>
			<div className="flex w-full min-w-0 flex-col gap-2">
				{transaction.contaFinanceira ? (
					<div className="border-border bg-muted/30 flex w-full min-w-0 items-center gap-3 rounded-xl border px-3 py-3">
						<div className="flex items-center gap-2">
							<Landmark className="text-primary h-4 w-4 min-h-4 min-w-4 shrink-0" />
						</div>
						<div className="flex min-w-0 flex-1 flex-col gap-0.5">
							<span className="text-[0.65rem] font-bold tracking-wide text-muted-foreground uppercase">Conta financeira</span>
							<div className="flex items-center gap-1.5">
								<span className="text-sm font-semibold break-words">{transaction.contaFinanceira.nome}</span>

								{financialAccountTypeConfig ? (
									<Chip.Root size="xs" shape="xl" className={cn(financialAccountTypeConfig.colors.background, financialAccountTypeConfig.colors.text)}>
										<Chip.Icon>{financialAccountTypeConfig.renderIcon(CHIP_XS_ICON_CLASS)}</Chip.Icon>
										<Chip.Label weight="bold">{financialAccountTypeConfig.label}</Chip.Label>
									</Chip.Root>
								) : null}
							</div>
						</div>
					</div>
				) : null}

				{transaction.autor ? (
					<div className="border-border bg-muted/30 flex w-full min-w-0 items-center gap-3 rounded-xl border px-3 py-3">
						<Avatar className="h-9 w-9 shrink-0">
							<AvatarImage src={transaction.autor.avatarUrl || undefined} alt={transaction.autor.nome || "N/A"} />
							<AvatarFallback className="text-xs">{formatNameAsInitials(transaction.autor.nome || "N/A")}</AvatarFallback>
						</Avatar>
						<div className="flex min-w-0 flex-1 flex-col gap-0.5">
							<span className="text-[0.65rem] font-bold tracking-wide text-muted-foreground uppercase">Autor</span>
							<span className="text-sm font-semibold break-words">{transaction.autor.nome}</span>
						</div>
					</div>
				) : null}

				{transaction.lancamentoContabil ? (
					<div className="border-border bg-muted/30 flex w-full min-w-0 flex-col gap-2 rounded-xl border px-3 py-3">
						<span className="text-[0.65rem] font-bold tracking-wide text-muted-foreground uppercase">Lançamento contábil</span>
						<p className="text-sm font-semibold break-words">{transaction.lancamentoContabil.titulo}</p>
						<p className="text-base font-extrabold tabular-nums">{formatToMoney(transaction.lancamentoContabil.valor)}</p>
						{transaction.lancamentoContabil.valorPrevisto != null ? (
							<p className="text-muted-foreground text-[0.7rem] break-words">
								Valor previsto: <span className="font-semibold text-foreground">{formatToMoney(transaction.lancamentoContabil.valorPrevisto)}</span>
							</p>
						) : null}
						{transaction.lancamentoContabil.anotacoes ? (
							<p className="text-muted-foreground line-clamp-3 text-xs leading-relaxed break-words">{transaction.lancamentoContabil.anotacoes}</p>
						) : null}
					</div>
				) : null}
			</div>
		</ResponsiveMenuSection>
	);
}
