"use client";

import type { TGetMessageTemplatesOutputDefault } from "@/app/api/message-templates/route";
import SelectMultipleClientsInput from "@/components/Inputs/SelectMultipleClientsInput";
import TemplatePreview from "@/components/Modals/WhatsappTemplates/Blocks/TemplatePreview";
import ResponsiveMenu from "@/components/Utils/ResponsiveMenu";
import ResponsiveMenuSection from "@/components/Utils/ResponsiveMenuSection";
import { Button } from "@/components/ui/button";
import { getErrorMessage } from "@/lib/errors";
import { testMessageTemplate } from "@/lib/mutations/message-templates";
import { useMutation } from "@tanstack/react-query";
import { AlertTriangle, CheckCircle2, Mail, MessageCircle, Send, UserRound } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

type TestMessageTemplateProps = {
	template: TGetMessageTemplatesOutputDefault["messageTemplates"][number];
	closeModal: () => void;
	callbacks?: {
		onMutate?: () => void;
		onSuccess?: () => void;
		onError?: () => void;
		onSettled?: () => void;
	};
};

export default function TestMessageTemplate({ template, closeModal, callbacks }: TestMessageTemplateProps) {
	const [selectedClientIds, setSelectedClientIds] = useState<string[]>([]);
	const approvedPhonesCount = useMemo(
		() => Object.values(template.metadados?.porNumeroTelefone ?? {}).filter((metadata) => metadata.status === "APROVADO").length,
		[template.metadados?.porNumeroTelefone],
	);

	const { mutate, isPending } = useMutation({
		mutationKey: ["test-message-template", template.id],
		mutationFn: testMessageTemplate,
		onMutate: () => {
			callbacks?.onMutate?.();
		},
		onSuccess: (response) => {
			callbacks?.onSuccess?.();
			toast.success(response.message);
			closeModal();
		},
		onError: (error) => {
			callbacks?.onError?.();
			toast.error(getErrorMessage(error));
		},
		onSettled: () => {
			callbacks?.onSettled?.();
		},
	});

	function handleSubmit() {
		if (selectedClientIds.length === 0) {
			toast.error("Selecione pelo menos um cliente para enviar o teste.");
			return;
		}

		mutate({
			messageTemplateId: template.id,
			clientIds: selectedClientIds,
		});
	}

	return (
		<ResponsiveMenu
			menuTitle="TESTAR TEMPLATE"
			menuDescription="Selecione clientes para receberem o template por WhatsApp e/ou email conforme os contatos cadastrados."
			menuActionButtonText="ENVIAR TESTE"
			menuCancelButtonText="CANCELAR"
			actionFunction={handleSubmit}
			actionIsLoading={isPending}
			stateIsLoading={false}
			stateError={null}
			closeMenu={closeModal}
			dialogVariant="lg"
			drawerVariant="lg"
			lockClose={isPending}
		>
			<ResponsiveMenuSection title="TEMPLATE" icon={<Send size={15} />}>
				<div className="grid w-full gap-2 rounded-lg border border-border bg-muted/20 p-3 lg:grid-cols-[1fr_auto]">
					<div className="flex min-w-0 flex-col gap-1">
						<h2 className="truncate text-sm font-bold tracking-tight">{template.nome}</h2>
						<p className="text-xs font-medium text-muted-foreground">{template.conteudo.assunto || "Sem assunto de email."}</p>
					</div>
					<div className="flex flex-wrap items-center gap-1.5 lg:justify-end">
						<div className="rounded-md bg-secondary px-2 py-1 text-[0.65rem] font-bold uppercase text-foreground">{template.categoria}</div>
						<div className="rounded-md bg-secondary px-2 py-1 text-[0.65rem] font-bold uppercase text-foreground">{template.statusGeral}</div>
					</div>
				</div>
			</ResponsiveMenuSection>

			<ResponsiveMenuSection title="CANAIS DO TESTE" icon={<CheckCircle2 size={15} />}>
				<div className="grid w-full gap-2 lg:grid-cols-2">
					<div className="flex items-center gap-2 rounded-lg border border-border bg-muted/20 p-3">
						<MessageCircle className="h-4 w-4 min-w-4 text-foreground" />
						<div className="flex min-w-0 flex-col">
							<p className="truncate text-xs font-bold tracking-tight">WhatsApp</p>
							<p className="text-xs text-muted-foreground">
								{approvedPhonesCount > 0 ? `${approvedPhonesCount} telefone(s) aprovado(s).` : "Nenhum telefone aprovado para este template."}
							</p>
						</div>
					</div>
					<div className="flex items-center gap-2 rounded-lg border border-border bg-muted/20 p-3">
						<Mail className="h-4 w-4 min-w-4 text-foreground" />
						<div className="flex min-w-0 flex-col">
							<p className="truncate text-xs font-bold tracking-tight">Email</p>
							<p className="text-xs text-muted-foreground">Enviado quando o cliente tiver email cadastrado.</p>
						</div>
					</div>
				</div>
				{approvedPhonesCount === 0 ? (
					<div className="flex items-center gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-amber-700 dark:text-amber-300">
						<AlertTriangle className="h-4 w-4 min-w-4" />
						<p className="text-xs font-medium">O teste ainda poderá enviar email, mas WhatsApp exige template aprovado na Meta.</p>
					</div>
				) : null}
			</ResponsiveMenuSection>

			<ResponsiveMenuSection title="CLIENTES DO TESTE" icon={<UserRound size={15} />}>
				<SelectMultipleClientsInput
					label="Clientes"
					selected={selectedClientIds}
					handleChange={setSelectedClientIds}
					onReset={() => setSelectedClientIds([])}
				/>
				<div className="flex items-center justify-between rounded-lg border border-border bg-muted/20 px-3 py-2">
					<p className="text-xs font-medium text-muted-foreground">
						{selectedClientIds.length === 1 ? "1 cliente selecionado" : `${selectedClientIds.length} clientes selecionados`}
					</p>
					<Button type="button" variant="ghost" size="sm" className="h-7 text-[0.65rem]" onClick={() => setSelectedClientIds([])}>
						LIMPAR
					</Button>
				</div>
			</ResponsiveMenuSection>

			<TemplatePreview content={template.conteudo} />
		</ResponsiveMenu>
	);
}
