import TextInput from "@/components/Inputs/TextInput";
import { formatPhoneAsBase, formatToCEP, formatToCPForCNPJ, formatToPhone } from "@/lib/formatting";
import type { TUseOrganizationOnboardingState } from "@/state-hooks/use-organization-onboarding-state";
import Image from "next/image";
import { MdAttachFile } from "react-icons/md";

type GeneralInfoStageProps = {
	state: TUseOrganizationOnboardingState["state"];
	updateOrganization: TUseOrganizationOnboardingState["updateOrganization"];
	updateOrganizationLogoHolder: TUseOrganizationOnboardingState["updateOrganizationLogoHolder"];
};

export function GeneralInfoStage({ state, updateOrganization, updateOrganizationLogoHolder }: GeneralInfoStageProps) {
	return (
		<div className="flex flex-col gap-6">
			<ImageContent
				imageUrl={state.organization.logoUrl}
				imageHolder={state.organizationLogoHolder}
				updateImageHolder={updateOrganizationLogoHolder}
			/>

			<div className="grid grid-cols-1 gap-4 md:grid-cols-2">
				<TextInput
					value={state.organization.nome}
					label="Nome da Organização"
					placeholder="Digite o nome da sua empresa"
					handleChange={(value) => updateOrganization({ nome: value })}
					width="100%"
					required
				/>
				<TextInput
					value={state.organization.cnpj || ""}
					label="CNPJ"
					placeholder="00.000.000/0000-00"
					handleChange={(value) => updateOrganization({ cnpj: formatToCPForCNPJ(value) })}
					width="100%"
					required
				/>
				<TextInput
					value={state.organization.email || ""}
					label="Email Corporativo"
					placeholder="contato@empresa.com"
					handleChange={(value) => updateOrganization({ email: value })}
					width="100%"
				/>
				<TextInput
					value={state.organization.telefone || ""}
					label="Telefone / WhatsApp"
					placeholder="(00) 00000-0000"
					handleChange={(value) => updateOrganization({ telefone: formatToPhone(value) })}
					width="100%"
				/>
				<TextInput
					value={state.organization.localizacaoCep || ""}
					label="CEP"
					placeholder="00000-000"
					handleChange={(value) => updateOrganization({ localizacaoCep: formatToCEP(value) })}
					width="100%"
				/>
			</div>
		</div>
	);
}

function ImageContent({
	imageUrl,
	imageHolder,
	updateImageHolder,
}: {
	imageUrl?: string | null;
	imageHolder: { file?: File | null; previewUrl?: string | null };
	updateImageHolder: (image: { file?: File | null; previewUrl?: string | null }) => void;
}) {
	return (
		<div className="flex w-full flex-col items-center justify-center gap-2">
			<span className="font-medium text-sm text-muted-foreground">Logo da Organização</span>
			<label className="relative h-32 w-32 cursor-pointer overflow-hidden rounded-full border-2 border-dashed border-primary/20 hover:bg-primary/5" htmlFor="logo-input-file">
				<ImagePreview imageHolder={imageHolder} imageUrl={imageUrl} />
				<input
					accept=".png,.jpeg,.jpg"
					className="absolute h-full w-full cursor-pointer opacity-0"
					id="logo-input-file"
					multiple={false}
					onChange={(e) => {
						const file = e.target.files?.[0] ?? null;
						updateImageHolder({ file, previewUrl: file ? URL.createObjectURL(file) : null });
					}}
					tabIndex={-1}
					type="file"
				/>
			</label>
		</div>
	);
}

function ImagePreview({
	imageUrl,
	imageHolder,
}: { imageUrl?: string | null; imageHolder: { file?: File | null; previewUrl?: string | null } }) {
	if (imageHolder.previewUrl) {
		return <Image alt="Logo da organização" fill={true} style={{ objectFit: "cover" }} src={imageHolder.previewUrl} />;
	}
	if (imageUrl) {
		return <Image alt="Logo da organização" fill={true} style={{ objectFit: "cover" }} src={imageUrl} />;
	}

	return (
		<div className="flex h-full w-full flex-col items-center justify-center gap-1">
			<MdAttachFile className="h-6 w-6 text-primary/50" />
			<p className="text-center font-medium text-xs text-primary/50">Carregar Logo</p>
		</div>
	);
}
