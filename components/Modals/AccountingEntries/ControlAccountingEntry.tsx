"use client";

import AccountingEntryAccountsBlock from "@/components/Modals/AccountingEntries/Blocks/Accounts";
import AccountingEntryFinancialTransactionsBlock from "@/components/Modals/AccountingEntries/Blocks/FinancialTransactions";
import AccountingEntryGeneralBlock from "@/components/Modals/AccountingEntries/Blocks/General";
import AccountingEntryValuesBlock from "@/components/Modals/AccountingEntries/Blocks/Values";
import { AccountingEntryRecurrenceBlock } from "@/components/Modals/AccountingEntries/Blocks/Recurrence";
import ResponsiveMenu from "@/components/Utils/ResponsiveMenu";
import { getErrorMessage } from "@/lib/errors";
import { invalidateFinanceQueries } from "@/lib/finances/invalidate-finance-queries";
import { createFinancialRecurringRule, updateAccountingEntry, updateFinancialRecurringRule } from "@/lib/mutations/finances";
import { useAccountingEntryById } from "@/lib/queries/finances";
import { useInternalAccountingEntryState } from "@/state-hooks/use-internal-accounting-entry-state";
import { AccountingEntryOriginTypeOptions } from "@/utils/select-options";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Info } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { TFinancialRecurringRuleConfig } from "@/schemas/financial-recurring";
import { toast } from "sonner";

type ControlAccountingEntryProps = {
	entryId: string;
	closeModal: () => void;
	callbacks?: {
		onMutate?: () => void;
		onSuccess?: () => void;
		onError?: (error: Error) => void;
		onSettled?: () => void;
	};
};

