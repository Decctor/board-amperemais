import {
	CheckoutPaymentSplitSchema,
	type TCheckoutPaymentSplit,
	getDefaultCheckoutPaymentSplit,
	isCheckoutPaymentSplitValid,
} from "@/lib/payments/schemas";
import type { TDeliveryModeEnum } from "@/schemas/enums";
import { useCallback, useMemo, useState } from "react";
import z from "zod";

export const CheckoutStateSchema = z.object({
	step: z.number().min(1).max(4).default(1),
	vendedorId: z.string({ invalid_type_error: "Tipo não válido para ID do vendedor." }).optional().nullable(),
	vendedorNome: z.string({ invalid_type_error: "Tipo não válido para nome do vendedor." }).optional().nullable(),
	descontoGeral: z.number({ invalid_type_error: "Tipo não válido para desconto geral." }).default(0),
	acrescimoGeral: z.number({ invalid_type_error: "Tipo não válido para acréscimo geral." }).default(0),
	observacoes: z.string({ invalid_type_error: "Tipo não válido para observações." }).default(""),
	entregaModalidade: z.enum(["PRESENCIAL", "RETIRADA", "ENTREGA", "COMANDA"], {
		invalid_type_error: "Tipo não válido para modalidade de entrega.",
	}).default("PRESENCIAL"),
	entregaLocalizacaoId: z.string({ invalid_type_error: "Tipo não válido para ID da localização." }).optional().nullable(),
	comandaNumero: z.string({ invalid_type_error: "Tipo não válido para número da comanda." }).optional().nullable(),
	pagamentos: z.array(CheckoutPaymentSplitSchema).default([]),
	cashbackResgate: z.number({ invalid_type_error: "Tipo não válido para resgate de cashback." }).default(0),
	cashbackProgramaId: z.string({ invalid_type_error: "Tipo não válido para ID do programa de cashback." }).optional().nullable(),
});

export type TCheckoutState = z.infer<typeof CheckoutStateSchema>;

type UseCheckoutStateProps = {
	initialState?: Partial<TCheckoutState>;
	valorTotal: number;
	clienteId?: string | null;
};

