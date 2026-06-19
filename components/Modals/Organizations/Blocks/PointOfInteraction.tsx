"use client";

import ResponsiveMenuSection from "@/components/Utils/ResponsiveMenuSection";
import { Switch } from "@/components/ui/switch";
import type { TUseOrganizationBaseState } from "@/state-hooks/use-organization-state";
import { ShieldCheck } from "lucide-react";

type AdminOrganizationPointOfInteractionBlockProps = {
	poiConfirmacaoValorObrigatoria: boolean;
	updateOrganization: TUseOrganizationBaseState["updateOrganization"];
};

export default function AdminOrganizationPointOfInteractionBlock({
	poiConfirmacaoValorObrigatoria,
	updateOrganization,
}: AdminOrganizationPointOfInteractionBlockProps) {
	return (
		<ResponsiveMenuSection title="PONTO DE INTERAÇÃO" icon={<ShieldCheck className="h-4 w-4 min-h-4 min-w-4" />}>
			<div className="flex items-center justify-between gap-4 rounded-lg border border-border bg-muted/20 px-4 py-3">
				<div className="flex flex-col gap-0.5">
					<span className="text-sm font-medium tracking-tight">Confirmação obrigatória do valor</span>
					<span className="text-xs text-muted-foreground">
						Exige que o operador informe novamente o valor final da venda e sua senha antes de aprovar uma transação no POI. Resgates de recompensa não
						exigem essa confirmação.
					</span>
				</div>
				<Switch checked={poiConfirmacaoValorObrigatoria} onCheckedChange={(checked) => updateOrganization({ poiConfirmacaoValorObrigatoria: checked })} />
			</div>
		</ResponsiveMenuSection>
	);
}
