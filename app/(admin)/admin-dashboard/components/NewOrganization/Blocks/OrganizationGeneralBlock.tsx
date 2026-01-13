"use client";
import TextInput from "@/components/Inputs/TextInput";
import ResponsiveMenuSection from "@/components/Utils/ResponsiveMenuSection";
import type { TUseOrganizationState } from "@/state-hooks/use-organization-state";
import { Building2, Upload } from "lucide-react";
import Image from "next/image";

type OrganizationGeneralBlockProps = {
	organization: TUseOrganizationState["state"]["organization"];
	updateOrganization: TUseOrganizationState["updateOrganization"];
	logoHolder: TUseOrganizationState["state"]["logoHolder"];
	updateLogoHolder: TUseOrganizationState["updateLogoHolder"];
};

export default function OrganizationGeneralBlock({ organization, updateOrganization, logoHolder, updateLogoHolder }: OrganizationGeneralBlockProps) {
	return (
		<ResponsiveMenuSection title="DADOS GERAIS" icon={<Building2 className="w-4 h-4" />}>
			<div className="flex flex-col lg:flex-row gap-4">
				{/* Logo Upload */}
				<div className="flex items-center justify-center min-h-[200px] min-w-[200px]">
					<label
						className="relative aspect-square w-full max-w-[200px] cursor-pointer overflow-hidden rounded-lg border-2 border-dashed border-primary/20 hover:border-primary/40 transition-colors"
						htmlFor="org-logo-file"
					>
						<LogoPreview logoHolder={logoHolder} logoUrl={organization.logoUrl} />
						<input
							accept=".png,.jpeg,.jpg"
							className="absolute h-full w-full cursor-pointer opacity-0"
							id="org-logo-file"
							multiple={false}
							onChange={(e) => {
								const file = e.target.files?.[0] ?? null;
								updateLogoHolder({
									file,
									previewUrl: file ? URL.createObjectURL(file) : null,
								});
							}}
							tabIndex={-1}
							type="file"
						/>
					</label>
				</div>

				{/* Form Fields */}
				<div className="flex flex-col gap-3 flex-1">
					<TextInput
						label="Nome"
						placeholder="Preencha aqui o nome da organização."
						value={organization.nome}
						handleChange={(value) => updateOrganization({ nome: value })}
						width="100%"
					/>
					<TextInput
						label="CNPJ"
						placeholder="Preencha aqui o CNPJ da organização."
						value={organization.cnpj}
						handleChange={(value) => updateOrganization({ cnpj: value })}
						width="100%"
					/>
					<TextInput
						label="Telefone"
						placeholder="Preencha aqui o telefone da organização."
						value={organization.telefone || ""}
						handleChange={(value) => updateOrganization({ telefone: value })}
						width="100%"
					/>
					<TextInput
						label="Email"
						placeholder="Preencha aqui o email da organização."
						value={organization.email || ""}
						handleChange={(value) => updateOrganization({ email: value })}
						width="100%"
					/>
				</div>
			</div>
		</ResponsiveMenuSection>
	);
}

function LogoPreview({
	logoHolder,
	logoUrl,
}: {
	logoHolder: TUseOrganizationState["state"]["logoHolder"];
	logoUrl: string | null | undefined;
}) {
	const displayUrl = logoHolder.previewUrl || logoUrl;

	if (displayUrl) {
		return <Image src={displayUrl} alt="Logo da organização" fill className="object-cover" />;
	}

	return (
		<div className="flex flex-col items-center justify-center h-full w-full gap-2 p-4">
			<Building2 className="w-12 h-12 text-primary/40" />
			<Upload className="w-6 h-6 text-primary/40" />
			<p className="text-xs text-primary/60 text-center">Clique para adicionar logo</p>
		</div>
	);
}
