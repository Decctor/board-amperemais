"use client";

import type { TCreateAccountingEntryInput, TUpdateAccountingEntryInput } from "@/app/api/finances/accounting-entries/route";
import { useCallback, useState } from "react";

type TAccountingEntryState = TUpdateAccountingEntryInput;
export type TAccountingEntryFinancialTransactionState = TAccountingEntryState["entryFinancialTransactions"][number];

type UseInternalAccountingEntryStateParams = {
	initialState?: Partial<TAccountingEntryState>;
};

function getDefaultState(): TAccountingEntryState {
	return {
		entryId: "",
		entry: {
			titulo: "",
			anotacoes: "",
			idContaDebito: "",
			idContaCredito: "",
			valor: 0,
			valorPrevisto: null,
			dataCompetencia: new Date(),
		},
		entryFinancialTransactions: [],
	};
}

export function getDefaultAccountingEntryTransactionState(
	patch?: Partial<TAccountingEntryFinancialTransactionState>,
): TAccountingEntryFinancialTransactionState {
	return {
		contaFinanceiraId: null,
		titulo: "",
		tipo: "ENTRADA",
		valor: 0,
		metodo: "A_DEFINIR",
		dataPrevisao: new Date(),
		dataEfetivacao: null,
		parcela: null,
		totalParcelas: null,
		...patch,
	};
}

export function useInternalAccountingEntryState({ initialState }: UseInternalAccountingEntryStateParams = {}) {
	const defaultState = getDefaultState();
	const [state, setState] = useState<TAccountingEntryState>({
		entryId: initialState?.entryId ?? defaultState.entryId,
		entry: {
			...defaultState.entry,
			...initialState?.entry,
		},
		entryFinancialTransactions: initialState?.entryFinancialTransactions ?? defaultState.entryFinancialTransactions,
	});

	const updateEntry = useCallback((patch: Partial<TAccountingEntryState["entry"]>) => {
		setState((prev) => ({
			...prev,
			entry: {
				...prev.entry,
				...patch,
			},
		}));
	}, []);

	const addFinancialTransaction = useCallback((transaction?: Partial<TAccountingEntryFinancialTransactionState>) => {
		setState((prev) => ({
			...prev,
			entryFinancialTransactions: [...prev.entryFinancialTransactions, getDefaultAccountingEntryTransactionState(transaction)],
		}));
	}, []);

	const updateFinancialTransaction = useCallback(
		({ index, changes }: { index: number; changes: Partial<TAccountingEntryFinancialTransactionState> }) => {
			setState((prev) => ({
				...prev,
				entryFinancialTransactions: prev.entryFinancialTransactions.map((transaction, transactionIndex) =>
					transactionIndex === index ? { ...transaction, ...changes } : transaction,
				),
			}));
		},
		[],
	);

	const removeFinancialTransaction = useCallback((index: number) => {
		setState((prev) => {
			const target = prev.entryFinancialTransactions[index];
			if (!target) return prev;
			if (!target.id) {
				return {
					...prev,
					entryFinancialTransactions: prev.entryFinancialTransactions.filter((_, transactionIndex) => transactionIndex !== index),
				};
			}
			return {
				...prev,
				entryFinancialTransactions: prev.entryFinancialTransactions.map((transaction, transactionIndex) =>
					transactionIndex === index ? { ...transaction, deletar: true } : transaction,
				),
			};
		});
	}, []);

	const redefineFinancialTransactions = useCallback((nextTransactions: TAccountingEntryState["entryFinancialTransactions"]) => {
		setState((prev) => ({
			...prev,
			entryFinancialTransactions: nextTransactions,
		}));
	}, []);

	const redefineState = useCallback((nextState: Partial<TAccountingEntryState>) => {
		setState((prev) => ({
			...prev,
			...nextState,
			entry: {
				...prev.entry,
				...nextState.entry,
			},
			entryFinancialTransactions: nextState.entryFinancialTransactions ?? prev.entryFinancialTransactions,
		}));
	}, []);

	const resetState = useCallback(() => {
		setState(getDefaultState());
	}, []);

	function getCreatePayload(): TCreateAccountingEntryInput {
		return {
			entry: state.entry,
			entryFinancialTransactions: state.entryFinancialTransactions.filter((transaction) => !transaction.deletar),
		};
	}

	return {
		state,
		updateEntry,
		addFinancialTransaction,
		updateFinancialTransaction,
		removeFinancialTransaction,
		redefineFinancialTransactions,
		redefineState,
		resetState,
		getCreatePayload,
	};
}

export type TUseInternalAccountingEntryState = ReturnType<typeof useInternalAccountingEntryState>;
