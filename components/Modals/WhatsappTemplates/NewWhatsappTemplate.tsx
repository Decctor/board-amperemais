import ResponsiveMenu from "@/components/Utils/ResponsiveMenu";
import type { TAuthUserSession } from "@/lib/authentication/types";
import { getErrorMessage } from "@/lib/errors";
import { useWhatsappTemplateState } from "@/state-hooks/use-whatsapp-template-state";
import { useMutation } from "@tanstack/react-query";
import TemplateBodyEditor from "./Blocks/TemplateBodyEditor";
import TemplateButtonsConfig from "./Blocks/TemplateButtonsConfig";
import TemplateFooterConfig from "./Blocks/TemplateFooterConfig";
import TemplateGeneral from "./Blocks/TemplateGeneral";
import TemplateHeaderConfig from "./Blocks/TemplateHeaderConfig";
import TemplatePreview from "./Blocks/TemplatePreview";
import TemplateStatus from "./Blocks/TemplateStatus";
type NewWhatsappTemplateProps = {
	user: TAuthUserSession["user"];
	callbacks?: {
		onMutate?: () => void;
		onSuccess?: () => void;
		onError?: () => void;
		onSettled?: () => void;
	};
	closeMenu: () => void;
};

function NewWhatsappTemplate({ user, closeMenu, callbacks }: NewWhatsappTemplateProps) {
	const { state, updateTemplate, updateComponents, updateBodyParameters, resetState } = useWhatsappTemplateState({
		initialState: {},
	});

	return (
		<ResponsiveMenu
			menuTitle="NOVO TEMPLATE WHATSAPP"
			menuDescription="Crie um novo template de mensagem para WhatsApp Business."
			menuActionButtonText="CRIAR TEMPLATE"
			menuCancelButtonText="CANCELAR"
			actionFunction={() => {}}
			actionIsLoading={false}
			stateIsLoading={false}
			closeMenu={closeMenu}
			dialogVariant="xl"
		>
			<div className="w-full flex items-start gap-2 flex-col lg:flex-row lg:max-h-full lg:h-full">
				<div className="w-full lg:w-2/3 flex flex-col gap-3 p-2 rounded-lg border border-primary/30 shadow-sm overflow-y-auto lg:h-full scrollbar-thin scrollbar-track-primary/10 scrollbar-thumb-primary/30">
					{/* Status Information */}
					<TemplateStatus whatsappTemplateId={null} status={null} quality={null} />
					{/* Basic Information */}
					<TemplateGeneral template={state.whatsappTemplate} updateTemplate={updateTemplate} whatsappTemplateId={null} />
					<TemplateHeaderConfig
						header={state.whatsappTemplate.componentes.cabecalho ?? null}
						onHeaderChange={(header) => updateComponents({ cabecalho: header })}
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
						parametrosTipo={state.whatsappTemplate.parametrosTipo}
						parametros={state.whatsappTemplate.componentes.corpo.parametros}
						onParametrosChange={updateBodyParameters}
					/>

					<TemplateFooterConfig
						footer={state.whatsappTemplate.componentes.rodape ?? null}
						onFooterChange={(footer) => updateComponents({ rodape: footer })}
					/>

					<TemplateButtonsConfig
						buttons={state.whatsappTemplate.componentes.botoes ?? null}
						onButtonsChange={(buttons) => updateComponents({ botoes: buttons })}
					/>
				</div>
				<div className="w-full lg:w-1/3 p-2 rounded-lg border border-primary/30 shadow-sm flex flex-col lg:h-full lg:sticky lg:top-0">
					<TemplatePreview components={state.whatsappTemplate.componentes} />
				</div>
			</div>
		</ResponsiveMenu>
	);
}

export default NewWhatsappTemplate;
