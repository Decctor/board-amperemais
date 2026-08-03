import type { TGetSalesSessionsOutput } from "@/app/api/pos/sales-sessions/route";
import NumberInput from "@/components/Inputs/NumberInput";
import SelectInput from "@/components/Inputs/SelectInput";
import ResponsiveMenu from "@/components/Utils/ResponsiveMenu";
import { Button } from "@/components/ui/button";
import { getErrorMessage } from "@/lib/errors";
import { formatToMoney } from "@/lib/formatting";
import { closeTab } from "@/lib/mutations/tabs";
import { usePOSFinancialAccounts } from "@/lib/queries/pos";
import type { TPaymentMethodEnum } from "@/schemas/enums";
import { useMutation, useQuery } from "@tanstack/react-query";
import axios from "axios";
import { Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

const PAYMENT_METHOD_OPTIONS: { id: TPaymentMethodEnum; value: TPaymentMethodEnum; label: string }[] = [
	{ id: "DINHEIRO", value: "DINHEIRO", label: "DINHEIRO" },
	{ id: "PIX", value: "PIX", label: "PIX" },
	{ id: "CARTAO_CREDITO", value: "CARTAO_CREDITO", label: "CARTÃO DE CRÉDITO" },
	{ id: "CARTAO_DEBITO", value: "CARTAO_DEBITO", label: "CARTÃO DE DÉBITO" },
	{ id: "TRANSFERENCIA", value: "TRANSFERENCIA", label: "TRANSFERÊNCIA" },
	{ id: "VALE", value: "VALE", label: "VALE" },
	{ id: "OUTRO", value: "OUTRO", label: "OUTRO" },
];

type TPaymentSplitState = {
	key: number;
	metodo: TPaymentMethodEnum;
	valor: number;
	// null = usar a conta padrão do método. Só vira id quando o método permite a escolha.
	contaFinanceiraId: string | null;
};

async function fetchOpenSalesSessions() {
	const { data } = await axios.get<TGetSalesSessionsOutput>("/api/pos/sales-sessions?status=ABERTA");
	return data.data.default?.sessions ?? [];
}

type CloseTabProps = {
	tabId: string;
	consumoParcial: number;
	closeModal: () => void;
	callbacks?: {
		onSuccess?: () => void;
	};
};

export function CloseTab({ tabId, consumoParcial, closeModal, callbacks }: CloseTabProps) {
	// Divisao entre pessoas = multiplos pagamentos com metodos/valores distintos na mesma venda.
	const [payments, setPayments] = useState<TPaymentSplitState[]>([{ key: 1, metodo: "DINHEIRO", valor: consumoParcial, contaFinanceiraId: null }]);
	const [sessaoVendaId, setSessaoVendaId] = useState<string | null>(null);

	const { data: openSessions } = useQuery({ queryKey: ["open-sales-sessions"], queryFn: fetchOpenSalesSessions });
	const { data: financialAccounts } = usePOSFinancialAccounts();
	const accountOptions = (financialAccounts?.contas ?? []).map((conta) => ({ id: conta.id, value: conta.id, label: conta.nome }));
	const methodsWithEditableAccount = financialAccounts?.metodosComContaEditavel ?? [];

	const { mutate, isPending } = useMutation({
		mutationKey: ["close-tab", tabId],
		mutationFn: closeTab,
		onSuccess: (data) => {
			callbacks?.onSuccess?.();
			toast.success(data.message);
			closeModal();
		},
		onError: (error) => toast.error(getErrorMessage(error)),
	});

	const totalInformado = payments.reduce((sum, payment) => sum + payment.valor, 0);
	const difference = consumoParcial - totalInformado;

	function updatePayment(key: number, changes: Partial<TPaymentSplitState>) {
		setPayments((prev) => prev.map((payment) => (payment.key === key ? { ...payment, ...changes } : payment)));
	}

	return (
		<ResponsiveMenu
			menuTitle="FECHAR CONTA"
			menuDescription="Informe os pagamentos reais do fechamento. A venda é confirmada uma única vez, com contábil, financeiro e fiscal."
			menuActionButtonText="FECHAR CONTA"
			menuActionButtonDisabled={Math.abs(difference) > 0.01}
			menuCancelButtonText="CANCELAR"
			actionFunction={() =>
				mutate({
					tabId,
					pagamentos: payments.map((payment) => ({
						metodo: payment.metodo,
						valor: payment.valor,
						efetivacaoTipo: "IMEDIATA",
						contaFinanceiraId: payment.contaFinanceiraId,
					})),
					sessaoVendaId,
				})
			}
			actionIsLoading={isPending}
			stateIsLoading={false}
			stateError={null}
			closeMenu={closeModal}
		>
			<div className="flex flex-col gap-3 p-1">
				<div className="flex items-center justify-between rounded-xl bg-secondary/50 px-3 py-2">
					<span className="text-xs font-medium uppercase text-muted-foreground">Consumo da conta</span>
					<span className="text-sm font-bold">{formatToMoney(consumoParcial)}</span>
				</div>

				{payments.map((payment) => (
					<div key={payment.key} className="flex flex-col gap-2">
						<div className="flex items-end gap-2">
							<div className="grow">
								<SelectInput
									label="MÉTODO"
									value={payment.metodo}
									options={PAYMENT_METHOD_OPTIONS}
									resetOptionLabel="DINHEIRO"
									// Trocar o método invalida a conta escolhida: ela pertencia ao método anterior.
									handleChange={(value) => updatePayment(payment.key, { metodo: value as TPaymentMethodEnum, contaFinanceiraId: null })}
									onReset={() => updatePayment(payment.key, { metodo: "DINHEIRO", contaFinanceiraId: null })}
								/>
							</div>
							<div className="w-32">
								<NumberInput label="VALOR" value={payment.valor} placeholder="0,00" handleChange={(value) => updatePayment(payment.key, { valor: value })} />
							</div>
							{payments.length > 1 ? (
								<Button variant="ghost" size="icon" onClick={() => setPayments((prev) => prev.filter((item) => item.key !== payment.key))}>
									<Trash2 className="w-4 h-4" />
								</Button>
							) : null}
						</div>
						{methodsWithEditableAccount.includes(payment.metodo) && accountOptions.length > 0 ? (
							<SelectInput
								label="CONTA FINANCEIRA"
								value={payment.contaFinanceiraId}
								options={accountOptions}
								resetOptionLabel="CONTA PADRÃO DO MÉTODO"
								handleChange={(value) => updatePayment(payment.key, { contaFinanceiraId: value })}
								onReset={() => updatePayment(payment.key, { contaFinanceiraId: null })}
							/>
						) : null}
					</div>
				))}

				<Button
					variant="outline"
					size="sm"
					className="flex items-center gap-1.5 w-fit"
					onClick={() =>
						setPayments((prev) => [
							...prev,
							{ key: Math.max(...prev.map((payment) => payment.key)) + 1, metodo: "PIX", valor: Math.max(0, difference), contaFinanceiraId: null },
						])
					}
				>
					<Plus className="w-3.5 h-3.5" />
					DIVIDIR PAGAMENTO
				</Button>

				{Math.abs(difference) > 0.01 ? (
					<p className="text-xs text-destructive">
						Os pagamentos ({formatToMoney(totalInformado)}) não cobrem o total da conta. Diferença: {formatToMoney(difference)}.
					</p>
				) : null}

				{(openSessions ?? []).length > 0 ? (
					<SelectInput
						label="SESSÃO DE CAIXA"
						value={sessaoVendaId}
						options={(openSessions ?? []).map((session) => ({
							id: session.id,
							value: session.id,
							label: session.responsavelVendedor?.nome ? `CAIXA — ${session.responsavelVendedor.nome}` : `CAIXA ${session.id.slice(0, 6)}`,
						}))}
						resetOptionLabel="NENHUMA"
						handleChange={(value) => setSessaoVendaId(value)}
						onReset={() => setSessaoVendaId(null)}
					/>
				) : null}
			</div>
		</ResponsiveMenu>
	);
}
