"use client";

import type { TAuthUserSession } from "@/lib/authentication/types";
import IfoodLogo from "@/utils/images/integrations/ifood-logo.png";
import { IntegrationProviderCard, type TIntegrationProviderDefinition } from "./_components/IntegrationProviderCard";

const PROVIDERS: TIntegrationProviderDefinition[] = [
	{
		id: "IFOOD",
		nome: "iFood",
		descricao:
			"Sincronize pedidos e clientes automaticamente e gerencie sua loja no iFood: status, pausas, horários de funcionamento e catálogo de produtos.",
		logo: IfoodLogo,
		href: "/dashboard/integrations/ifood",
		brandColor: "#EA1D2C",
	},
];

type IntegrationsPageProps = {
	sessionUser: TAuthUserSession["user"];
	membership: NonNullable<TAuthUserSession["membership"]>;
};

export default function IntegrationsPage({ sessionUser: _sessionUser, membership }: IntegrationsPageProps) {
	const activeIntegrationType = membership.organizacao.integracaoTipo;

	return (
		<div className="flex h-full w-full flex-col gap-3 p-2 lg:p-4">
			<div className="flex w-full flex-col border-b pb-4">
				<h1 className="text-xl font-semibold tracking-tight">Integrações</h1>
				<p className="text-sm text-muted-foreground">Conecte e gerencie as integrações da sua organização com plataformas externas.</p>
			</div>

			<div className="flex w-full flex-wrap items-stretch gap-x-6 gap-y-4">
				{PROVIDERS.map((provider) => (
					<IntegrationProviderCard key={provider.id} provider={provider} isConnected={activeIntegrationType === provider.id} />
				))}
			</div>

			<p className="text-xs text-muted-foreground">Novas integrações serão adicionadas em breve.</p>
		</div>
	);
}
