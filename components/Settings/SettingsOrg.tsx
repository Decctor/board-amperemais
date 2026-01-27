"use client";

import TextInput from "@/components/Inputs/TextInput";
import { DEFAULT_ORG_COLORS, hexToRgba } from "@/components/Providers/OrgColorsProvider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { TAuthUserSession } from "@/lib/authentication/types";
import { getErrorMessage } from "@/lib/errors";
import { uploadFile } from "@/lib/files-storage";
import { formatToCPForCNPJ, formatToPhone } from "@/lib/formatting";
import { updateOrganization } from "@/lib/mutations/organizations";
import { cn } from "@/lib/utils";
import { useOrganizationState } from "@/state-hooks/use-organization-state";
import { useMutation } from "@tanstack/react-query";
import { Building2, Camera, ImageIcon, Loader2, Palette, Save, Undo2 } from "lucide-react";
import Image from "next/image";
import { useEffect } from "react";
import { toast } from "sonner";
import SectionWrapper from "../ui/section-wrapper";

type SettingsOrgProps = {
	user: TAuthUserSession["user"];
	membership: NonNullable<TAuthUserSession["membership"]>;
};

export default function SettingsOrg({ user, membership }: SettingsOrgProps) {
	const { state, updateOrganization: updateOrgState, updateLogoHolder, redefineState } = useOrganizationState();
	const permissions = membership.permissoes.empresa;
	const canEdit = permissions.editar;

	// Initialize state from membership
	useEffect(() => {
		if (membership.organizacao) {
			redefineState({
				...state,
				organization: {
					...state.organization,
					...membership.organizacao,
					corPrimaria: membership.organizacao.corPrimaria || DEFAULT_ORG_COLORS.primary,
					corPrimariaForeground: membership.organizacao.corPrimariaForeground || DEFAULT_ORG_COLORS.primaryForeground,
					corSecundaria: membership.organizacao.corSecundaria || DEFAULT_ORG_COLORS.secondary,
					corSecundariaForeground: membership.organizacao.corSecundariaForeground || DEFAULT_ORG_COLORS.secondaryForeground,
				},
				logoHolder: {
					file: null,
					previewUrl: membership.organizacao.logoUrl,
				},
			});
		}
		// biome-ignore lint/correctness/useExhaustiveDependencies: Initialize state only once
	}, []);

	const updateOrgMutation = useMutation({
		mutationFn: async () => {
			let logoUrl = state.organization.logoUrl;

			if (state.logoHolder.file) {
				const { url } = await uploadFile({
					file: state.logoHolder.file,
					fileName: `${state.organization.nome}-logo`,
					prefix: "organizations",
				});
				logoUrl = url;
			}

			return await updateOrganization({
				organization: {
					nome: state.organization.nome,
					email: state.organization.email,
					telefone: state.organization.telefone,
					logoUrl: logoUrl,
					corPrimaria: state.organization.corPrimaria,
					corPrimariaForeground: state.organization.corPrimariaForeground,
					corSecundaria: state.organization.corSecundaria,
					corSecundariaForeground: state.organization.corSecundariaForeground,
				},
			});
		},
		onSuccess: () => {
			toast.success("Organização atualizada com sucesso! Recarregue a página para ver todas as mudanças.");
			// Optional: reload to refresh context/session if needed, though react-query invalidation is better if possible.
			// Since organization details are often in session/context, reload might be safest for now.
			window.location.reload();
		},
		onError: (error) => {
			toast.error(getErrorMessage(error));
		},
	});

	if (!permissions.visualizar) {
		return (
			<div className="flex w-full flex-col items-center justify-center p-8 text-center text-muted-foreground">
				<Building2 className="mb-4 h-12 w-12 opacity-20" />
				<h2 className="text-lg font-medium">Acesso Negado</h2>
				<p className="text-sm">Você não tem permissão para visualizar as configurações da organização.</p>
			</div>
		);
	}

	const handleSave = () => {
		updateOrgMutation.mutate();
	};

	const handleReset = () => {
		if (membership.organizacao) {
			redefineState({
				...state,
				organization: {
					...state.organization,
					...membership.organizacao,
					corPrimaria: membership.organizacao.corPrimaria || DEFAULT_ORG_COLORS.primary,
					corPrimariaForeground: membership.organizacao.corPrimariaForeground || DEFAULT_ORG_COLORS.primaryForeground,
					corSecundaria: membership.organizacao.corSecundaria || DEFAULT_ORG_COLORS.secondary,
					corSecundariaForeground: membership.organizacao.corSecundariaForeground || DEFAULT_ORG_COLORS.secondaryForeground,
				},
				logoHolder: {
					file: null,
					previewUrl: membership.organizacao.logoUrl,
				},
			});
		}
	};

	const primaryColor = state.organization.corPrimaria || DEFAULT_ORG_COLORS.primary;
	const primaryForegroundColor = state.organization.corPrimariaForeground || DEFAULT_ORG_COLORS.primaryForeground;
	const secondaryColor = state.organization.corSecundaria || DEFAULT_ORG_COLORS.secondary;
	const secondaryForegroundColor = state.organization.corSecundariaForeground || DEFAULT_ORG_COLORS.secondaryForeground;

	return (
		<div className="flex w-full flex-col gap-6">
			{/* Header Section */}
			<div className="flex flex-col lg:flex-row items-center justify-between border-b pb-4">
				<div className="space-y-1">
					<h2 className="text-xl font-semibold tracking-tight">Configurações da Organização</h2>
					<p className="text-sm text-muted-foreground">Gerencie as informações gerais, identidade visual e preferências da sua organização.</p>
				</div>
				<div className="flex items-center gap-2">
					<Button variant="outline" size="sm" onClick={handleReset} disabled={updateOrgMutation.isPending || !canEdit}>
						<Undo2 className="mr-2 h-4 w-4" />
						Restaurar
					</Button>
					<Button size="sm" onClick={handleSave} disabled={updateOrgMutation.isPending || !canEdit}>
						{updateOrgMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
						Salvar Alterações
					</Button>
				</div>
			</div>

			<SectionWrapper title="INFORMAÇÕES GERAIS" icon={<Building2 className="h-4 w-4" />}>
				<div className="rounded-xl border bg-card text-card-foreground shadow-sm">
					<div className="p-6 pt-0 space-y-4">
						<div className="flex flex-col md:flex-row gap-6">
							{/* Logo Upload Section */}
							<div className="flex flex-col gap-2 items-center md:items-start">
								<Label className="text-xs font-medium text-muted-foreground">LOGO</Label>
								<div className="relative group">
									<div className="relative h-32 w-32 overflow-hidden rounded-xl border-2 border-dashed border-muted-foreground/25 bg-muted/50 transition-colors hover:bg-muted">
										{state.logoHolder.previewUrl ? (
											<Image src={state.logoHolder.previewUrl} alt="Logo da organização" fill className="object-cover" />
										) : (
											<div className="flex h-full w-full flex-col items-center justify-center gap-1 text-muted-foreground">
												<ImageIcon className="h-8 w-8 opacity-50" />
												<span className="text-[10px] font-medium">SEM LOGO</span>
											</div>
										)}
										{canEdit && (
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
													onChange={(e) => {
														const file = e.target.files?.[0];
														if (file) {
															updateLogoHolder({
																file,
																previewUrl: URL.createObjectURL(file),
															});
														}
													}}
												/>
											</label>
										)}
									</div>
								</div>
							</div>

							{/* Fields */}
							<div className="flex-1 grid gap-4">
								<TextInput
									label="NOME DA ORGANIZAÇÃO"
									value={state.organization.nome}
									placeholder="Nome da sua empresa"
									handleChange={(val) => updateOrgState({ nome: val })}
									editable={canEdit}
									width="100%"
								/>
								<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
									<TextInput
										label="CNPJ"
										value={state.organization.cnpj ? formatToCPForCNPJ(state.organization.cnpj) : ""}
										placeholder="00.000.000/0000-00"
										handleChange={() => {}} // CNPJ usually not editable freely or requires validation logic, making it read-only for now based on typical rules, or use updateOrgState if needed but user didn't specify. Assuming read-only for safety or standard editable. Let's make it read-only as changing CNPJ is sensitive.
										editable={false}
										width="100%"
										holderClassName="bg-muted/50"
									/>
									<TextInput
										label="TELEFONE"
										value={state.organization.telefone || ""}
										placeholder="(00) 00000-0000"
										handleChange={(val) => updateOrgState({ telefone: formatToPhone(val) })}
										editable={canEdit}
										width="100%"
									/>
								</div>
								<TextInput
									label="EMAIL DE CONTATO"
									value={state.organization.email || ""}
									placeholder="contato@empresa.com"
									handleChange={(val) => updateOrgState({ email: val })}
									editable={canEdit}
									width="100%"
								/>
							</div>
						</div>
					</div>
				</div>
			</SectionWrapper>

			<SectionWrapper title="IDENTIDADE VISUAL" icon={<Palette className="h-4 w-4" />}>
				<div className="p-6 pt-0 space-y-6">
					{/* Colors Inputs */}
					<div className="space-y-6">
						{/* Primary Colors */}
						<div className="space-y-3 p-4 bg-muted/30 rounded-lg">
							<h4 className="text-xs font-bold uppercase text-muted-foreground">Cores Primárias</h4>
							<div className="space-y-2">
								<Label className="text-xs font-medium">COR DE FUNDO</Label>
								<div className="flex items-center gap-3">
									<div className="relative h-10 w-10 overflow-hidden rounded-lg border shadow-sm">
										<input
											type="color"
											value={primaryColor}
											onChange={(e) => canEdit && updateOrgState({ corPrimaria: e.target.value })}
											disabled={!canEdit}
											className="absolute -inset-2 h-[200%] w-[200%] cursor-pointer"
										/>
									</div>
									<Input
										value={primaryColor}
										onChange={(e) => canEdit && updateOrgState({ corPrimaria: e.target.value })}
										disabled={!canEdit}
										className="font-mono uppercase"
										maxLength={7}
									/>
								</div>
							</div>

							<div className="space-y-2">
								<Label className="text-xs font-medium">COR DO TEXTO</Label>
								<div className="flex items-center gap-3">
									<div className="relative h-10 w-10 overflow-hidden rounded-lg border shadow-sm">
										<input
											type="color"
											value={primaryForegroundColor}
											onChange={(e) => canEdit && updateOrgState({ corPrimariaForeground: e.target.value })}
											disabled={!canEdit}
											className="absolute -inset-2 h-[200%] w-[200%] cursor-pointer"
										/>
									</div>
									<Input
										value={primaryForegroundColor}
										onChange={(e) => canEdit && updateOrgState({ corPrimariaForeground: e.target.value })}
										disabled={!canEdit}
										className="font-mono uppercase"
										maxLength={7}
									/>
								</div>
							</div>
						</div>

						{/* Secondary Colors */}
						<div className="space-y-3 p-4 bg-muted/30 rounded-lg">
							<h4 className="text-xs font-bold uppercase text-muted-foreground">Cores Secundárias</h4>
							<div className="space-y-2">
								<Label className="text-xs font-medium">COR DE FUNDO</Label>
								<div className="flex items-center gap-3">
									<div className="relative h-10 w-10 overflow-hidden rounded-lg border shadow-sm">
										<input
											type="color"
											value={secondaryColor}
											onChange={(e) => canEdit && updateOrgState({ corSecundaria: e.target.value })}
											disabled={!canEdit}
											className="absolute -inset-2 h-[200%] w-[200%] cursor-pointer"
										/>
									</div>
									<Input
										value={secondaryColor}
										onChange={(e) => canEdit && updateOrgState({ corSecundaria: e.target.value })}
										disabled={!canEdit}
										className="font-mono uppercase"
										maxLength={7}
									/>
								</div>
							</div>

							<div className="space-y-2">
								<Label className="text-xs font-medium">COR DO TEXTO</Label>
								<div className="flex items-center gap-3">
									<div className="relative h-10 w-10 overflow-hidden rounded-lg border shadow-sm">
										<input
											type="color"
											value={secondaryForegroundColor}
											onChange={(e) => canEdit && updateOrgState({ corSecundariaForeground: e.target.value })}
											disabled={!canEdit}
											className="absolute -inset-2 h-[200%] w-[200%] cursor-pointer"
										/>
									</div>
									<Input
										value={secondaryForegroundColor}
										onChange={(e) => canEdit && updateOrgState({ corSecundariaForeground: e.target.value })}
										disabled={!canEdit}
										className="font-mono uppercase"
										maxLength={7}
									/>
								</div>
							</div>
						</div>
					</div>

					{/* Mini Preview */}
					<span className="mb-3 block text-xs font-medium">PRÉ-VISUALIZAÇÃO</span>
					<div className="flex flex-col gap-4">
						{/* Button Preview */}
						<div className="flex flex-col gap-1">
							<span className="text-xs text-muted-foreground">BOTÃO COM COR PRIMÁRIA</span>
							<div 
								className="px-6 py-3 rounded-lg text-sm font-bold inline-block w-fit shadow-sm"
								style={{ backgroundColor: primaryColor, color: primaryForegroundColor }}
							>
								GANHAR CASHBACK
							</div>
						</div>

						{/* Progress Bar Preview */}
						<div className="flex flex-col gap-1">
							<span className="text-xs text-muted-foreground">BARRA DE PROGRESSO</span>
							<div className="h-6 w-full rounded-md overflow-hidden bg-gray-100">
								<div
									className="h-full w-[65%] rounded-md"
									style={{
										background: `linear-gradient(to right, ${hexToRgba(primaryColor, 0.6)}, ${primaryColor})`,
									}}
								/>
							</div>
						</div>

						{/* Chart Colors Preview */}
						<div className="flex flex-col gap-1">
							<span className="text-xs text-muted-foreground">CORES DOS GRÁFICOS</span>
							<div className="flex items-center gap-4">
								<div className="flex items-center gap-2">
									<div className="w-4 h-4 rounded" style={{ backgroundColor: primaryColor }} />
									<span className="text-xs">Período Atual</span>
								</div>
								<div className="flex items-center gap-2">
									<div className="w-4 h-4 rounded" style={{ backgroundColor: secondaryColor }} />
									<span className="text-xs">Período Anterior</span>
								</div>
							</div>
						</div>

						{/* Stat Value Preview */}
						<div className="flex flex-col gap-1">
							<span className="text-xs text-muted-foreground">VALORES DE ESTATÍSTICAS (COR SECUNDÁRIA)</span>
							<div 
								className="text-2xl font-bold px-3 py-2 rounded w-fit" 
								style={{ backgroundColor: secondaryColor, color: secondaryForegroundColor }}
							>
								R$ 129.513,28
							</div>
						</div>

						{/* Heatmap Preview */}
						<div className="flex flex-col gap-1">
							<span className="text-xs text-muted-foreground">MAPAS DE CALOR</span>
							<div className="flex gap-1">
								{[0.2, 0.4, 0.6, 0.8, 1].map((opacity, index) => (
									<div
										key={index.toString()}
										className="w-8 h-8 rounded border border-primary/20 flex items-center justify-center text-[0.6rem] font-bold"
										style={{ backgroundColor: hexToRgba(primaryColor, opacity) }}
									>
										{index + 1}
									</div>
								))}
							</div>
						</div>
					</div>
				</div>
			</SectionWrapper>
		</div>
	);
}
