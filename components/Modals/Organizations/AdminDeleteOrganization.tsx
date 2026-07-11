import TextInput from "@/components/Inputs/TextInput";
import ResponsiveMenu from "@/components/Utils/ResponsiveMenu";
import { getErrorMessage } from "@/lib/errors";
import { deleteOrganization } from "@/lib/mutations/admin";
import { useOrganizationDeletionSummary } from "@/lib/queries/admin";
import { useMutation } from "@tanstack/react-query";
import { AlertTriangle, Ban, MessageCircle, UsersRound } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

type AdminDeleteOrganizationProps = {
	organizationId: string;
	closeModal: () => void;
	callbacks?: {
		onMutate?: () => void;
		onSuccess?: () => void;
		onError?: () => void;
		onSettled?: () => void;
	};
};

const COUNT_LABELS: { key: keyof TCounts; label: string }[] = [
	{ key: "membros", label: "Membros" },
	{ key: "clientes", label: "Clientes" },
	{ key: "vendas", label: "Vendas" },
	{ key: "produtos", label: "Produtos" },
	{ key: "campanhas", label: "Campanhas" },
	{ key: "cupons", label: "Cupons" },
	{ key: "conversas", label: "Conversas" },
	{ key: "mensagens", label: "Mensagens" },
	{ key: "vendedores", label: "Vendedores" },
	{ key: "metas", label: "Metas" },
	{ key: "compras", label: "Compras" },
	{ key: "documentosFiscais", label: "Docs. Fiscais" },
	{ key: "transacoesFinanceiras", label: "Trans. Financeiras" },
	{ key: "conexoesWhatsapp", label: "Conexões WhatsApp" },
];
type TCounts = NonNullable<ReturnType<typeof useOrganizationDeletionSummary>["data"]>["counts"];

export function AdminDeleteOrganization({ organizationId, closeModal, callbacks }: AdminDeleteOrganizationProps) {
	const [confirmationText, setConfirmationText] = useState("");
	const { data: summary, isLoading, error } = useOrganizationDeletionSummary({ id: organizationId });

	const { mutate, isPending } = useMutation({
		mutationKey: ["admin-delete-organization", organizationId],
		mutationFn: deleteOrganization,
		onMutate: () => callbacks?.onMutate?.(),
		onSuccess: (data) => {
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

	const organizationName = summary?.organization.nome ?? "";
	const subscriptionBlocked = !!summary?.bloqueios.assinaturaAtiva;
	const confirmationMatches = confirmationText.trim() === organizationName;

	function handleDelete() {
		if (!summary) return;
		if (subscriptionBlocked) return toast.error("Organização possui assinatura ativa no Stripe. Cancele a assinatura antes de excluir.");
		if (!confirmationMatches) return toast.error("Digite o nome exato da organização para confirmar a exclusão.");
		mutate({ organizationId });
	}

	return (
		<ResponsiveMenu
			menuTitle="EXCLUIR ORGANIZAÇÃO"
			menuDescription="Essa ação é permanente e não pode ser desfeita. Revise o que será apagado antes de confirmar."
			menuActionButtonText="EXCLUIR DEFINITIVAMENTE"
			menuActionButtonClassName="bg-destructive text-white hover:bg-destructive/90"
			menuActionButtonDisabled={!summary || subscriptionBlocked || !confirmationMatches}
			menuCancelButtonText="CANCELAR"
			actionFunction={handleDelete}
			actionIsLoading={isPending}
			stateIsLoading={isLoading}
			stateError={error ? getErrorMessage(error) : null}
			closeMenu={closeModal}
			lockClose={isPending}
		>
			{summary ? (
				<div className="flex w-full flex-col gap-3">
					{subscriptionBlocked ? (
						<div className="flex items-start gap-2 rounded-lg border border-destructive/40 bg-destructive/10 p-3">
							<Ban className="h-4 w-4 min-w-4 min-h-4 text-destructive mt-0.5" />
							<div className="flex flex-col gap-0.5">
								<p className="text-sm font-semibold text-destructive">Exclusão bloqueada</p>
								<p className="text-xs text-foreground/70">
									A organização <span className="font-semibold">{organizationName}</span> possui assinatura ativa no Stripe (
									{summary.organization.stripeSubscriptionStatus}). Cancele a assinatura antes de excluir.
								</p>
							</div>
						</div>
					) : (
						<div className="flex items-start gap-2 rounded-lg border border-amber-500/40 bg-amber-500/10 p-3">
							<AlertTriangle className="h-4 w-4 min-w-4 min-h-4 text-amber-600 dark:text-amber-400 mt-0.5" />
							<p className="text-xs text-foreground/80">
								Todos os dados de <span className="font-semibold">{organizationName}</span> listados abaixo serão apagados permanentemente do banco de dados.
							</p>
						</div>
					)}

					{/* Resumo do que será apagado */}
					<div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
						{COUNT_LABELS.map(({ key, label }) => (
							<div key={key} className="flex flex-col items-center justify-center gap-0.5 rounded-lg border border-border bg-card p-2">
								<span className="text-base font-bold tracking-tight">{summary.counts[key]}</span>
								<span className="text-center text-[0.65rem] font-medium text-foreground/60 uppercase">{label}</span>
							</div>
						))}
					</div>

					{/* Avisos */}
					<div className="flex flex-col gap-1.5">
						{summary.avisos.usuariosSemOutraOrganizacao > 0 ? (
							<div className="flex items-center gap-2 text-xs text-foreground/70">
								<UsersRound className="h-3.5 w-3.5 min-w-3.5 min-h-3.5 text-amber-600 dark:text-amber-400" />
								<span>
									{summary.avisos.usuariosSemOutraOrganizacao} usuário(s) ficarão sem nenhuma organização (as contas não são excluídas, apenas o vínculo).
								</span>
							</div>
						) : null}
						{summary.avisos.conexoesWhatsappGateway > 0 ? (
							<div className="flex items-center gap-2 text-xs text-foreground/70">
								<MessageCircle className="h-3.5 w-3.5 min-w-3.5 min-h-3.5 text-amber-600 dark:text-amber-400" />
								<span>{summary.avisos.conexoesWhatsappGateway} conexão(ões) WhatsApp via gateway serão desconectadas.</span>
							</div>
						) : null}
					</div>

					{/* Confirmação por digitação */}
					{!subscriptionBlocked ? (
						<TextInput
							label={`Para confirmar, digite o nome da organização: ${organizationName}`}
							placeholder={organizationName}
							value={confirmationText}
							handleChange={(value) => setConfirmationText(value)}
						/>
					) : null}
				</div>
			) : null}
		</ResponsiveMenu>
	);
}
