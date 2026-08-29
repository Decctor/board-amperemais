"use client";

import ResponsiveMenuSection from "@/components/Utils/ResponsiveMenuSection";
import { Switch } from "@/components/ui/switch";
import { formatDateAsLocale } from "@/lib/formatting";
import type { TOrganizationBaseState, TUseOrganizationBaseState } from "@/state-hooks/use-organization-state";
import dayjs from "dayjs";
import { Headset } from "lucide-react";

type AdminOrganizationManagedServiceBlockProps = {
	organization: TOrganizationBaseState["organization"];
	updateOrganization: TUseOrganizationBaseState["updateOrganization"];
};

export default function AdminOrganizationManagedServiceBlock({ organization, updateOrganization }: AdminOrganizationManagedServiceBlockProps) {
	// Espelha a ativação por compra do add-on (generate-checkout): fotografa o marco do baseline
	// ao ativar e preserva o existente, para uma reativação não reescrever o histórico.
	function handleToggleConsultoria(consultoriaAtiva: boolean) {
		updateOrganization({
			consultoriaAtiva,
			baselineInicio: consultoriaAtiva ? (organization.baselineInicio ?? dayjs().startOf("day").toDate()) : organization.baselineInicio,
		});
	}

	return (
		<ResponsiveMenuSection title="GESTÃO ASSISTIDA" icon={<Headset className="h-4 w-4 min-h-4 min-w-4" />}>
			<p className="text-xs text-muted-foreground">
				Marque quando a conta for operada pelo nosso time (gestor de crescimento dedicado). Além do add-on comercial, é o que autoriza uma conexão MCP de
				plataforma a criar e ajustar campanhas desta organização — desligar encerra essa permissão na hora.
			</p>

			<div className="flex items-center justify-between gap-3 rounded-md border border-border p-3">
				<div className="flex flex-col">
					<span className="text-sm font-medium text-foreground">Consultoria ativa</span>
					<span className="text-xs text-muted-foreground">
						{organization.consultoriaAtiva ? "A conta é operada pelo nosso time." : "A conta é operada pelo próprio cliente."}
					</span>
				</div>
				<Switch checked={organization.consultoriaAtiva} onCheckedChange={handleToggleConsultoria} />
			</div>

			{organization.baselineInicio ? (
				<p className="text-xs font-medium text-foreground/80">
					Baseline desde {formatDateAsLocale(organization.baselineInicio)} — resultados anteriores a esta data contam como linha de base.
				</p>
			) : null}
		</ResponsiveMenuSection>
	);
}
