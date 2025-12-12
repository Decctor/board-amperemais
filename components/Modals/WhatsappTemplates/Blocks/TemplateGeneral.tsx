import SelectInput from "@/components/Inputs/SelectInput";
import TextInput from "@/components/Inputs/TextInput";
import ResponsiveMenuSection from "@/components/Utils/ResponsiveMenuSection";
import { TemplateCategoryOptions, TemplateLanguageOptions, TemplateParameterFormatOptions } from "@/lib/whatsapp/templates";
import type { TUseWhatsappTemplateState } from "@/state-hooks/use-whatsapp-template-state";
import { LayoutGrid } from "lucide-react";

type TemplateGeneralProps = {
	template: TUseWhatsappTemplateState["state"]["whatsappTemplate"];
	updateTemplate: TUseWhatsappTemplateState["updateTemplate"];
	whatsappTemplateId: string | null;
};
export default function TemplateGeneral({ template, updateTemplate, whatsappTemplateId }: TemplateGeneralProps) {
	return (
		<ResponsiveMenuSection title="INFORMAÇÕES BÁSICAS" icon={<LayoutGrid size={15} />}>
			{whatsappTemplateId && (
				<p className="w-fit self-center bg-orange-100 text-orange-500 text-xs rounded-lg px-2 py-1">
					⚠️ Nome do template não pode ser alterado após sincronização com WhatsApp.
				</p>
			)}
			<div className="w-full flex items-center gap-2 lg:flex-row">
				<div className="w-full lg:w-1/2">
					<TextInput
						label="NOME DO TEMPLATE"
						value={template.nome}
						placeholder="nome_do_template"
						handleChange={(value) => updateTemplate({ nome: value.toLowerCase().replace(/[^a-z0-9_]/g, "_") })}
						width="100%"
						editable={!whatsappTemplateId}
					/>
				</div>
				<div className="w-full lg:w-1/2">
					<SelectInput
						label="CATEGORIA"
						value={template.categoria}
						options={TemplateCategoryOptions}
						selectedItemLabel="label"
						onReset={() => updateTemplate({ categoria: "AUTENTICAÇÃO" })}
						handleChange={(value) => updateTemplate({ categoria: value as "AUTENTICAÇÃO" | "MARKETING" | "UTILIDADE" })}
						width="100%"
					/>
				</div>
			</div>

			<SelectInput
				label="FORMATO DE PARÂMETROS"
				value={template.parametrosTipo}
				options={TemplateParameterFormatOptions}
				selectedItemLabel="label"
				onReset={() => updateTemplate({ parametrosTipo: "NOMEADO" })}
				handleChange={(value) => updateTemplate({ parametrosTipo: value as "NOMEADO" | "POSICIONAL" })}
				width="100%"
			/>
		</ResponsiveMenuSection>
	);
}
