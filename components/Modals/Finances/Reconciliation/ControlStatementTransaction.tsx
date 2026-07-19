"use client";

import SelectInput from "@/components/Inputs/SelectInput";
import TextInput from "@/components/Inputs/TextInput";
import TextareaInput from "@/components/Inputs/TextareaInput";
import { LoadingButton } from "@/components/loading-button";
import { Input } from "@/components/ui/input";
import ResponsiveMenu from "@/components/Utils/ResponsiveMenu";
import ResponsiveMenuSection from "@/components/Utils/ResponsiveMenuSection";
import { getErrorMessage } from "@/lib/errors";
import { formatDateAsLocale, formatToMoney } from "@/lib/formatting";
import { createManualReconciliationMatch, syncReconciliation } from "@/lib/mutations/financial-reconciliation";
import { useAccountCharts, useFinancesTransactions } from "@/lib/queries/finances";
import { useStatementTransactionById } from "@/lib/queries/financial-reconciliation";
import { cn } from "@/lib/utils";
import { FinancialTransactionTypeOptions } from "@/utils/select-options";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowRightLeft, FileText, Link2, PlusCircle, Sparkles } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

type ControlStatementTransactionProps = {
	linhaId: string;
	closeModal: () => void;
	callbacks?: {
		onMutate?: () => void;
		onSuccess?: () => void;
		onError?: (error: Error) => void;
		onSettled?: () => void;
	};
};