export default function ControlAccountingEntry({ entryId, closeModal, callbacks }: ControlAccountingEntryProps) {
	const queryClient = useQueryClient();
	const { data: entryData, isLoading, isError, error, queryKey } = useAccountingEntryById(entryId);
	const {
		state,
		updateEntry,
		addFinancialTransaction,
		updateFinancialTransaction,
		removeFinancialTransaction,
		redefineFinancialTransactions,
		redefineState,
		resetState,
	} = useInternalAccountingEntryState({ initialState: { entryId } });
	const [recurrenceConfig, setRecurrenceConfig] = useState<TFinancialRecurringRuleConfig | null>(null);
	const hydratedEntryIdRef = useRef<string | null>(null);

	useEffect(() => {
		if (!entryData || hydratedEntryIdRef.current === entryData.id) return;
		hydratedEntryIdRef.current = entryData.id;
		redefineState({
			entryId: entryData.id,
			entry: {
				titulo: entryData.titulo,
				anotacoes: entryData.anotacoes,
				idContaDebito: entryData.idContaDebito,
				idContaCredito: entryData.idContaCredito,
				valor: entryData.valor,
				valorPrevisto: entryData.valorPrevisto,
				dataCompetencia: entryData.dataCompetencia,
			},
			entryFinancialTransactions: entryData.transacoesFinanceiras.map((transaction) => ({
				id: transaction.id,
				deletar: false,
				contaFinanceiraId: transaction.contaFinanceiraId,
				titulo: transaction.titulo,
				tipo: transaction.tipo,
				valor: transaction.valor,
				valorBase: transaction.valorBase,
				valorJuros: transaction.valorJuros,
				valorMulta: transaction.valorMulta,
				valorTaxas: transaction.valorTaxas,
				valorDesconto: transaction.valorDesconto,
				modificadoresMetadata: transaction.modificadoresMetadata,
				metodo: transaction.metodo,
				dataPrevisao: transaction.dataPrevisao,
				dataEfetivacao: transaction.dataEfetivacao,
				parcela: transaction.parcela,
				totalParcelas: transaction.totalParcelas,
			})),
		});
		const rule = entryData.recorrenciaRegra;
		setRecurrenceConfig(
			rule
				? {
						...rule.config,
						inicio: new Date(rule.config.inicio),
						fim: rule.config.fim ? new Date(rule.config.fim) : null,
					}
				: null,
		);
	}, [entryData, redefineState]);

	const { mutate, isPending } = useMutation({
		mutationKey: ["update-accounting-entry", entryId],
		mutationFn: async ({ entryPayload, config }: { entryPayload: typeof state; config: TFinancialRecurringRuleConfig | null }) => {
			const result = await updateAccountingEntry(entryPayload);
			const existingRuleId = entryData?.recorrenciaRegra?.id;
			if (config) {
				if (existingRuleId) await updateFinancialRecurringRule({ ruleId: existingRuleId, config, status: "ATIVA" });
				else await createFinancialRecurringRule({ accountingEntryId: entryId, config });
			} else if (existingRuleId) {
				await updateFinancialRecurringRule({ ruleId: existingRuleId, status: "ENCERRADA" });
			}
			return result;
		},
		onMutate: async () => {
			await queryClient.cancelQueries({ queryKey });
			callbacks?.onMutate?.();
		},
		onSuccess: (data) => {
			callbacks?.onSuccess?.();
			toast.success(data.message);
			resetState();
			setRecurrenceConfig(null);
			void invalidateFinanceQueries(queryClient, { accountingEntryId: entryId });
			void queryClient.invalidateQueries({ queryKey: ["finances-recurring-rules"] });
			closeModal();
		},
		onError: (mutationError) => {
			callbacks?.onError?.(mutationError as Error);
			toast.error(getErrorMessage(mutationError));
		},
		onSettled: () => callbacks?.onSettled?.(),
	});

	const originType = entryData?.origemTipo ?? "MANUAL";
	const originTypeConfig = AccountingEntryOriginTypeOptions.find((option) => option.value === originType);
	const canEditAccountingFields = originType === "MANUAL";
	const canEditTransactions = originType === "MANUAL" || originType === "VENDA" || originType === "COMPRA";
	const canEditAnnotations =
		originType === "MANUAL" || originType === "VENDA" || originType === "COMPRA" || originType === "ESTORNO" || originType === "PERDA_ESTOQUE";

	return (
		<ResponsiveMenu
			menuTitle="EDITAR LANÇAMENTO CONTÁBIL"
			menuDescription="Ajuste os dados do lançamento e suas transações financeiras vinculadas."
			menuActionButtonText="SALVAR LANÇAMENTO"
			menuCancelButtonText="CANCELAR"
			actionFunction={() => mutate({ entryPayload: state, config: recurrenceConfig })}
			actionIsLoading={isPending}
			stateIsLoading={isLoading}
			stateError={isError ? getErrorMessage(error) : null}
			closeMenu={closeModal}
			lockClose={isPending}
		>
			{entryData ? (
				<div className="flex flex-col gap-3 rounded-md border border-border bg-muted/40 px-3 py-3 text-sm">
					<div className="w-full flex  items-center justify-between gap-3">
						<div className="flex items-center gap-1.5">
							<Info className="h-4 w-4 text-muted-foreground" />
							<span className="font-medium">ORIGEM DO LANÇAMENTO:</span>
						</div>
						{originTypeConfig ? (
							<span className="inline-flex items-center gap-1 rounded-md bg-primary/10 px-2 py-1 text-xs font-semibold">
								{originTypeConfig.icon}
								{originTypeConfig.label}
							</span>
						) : (
							<span className="text-xs font-semibold">{originType}</span>
						)}
					</div>
					{originType === "VENDA" ? (
						<p className="text-xs text-muted-foreground">
							Este lançamento foi gerado por uma venda. Os dados contábeis principais são controlados pela venda; por aqui você pode ajustar anotações e
							transações financeiras.
						</p>
					) : null}
					{originType === "COMPRA" ? (
						<p className="text-xs text-muted-foreground">
							Este lançamento foi gerado por uma compra. Os dados contábeis principais são controlados pela compra; por aqui você pode ajustar anotações e
							transações financeiras.
						</p>
					) : null}
					{originType === "ESTORNO" ? (
						<p className="text-xs text-muted-foreground">
							Este lançamento registra um estorno. Os dados contábeis e financeiros ficam em modo leitura; apenas anotações podem ser ajustadas.
						</p>
					) : null}
					{originType === "PERDA_ESTOQUE" ? (
						<p className="text-xs text-muted-foreground">
							Este lançamento foi gerado pelo descarte de um lote de estoque. Os dados contábeis ficam em modo leitura; apenas anotações podem ser ajustadas.
						</p>
					) : null}
				</div>
			) : null}
			<AccountingEntryGeneralBlock
				entry={state.entry}
				updateEntry={updateEntry}
				titleEditable={canEditAccountingFields}
				competenceEditable={canEditAccountingFields}
				annotationsEditable={canEditAnnotations}
			/>
			<AccountingEntryAccountsBlock entry={state.entry} updateEntry={updateEntry} editable={canEditAccountingFields} />
			<AccountingEntryValuesBlock entry={state.entry} updateEntry={updateEntry} editable={canEditAccountingFields} />
			<AccountingEntryFinancialTransactionsBlock
				entryTotalValue={state.entry.valor}
				entryCompetenceDate={state.entry.dataCompetencia}
				entryFinancialTransactions={state.entryFinancialTransactions}
				addFinancialTransaction={addFinancialTransaction}
				updateFinancialTransaction={updateFinancialTransaction}
				removeFinancialTransaction={removeFinancialTransaction}
				redefineFinancialTransactions={redefineFinancialTransactions}
				editable={canEditTransactions}
			/>
			{originType === "MANUAL" ? (
				<AccountingEntryRecurrenceBlock config={recurrenceConfig} onChange={setRecurrenceConfig} editable={canEditAccountingFields} />
			) : null}
		</ResponsiveMenu>
	);
}
