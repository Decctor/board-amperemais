import CheckboxInput from "@/components/Inputs/CheckboxInput";
import TextInput from "@/components/Inputs/TextInput";
import TextareaInput from "@/components/Inputs/TextareaInput";
import ResponsiveMenuSection from "@/components/Utils/ResponsiveMenuSection";
import { Button } from "@/components/ui/button";
import type { TFiscalDocumentTypeEnum } from "@/schemas/enums";
import type { TUseFiscalOperationProfileState } from "@/state-hooks/use-fiscal-operation-profile-state";
import { LayoutGrid } from "lucide-react";

const FISCAL_DOCUMENT_TYPE_OPTIONS: { value: TFiscalDocumentTypeEnum; label: string }[] = [
	{ value: "NFCE", label: "NFC-E" },
	{ value: "NFE", label: "NF-E" },
	{ value: "NFSE", label: "NFS-E" },
];

type FiscalOperationProfileGeneralBlockProps = {
	fiscalOperationProfile: TUseFiscalOperationProfileState["state"]["fiscalOperationProfile"];
	updateFiscalOperationProfile: TUseFiscalOperationProfileState["updateFiscalOperationProfile"];
};
export default function FiscalOperationProfileGeneralBlock({
	fiscalOperationProfile,
	updateFiscalOperationProfile,
}: FiscalOperationProfileGeneralBlockProps) {
	return (
		<ResponsiveMenuSection title="INFORMAÇÕES GERAIS" icon={<LayoutGrid className="h-4 min-h-4 w-4 min-w-4" />}>
			<div className="w-full flex items-center justify-center">
				<CheckboxInput
					checked={fiscalOperationProfile.ativo}
					labelTrue="PERFIL ATIVO"
					labelFalse="PERFIL INATIVO"
					handleChange={(value) => updateFiscalOperationProfile({ ativo: value })}
					justify="justify-center"
				/>
			</div>

			<div className="w-full flex flex-col items-center gap-1 my-2">
				<h3 className="text-start text-sm font-medium tracking-tight text-primary/80">TIPO DE DOCUMENTO</h3>
				<div className="w-full flex items-center gap-2 justify-center flex-wrap">
					{FISCAL_DOCUMENT_TYPE_OPTIONS.map((option) => (
						<Button
							key={option.value}
							variant={fiscalOperationProfile.tipoDocumento === option.value ? "default" : "ghost"}
							size="fit"
							className="flex items-center gap-1.5 px-2 py-1 rounded-lg"
							onClick={() => updateFiscalOperationProfile({ tipoDocumento: option.value })}
						>
							{option.label}
						</Button>
					))}
				</div>
			</div>

			<TextInput
				value={fiscalOperationProfile.nome}
				label="NOME"
				placeholder="Ex.: VENDA PRESENCIAL NFC-E"
				handleChange={(value) => updateFiscalOperationProfile({ nome: value })}
			/>
			<TextareaInput
				value={fiscalOperationProfile.descricao ?? ""}
				label="DESCRIÇÃO"
				placeholder="Descreva quando este perfil deve ser utilizado..."
				handleChange={(value) => updateFiscalOperationProfile({ descricao: value })}
			/>
		</ResponsiveMenuSection>
	);
}
