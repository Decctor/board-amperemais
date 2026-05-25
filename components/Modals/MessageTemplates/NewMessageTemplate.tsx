"use client";

import ResponsiveMenu from "@/components/Utils/ResponsiveMenu";
import { MessageTemplateComposer } from "@/components/MessageTemplates";
import { getErrorMessage } from "@/lib/errors";
import { createMessageTemplate } from "@/lib/mutations/message-templates";
import { useMessageTemplateState } from "@/state-hooks/use-message-template-state";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";

type NewMessageTemplateProps = {
	closeModal: () => void;
	organizationId: string;
	organizationName: string;
	organizationLogoUrl: string | null;
	callbacks?: {
		onMutate?: () => void;
		onSuccess?: () => void;
		onError?: () => void;
		onSettled?: () => void;
	};
};

function NewMessageTemplate({
	closeModal,
	organizationId,
	organizationName,
	organizationLogoUrl,
	callbacks,
}: NewMessageTemplateProps) {
	const messageTemplateState = useMessageTemplateState({ organizationName });
	const { state, resetState, unknownVariables } = messageTemplateState;

	const { mutate: handleCreateMessageTemplate, isPending } = useMutation({
		mutationKey: ["create-message-template"],
		mutationFn: createMessageTemplate,
		onMutate: async () => {
			if (callbacks?.onMutate) callbacks.onMutate();
			return;
		},
		onSuccess: async (response) => {
			if (callbacks?.onSuccess) callbacks.onSuccess();
			toast.success(response.message);
			resetState();
			closeModal();
		},
		onError: (error) => {
			if (callbacks?.onError) callbacks.onError();
			toast.error(getErrorMessage(error));
		},
		onSettled: async () => {
			if (callbacks?.onSettled) callbacks.onSettled();
			return;
		},
	});

	function handleSubmit() {
		if (!validateMessageTemplateForm({ messageTemplate: state.messageTemplate, unknownVariables })) return;

		handleCreateMessageTemplate({
			messageTemplate: state.messageTemplate,
			submitWhatsapp: true,
		});
	}

	return (
		<ResponsiveMenu
			menuTitle="NOVO TEMPLATE"
			menuDescription="Configure o conteúdo usado no WhatsApp e no e-mail."
			menuActionButtonText="CRIAR TEMPLATE"
			menuCancelButtonText="CANCELAR"
			actionFunction={handleSubmit}
			actionIsLoading={isPending}
			stateIsLoading={false}
			stateError={null}
			closeMenu={closeModal}
			dialogVariant="xl"
			drawerVariant="xl"
			lockClose={isPending}
		>
			<MessageTemplateComposer
				messageTemplateState={messageTemplateState}
				organizationId={organizationId}
				organizationName={organizationName}
				organizationLogoUrl={organizationLogoUrl}
				className="grid gap-4 xl:grid-cols-[minmax(280px,0.8fr)_minmax(520px,1.5fr)_minmax(340px,1fr)]"
			/>
		</ResponsiveMenu>
	);
}

export function validateMessageTemplateForm({
	messageTemplate,
	unknownVariables,
}: {
	messageTemplate: ReturnType<typeof useMessageTemplateState>["state"]["messageTemplate"];
	unknownVariables: string[];
}) {
	if (!messageTemplate.nome.trim()) {
		toast.error("Informe o nome do template.");
		return false;
	}
	if (!messageTemplate.conteudo.corpo.conteudo.trim()) {
		toast.error("Informe o conteúdo do corpo.");
		return false;
	}
	if (unknownVariables.length > 0) {
		toast.error("Existem variáveis fora do catálogo nativo.", {
			description: unknownVariables.map((variable) => `{{${variable}}}`).join(", "),
		});
		return false;
	}
	const invalidPresetButton = messageTemplate.conteudo.botoes.find((button) => button.tipo === "URL_PRESET" && !button.texto.trim());
	if (invalidPresetButton) {
		toast.error("Preencha o texto dos botões de preset.");
		return false;
	}
	if (!messageTemplate.conteudo.assunto.trim()) {
		toast.error("Informe o assunto do e-mail.");
		return false;
	}
	return true;
}

export default NewMessageTemplate;
