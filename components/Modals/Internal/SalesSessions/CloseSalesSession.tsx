import NumberInput from "@/components/Inputs/NumberInput";
import TextareaInput from "@/components/Inputs/TextareaInput";
import ErrorComponent from "@/components/Layouts/ErrorComponent";
import ResponsiveMenu from "@/components/Utils/ResponsiveMenu";
import { getErrorMessage } from "@/lib/errors";
import { formatToMoney } from "@/lib/formatting";
import { closeSalesSession } from "@/lib/mutations/sales-sessions";
import { useSalesSessionById } from "@/lib/queries/sales-sessions";
import { cn } from "@/lib/utils";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle } from "lucide-react";
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
	const queryClient = useQueryClient();
	const { data: session, isLoading, isError, error } = useSalesSessionById({ sessionId });
	const [contagem, setContagem] = useState<Record<string, number>>({});
	const [observacoes, setObservacoes] = useState<string>("");

	const { mutate, isPending } = useMutation({
		mutationKey: ["close-sales-session", sessionId],
		mutationFn: closeSalesSession,
		onSuccess: (data) => {
			callbacks?.onSuccess?.();
			toast.success(data.message);
			queryClient.invalidateQueries({ queryKey: ["sales-sessions"] });
			queryClient.invalidateQueries({ queryKey: ["active-sales-session"] });
			closeModal();
		},
		onError: (err) => toast.error(getErrorMessage(err)),
		onSettled: () => callbacks?.onSettled?.(),
	});

	const resumo = session?.resumoEsperado ?? [];
	const pendenciasFiscais = session?.pendenciasFiscais ?? [];
	const gavetaLinhas = resumo.filter((linha) => isCashDrawerMethod(linha.metodo));

	const totalEsperadoGaveta = gavetaLinhas.reduce((acc, linha) => acc + linha.valorEsperado, 0);
	const totalInformadoGaveta = gavetaLinhas.reduce((acc, linha) => acc + (contagem[linha.metodo] ?? 0), 0);
	const diferencaGaveta = totalInformadoGaveta - totalEsperadoGaveta;

	function handleSubmit() {
		if (!session) return;
		const conferencias = gavetaLinhas.map((linha) => ({ metodo: linha.metodo, valorInformado: contagem[linha.metodo] ?? 0 }));
		mutate({ sessaoVendaId: sessionId, conferencias, observacoesFechamento: observacoes || null });
	}

	return (
		<ResponsiveMenu
			menuTitle="FECHAR CAIXA"
			menuDescription="Confira os valores por metodo e informe a contagem física da gaveta."
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
				<ErrorComponent msg="Sessão de venda não encontrada." />
			) : (
				<div className="flex w-full flex-col gap-4">
					{pendenciasFiscais.length > 0 ? (
						<div className="flex items-start gap-2 rounded-lg border border-[#ffb900]/40 bg-[#ffb900]/10 p-3">
							<AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-[#e6a700]" />
							<div className="flex flex-col gap-0.5">
								<span className="font-bold text-xs tracking-wide">
									{pendenciasFiscais.length > 1
										? `${pendenciasFiscais.length} DOCUMENTOS FISCAIS PENDENTES`
										: `${pendenciasFiscais.length} DOCUMENTO FISCAL PENDENTE`}
								</span>
								<span className="text-[11px] text-muted-foreground">
									Notas não autorizadas neste turno. Conforme a configuração, o fechamento pode ser bloqueado até a regularização.
								</span>
							</div>
						</div>
					) : null}

					<div className="flex flex-col gap-2">
						<span className="font-bold text-[11px] uppercase tracking-[0.08em] text-muted-foreground">CONFERÊNCIA POR MÉTODO</span>

						{gavetaLinhas.length === 0 && resumo.length === 0 ? (
							<span className="text-xs text-muted-foreground">Nenhum movimento registrado nesta sessão.</span>
						) : null}

						{/* Gaveta (dinheiro): contagem física */}
						{gavetaLinhas.map((linha) => {
							const informado = contagem[linha.metodo];
							const diferenca = (informado ?? 0) - linha.valorEsperado;
							const mostrarEsperado = !conferenciaCega;
							return (
								<div key={linha.metodo} className="flex flex-col gap-2 rounded-lg border border-border p-3">
									<div className="flex items-center justify-between">
										<span className="font-bold text-sm">{linha.metodo}</span>
										{mostrarEsperado ? (
											<span className="text-xs text-muted-foreground">ESPERADO {formatToMoney(linha.valorEsperado)}</span>
										) : (
											<span className="text-[11px] text-muted-foreground/70">CONTAGEM CEGA</span>
										)}
									</div>
									<NumberInput
										label="CONTAGEM FÍSICA"
										value={contagem[linha.metodo] ?? null}
										handleChange={(value) => setContagem((prev) => ({ ...prev, [linha.metodo]: value }))}
										placeholder="0,00"
									/>
									{mostrarEsperado && informado !== undefined ? (
										<span
											className={cn("text-xs font-semibold", diferenca === 0 ? "text-muted-foreground" : diferenca > 0 ? "text-green-600" : "text-destructive")}
										>
											{diferenca === 0 ? "Sem diferença" : diferenca > 0 ? `Sobra ${formatToMoney(diferenca)}` : `Falta ${formatToMoney(Math.abs(diferenca))}`}
										</span>
									) : null}
								</div>
							);
						})}

						{/* Recebíveis (não-gaveta): resumo somente leitura */}
						{resumo
							.filter((linha) => !isCashDrawerMethod(linha.metodo))
							.map((linha) => (
								<div key={linha.metodo} className="flex items-center justify-between rounded-lg border border-dashed border-border px-3 py-2">
									<span className="text-sm text-muted-foreground">{linha.metodo}</span>
									<span className="text-xs text-muted-foreground">RECEBÍVEL {formatToMoney(linha.valorEsperado)}</span>
								</div>
							))}
					</div>

					{/* Totais da gaveta */}
					{gavetaLinhas.length > 0 ? (
						<div className="flex flex-col gap-1 rounded-lg bg-muted/60 p-3">
							{!conferenciaCega ? (
								<div className="flex items-center justify-between text-xs">
									<span className="text-muted-foreground">ESPERADO EM GAVETA</span>
									<span className="font-semibold tabular-nums">{formatToMoney(totalEsperadoGaveta)}</span>
								</div>
							) : null}
							<div className="flex items-center justify-between text-xs">
								<span className="text-muted-foreground">CONTADO</span>
								<span className="font-semibold tabular-nums">{formatToMoney(totalInformadoGaveta)}</span>
							</div>
							{!conferenciaCega ? (
								<div className="flex items-center justify-between border-t border-border/60 pt-1 text-sm">
									<span className="font-bold">DIFERENÇA</span>
									<span
										className={cn(
											"font-black tabular-nums",
											diferencaGaveta === 0 ? "text-foreground" : diferencaGaveta > 0 ? "text-green-600" : "text-destructive",
										)}
									>
										{diferencaGaveta > 0 ? "+" : ""}
										{formatToMoney(diferencaGaveta)}
									</span>
								</div>
							) : null}
						</div>
					) : null}

					<TextareaInput
						label="OBSERVAÇÕES DO FECHAMENTO"
						value={observacoes}
						handleChange={(value) => setObservacoes(value)}
						placeholder="Observações do fechamento (opcional)..."
					/>
				</div>
			)}
		</ResponsiveMenu>
	);
}
