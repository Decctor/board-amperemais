"use client";

import TextInput from "@/components/Inputs/TextInput";
import ErrorComponent from "@/components/Layouts/ErrorComponent";
import LoadingComponent from "@/components/Layouts/LoadingComponent";
import { DEFAULT_ORG_COLORS, hexToRgba } from "@/components/Providers/OrgColorsProvider";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { TAuthUserSession } from "@/lib/authentication/types";
import { getErrorMessage } from "@/lib/errors";
import { uploadFile } from "@/lib/files-storage";
import { formatToCPForCNPJ, formatToPhone } from "@/lib/formatting";
import { slugifyOrganizationName } from "@/lib/organizations/slug";
import { Building2, Camera, ImageIcon, Palette } from "lucide-react";
import Image from "next/image";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { OrganizationSlugFeedback } from "../Organizations/OrganizationSlugFeedback";
import { useOrganizationSectionForm } from "./Organization/use-organization-section-form";
import { SettingsFormCard, SettingsFormSection } from "./SettingsFormCard";
import SettingsSectionActions from "./SettingsSectionActions";

type TOrganizationIdentityDraft = {
	nome: string;
	slug: string;
	cnpj: string;
	telefone: string | null;
	email: string | null;
	logoUrl: string | null;
	corPrimaria: string;
	corPrimariaForeground: string;
	corSecundaria: string;
	corSecundariaForeground: string;
};

type TOrganizationData = NonNullable<ReturnType<typeof useOrganizationSectionForm>["organization"]>;

function toIdentityDraft(organization: TOrganizationData): TOrganizationIdentityDraft {
	return {
		nome: organization.nome,
		slug: organization.slug ?? "",
		cnpj: organization.cnpj,
		telefone: organization.telefone,
		email: organization.email,
		logoUrl: organization.logoUrl,
		corPrimaria: organization.corPrimaria || DEFAULT_ORG_COLORS.primary,
		corPrimariaForeground: organization.corPrimariaForeground || DEFAULT_ORG_COLORS.primaryForeground,
		corSecundaria: organization.corSecundaria || DEFAULT_ORG_COLORS.secondary,
		corSecundariaForeground: organization.corSecundariaForeground || DEFAULT_ORG_COLORS.secondaryForeground,
	};
}

type ColorFieldProps = {
	label: string;
	value: string;
	onChange: (value: string) => void;
	editable: boolean;
};

function ColorField({ label, value, onChange, editable }: ColorFieldProps) {
	return (
		<div className="flex flex-col gap-2">
			<Label className="text-xs font-medium">{label}</Label>
			<div className="flex items-center gap-3">
				<div className="relative h-10 w-10 overflow-hidden rounded-lg border shadow-sm">
					<input
						type="color"
						value={value}
						onChange={(event) => editable && onChange(event.target.value)}
						disabled={!editable}
						aria-label={label}
						className="absolute -inset-2 h-[200%] w-[200%] cursor-pointer"
					/>
				</div>
				<Input
					value={value}
					onChange={(event) => editable && onChange(event.target.value)}
					disabled={!editable}
					className="font-mono uppercase"
					maxLength={7}
				/>
			</div>
		</div>
	);
}

type SettingsOrgProps = {
	membership: NonNullable<TAuthUserSession["membership"]>;
};