export const useCheckoutState = ({ initialState, valorTotal, clienteId }: UseCheckoutStateProps) => {
	const [state, setState] = useState<TCheckoutState>({
		step: initialState?.step ?? 1,
		vendedorId: initialState?.vendedorId ?? null,
		vendedorNome: initialState?.vendedorNome ?? null,
		descontoGeral: initialState?.descontoGeral ?? 0,
		acrescimoGeral: initialState?.acrescimoGeral ?? 0,
		observacoes: initialState?.observacoes ?? "",
		entregaModalidade: initialState?.entregaModalidade ?? "PRESENCIAL",
		entregaLocalizacaoId: initialState?.entregaLocalizacaoId ?? null,
		comandaNumero: initialState?.comandaNumero ?? null,
		pagamentos: initialState?.pagamentos ?? [],
		cashbackResgate: initialState?.cashbackResgate ?? 0,
		cashbackProgramaId: initialState?.cashbackProgramaId ?? null,
	});

	const goToStep = useCallback((step: number) => {
		setState((prev) => ({ ...prev, step: Math.max(1, Math.min(4, step)) }));
	}, []);

	const nextStep = useCallback(() => {
		setState((prev) => ({ ...prev, step: Math.min(4, prev.step + 1) }));
	}, []);

	const prevStep = useCallback(() => {
		setState((prev) => ({ ...prev, step: Math.max(1, prev.step - 1) }));
	}, []);

	const setVendedor = useCallback((vendedorId: string | null, vendedorNome: string | null) => {
		setState((prev) => ({ ...prev, vendedorId, vendedorNome }));
	}, []);

	const setDescontoGeral = useCallback((descontoGeral: number) => {
		setState((prev) => ({ ...prev, descontoGeral }));
	}, []);

	const setAcrescimoGeral = useCallback((acrescimoGeral: number) => {
		setState((prev) => ({ ...prev, acrescimoGeral }));
	}, []);

	const setObservacoes = useCallback((observacoes: string) => {
		setState((prev) => ({ ...prev, observacoes }));
	}, []);

	const setEntregaModalidade = useCallback((entregaModalidade: TDeliveryModeEnum) => {
		setState((prev) => ({
			...prev,
			entregaModalidade,
			entregaLocalizacaoId: entregaModalidade === "ENTREGA" ? prev.entregaLocalizacaoId : null,
			comandaNumero: entregaModalidade === "COMANDA" ? prev.comandaNumero : null,
		}));
	}, []);

	const setEntregaLocalizacaoId = useCallback((entregaLocalizacaoId: string | null) => {
		setState((prev) => ({ ...prev, entregaLocalizacaoId }));
	}, []);

	const setComandaNumero = useCallback((comandaNumero: string | null) => {
		setState((prev) => ({ ...prev, comandaNumero }));
	}, []);

	const addPagamento = useCallback((pagamento: Partial<Omit<TCheckoutPaymentSplit, "id">>) => {
		setState((prev) => ({
			...prev,
			pagamentos: [...prev.pagamentos, getDefaultCheckoutPaymentSplit(pagamento)],
		}));
	}, []);

	const removePagamento = useCallback((id: string) => {
		setState((prev) => ({
			...prev,
			pagamentos: prev.pagamentos.filter((p) => p.id !== id),
		}));
	}, []);

	const updatePagamento = useCallback((id: string, updates: Partial<Omit<TCheckoutPaymentSplit, "id">>) => {
		setState((prev) => ({
			...prev,
			pagamentos: prev.pagamentos.map((p) => (p.id === id ? { ...p, ...updates } : p)),
		}));
	}, []);

	const setCashbackResgate = useCallback((cashbackResgate: number) => {
		setState((prev) => ({ ...prev, cashbackResgate }));
	}, []);

	const setCashbackProgramaId = useCallback((cashbackProgramaId: string | null) => {
		setState((prev) => ({ ...prev, cashbackProgramaId }));
	}, []);

	const computedValues = useMemo(() => {
		const totalPagamentos = state.pagamentos.reduce((sum, p) => sum + p.valor, 0) + state.cashbackResgate;
		const valorFinal = valorTotal - state.descontoGeral + state.acrescimoGeral;
		const valorRestante = valorFinal - totalPagamentos;
		const troco = totalPagamentos > valorFinal ? totalPagamentos - valorFinal : 0;
		const pagamentoCompleto = valorRestante <= 0.01;

		return {
			valorFinal,
			totalPagamentos,
			valorRestante,
			troco,
			pagamentoCompleto,
		};
	}, [valorTotal, state.descontoGeral, state.acrescimoGeral, state.pagamentos, state.cashbackResgate]);

	const canProceedFromStep = useCallback(
		(step: number): boolean => {
			switch (step) {
				case 1:
					return true;
				case 2:
					if (state.entregaModalidade === "ENTREGA" && !state.entregaLocalizacaoId) return false;
					if (state.entregaModalidade === "COMANDA" && !state.comandaNumero) return false;
					return true;
				case 3:
					if (!computedValues.pagamentoCompleto) return false;
					if (state.pagamentos.length === 0 && state.cashbackResgate <= 0) return false;
					return state.pagamentos.every((payment) =>
						isCheckoutPaymentSplitValid(payment, {
							hasLinkedClient: !!clienteId,
							entregaModalidade: state.entregaModalidade,
						}),
					);
				default:
					return true;
			}
		},
		[clienteId, computedValues.pagamentoCompleto, state.entregaModalidade, state.entregaLocalizacaoId, state.comandaNumero, state.pagamentos, state.cashbackResgate],
	);

	const resetState = useCallback((newState: TCheckoutState) => {
		setState(newState);
	}, []);

	return {
		state,
		goToStep,
		nextStep,
		prevStep,
		setVendedor,
		setDescontoGeral,
		setAcrescimoGeral,
		setObservacoes,
		setEntregaModalidade,
		setEntregaLocalizacaoId,
		setComandaNumero,
		addPagamento,
		removePagamento,
		updatePagamento,
		setCashbackResgate,
		setCashbackProgramaId,
		...computedValues,
		canProceedFromStep,
		resetState,
	};
};

export type TUseCheckoutState = ReturnType<typeof useCheckoutState>;
