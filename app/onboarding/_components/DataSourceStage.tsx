"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { TUseOrganizationOnboardingState } from "@/state-hooks/use-organization-onboarding-state";
import BlingLogo from "@/utils/images/integrations/bling-logo.png";
import NuvemshopLogo from "@/utils/images/integrations/nuvemshop-logo.png";
import { CheckCircle2, Database, Plug, Store } from "lucide-react";
import Image, { type StaticImageData } from "next/image";

type DataSourceStageProps = {
	state: TUseOrganizationOnboardingState["state"];
	updateDataSource: TUseOrganizationOnboardingState["updateDataSource"];
};

const OAUTH_INTEGRATIONS: { key: string; nome: string; descricao: string; logo: StaticImageData; authUrl: string }[] = [
	{
		key: "BLING",
		nome: "Bling",
		descricao: "ERP popular para varejo e e-commerce. Sincroniza vendas e clientes automaticamente.",
		logo: BlingLogo,
		authUrl: "/api/integrations/bling/auth?redirectTo=/onboarding",
	},
	{
		key: "NUVEM-SHOP",
		nome: "Nuvem Shop",
		descricao: "Plataforma de e-commerce. Importa seus pedidos e clientes da loja online.",
		logo: NuvemshopLogo,
		authUrl: "/api/integrations/nuvemshop/auth?redirectTo=/onboarding",
	},
];

export function DataSourceStage({ state, updateDataSource }: DataSourceStageProps) {
	const mode = state.dataSource.mode;
	const connectedIntegration = state.organization.integracaoTipo;

	return (
		<div className="flex flex-col gap-4">
			<p className="text-sm text-muted-foreground tracking-tight">
				De onde virão os dados de vendas? Conecte um sistema que você já usa ou comece registrando as vendas direto no balcão pelo Ponto de Interação.
			</p>

			<div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
				<ModeCard
					selected={mode === "INTEGRATION"}
					onSelect={() => updateDataSource({ mode: "INTEGRATION" })}
					icon={<Plug className="h-5 w-5" />}
					title="Conectar uma integração"
					description="Já uso um ERP ou plataforma de e-commerce."
				/>
				<ModeCard
					selected={mode === "POI"}
					onSelect={() => updateDataSource({ mode: "POI", integrationKey: null })}
					icon={<Store className="h-5 w-5" />}
					title="Usar o Ponto de Interação"
					description="Vou registrar as vendas no balcão pelo tablet/celular."
				/>
			</div>

			{mode === "INTEGRATION" && (
				<div className="flex flex-col gap-3 rounded-2xl border border-border bg-superficie/40 p-4">
					{connectedIntegration && (
						<div className="flex items-center gap-2 rounded-xl border border-green-200 bg-green-50 px-3 py-2 text-sm font-semibold text-green-700">
							<CheckCircle2 className="h-4 w-4" />
							Integração {connectedIntegration} conectada.
						</div>
					)}
					<div className="grid grid-cols-1 gap-3">
						{OAUTH_INTEGRATIONS.map((integration) => (
							<div key={integration.key} className="flex items-center gap-3 rounded-xl border border-border bg-white p-3">
								<div className="relative h-10 w-20 shrink-0">
									<Image src={integration.logo} alt={integration.nome} fill className="object-contain" />
								</div>
								<div className="flex flex-col gap-0.5">
									<span className="font-semibold text-gray-900">{integration.nome}</span>
									<span className="text-xs text-muted-foreground leading-snug">{integration.descricao}</span>
								</div>
								<a href={integration.authUrl} className="ml-auto shrink-0">
									<Button size="sm" className="rounded-xl bg-[#24549C] text-white hover:bg-[#1a3d7a]">
										Conectar
									</Button>
								</a>
							</div>
						))}
					</div>
					<p className="text-xs text-muted-foreground">Outras integrações (Online Software, Cardápio Web, iFood) podem ser conectadas depois, nas configurações.</p>
				</div>
			)}

			{mode === "POI" && (
				<div className="flex items-start gap-3 rounded-2xl border border-[#24549C]/20 bg-[#24549C]/[0.04] p-4">
					<span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#24549C]/10 text-[#24549C]">
						<Database className="h-5 w-5" />
					</span>
					<div className="flex flex-col gap-1">
						<span className="font-semibold text-gray-900">Ponto de Interação</span>
						<p className="text-sm text-muted-foreground leading-relaxed">
							Você vai registrar as vendas e o cashback direto no balcão, pelo tablet ou celular, começando pelo telefone do cliente. Seu QR Code de acesso já
							estará pronto no painel. Sem necessidade de integração agora.
						</p>
					</div>
				</div>
			)}
		</div>
	);
}

function ModeCard({
	selected,
	onSelect,
	icon,
	title,
	description,
}: {
	selected: boolean;
	onSelect: () => void;
	icon: React.ReactNode;
	title: string;
	description: string;
}) {
	return (
		<button
			type="button"
			onClick={onSelect}
			className={cn(
				"flex flex-col items-start gap-2 rounded-2xl border-2 p-4 text-left transition-all duration-200 hover:-translate-y-0.5",
				selected ? "border-[#24549C] bg-[#24549C]/[0.04] shadow-sm" : "border-gray-100 bg-white hover:border-[#24549C]/40",
			)}
		>
			<span
				className={cn(
					"flex h-10 w-10 items-center justify-center rounded-xl transition-colors",
					selected ? "bg-[#24549C] text-white" : "bg-superficie text-gray-500",
				)}
			>
				{icon}
			</span>
			<span className="font-bold text-gray-900 tracking-tight">{title}</span>
			<span className="text-sm text-muted-foreground leading-snug">{description}</span>
		</button>
	);
}
