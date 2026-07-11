import { INTEGRATION_PAGES } from "@/app/_content/integration-pages";
import { IntegrationCard } from "@/components/Content/Integration/IntegrationCard";
import type { Metadata } from "next";

const BASE_URL = "https://www.recompracrm.com.br";

export const metadata: Metadata = {
	title: "Integrações — Conecte seu ERP, PDV ou e-commerce ao RecompraCRM",
	description:
		"Conecte Bling, Cardápio Web, Online Software, Nuvem Shop e iFood ao RecompraCRM. Importe vendas, clientes e produtos automaticamente e ative cashback, RFM e campanhas de WhatsApp.",
	alternates: { canonical: `${BASE_URL}/integrations` },
	openGraph: {
		title: "Integrações RecompraCRM — ERP, PDV e e-commerce",
		description: "Importe vendas, clientes e produtos automaticamente e transforme cada venda em recompra.",
		url: `${BASE_URL}/integrations`,
		type: "website",
	},
};

export default function IntegrationsHubPage() {
	const itemListJsonLd = {
		"@context": "https://schema.org",
		"@type": "ItemList",
		itemListElement: INTEGRATION_PAGES.map((integration, i) => ({
			"@type": "ListItem",
			position: i + 1,
			name: `Integração ${integration.name}`,
			url: `${BASE_URL}/integrations/${integration.slug}`,
		})),
	};

	return (
		<>
			<script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListJsonLd) }} />

			<main className="px-6 pb-20 pt-28">
				<div className="container mx-auto max-w-5xl">
					<div className="mb-14 text-center">
						<span className="mb-5 inline-block rounded-full bg-blue-50 px-4 py-2 text-xs font-bold uppercase tracking-widest text-[#24549C]">Integrações</span>
						<h1 className="mb-4 text-4xl font-black tracking-tight text-slate-900 sm:text-5xl">
							Seus dados de venda, <span className="text-[#24549C]">sem digitar duas vezes</span>
						</h1>
						<p className="mx-auto max-w-2xl text-lg leading-relaxed text-slate-500">
							Conecte o sistema que sua loja já usa. O RecompraCRM importa vendas, clientes e produtos automaticamente e coloca cashback, análise RFM e campanhas
							de WhatsApp para rodar sozinhos.
						</p>
					</div>

					<div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
						{INTEGRATION_PAGES.map((integration) => (
							<IntegrationCard key={integration.slug} integration={integration} />
						))}
					</div>
				</div>
			</main>
		</>
	);
}
