"use client";

import { DEFAULT_ORG_COLORS, hexToRgba, useOrgColors } from "@/components/Providers/OrgColorsProvider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { TAuthUserSession } from "@/lib/authentication/types";
import { getErrorMessage } from "@/lib/errors";
import { cn } from "@/lib/utils";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, Palette, RotateCcw, Save } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

type SettingsOrgColorsProps = {
	user: TAuthUserSession["user"];
	membership: NonNullable<TAuthUserSession["membership"]>;
};

export default function SettingsOrgColors({ user, membership }: SettingsOrgColorsProps) {
	const { colors } = useOrgColors();
	const queryClient = useQueryClient();

	const [primaryColor, setPrimaryColor] = useState(membership.organizacao.corPrimaria || DEFAULT_ORG_COLORS.primary);
	const [secondaryColor, setSecondaryColor] = useState(membership.organizacao.corSecundaria || DEFAULT_ORG_COLORS.secondary);

	const hasChanges =
		primaryColor !== (membership.organizacao.corPrimaria || DEFAULT_ORG_COLORS.primary) ||
		secondaryColor !== (membership.organizacao.corSecundaria || DEFAULT_ORG_COLORS.secondary);

	const updateColorsMutation = useMutation({
		mutationFn: async (data: { corPrimaria: string; corSecundaria: string }) => {
			const response = await fetch(`/api/organizations/${membership.organizacao.id}/colors`, {
				method: "PATCH",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(data),
			});
			if (!response.ok) {
				const error = await response.json();
				throw new Error(error.message || "Erro ao atualizar cores");
			}
			return response.json();
		},
		onSuccess: () => {
			toast.success("Cores atualizadas com sucesso! Recarregue a página para ver as mudanças.");
			// Force page reload to update all components with new colors
			window.location.reload();
		},
		onError: (error) => {
			toast.error(getErrorMessage(error));
		},
	});

	const handleSave = () => {
		updateColorsMutation.mutate({
			corPrimaria: primaryColor,
			corSecundaria: secondaryColor,
		});
	};

	const handleReset = () => {
		setPrimaryColor(DEFAULT_ORG_COLORS.primary);
		setSecondaryColor(DEFAULT_ORG_COLORS.secondary);
	};

	return (
		<div className={cn("flex w-full flex-col gap-6")}>
			<div className="bg-card border-primary/20 flex w-full flex-col gap-4 rounded-xl border px-4 py-5 shadow-2xs">
				<div className="flex items-center gap-2">
					<Palette className="w-5 h-5" />
					<h2 className="text-sm font-semibold">Personalização de Cores</h2>
				</div>
				<p className="text-xs text-muted-foreground">
					Personalize as cores do seu painel para refletir a identidade visual da sua organização. As cores serão aplicadas aos gráficos, botões e
					outros elementos visuais.
				</p>

				<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
					{/* Primary Color */}
					<div className="flex flex-col gap-3">
						<Label htmlFor="primaryColor" className="text-xs font-medium">
							Cor Primária
						</Label>
						<p className="text-[0.65rem] text-muted-foreground">
							Usada em gráficos de período atual, barras de progresso e elementos de destaque.
						</p>
						<div className="flex items-center gap-3">
							<div className="relative">
								<input
									type="color"
									id="primaryColor"
									value={primaryColor}
									onChange={(e) => setPrimaryColor(e.target.value)}
									className="w-12 h-12 rounded-lg border border-primary/20 cursor-pointer"
								/>
							</div>
							<Input
								type="text"
								value={primaryColor}
								onChange={(e) => {
									const value = e.target.value;
									if (/^#[0-9A-Fa-f]{0,6}$/.test(value)) {
										setPrimaryColor(value);
									}
								}}
								placeholder="#fead41"
								className="w-28 uppercase text-xs"
							/>
						</div>
					</div>

					{/* Secondary Color */}
					<div className="flex flex-col gap-3">
						<Label htmlFor="secondaryColor" className="text-xs font-medium">
							Cor Secundária
						</Label>
						<p className="text-[0.65rem] text-muted-foreground">
							Usada em gráficos de período anterior, valores de estatísticas e elementos complementares.
						</p>
						<div className="flex items-center gap-3">
							<div className="relative">
								<input
									type="color"
									id="secondaryColor"
									value={secondaryColor}
									onChange={(e) => setSecondaryColor(e.target.value)}
									className="w-12 h-12 rounded-lg border border-primary/20 cursor-pointer"
								/>
							</div>
							<Input
								type="text"
								value={secondaryColor}
								onChange={(e) => {
									const value = e.target.value;
									if (/^#[0-9A-Fa-f]{0,6}$/.test(value)) {
										setSecondaryColor(value);
									}
								}}
								placeholder="#15599a"
								className="w-28 uppercase text-xs"
							/>
						</div>
					</div>
				</div>

				{/* Preview Section */}
				<div className="mt-4 p-4 border border-primary/20 rounded-lg">
					<h3 className="text-xs font-medium mb-3">Pré-visualização</h3>
					<div className="flex flex-col gap-4">
						{/* Progress Bar Preview */}
						<div className="flex flex-col gap-1">
							<span className="text-[0.65rem] text-muted-foreground">Barra de Progresso</span>
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
							<span className="text-[0.65rem] text-muted-foreground">Cores dos Gráficos</span>
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
							<span className="text-[0.65rem] text-muted-foreground">Valores de Estatísticas</span>
							<div className="text-2xl font-bold" style={{ color: secondaryColor }}>
								R$ 129.513,28
							</div>
						</div>

						{/* Heatmap Preview */}
						<div className="flex flex-col gap-1">
							<span className="text-[0.65rem] text-muted-foreground">Mapas de Calor</span>
							<div className="flex gap-1">
								{[0.2, 0.4, 0.6, 0.8, 1].map((opacity, index) => (
									<div
										key={index}
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

				{/* Actions */}
				<div className="flex items-center justify-end gap-2 mt-2">
					<Button variant="outline" size="sm" onClick={handleReset} className="flex items-center gap-2">
						<RotateCcw className="w-4 h-4" />
						Restaurar Padrões
					</Button>
					<Button size="sm" onClick={handleSave} disabled={!hasChanges || updateColorsMutation.isPending} className="flex items-center gap-2">
						{updateColorsMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
						Salvar Alterações
					</Button>
				</div>
			</div>
		</div>
	);
}
