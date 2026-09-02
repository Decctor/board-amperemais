import ErrorComponent from "@/components/Layouts/ErrorComponent";
import { SessionMetaRow } from "@/components/Modals/Internal/SalesSessions/Blocks/SessionMetaRow";
import ResponsiveMenu from "@/components/Utils/ResponsiveMenu";
import { getErrorMessage } from "@/lib/errors";
import { formatToMoney } from "@/lib/formatting";
import { reviewSalesSession } from "@/lib/mutations/sales-sessions";
import { useSalesSessionById } from "@/lib/queries/sales-sessions";
import { cn } from "@/lib/utils";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import dayjs from "dayjs";
import { toast } from "sonner";

type SalesSessionDetailProps = {
	sessionId: string;
	closeModal: () => void;
	/** Gestor pode conferir (aprovar a conferência de) uma sessão FECHADA. */
	canReview?: boolean;
};

export default function SalesSessionDetail({ sessionId, closeModal, canReview = false }: SalesSessionDetailProps) {
	const queryClient = useQueryClient();
	const { data: session, isLoading, isError, error, queryKey } = useSalesSessionById({ sessionId });

	const { mutate: review, isPending: isReviewing } = useMutation({
		mutationKey: ["review-sales-session", sessionId],
		mutationFn: reviewSalesSession,
		onSuccess: (data) => {
			toast.success(data.message);
			queryClient.invalidateQueries({ queryKey });
			queryClient.invalidateQueries({ queryKey: ["sales-sessions"] });
		},
		onError: (err) => toast.error(getErrorMessage(err)),
	});

	const isOpen = session?.status === "ABERTA";
	const canReviewThisSession = canReview && session?.status === "FECHADA";
	const linhas = isOpen
		? (session?.resumoEsperado ?? []).map((linha) => ({
				metodo: linha.metodo,
				valorEsperado: linha.valorEsperado,
				valorInformado: null as number | null,
				diferenca: null as number | null,
			}))
		: (session?.conferencias ?? []).map((linha) => ({
				metodo: linha.metodo,
				valorEsperado: linha.valorEsperado,
				valorInformado: linha.valorInformado,
				diferenca: linha.diferenca,
			}));

	return (
		<ResponsiveMenu
			menuTitle="DETALHES DO CAIXA"
			menuDescription="Resumo do turno e conferencia por metodo de pagamento."
			menuActionButtonText={canReviewThisSession ? "CONFERIR CAIXA" : "FECHAR"}
			menuCancelButtonText="VOLTAR"
			actionFunction={canReviewThisSession ? () => review({ sessaoVendaId: sessionId }) : closeModal}
			actionIsLoading={isReviewing}
			stateIsLoading={isLoading}
			stateError={isError ? getErrorMessage(error) : null}
			closeMenu={closeModal}
			dialogVariant="md"
		>
			{!session ? (
				<ErrorComponent msg="Sessão de venda não encontrada." />
			) : (
				<div className="flex w-full flex-col gap-4">
					<div className="flex flex-col gap-1 rounded-lg bg-muted/50 p-3">
						<SessionMetaRow label="RESPONSÁVEL" value={session.responsavelVendedor?.nome ?? "—"} />
						<SessionMetaRow label="ABERTURA" value={dayjs(session.dataAbertura).format("DD/MM/YYYY HH:mm")} />
						<SessionMetaRow label="FECHAMENTO" value={session.dataFechamento ? dayjs(session.dataFechamento).format("DD/MM/YYYY HH:mm") : "—"} />
						<SessionMetaRow label="FUNDO DE TROCO" value={formatToMoney(session.saldoInicial)} />
						{session.status === "CONFERIDA" ? <SessionMetaRow label="CONFERIDA POR" value={session.conferidaPorUsuario?.nome ?? "—"} /> : null}
					</div>

					<div className="flex flex-col gap-2">
						<span className="font-bold text-[11px] uppercase tracking-[0.08em] text-muted-foreground">CONFERENCIA POR METODO</span>
						{linhas.length === 0 ? <span className="text-xs text-muted-foreground">Nenhum movimento neste turno.</span> : null}
						{linhas.map((linha) => (
							<div key={linha.metodo} className="flex items-center justify-between rounded-lg border border-border px-3 py-2">
								<span className="font-semibold text-sm">{linha.metodo}</span>
								<div className="flex items-center gap-4 text-xs tabular-nums">
									<span className="text-muted-foreground">Esperado {formatToMoney(linha.valorEsperado)}</span>
									{linha.valorInformado !== null ? <span>Contado {formatToMoney(linha.valorInformado)}</span> : null}
									{linha.diferenca !== null && linha.diferenca !== undefined ? (
										<span
											className={cn("font-bold", linha.diferenca === 0 ? "text-muted-foreground" : linha.diferenca > 0 ? "text-green-600" : "text-destructive")}
										>
											{linha.diferenca > 0 ? "+" : ""}
											{formatToMoney(linha.diferenca)}
										</span>
									) : null}
								</div>
							</div>
						))}
					</div>

					{!isOpen && session.diferencaTotal !== null && session.diferencaTotal !== undefined ? (
						<div className="flex items-center justify-between rounded-lg bg-muted/60 p-3 text-sm">
							<span className="font-bold">Diferenca total</span>
							<span
								className={cn(
									"font-black tabular-nums",
									session.diferencaTotal === 0 ? "text-foreground" : session.diferencaTotal > 0 ? "text-green-600" : "text-destructive",
								)}
							>
								{session.diferencaTotal > 0 ? "+" : ""}
								{formatToMoney(session.diferencaTotal)}
							</span>
						</div>
					) : null}
				</div>
			)}
		</ResponsiveMenu>
	);
}