export default function ControlStatementTransaction({ linhaId, closeModal, callbacks }: ControlStatementTransactionProps) {
	const queryClient = useQueryClient();
	const { data: line, isLoading, isError, error } = useStatementTransactionById({ linhaId });

	// Estado do formulário "criar lançamento" — hidratado a partir da linha (e da regra aprendida) quando os dados chegam.
	const [titulo, setTitulo] = useState("");
	const [anotacoes, setAnotacoes] = useState("");
	const [contaContabilDebitoId, setContaContabilDebitoId] = useState("");
	const [contaContabilCreditoId, setContaContabilCreditoId] = useState("");
	const [isHydrated, setIsHydrated] = useState(false);

	useEffect(() => {
		if (!line || isHydrated) return;
		setTitulo(line.descricao);
		if (line.regraSugerida) {
			setContaContabilDebitoId(line.regraSugerida.contaContabilDebitoId);
			setContaContabilCreditoId(line.regraSugerida.contaContabilCreditoId);
		}
		setIsHydrated(true);
	}, [line, isHydrated]);

	const { data: accountCharts } = useAccountCharts({ initialFilters: {} });
	const accountChartOptions = useMemo(
		() =>
			accountCharts?.map((chart) => ({
				id: chart.id,
				value: chart.id,
				label: `${chart.codigo ? `${chart.codigo} - ` : ""}${chart.nome}`,
			})) ?? [],
		[accountCharts],
	);

	const {
		data: transactionsData,
		isLoading: transactionsLoading,
		filters: transactionFilters,
		updateFilters: updateTransactionFilters,
	} = useFinancesTransactions({ initialFilters: { page: 1, search: "" } });
	const linkableTransactions = transactionsData?.transactions ?? [];

	const lineTypeConfig = useMemo(() => FinancialTransactionTypeOptions.find((option) => option.value === line?.tipo) ?? null, [line?.tipo]);
	const isPendente = line?.status === "PENDENTE";

	function invalidateReconciliationQueries() {
		void queryClient.invalidateQueries({ queryKey: ["reconciliation-statement-transactions"] });
		void queryClient.invalidateQueries({ queryKey: ["reconciliation-statement-transaction-by-id"] });
		void queryClient.invalidateQueries({ queryKey: ["reconciliation-statement-imports"] });
		void queryClient.invalidateQueries({ queryKey: ["finances-financial-transactions"] });
		void queryClient.invalidateQueries({ queryKey: ["finances-accounting-entries"] });
	}

	const {
		mutate: mutateLinkTransaction,
		isPending: isLinkPending,
		variables: linkVariables,
	} = useMutation({
		mutationKey: ["create-manual-reconciliation-match"],
		mutationFn: createManualReconciliationMatch,
		onMutate: () => callbacks?.onMutate?.(),
		onSuccess: (data) => {
			callbacks?.onSuccess?.();
			toast.success(data.message);
			invalidateReconciliationQueries();
			closeModal();
		},
		onError: (err) => {
			callbacks?.onError?.(err as Error);
			toast.error(getErrorMessage(err));
		},
		onSettled: () => callbacks?.onSettled?.(),
	});

	const { mutate: mutateCreateEntry, isPending: isCreateEntryPending } = useMutation({
		mutationKey: ["create-entry-from-statement-line"],
		mutationFn: syncReconciliation,
		onMutate: () => callbacks?.onMutate?.(),
		onSuccess: (data) => {
			if (data.data.lancamentosCriados === 0) {
				toast.error(data.data.erros[0] ?? "Não foi possível criar o lançamento a partir da linha do extrato.");
				return;
			}
			callbacks?.onSuccess?.();
			toast.success(data.message);
			invalidateReconciliationQueries();
			closeModal();
		},
		onError: (err) => {
			callbacks?.onError?.(err as Error);
			toast.error(getErrorMessage(err));
		},
		onSettled: () => callbacks?.onSettled?.(),
	});

	return (
		<ResponsiveMenu
			menuTitle="RESOLVER LINHA DO EXTRATO"
			menuDescription="Vincule a linha a uma transação financeira existente ou crie um novo lançamento a partir dela."
			menuActionButtonText="CRIAR LANÇAMENTO"
			menuCancelButtonText="CANCELAR"
			menuActionButtonDisabled={!isPendente || !contaContabilDebitoId || !contaContabilCreditoId || isLinkPending}
			actionFunction={() =>
				mutateCreateEntry({
					confirmarMatchIds: [],
					criarLancamentos: [
						{
							linhaId,
							titulo: titulo || null,
							anotacoes: anotacoes || null,
							contaContabilDebitoId,
							contaContabilCreditoId,
						},
					],
					ignorarLinhaIds: [],
				})
			}
			actionIsLoading={isCreateEntryPending}
			stateIsLoading={isLoading}
			stateError={isError ? getErrorMessage(error) : null}
			closeMenu={closeModal}
			lockClose={isCreateEntryPending || isLinkPending}
			dialogVariant="md"
			drawerVariant="lg"
		>
			{line ? (
				<>
					<div className="bg-muted/30 border-border flex w-full flex-col gap-1.5 rounded-md border px-3 py-2">
						<div className="flex w-full flex-col items-start justify-between gap-2 lg:flex-row lg:items-center">
							<div className="flex flex-wrap items-center gap-2">
								{lineTypeConfig ? (
									<span
										className={cn(
											"flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-[0.65rem]",
											lineTypeConfig.colors.background,
											lineTypeConfig.colors.text,
										)}
									>
										{lineTypeConfig.icon}
										{lineTypeConfig.label}
									</span>
								) : null}
								<p className="text-xs font-bold tracking-tight lg:text-sm">{line.descricao}</p>
							</div>
							<span className={cn("text-sm font-semibold", lineTypeConfig?.colors.text)}>
								{line.tipo === "SAIDA" ? "-" : "+"}
								{formatToMoney(line.valor)}
							</span>
						</div>
						<div className="flex flex-wrap items-center gap-3 text-[0.65rem] font-medium uppercase text-muted-foreground">
							<span>{formatDateAsLocale(line.dataTransacao)}</span>
							{line.contaFinanceira ? <span>CONTA: {line.contaFinanceira.nome}</span> : null}
							{line.importacao?.arquivoNome ? (
								<span className="flex items-center gap-1">
									<FileText className="h-3 w-3" />
									{line.importacao.arquivoNome}
								</span>
							) : null}
							<span>STATUS: {line.status}</span>
						</div>
					</div>

					{!isPendente ? (
						<p className="text-center text-xs italic text-muted-foreground">
							Esta linha não está mais pendente — não é possível vinculá-la ou criar lançamentos a partir dela.
						</p>
					) : (
						<>
							<ResponsiveMenuSection title="VINCULAR TRANSAÇÃO EXISTENTE" icon={<Link2 className="h-4 w-4" />}>
								<Input
									value={transactionFilters.search}
									placeholder="Pesquisar transação financeira..."
									onChange={(e) => updateTransactionFilters({ search: e.target.value, page: 1 })}
									className="w-full rounded-md"
								/>
								<div className="border-border flex max-h-64 w-full flex-col overflow-y-auto rounded-md border">
									{transactionsLoading ? (
										<p className="px-3 py-4 text-center text-xs text-muted-foreground">Buscando transações...</p>
									) : linkableTransactions.length === 0 ? (
										<p className="px-3 py-4 text-center text-xs text-muted-foreground">Nenhuma transação encontrada para a busca.</p>
									) : (
										linkableTransactions.map((transaction) => {
											const transactionTypeConfig = FinancialTransactionTypeOptions.find((option) => option.value === transaction.tipo) ?? null;
											return (
												<div key={transaction.id} className="border-border flex w-full items-center gap-2 border-t px-3 py-2 first:border-t-0">
													{transactionTypeConfig?.icon}
													<div className="flex min-w-0 flex-1 flex-col">
														<p className="truncate text-xs font-medium">{transaction.titulo || "TRANSAÇÃO SEM TÍTULO"}</p>
														<p className="text-[0.65rem] uppercase text-muted-foreground">
															{formatToMoney(transaction.valor)}
															{transaction.dataEfetivacao
																? ` · EFETIVADA: ${formatDateAsLocale(transaction.dataEfetivacao)}`
																: transaction.dataPrevisao
																	? ` · PREVISÃO: ${formatDateAsLocale(transaction.dataPrevisao)}`
																	: null}
															{transaction.contaFinanceira ? ` · ${transaction.contaFinanceira.nome}` : null}
														</p>
													</div>
													<LoadingButton
														type="button"
														size="sm"
														variant="outline"
														loading={isLinkPending && linkVariables?.transacaoFinanceiraId === transaction.id}
														disabled={isLinkPending || isCreateEntryPending}
														onClick={() => mutateLinkTransaction({ extratoTransacaoId: linhaId, transacaoFinanceiraId: transaction.id })}
														className="flex shrink-0 items-center gap-1.5"
													>
														<Link2 className="h-4 w-4" />
														VINCULAR
													</LoadingButton>
												</div>
											);
										})
									)}
								</div>
								<p className="text-[0.65rem] italic text-muted-foreground">
									Ao vincular uma transação pendente, ela será efetivada com a data da linha do extrato.
								</p>
							</ResponsiveMenuSection>

							<ResponsiveMenuSection
								title="CRIAR LANÇAMENTO"
								icon={<PlusCircle className="h-4 w-4" />}
								action={
									line.regraSugerida ? (
										<span className="flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[0.6rem] font-medium text-amber-700">
											<Sparkles className="h-3 w-3" />
											SUGERIDO POR REGRA APRENDIDA
										</span>
									) : undefined
								}
							>
								<TextInput
									label="TÍTULO DO LANÇAMENTO"
									value={titulo}
									placeholder="Preencha o título do lançamento..."
									handleChange={(value) => setTitulo(value)}
								/>
								<TextareaInput
									label="ANOTAÇÕES"
									value={anotacoes}
									placeholder="Preencha anotações sobre o lançamento (opcional)..."
									handleChange={(value) => setAnotacoes(value)}
								/>
								<div className="flex w-full flex-col gap-3 lg:flex-row">
									<div className="w-full lg:w-1/2">
										<SelectInput
											label="CONTA DE DÉBITO"
											value={contaContabilDebitoId}
											options={accountChartOptions}
											resetOptionLabel="NÃO DEFINIDA"
											onReset={() => setContaContabilDebitoId("")}
											handleChange={(value) => setContaContabilDebitoId(value)}
											required
										/>
									</div>
									<div className="w-full lg:w-1/2">
										<SelectInput
											label="CONTA DE CRÉDITO"
											value={contaContabilCreditoId}
											options={accountChartOptions}
											resetOptionLabel="NÃO DEFINIDA"
											onReset={() => setContaContabilCreditoId("")}
											handleChange={(value) => setContaContabilCreditoId(value)}
											required
										/>
									</div>
								</div>
								<p className="flex items-center gap-1.5 text-[0.65rem] italic text-muted-foreground">
									<ArrowRightLeft className="h-3 w-3" />O lançamento será criado com o valor e a data da linha do extrato, já conciliado com esta linha.
								</p>
							</ResponsiveMenuSection>
						</>
					)}
				</>
			) : null}
		</ResponsiveMenu>
	);
}
