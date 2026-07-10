"use client";

import TextInput from "@/components/Inputs/TextInput";
import ResponsiveMenu from "@/components/Utils/ResponsiveMenu";
import ResponsiveMenuSection from "@/components/Utils/ResponsiveMenuSection";
import { Button } from "@/components/ui/button";
import { getErrorMessage } from "@/lib/errors";
import { formatToMoney } from "@/lib/formatting";
import { createActionApproval, decideActionApproval, decideActionApprovalWithPin } from "@/lib/mutations/action-approvals";
import { useActionApprovalById } from "@/lib/queries/action-approvals";
import type { TVendaDescontoApprovalPayload } from "@/schemas/action-approvals";
import { useMutation } from "@tanstack/react-query";
import { KeyRound, RefreshCcw, Send } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

type DiscountApprovalProps = {
	vendedorId: string | null;
	valorBase: number;
	descontoTotal: number;
	limiteSolicitante: TVendaDescontoApprovalPayload["limiteSolicitante"];
	closeModal: () => void;
	// Chamado com o ID da aprovação válida — o chamador finaliza a venda com ele.
	onApproved: (approvalRequestId: string) => void;
};

/**
 * Aprovação de desconto acima do teto do operador, com dois caminhos:
 * - PIN no terminal: um gestor presente digita o identificador + senha de operador do seu vendedor
 *   vinculado e a aprovação sai na hora (registrada como SENHA_PDV);
 * - Solicitação remota: cria uma solicitação PENDENTE na fila de aprovações e aguarda a decisão
 *   (a venda pode ser estacionada como orçamento enquanto isso).
 */