export default function SettingsOrg({ membership }: SettingsOrgProps) {
	const { organization, isLoading, isError, isSuccess, error, save, isSaving } = useOrganizationSectionForm();
	const [draft, setDraft] = useState<TOrganizationIdentityDraft | null>(null);
	const [logoFile, setLogoFile] = useState<{ file: File; previewUrl: string } | null>(null);
	const [isUploadingLogo, setIsUploadingLogo] = useState(false);

	useEffect(() => {
		if (organization) setDraft(toIdentityDraft(organization));
	}, [organization]);

	if (isLoading) return <LoadingComponent />;
	if (isError) return <ErrorComponent msg={getErrorMessage(error)} />;
	if (!isSuccess || !organization || !draft) return null;

	const canEdit = membership.permissoes.empresa.editar;

	function updateDraft(partial: Partial<TOrganizationIdentityDraft>) {
		setDraft((current) => (current ? { ...current, ...partial } : current));
	}

	// Arrow e não declaração: uma `function` é içada para antes do guard acima e perde o narrowing.
	const handleReset = () => {
		setDraft(toIdentityDraft(organization));
		setLogoFile(null);
	};

	const handleSave = async () => {
		let { logoUrl } = draft;
		if (logoFile) {
			setIsUploadingLogo(true);
			try {
				const { url } = await uploadFile({ file: logoFile.file, fileName: `${draft.nome}-logo`, prefix: "organizations" });
				logoUrl = url;
			} catch (uploadError) {
				toast.error(getErrorMessage(uploadError));
				return;
			} finally {
				setIsUploadingLogo(false);
			}
		}
		// Slug vazio não é enviado (não dá para limpar o endereço por aqui); o servidor valida o resto.
		const normalizedSlug = slugifyOrganizationName(draft.slug);
		save({ organization: { ...draft, slug: normalizedSlug || undefined, logoUrl } });
		setLogoFile(null);
	};

	const previewLogoUrl = logoFile?.previewUrl ?? draft.logoUrl;

	return (
		<SettingsFormCard
			footer={canEdit ? <SettingsSectionActions isSaving={isSaving || isUploadingLogo} onReset={handleReset} onSave={handleSave} /> : undefined}
		>
			<SettingsFormSection title="INFORMAÇÕES GERAIS" icon={<Building2 className="h-4 w-4" />}>
				<div className="flex flex-col gap-6 md:flex-row">
					<div className="flex flex-col items-center gap-2 md:items-start">
						<Label className="text-muted-foreground text-xs font-medium">LOGO</Label>
						<div className="group relative">
							<div className="border-muted-foreground/25 bg-muted/50 hover:bg-muted relative h-32 w-32 overflow-hidden rounded-xl border-2 border-dashed transition-colors">
								{previewLogoUrl ? (
									<Image src={previewLogoUrl} alt="Logo da organização" fill className="object-cover" />
								) : (
									<div className="text-muted-foreground flex h-full w-full flex-col items-center justify-center gap-1">
										<ImageIcon className="h-8 w-8 opacity-50" />
										<span className="text-[10px] font-medium">SEM LOGO</span>
									</div>
								)}
								{canEdit ? (
									<label
										htmlFor="logo-upload"
										className="absolute inset-0 flex cursor-pointer flex-col items-center justify-center bg-black/50 opacity-0 transition-opacity group-hover:opacity-100"
									>
										<Camera className="h-6 w-6 text-white" />
										<span className="mt-1 text-[10px] font-medium text-white">ALTERAR</span>
										<input
											id="logo-upload"
											type="file"
											accept="image/png, image/jpeg, image/jpg"
											className="sr-only"
											onChange={(event) => {
												const file = event.target.files?.[0];
												if (file) setLogoFile({ file, previewUrl: URL.createObjectURL(file) });
											}}
										/>
									</label>
								) : null}
							</div>
						</div>
					</div>

					<div className="grid flex-1 gap-4">
						<TextInput
							label="NOME DA ORGANIZAÇÃO"
							value={draft.nome}
							placeholder="Nome da sua empresa"
							handleChange={(value) => updateDraft({ nome: value })}
							editable={canEdit}
						/>
						<div className="flex flex-col gap-1">
							<TextInput
								label="ENDEREÇO DA LOJA ONLINE"
								value={draft.slug}
								placeholder="endereco-da-sua-loja"
								handleChange={(value) =>
									updateDraft({
										slug: value
											.toLowerCase()
											.replace(/\s+/g, "-")
											.replace(/[^a-z0-9-]/g, ""),
									})
								}
								handleOnBlur={() => updateDraft({ slug: slugifyOrganizationName(draft.slug) })}
								editable={canEdit}
							/>
							<OrganizationSlugFeedback
								slug={draft.slug}
								savedSlug={organization.slug}
								onApplySuggestion={(suggestion) => updateDraft({ slug: suggestion })}
							/>
							{draft.slug && organization.slug && draft.slug !== organization.slug ? (
								<p className="text-xs text-amber-600">Alterar o endereço quebra os links da loja já compartilhados com seus clientes.</p>
							) : null}
						</div>
						<div className="grid grid-cols-1 gap-4 md:grid-cols-2">
							<TextInput
								label="CNPJ"
								value={draft.cnpj ? formatToCPForCNPJ(draft.cnpj) : ""}
								placeholder="00.000.000/0000-00"
								handleChange={() => {}}
								editable={false}
								holderClassName="bg-muted/50"
							/>
							<TextInput
								label="TELEFONE"
								value={draft.telefone || ""}
								placeholder="(00) 00000-0000"
								handleChange={(value) => updateDraft({ telefone: formatToPhone(value) })}
								editable={canEdit}
							/>
						</div>
						<TextInput
							label="EMAIL DE CONTATO"
							value={draft.email || ""}
							placeholder="contato@empresa.com"
							handleChange={(value) => updateDraft({ email: value })}
							editable={canEdit}
						/>
					</div>
				</div>
			</SettingsFormSection>

			<SettingsFormSection title="IDENTIDADE VISUAL" icon={<Palette className="h-4 w-4" />}>
				<div className="flex flex-col gap-6 lg:flex-row">
					<div className="flex flex-1 flex-col gap-6">
						<div className="flex flex-col gap-3">
							<h4 className="text-muted-foreground text-xs font-bold uppercase">Cores primárias</h4>
							<ColorField label="COR DE FUNDO" value={draft.corPrimaria} onChange={(value) => updateDraft({ corPrimaria: value })} editable={canEdit} />
							<ColorField
								label="COR DO TEXTO"
								value={draft.corPrimariaForeground}
								onChange={(value) => updateDraft({ corPrimariaForeground: value })}
								editable={canEdit}
							/>
						</div>
						<div className="flex flex-col gap-3">
							<h4 className="text-muted-foreground text-xs font-bold uppercase">Cores secundárias</h4>
							<ColorField label="COR DE FUNDO" value={draft.corSecundaria} onChange={(value) => updateDraft({ corSecundaria: value })} editable={canEdit} />
							<ColorField
								label="COR DO TEXTO"
								value={draft.corSecundariaForeground}
								onChange={(value) => updateDraft({ corSecundariaForeground: value })}
								editable={canEdit}
							/>
						</div>
					</div>

					<div className="flex flex-1 flex-col gap-3">
						<span className="text-xs font-medium">PRÉ-VISUALIZAÇÃO</span>
						<div className="flex flex-col gap-3">
							<div className="flex flex-col gap-1">
								<span className="text-muted-foreground text-xs">BOTÃO COM COR PRIMÁRIA</span>
								<div
									className="inline-block w-fit rounded-lg px-6 py-3 text-sm font-bold shadow-sm"
									style={{ backgroundColor: draft.corPrimaria, color: draft.corPrimariaForeground }}
								>
									GANHAR CASHBACK
								</div>
							</div>

							<div className="flex flex-col gap-1">
								<span className="text-muted-foreground text-xs">BARRA DE PROGRESSO</span>
								<div className="bg-muted h-6 w-full overflow-hidden rounded-md">
									<div
										className="h-full w-[65%] rounded-md"
										style={{ background: `linear-gradient(to right, ${hexToRgba(draft.corPrimaria, 0.6)}, ${draft.corPrimaria})` }}
									/>
								</div>
							</div>

							<div className="flex flex-col gap-1">
								<span className="text-muted-foreground text-xs">CORES DOS GRÁFICOS</span>
								<div className="flex items-center gap-4">
									<div className="flex items-center gap-2">
										<div className="h-4 w-4 rounded" style={{ backgroundColor: draft.corPrimaria }} />
										<span className="text-xs">Período atual</span>
									</div>
									<div className="flex items-center gap-2">
										<div className="h-4 w-4 rounded" style={{ backgroundColor: draft.corSecundaria }} />
										<span className="text-xs">Período anterior</span>
									</div>
								</div>
							</div>

							<div className="flex flex-col gap-1">
								<span className="text-muted-foreground text-xs">VALORES DE ESTATÍSTICAS (COR SECUNDÁRIA)</span>
								<div
									className="w-fit rounded px-3 py-2 text-2xl font-bold tabular-nums"
									style={{ backgroundColor: draft.corSecundaria, color: draft.corSecundariaForeground }}
								>
									R$ 129.513,28
								</div>
							</div>

							<div className="flex flex-col gap-1">
								<span className="text-muted-foreground text-xs">MAPAS DE CALOR</span>
								<div className="flex gap-1">
									{[0.2, 0.4, 0.6, 0.8, 1].map((opacity, index) => (
										<div
											key={opacity}
											className="border-border flex h-8 w-8 items-center justify-center rounded border text-[0.6rem] font-bold"
											style={{ backgroundColor: hexToRgba(draft.corPrimaria, opacity) }}
										>
											{index + 1}
										</div>
									))}
								</div>
							</div>
						</div>
					</div>
				</div>
			</SettingsFormSection>
		</SettingsFormCard>
	);
}
