import NumberInput from "@/components/Inputs/NumberInput";
import TextareaInput from "@/components/Inputs/TextareaInput";
import ErrorComponent from "@/components/Layouts/ErrorComponent";
import ResponsiveMenu from "@/components/Utils/ResponsiveMenu";
import { getErrorMessage } from "@/lib/errors";
import { formatToMoney } from "@/lib/formatting";
import { closeSalesSession } from "@/lib/mutations/sales-sessions";
import { useSalesSessionById } from "@/lib/queries/sales-sessions";
import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";

// Apenas DINHEIRO tem dinheiro físico na gaveta e exige contagem; os demais são resumo de recebível.
function isCashDrawerMethod(metodo: string): boolean {
	return metodo === "DINHEIRO";
}

type CloseSalesSessionProps = {
	sessionId: string;
	closeModal: () => void;
	conferenciaCega?: boolean;
	callbacks?: {
		onSuccess?: () => void;
		onSettled?: () => void;
	};
};

export default function CloseSalesSession({ sessionId, closeModal, conferenciaCega, callbacks }: CloseSalesSessionProps) {
	const { data: session, isLoading, isError, error } = useSalesSessionById({ sessionId });
	const [contagem, setContagem] = useState<Record<string, number>>({});
	const [observacoes, setObservacoes] = useState<string>("");

	const { mutate, isPending } = useMutation({
		mutationKey: ["close-sales-session", sessionId],
		mutationFn: closeSalesSession,
		onSuccess: (data) => {
			callbacks?.onSuccess?.();
			toast.success(data.message);
			closeModal();
		},
		onError: (err) => toast.error(getErrorMessage(err)),
		onSettled: () => callbacks?.onSettled?.(),
	});

	function handleSubmit() {
		if (!session) return;
		const conferencias = (session.resumoEsperado ?? [])
			.filter((linha) => isCashDrawerMethod(linha.metodo))
			.map((linha) => ({ metodo: linha.metodo, valorInformado: contagem[linha.metodo] ?? 0 }));
		mutate({ sessaoVendaId: sessionId, conferencias, observacoesFechamento: observacoes || null });
	}

	return (
		<ResponsiveMenu
			menuTitle="FECHAR CAIXA"
			menuDescription="Confira os valores por metodo de pagamento e informe a contagem fisica da gaveta."
			menuActionButtonText="FECHAR CAIXA"
			menuCancelButtonText="CANCELAR"
			actionFunction={handleSubmit}
			actionIsLoading={isPending}
			stateIsLoading={isLoading}
			stateError={isError ? getErrorMessage(error) : null}
			closeMenu={closeModal}
			dialogVariant="md"
		>
			{!session ? (
				<ErrorComponent msg="Sessao de venda nao encontrada." />
			) : (
				<div className="flex w-full flex-col gap-3">
					<div className="flex w-fit items-center gap-2 rounded bg-primary/20 px-2 py-1">
						<h1 className="font-medium text-xs tracking-tight">CONFERENCIA POR METODO</h1>
					</div>
					<div className="flex w-full flex-col gap-2">
						{(session.resumoEsperado ?? []).map((linha) => {
							const isGaveta = isCashDrawerMethod(linha.metodo);
							return (
								<div key={linha.metodo} className="flex w-full flex-col gap-1 rounded border border-primary/20 p-2">
									<div className="flex w-full items-center justify-between">
										<h2 className="font-medium text-sm tracking-tight">{linha.metodo}</h2>
										{!conferenciaCega || !isGaveta ? (
											<span className="text-xs text-foreground/60">Esperado: {formatToMoney(linha.valorEsperado)}</span>
										) : (
											<span className="text-xs text-foreground/40">Contagem cega</span>
										)}
									</div>
									{isGaveta ? (
										<NumberInput
											label="CONTAGEM FISICA"
											value={contagem[linha.metodo] ?? null}
											handleChange={(value) => setContagem((prev) => ({ ...prev, [linha.metodo]: value }))}
											placeholder="0,00"
										/>
									) : (
										<span className="text-xs text-foreground/50">Recebivel — sem contagem fisica.</span>
									)}
								</div>
							);
						})}
						{(session.resumoEsperado ?? []).length === 0 ? (
							<span className="text-xs text-foreground/60">Nenhum movimento registrado nesta sessao.</span>
						) : null}
					</div>
					<TextareaInput
						label="OBSERVACOES DO FECHAMENTO"
						value={observacoes}
						handleChange={(value) => setObservacoes(value)}
						placeholder="Observacoes do fechamento (opcional)..."
					/>
				</div>
			)}
		</ResponsiveMenu>
	);
}
