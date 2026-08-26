import TextInput from "@/components/Inputs/TextInput";
import { OrganizationSlugFeedback } from "@/components/Organizations/OrganizationSlugFeedback";
import ResponsiveMenuSection from "@/components/Utils/ResponsiveMenuSection";
import { Checkbox } from "@/components/ui/checkbox";
import { OrganizationNicheOptions } from "@/config/onboarding";
import { formatToCPForCNPJ, formatToPhone } from "@/lib/formatting";
import { slugifyOrganizationName } from "@/lib/organizations/slug";
import { useAvailableDealLicense } from "@/lib/queries/deals";
import { cn } from "@/lib/utils";
import type { TUseOrganizationOnboardingState } from "@/state-hooks/use-organization-onboarding-state";
import { BadgeCheck, Check, LayoutGrid, Store } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { MdAttachFile } from "react-icons/md";

type GeneralInfoStageProps = {
	state: TUseOrganizationOnboardingState["state"];
	updateOrganization: TUseOrganizationOnboardingState["updateOrganization"];
	updateOrganizationLogoHolder: TUseOrganizationOnboardingState["updateOrganizationLogoHolder"];
	updateOnboarding: TUseOrganizationOnboardingState["updateOnboarding"];
};

export function GeneralInfoStage({ state, updateOrganization, updateOrganizationLogoHolder, updateOnboarding }: GeneralInfoStageProps) {
	// Licença de deal (venda B2B multi-licença): se o usuário é obtentor de um deal ativo
	// com licença disponível, a organização será ativada sem trial e sem checkout.
	const { data: dealLicense } = useAvailableDealLicense();

	// O endereço acompanha o nome até o usuário mexer nele; se ele limpar o campo, volta a acompanhar.
	const [slugEdited, setSlugEdited] = useState(() => Boolean(state.organization.slug));

	const handleNomeChange = (value: string) => {
		updateOrganization(slugEdited ? { nome: value } : { nome: value, slug: slugifyOrganizationName(value) });
	};

	const handleSlugChange = (value: string) => {
		// Normalização leve para não mutilar a digitação (hífen no fim é válido enquanto digita);
		// o blur e o servidor aplicam a normalização completa.
		const typed = value
			.toLowerCase()
			.replace(/\s+/g, "-")
			.replace(/[^a-z0-9-]/g, "");
		setSlugEdited(typed.length > 0);
		updateOrganization({ slug: typed || slugifyOrganizationName(state.organization.nome) });
	};

	return (
		<>
			{dealLicense?.available ? (
				<div className="flex w-full items-start gap-3 rounded-xl border border-emerald-300 bg-emerald-50 p-3">
					<BadgeCheck className="h-5 w-5 min-w-5 min-h-5 text-emerald-600" />
					<div className="flex flex-col gap-0.5">
						<h4 className="text-sm font-semibold tracking-tight text-emerald-800">VOCÊ POSSUI LICENÇAS DISPONÍVEIS</h4>
						<p className="text-xs text-emerald-700">
							{dealLicense.licencasUtilizadas} de {dealLicense.deal.quantidadeLicencas} licenças do seu plano estão em uso. Esta organização será ativada
							automaticamente no plano {dealLicense.deal.planoBase}, sem período de teste e sem checkout.
						</p>
					</div>
				</div>
			) : null}
			<ResponsiveMenuSection title="INFORMAÇÕES GERAIS" icon={<LayoutGrid className="h-4 min-h-4 w-4 min-w-4" />}>
				<div className="w-full flex items-center lg:items-start flex-col lg:flex-row gap-x-6 gap-y-3">
					<ImageContent
						imageUrl={state.organization.logoUrl}
						imageHolder={state.organizationLogoHolder}
						updateImageHolder={updateOrganizationLogoHolder}
					/>
					<div className="h-full w-full lg:grow flex flex-col items-center gap-2">
						<TextInput
							value={state.organization.nome}
							label="NOME DA EMPRESA"
							labelClassName="text-black"
							holderClassName="dark:border-black/20 text-black"
							placeholder="Preencha aqui o nome da sua empresa..."
							handleChange={handleNomeChange}
							required
						/>
						<div className="flex w-full flex-col gap-1">
							<TextInput
								value={state.organization.slug}
								label="ENDEREÇO DA SUA LOJA ONLINE"
								labelClassName="text-black"
								holderClassName="dark:border-black/20 text-black"
								placeholder="endereco-da-sua-loja"
								handleChange={handleSlugChange}
								handleOnBlur={() => updateOrganization({ slug: slugifyOrganizationName(state.organization.slug) })}
							/>
							<OrganizationSlugFeedback slug={state.organization.slug} onApplySuggestion={(suggestion) => updateOrganization({ slug: suggestion })} />
						</div>
						<TextInput
							value={state.organization.cnpj || ""}
							label="CNPJ DA EMPRESA"
							labelClassName="text-black"
							holderClassName="dark:border-black/20 text-black"
							placeholder="Preencha aqui o CNPJ da sua empresa..."
							handleChange={(value) => updateOrganization({ cnpj: formatToCPForCNPJ(value) })}
							required
						/>
						<TextInput
							value={state.organization.email || ""}
							label="EMAIL CORPORATIVO"
							labelClassName="text-black"
							holderClassName="dark:border-black/20 text-black"
							placeholder="Preencha aqui o email corporativo da sua empresa..."
							handleChange={(value) => updateOrganization({ email: value })}
						/>
						<TextInput
							value={state.organization.telefone || ""}
							label="TELEFONE / WHATSAPP"
							labelClassName="text-black"
							holderClassName="dark:border-black/20 text-black"
							placeholder="Preencha aqui o telefone/whatsapp da sua empresa..."
							handleChange={(value) => updateOrganization({ telefone: formatToPhone(value) })}
						/>
					</div>
				</div>
			</ResponsiveMenuSection>

			<ResponsiveMenuSection title="SEGMENTO DE ATUAÇÃO" icon={<Store className="h-4 min-h-4 w-4 min-w-4" />}>
				<p className="text-sm text-muted-foreground tracking-tight -mt-1">
					Escolha o segmento mais próximo do seu negócio. Vamos usar isso para sugerir as melhores configurações de cashback e campanhas para você.
				</p>
				<div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
					{OrganizationNicheOptions.map((niche) => {
						const selected = state.organization.atuacaoNicho === niche.value;
						return (
							<button
								type="button"
								key={niche.id}
								onClick={() => updateOrganization({ atuacaoNicho: niche.value })}
								className={cn(
									"relative flex items-center gap-2.5 rounded-xl border-2 p-3 text-left transition-all duration-200 hover:-translate-y-0.5",
									selected ? "border-[#FFB900] bg-[#FFB900]/5 shadow-sm ring-1 ring-[#FFB900]/20" : "border-gray-100 bg-white hover:border-[#FFB900]/40",
								)}
							>
								<span
									className={cn(
										"flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition-colors",
										selected ? "bg-[#FFB900]/15 text-yellow-700" : "bg-gray-50 text-gray-400",
									)}
								>
									{niche.renderIcon("h-4.5 w-4.5")}
								</span>
								<span className={cn("text-xs font-semibold leading-tight", selected ? "text-yellow-700" : "text-gray-800")}>{niche.label}</span>
								{selected && (
									<span className="absolute top-1.5 right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-[#FFB900] text-white">
										<Check className="h-2.5 w-2.5 stroke-[3px]" />
									</span>
								)}
							</button>
						);
					})}
				</div>
			</ResponsiveMenuSection>

			<div className="flex items-start gap-1.5 px-1">
				<Checkbox
					id="terms-consent"
					checked={state.termsAccepted}
					onCheckedChange={(checked) => updateOnboarding({ termsAccepted: checked === true })}
					className="mt-0.5"
				/>
				<label htmlFor="terms-consent" className="text-sm text-foreground dark:text-black leading-relaxed cursor-pointer">
					Li e concordo com os{" "}
					<Link href="/legal" target="_blank" className="text-foreground dark:text-black font-medium underline hover:text-foreground/80 transition-colors">
						Termos de Uso e Política de Privacidade
					</Link>{" "}
					da plataforma RecompraCRM.
				</label>
			</div>
		</>
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
		<div className="flex w-full max-w-[350px] items-center justify-center self-center lg:self-auto min-h-[200px] sm:min-h-[280px]">
			<label className="relative aspect-square w-full max-w-[280px] cursor-pointer overflow-hidden rounded-lg" htmlFor="dropzone-file">
				<ImagePreview imageHolder={imageHolder} imageUrl={imageUrl} />
				<input
					accept=".png,.jpeg,.jpg"
					className="absolute h-full w-full cursor-pointer opacity-0"
					id="dropzone-file"
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

function ImagePreview({ imageUrl, imageHolder }: { imageUrl?: string | null; imageHolder: { file?: File | null; previewUrl?: string | null } }) {
	if (imageHolder.previewUrl) {
		return <Image alt="Logo da organização" fill={true} style={{ objectFit: "cover" }} src={imageHolder.previewUrl} />;
	}
	if (imageUrl) {
		return <Image alt="Logo da organização" fill={true} style={{ objectFit: "cover" }} src={imageUrl} />;
	}
	return (
		<div className="flex h-full w-full flex-col items-center justify-center gap-1 bg-gray-200 dark:bg-black/20">
			<MdAttachFile className="h-6 w-6 text-foreground/50 dark:text-black" />
			<p className="text-center font-medium text-xs text-foreground/50 dark:text-black">DEFINIR LOGO</p>
		</div>
	);
}
