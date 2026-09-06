"use client";

import { Button } from "@/components/ui/button";
import type { TOnboardingReadiness } from "@/lib/onboarding/readiness";
import BlingLogo from "@/utils/images/integrations/bling-logo.png";
import NuvemshopLogo from "@/utils/images/integrations/nuvemshop-logo.png";
import { Plug, Store } from "lucide-react";
import Image, { type StaticImageData } from "next/image";
import { ChoiceList } from "../shared/ChoiceList";
import { ReadinessPill } from "../shared/ReadinessPill";

type TDataSourceMode = "INTEGRACAO" | "POI" | "DEPOIS";

type DataSourceStageProps = {
	mode: TDataSourceMode | null;
	onChangeMode: (mode: TDataSourceMode) => void;
	readiness: TOnboardingReadiness | null;
};

const OAUTH_INTEGRATIONS: { key: string; nome: string; descricao: string; logo: StaticImageData; authUrl: string }[] = [
	{
		key: "BLING",
		nome: "Bling",
		descricao: "ERP para varejo e e-commerce. Vendas e clientes entram automaticamente.",
		logo: BlingLogo,
		authUrl: "/api/integrations/bling/auth?redirectTo=/onboarding",
	},
	{
		key: "NUVEM-SHOP",
		nome: "Nuvemshop",
		descricao: "Loja online. Pedidos e clientes da sua loja entram automaticamente.",
		logo: NuvemshopLogo,
		authUrl: "/api/integrations/nuvemshop/auth?redirectTo=/onboarding",
	},
];

const INTEGRATION_STATUS_LABEL = { CONECTADO: "Conectada", EXPIRADO: "Expirada", ERRO: "Com erro" } as const;

export function DataSourceStage({ mode, onChangeMode, readiness }: DataSourceStageProps) {
	const integrations = readiness?.fonteDados.integracoes ?? [];
	const connectedTypes = new Set(integrations.map((integration) => integration.tipo));

	return (
		<div className="flex w-full max-w-[640px] flex-col gap-6">
			<ChoiceList<TDataSourceMode>
				label="Fonte de vendas"
				value={mode}
				onChange={onChangeMode}
				options={[
					{
						value: "INTEGRACAO",
						titulo: "Conectar o sistema que já uso",
						descricao: "ERP ou loja online. O histórico recente é importado em segundo plano e as novas vendas chegam sozinhas.",
						icon: <Plug />,
					},
					{
						value: "POI",
						titulo: "Registrar no balcão",
						descricao: "Pelo Ponto de Interação, no tablet ou celular, a partir do telefone do cliente. Sem integração agora.",
						icon: <Store />,
					},
				]}
			/>

			{mode === "INTEGRACAO" ? (
				<section className="flex flex-col gap-3">
					<p className="text-[11px] font-extrabold tracking-[0.08em] text-muted-foreground uppercase">Sistemas disponíveis</p>
					<ul className="flex flex-col divide-y divide-border rounded-xl border border-border">
						{OAUTH_INTEGRATIONS.map((integration) => {
							const connected = integrations.find((row) => row.tipo === integration.key);
							return (
								<li key={integration.key} className="flex items-center gap-4 p-4">
									<span className="relative flex h-10 w-16 shrink-0 items-center justify-center rounded-lg border border-border bg-background p-1.5">
										<Image src={integration.logo} alt={integration.nome} fill className="object-contain p-1.5" />
									</span>
									<span className="flex min-w-0 grow flex-col gap-0.5">
										<span className="flex items-center gap-2">
											<span className="text-sm font-bold">{integration.nome}</span>
											{connected ? (
												<ReadinessPill tone={connected.status === "CONECTADO" ? "ok" : "falhou"}>{INTEGRATION_STATUS_LABEL[connected.status]}</ReadinessPill>
											) : null}
										</span>
										<span className="text-sm leading-snug text-muted-foreground">{integration.descricao}</span>
									</span>
									<Button asChild size="sm" variant={connected ? "outline" : "default"} className="shrink-0 font-bold">
										<a href={integration.authUrl}>{connected ? "Reconectar" : "Conectar"}</a>
									</Button>
								</li>
							);
						})}
					</ul>
					<p className="text-xs text-muted-foreground">
						Online Software, Cardápio Web, iFood e ERP Flex podem ser conectados depois, em Configurações.
						{connectedTypes.size > 0 ? " Você pode continuar enquanto a importação anda." : ""}
					</p>
				</section>
			) : null}

			{mode === "POI" ? (
				<div className="rounded-xl border border-border p-4 text-sm text-muted-foreground">
					<p>
						Você registra vendas e cashback no balcão, começando pelo telefone do cliente. O QR Code de acesso do Ponto de Interação já fica pronto no
						painel. Se conectar um sistema depois, as duas fontes convivem.
					</p>
				</div>
			) : null}
		</div>
	);
}
