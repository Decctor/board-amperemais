import ResponsiveMenu from "@/components/Utils/ResponsiveMenu";
import { getErrorMessage } from "@/lib/errors";
import { createWhatsappTemplate } from "@/lib/mutations/whatsapp-templates";
import type { TCampaignTriggerTypeEnum } from "@/schemas/enums";
import { useWhatsappTemplateState } from "@/state-hooks/use-whatsapp-template-state";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import TemplateBodyEditor from "./Blocks/TemplateBodyEditor";
import TemplateGeneral from "./Blocks/TemplateGeneral";
import TemplateHeaderConfig from "./Blocks/TemplateHeaderConfig";
import TemplatePreview from "./Blocks/TemplatePreview";
type NewWhatsappTemplateProps = {
	organizationId: string;
	callbacks?: {
		onMutate?: () => void;
		onSuccess?: (data: { templateId?: string }) => void;
		onError?: () => void;
		onSettled?: () => void;
	};
	closeMenu: () => void;
	triggerContext?: TCampaignTriggerTypeEnum;
};

function NewWhatsappTemplate({ organizationId, closeMenu, callbacks, triggerContext }: NewWhatsappTemplateProps) {
	const { state, updateTemplate, updateComponents, updateBodyParameters, resetState } = useWhatsappTemplateState({
		initialState: {},
	});

	const { mutate: handleCreateWhatsappTemplateMutation, isPending } = useMutation({
		mutationKey: ["create-whatsapp-template"],
		mutationFn: createWhatsappTemplate,
		onMutate: async () => {
			if (callbacks?.onMutate) callbacks.onMutate();
			return;
		},
		onSuccess: async (data) => {
			if (callbacks?.onSuccess) callbacks.onSuccess({ templateId: data.data.insertedId });
			toast.success(data.message);
			return closeMenu();
		},
		onError: async (error) => {
			console.log("[HANDLE CREATE WHATSAPP TEMPLATE ERROR]", error);
			if (callbacks?.onError) callbacks.onError();
			return toast.error(getErrorMessage(error));
		},
		onSettled: async () => {
			if (callbacks?.onSettled) callbacks.onSettled();
			return;
		},
	});
	return (
		<ResponsiveMenu
			menuTitle="NOVO TEMPLATE WHATSAPP"
			menuDescription="Crie um novo template de mensagem para WhatsApp Business."
			menuActionButtonText="CRIAR TEMPLATE"
			menuCancelButtonText="CANCELAR"
			actionFunction={() =>
				handleCreateWhatsappTemplateMutation({
					template: {
						nome: state.whatsappTemplate.nome,
						categoria: state.whatsappTemplate.categoria,
						componentes: state.whatsappTemplate.componentes,
					},
				})
			}
			actionIsLoading={isPending}
			stateIsLoading={false}
			closeMenu={closeMenu}
			dialogVariant="xl"
		>
			<div className="w-full flex items-start gap-2 flex-col lg:flex-row lg:max-h-full lg:h-full">
				<div className="w-full lg:w-2/3 flex flex-col gap-3 p-2 rounded-lg border border-border/30 shadow-sm overflow-y-auto lg:h-full scrollbar-thin scrollbar-track-primary/10 scrollbar-thumb-primary/30">
					{/* Basic Information */}
					<TemplateGeneral template={state.whatsappTemplate} updateTemplate={updateTemplate} blockNameChange={false} />
					<TemplateHeaderConfig
						header={state.whatsappTemplate.componentes.cabecalho ?? null}
						onHeaderChange={(header) => updateComponents({ cabecalho: header })}
						organizationId={organizationId}
					/>

					<TemplateBodyEditor
						content={state.whatsappTemplate.componentes.corpo.conteudo}
						contentChangeCallback={(content) =>
							updateComponents({
								corpo: {
									...state.whatsappTemplate.componentes.corpo,
									conteudo: content,
								},
							})
						}
						parametros={state.whatsappTemplate.componentes.corpo.parametros}
						onParametrosChange={updateBodyParameters}
						triggerContext={triggerContext}
					/>
				</div>
				<div className="w-full lg:w-1/3 p-2 rounded-lg border border-border/30 shadow-sm flex flex-col lg:h-full lg:sticky lg:top-0">
					<TemplatePreview components={state.whatsappTemplate.componentes} />
				</div>
			</div>
		</ResponsiveMenu>
	);
}

export default NewWhatsappTemplate;
