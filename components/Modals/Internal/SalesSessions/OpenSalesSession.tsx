import NumberInput from "@/components/Inputs/NumberInput";
import SelectInput from "@/components/Inputs/SelectInput";
import TextareaInput from "@/components/Inputs/TextareaInput";
import ResponsiveMenu from "@/components/Utils/ResponsiveMenu";
import { getErrorMessage } from "@/lib/errors";
import { openSalesSession } from "@/lib/mutations/sales-sessions";
import { useFinancesAccounts } from "@/lib/queries/finances";
import { useSellersSimplified } from "@/lib/queries/sellers";
import { useInternalSalesSessionState } from "@/state-hooks/use-internal-sales-session-state";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

type OpenSalesSessionProps = {
	closeModal: () => void;
	exigirFundoTroco?: boolean;
	initialResponsavelVendedorId?: string | null;
	callbacks?: {
		onMutate?: () => void;
		onSuccess?: () => void;
		onError?: () => void;
		onSettled?: () => void;
	};
};

export default function OpenSalesSession({ closeModal, exigirFundoTroco, initialResponsavelVendedorId, callbacks }: OpenSalesSessionProps) {
	const queryClient = useQueryClient();
	const { state, updateOpenInput } = useInternalSalesSessionState({
		initialState: initialResponsavelVendedorId ? { responsavelVendedorId: initialResponsavelVendedorId } : undefined,
	});

	const { data: sellers } = useSellersSimplified();
	const { data: accountsData } = useFinancesAccounts({ initialFilters: { stats: false } });

	const sellerOptions = (sellers ?? []).map((seller) => ({ id: seller.id, value: seller.id, label: seller.nome }));
	const accountOptions = (accountsData?.accounts ?? [])
		.filter((account) => account.tipo === "CAIXA")
		.map((account) => ({ id: account.id, value: account.id, label: account.nome }));

	const { mutate, isPending } = useMutation({
		mutationKey: ["open-sales-session"],
		mutationFn: openSalesSession,
		onMutate: () => callbacks?.onMutate?.(),
		onSuccess: (data) => {
			queryClient.invalidateQueries({ queryKey: ["sales-sessions"] });
			queryClient.invalidateQueries({ queryKey: ["active-sales-session"] });
			callbacks?.onSuccess?.();
			toast.success(data.message);
			closeModal();
		},
		onError: (error) => {
			callbacks?.onError?.();
			toast.error(getErrorMessage(error));
		},
		onSettled: () => callbacks?.onSettled?.(),
	});

	function handleSubmit() {
		if (!state.openInput.responsavelVendedorId) return toast.error("Selecione o vendedor responsavel pela sessao.");
		if (exigirFundoTroco && state.openInput.saldoInicial <= 0) return toast.error("Informe o fundo de troco para abrir o caixa.");
		mutate(state.openInput);
	}

	return (
		<ResponsiveMenu
			menuTitle="ABRIR CAIXA"
			menuDescription="Abra uma sessao de venda informando o responsavel e o fundo de troco."
			menuActionButtonText="ABRIR CAIXA"
			menuCancelButtonText="CANCELAR"
			actionFunction={handleSubmit}
			actionIsLoading={isPending}
			stateIsLoading={false}
			stateError={null}
			closeMenu={closeModal}
			dialogVariant="sm"
		>
			<div className="flex w-full flex-col gap-3">
				<SelectInput
					label="RESPONSAVEL"
					value={state.openInput.responsavelVendedorId || null}
					options={sellerOptions}
					handleChange={(value) => updateOpenInput({ responsavelVendedorId: value })}
					resetOptionLabel="Selecione o responsavel"
					onReset={() => updateOpenInput({ responsavelVendedorId: "" })}
					required
				/>
				<SelectInput
					label="CONTA CAIXA"
					value={state.openInput.contaFinanceiraId ?? null}
					options={accountOptions}
					handleChange={(value) => updateOpenInput({ contaFinanceiraId: value })}
					resetOptionLabel="Nenhuma"
					onReset={() => updateOpenInput({ contaFinanceiraId: null })}
				/>
				<NumberInput
					label={exigirFundoTroco ? "FUNDO DE TROCO (OBRIGATORIO)" : "FUNDO DE TROCO"}
					value={state.openInput.saldoInicial}
					handleChange={(value) => updateOpenInput({ saldoInicial: value })}
					placeholder="0,00"
				/>
				<TextareaInput
					label="OBSERVACOES"
					value={state.openInput.observacoesAbertura ?? ""}
					handleChange={(value) => updateOpenInput({ observacoesAbertura: value || null })}
					placeholder="Observacoes da abertura (opcional)..."
				/>
			</div>
		</ResponsiveMenu>
	);
}