export function DiscountApproval({ vendedorId, valorBase, descontoTotal, limiteSolicitante, closeModal, onApproved }: DiscountApprovalProps) {
	const [identificador, setIdentificador] = useState("");
	const [senhaOperador, setSenhaOperador] = useState("");
	const [remoteRequestId, setRemoteRequestId] = useState<string | null>(null);
	const approvedHandledRef = useRef(false);

	const payload: TVendaDescontoApprovalPayload = useMemo(
		() => ({
			tipo: "VENDA_DESCONTO",
			vendedorId,
			valorBase,
			descontoSolicitado: descontoTotal,
			descontoPercentual: valorBase > 0 ? (descontoTotal / valorBase) * 100 : 0,
			limiteSolicitante,
		}),
		[vendedorId, valorBase, descontoTotal, limiteSolicitante],
	);

	const { mutate: approveWithPin, isPending: isApprovingWithPin } = useMutation({
		mutationKey: ["decide-action-approval-with-pin"],
		mutationFn: decideActionApprovalWithPin,
		onSuccess: (data) => {
			toast.success(data.message);
			onApproved(data.data.request.id);
		},
		onError: (error) => {
			toast.error(getErrorMessage(error));
		},
	});

	const { mutate: requestRemoteApproval, isPending: isRequestingRemote } = useMutation({
		mutationKey: ["create-action-approval"],
		mutationFn: createActionApproval,
		onSuccess: (data) => {
			toast.success("Solicitação enviada. Aguardando aprovação de um gestor.");
			setRemoteRequestId(data.data.request.id);
		},
		onError: (error) => {
			toast.error(getErrorMessage(error));
		},
	});

	const { mutate: cancelRemoteRequest, isPending: isCancelling } = useMutation({
		mutationKey: ["cancel-action-approval"],
		mutationFn: (requestId: string) => decideActionApproval({ id: requestId, decisao: "CANCELAR" }),
		onSettled: () => {
			setRemoteRequestId(null);
		},
	});

	// Acompanha a solicitação remota por polling curto (a decisão pode vir de outro dispositivo).
	const { data: remoteRequest } = useActionApprovalById({ requestId: remoteRequestId, refetchInterval: 4000 });
	useEffect(() => {
		if (!remoteRequest || approvedHandledRef.current) return;
		if (remoteRequest.status === "APROVADA") {
			approvedHandledRef.current = true;
			toast.success("Desconto aprovado pelo gestor.");
			onApproved(remoteRequest.id);
			return;
		}
		if (remoteRequest.status === "REJEITADA") {
			toast.error(remoteRequest.motivoDecisao ? `Solicitação rejeitada: ${remoteRequest.motivoDecisao}` : "Solicitação rejeitada pelo gestor.");
			setRemoteRequestId(null);
			return;
		}
		if (remoteRequest.status === "EXPIRADA") {
			toast.error("A solicitação expirou. Envie uma nova solicitação.");
			setRemoteRequestId(null);
		}
	}, [remoteRequest, onApproved]);

	const handlePinApproval = () => {
		if (!identificador.trim()) {
			toast.error("Informe o identificador do vendedor do gestor aprovador.");
			return;
		}
		if (!senhaOperador.trim()) {
			toast.error("Informe a senha de operador do gestor aprovador.");
			return;
		}
		approveWithPin({ tipo: "VENDA_DESCONTO", payload, identificador: identificador.trim(), senhaOperador: senhaOperador.trim() });
	};

	const descontoPercentualLabel = `${payload.descontoPercentual.toFixed(1).replace(".", ",")}%`;

	return (
		<ResponsiveMenu
			menuTitle="APROVAÇÃO DE DESCONTO"
			menuDescription="O desconto aplicado excede o limite do operador e precisa da aprovação de um gestor."
			menuActionButtonText="APROVAR COM SENHA"
			menuCancelButtonText="CANCELAR"
			actionFunction={handlePinApproval}
			actionIsLoading={isApprovingWithPin}
			stateIsLoading={false}
			stateError={null}
			closeMenu={closeModal}
		>
			<div className="flex flex-col gap-4">
				<div className="flex flex-col gap-1 rounded-lg border border-red-200 bg-red-50 px-3 py-2 dark:border-red-800/40 dark:bg-red-900/10">
					<p className="text-xs font-bold text-red-700 dark:text-red-300">
						Desconto solicitado: {formatToMoney(descontoTotal)} ({descontoPercentualLabel})
					</p>
					<p className="text-[0.65rem] text-red-700/80 dark:text-red-300/80">Valor bruto da venda: {formatToMoney(valorBase)}</p>
					{limiteSolicitante?.tipo && limiteSolicitante.valor !== null ? (
						<p className="text-[0.65rem] text-red-700/80 dark:text-red-300/80">
							Limite do operador: {limiteSolicitante.tipo === "PERCENTUAL" ? `${limiteSolicitante.valor}%` : formatToMoney(limiteSolicitante.valor)}
						</p>
					) : null}
				</div>

				<ResponsiveMenuSection title="APROVAÇÃO NO TERMINAL" icon={<KeyRound className="h-4 min-h-4 w-4 min-w-4" />}>
					<p className="text-[0.65rem] text-muted-foreground">
						Um gestor presente informa o identificador e a senha de operador do vendedor vinculado ao seu usuário.
					</p>
					<TextInput
						label="IDENTIFICADOR DO VENDEDOR"
						placeholder="Identificador do vendedor do gestor..."
						value={identificador}
						handleChange={(value) => setIdentificador(value)}
					/>
					<TextInput
						label="SENHA DE OPERADOR"
						placeholder="Senha de operador do gestor..."
						value={senhaOperador}
						handleChange={(value) => setSenhaOperador(value)}
					/>
				</ResponsiveMenuSection>

				<ResponsiveMenuSection title="APROVAÇÃO REMOTA" icon={<Send className="h-4 min-h-4 w-4 min-w-4" />}>
					{remoteRequestId ? (
						<div className="flex flex-col gap-2">
							<div className="flex items-center gap-2 text-sm text-muted-foreground">
								<RefreshCcw className="h-4 w-4 animate-spin" /> Aguardando aprovação de um gestor... A solicitação expira em 15 minutos.
							</div>
							<p className="text-[0.65rem] text-muted-foreground">
								Você pode salvar a venda como orçamento e finalizá-la depois que a aprovação for concedida.
							</p>
							<Button type="button" variant="ghost-destructive" size="sm" disabled={isCancelling} onClick={() => cancelRemoteRequest(remoteRequestId)}>
								CANCELAR SOLICITAÇÃO
							</Button>
						</div>
					) : (
						<div className="flex flex-col gap-2">
							<p className="text-[0.65rem] text-muted-foreground">
								Sem um gestor presente? Envie a solicitação para a fila de aprovações (Vendas → Aprovações).
							</p>
							<Button
								type="button"
								variant="ghost-brand"
								size="sm"
								disabled={isRequestingRemote}
								onClick={() => requestRemoteApproval({ tipo: "VENDA_DESCONTO", payload })}
							>
								<Send className="h-4 w-4 mr-1.5" />
								{isRequestingRemote ? "ENVIANDO SOLICITAÇÃO..." : "SOLICITAR APROVAÇÃO REMOTA"}
							</Button>
						</div>
					)}
				</ResponsiveMenuSection>
			</div>
		</ResponsiveMenu>
	);
}
