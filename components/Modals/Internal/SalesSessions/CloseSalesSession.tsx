import NumberInput from "@/components/Inputs/NumberInput";
import TextareaInput from "@/components/Inputs/TextareaInput";
import ErrorComponent from "@/components/Layouts/ErrorComponent";
import { SessionMetaRow } from "@/components/Modals/Internal/SalesSessions/Blocks/SessionMetaRow";
import ResponsiveMenu from "@/components/Utils/ResponsiveMenu";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { getErrorMessage } from "@/lib/errors";
import { formatDateAsLocale, formatToMoney } from "@/lib/formatting";
import { closeSalesSession } from "@/lib/mutations/sales-sessions";
import { useSalesSessionById } from "@/lib/queries/sales-sessions";
import { cn } from "@/lib/utils";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import dayjs from "dayjs";
import { AlertTriangle, ChevronDown } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

const SUCCESS_TEXT = "text-[#16a34a]";

function SectionLabel({ children }: { children: string }) {
	return <span className="font-bold text-[11px] uppercase tracking-[0.08em] text-muted-foreground">{children}</span>;
}

function differenceClass(value: number) {
	if (value === 0) return "text-muted-foreground";
	if (value > 0) return SUCCESS_TEXT;
	return "text-destructive";
}

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
	const [confirmarDiferenca, setConfirmarDiferenca] = useState(false);

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
	const recebivelLinhas = resumo.filter((linha) => !isCashDrawerMethod(linha.metodo));

	const totalEsperadoGaveta = gavetaLinhas.reduce((acc, linha) => acc + linha.valorEsperado, 0);
	const totalInformadoGaveta = gavetaLinhas.reduce((acc, linha) => acc + (contagem[linha.metodo] ?? 0), 0);
	const diferencaGaveta = totalInformadoGaveta - totalEsperadoGaveta;
	const temDiferencaGaveta = !conferenciaCega && gavetaLinhas.length > 0 && diferencaGaveta !== 0;

	const vendas = session?.vendas ?? [];
	const totalVendas = vendas.reduce((acc, venda) => acc + venda.valorTotal, 0);

	function updateContagem(metodo: string, value: number) {
		setContagem((prev) => ({ ...prev, [metodo]: value }));
		setConfirmarDiferenca(false);
	}

	function handleSubmit() {
		if (!session) return;
		if (temDiferencaGaveta && !confirmarDiferenca) {
			setConfirmarDiferenca(true);
			return;
		}
		const conferencias = gavetaLinhas.map((linha) => ({ metodo: linha.metodo, valorInformado: contagem[linha.metodo] ?? 0 }));
		mutate({ sessaoVendaId: sessionId, conferencias, observacoesFechamento: observacoes || null });
	}

	const actionButtonText = confirmarDiferenca && temDiferencaGaveta ? "CONFIRMAR DIFERENÇA E FECHAR" : "FECHAR CAIXA";

	return (
		<ResponsiveMenu
			menuTitle="FECHAR CAIXA"
			menuDescription="Conte o dinheiro na gaveta e confira os recebíveis do turno."
			menuActionButtonText={actionButtonText}
			menuActionButtonClassName={confirmarDiferenca && temDiferencaGaveta ? "bg-[#ffb900] text-[#171717] hover:bg-[#e6a700]" : undefined}
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
				<div className="flex w-full flex-col gap-5">
					{pendenciasFiscais.length > 0 ? (
						<div className="flex items-start gap-2 rounded-xl border border-[#ffb900]/40 bg-[#ffb900]/10 p-3">
							<AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-[#e6a700]" aria-hidden />
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

					<div className="flex flex-col gap-1 rounded-xl bg-muted/50 p-3">
						<SessionMetaRow label="RESPONSÁVEL" value={session.responsavelVendedor?.nome ?? "—"} />
						<SessionMetaRow label="ABERTURA" value={dayjs(session.dataAbertura).format("DD/MM/YYYY HH:mm")} />
						<SessionMetaRow label="FUNDO DE TROCO" value={formatToMoney(session.saldoInicial)} />
					</div>

					{confirmarDiferenca && temDiferencaGaveta ? (
						<div className="flex items-start gap-2 rounded-xl border border-[#ffb900]/40 bg-[#ffb900]/10 p-3">
							<AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-[#e6a700]" aria-hidden />
							<p className="text-xs leading-relaxed text-muted-foreground">
								A contagem da gaveta difere do esperado em{" "}
								<span className={cn("font-bold tabular-nums", differenceClass(diferencaGaveta))}>
									{diferencaGaveta > 0 ? "+" : ""}
									{formatToMoney(diferencaGaveta)}
								</span>
								. Confirme para registrar o fechamento com essa diferença ou ajuste a contagem.
							</p>
						</div>
					) : null}

					{gavetaLinhas.length > 0 ? (
						<section className="flex flex-col gap-2">
							<SectionLabel>CONTAGEM FÍSICA DA GAVETA</SectionLabel>
							<div className="flex flex-col overflow-hidden rounded-xl bg-muted/50">
								{gavetaLinhas.map((linha, index) => {
									const informado = contagem[linha.metodo];
									const diferenca = (informado ?? 0) - linha.valorEsperado;
									const mostrarEsperado = !conferenciaCega;
									return (
										<div
											key={linha.metodo}
											className={cn("flex flex-col gap-2 px-3 py-3", index < gavetaLinhas.length - 1 && "border-b border-border/60")}
										>
											<div className="flex items-center justify-between gap-2">
												<span className="font-bold text-sm">{linha.metodo}</span>
												{mostrarEsperado ? (
													<span className="text-[11px] text-muted-foreground">
														ESPERADO <span className="font-semibold tabular-nums">{formatToMoney(linha.valorEsperado)}</span>
													</span>
												) : (
													<span className="text-[11px] text-muted-foreground/70">CONTAGEM CEGA</span>
												)}
											</div>
											<NumberInput
												label="CONTAGEM FÍSICA"
												value={contagem[linha.metodo] ?? null}
												handleChange={(value) => updateContagem(linha.metodo, value)}
												placeholder="0,00"
											/>
											{mostrarEsperado && informado !== undefined ? (
												<span className={cn("text-xs font-semibold", differenceClass(diferenca))}>
													{diferenca === 0
														? "Sem diferença"
														: diferenca > 0
															? `Sobra ${formatToMoney(diferenca)}`
															: `Falta ${formatToMoney(Math.abs(diferenca))}`}
												</span>
											) : null}
										</div>
									);
								})}

								<div className="flex flex-col gap-1 border-t border-border/60 bg-muted/80 px-3 py-3">
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
										<div className="flex items-center justify-between pt-1 text-sm">
											<span className="font-bold">DIFERENÇA</span>
											<span className={cn("font-black tabular-nums", differenceClass(diferencaGaveta))}>
												{diferencaGaveta > 0 ? "+" : ""}
												{formatToMoney(diferencaGaveta)}
											</span>
										</div>
									) : null}
								</div>
							</div>
						</section>
					) : null}

					{recebivelLinhas.length > 0 ? (
						<section className="flex flex-col gap-2">
							<SectionLabel>RECEBÍVEIS DO TURNO</SectionLabel>
							<div className="flex flex-col gap-0.5 px-1">
								{recebivelLinhas.map((linha) => (
									<div key={linha.metodo} className="flex items-center justify-between py-1.5">
										<span className="text-sm text-muted-foreground">{linha.metodo}</span>
										<span className="font-semibold text-xs tabular-nums">{formatToMoney(linha.valorEsperado)}</span>
									</div>
								))}
							</div>
						</section>
					) : null}

					{gavetaLinhas.length === 0 && recebivelLinhas.length === 0 ? (
						<p className="text-xs text-muted-foreground">Nenhum movimento registrado nesta sessão.</p>
					) : null}

					{vendas.length > 0 ? (
						<Collapsible className="flex flex-col gap-2">
							<CollapsibleTrigger className="group flex w-full items-center justify-between rounded-lg px-1 py-1 text-left transition-colors hover:bg-muted/40">
								<div className="flex flex-col gap-0.5">
									<SectionLabel>VENDAS DO TURNO</SectionLabel>
									<span className="text-xs text-muted-foreground">
										{vendas.length} {vendas.length === 1 ? "venda" : "vendas"} · {formatToMoney(totalVendas)}
									</span>
								</div>
								<ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-data-[state=open]:rotate-180" />
							</CollapsibleTrigger>
							<CollapsibleContent>
								<div className="mt-1 flex flex-col gap-1 rounded-xl bg-muted/40 px-3 py-2">
									{vendas.map((venda) => (
										<div key={venda.id} className="grid grid-cols-[1fr_auto] gap-x-3 gap-y-0.5 py-1.5 text-xs [&:not(:last-child)]:border-b [&:not(:last-child)]:border-border/40">
											<span className="truncate font-medium text-foreground">{venda.cliente?.nome || "AO CONSUMIDOR"}</span>
											<span className="text-right font-semibold tabular-nums">{formatToMoney(venda.valorTotal)}</span>
											<span className="col-span-2 text-[11px] text-muted-foreground">{formatDateAsLocale(venda.dataVenda, true)}</span>
										</div>
									))}
								</div>
							</CollapsibleContent>
						</Collapsible>
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
