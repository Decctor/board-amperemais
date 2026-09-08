import { INTEGRATION_PAGES } from "@/app/_content/integration-pages";
import { ArrowRight, Plug } from "lucide-react";
import Image from "next/image";
import { Reveal } from "./_primitives/Reveal";
import { SectionHeader } from "./_primitives/SectionHeader";
import { Stamp } from "./_primitives/Stamp";
import { TrackedLink } from "./TrackedLink";

// Short, benefit-first pitch per integration (landing copy lives inline, like
// the other ledger sections). Keyed by slug from INTEGRATION_PAGES.
const PITCHES: Record<string, string> = {
	bling: "Vendas, clientes e produtos do seu ERP Bling, no automático.",
	"online-software": "Vendas de balcão do seu ERP, com vendedores e dados fiscais.",
	"cardapio-web": "Pedidos de delivery, retirada e salão viram base de clientes.",
	"nuvem-shop": "Pedidos da sua loja online, com clientes e variantes de produto.",
	ifood: "Clientes do iFood na sua base, prontos para reativar no WhatsApp.",
};

const CARD_SHADOW = "shadow-[0_12px_36px_-24px_rgba(36,84,156,0.35)]";

export function LedgerIntegrations() {
	return (
		<section id="integracoes" className="ledger-canvas ledger-deferred relative py-20 lg:py-28">
			<div className="mx-auto max-w-7xl px-5 lg:px-8">
				<SectionHeader
					eyebrow="Integrações"
					title={
						<>
							<span className="ledger-write block" style={{ "--i": 1 } as React.CSSProperties} data-stagger>
								Conecta com o que sua loja já usa.
							</span>
							<span className="ledger-fade mt-1 block text-[#171717]/55" style={{ "--i": 4 } as React.CSSProperties} data-stagger>
								Seus dados entram sozinhos.
							</span>
						</>
					}
					description="Já tem ERP, PDV ou loja online? O RecompraCRM importa suas vendas, clientes e produtos automaticamente, sem digitar nada duas vezes."
				/>

				{/* Cards */}
				<Reveal>
					<div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
						{INTEGRATION_PAGES.map((integration) => (
							<TrackedLink
								key={integration.slug}
								href={`/integrations/${integration.slug}`}
								event="landing_integration_click"
								properties={{ integration: integration.slug, location: "landing_integrations" }}
								className={`group flex flex-col rounded-3xl border border-[#e5e5e5] bg-white p-5 transition-all duration-300 hover:-translate-y-1 hover:border-[#24549c]/30 ${CARD_SHADOW}`}
							>
								<div className="flex items-center justify-between">
									<div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-[#e5e5e5] bg-[#f7f9fc] p-2">
										<Image src={integration.logo} alt={integration.logoAlt} className="h-full w-full object-contain" />
									</div>
									<Stamp variant="soft-blue" size="sm">
										{integration.category}
									</Stamp>
								</div>
								<h3 className="mt-4 text-[18px] font-extrabold tracking-[-0.015em] text-[#171717]">{integration.name}</h3>
								<p className="mt-1.5 flex-1 text-[13px] leading-[1.6] text-[#171717]/65">{PITCHES[integration.slug] ?? integration.heroSubtitle}</p>
								<span className="mt-4 inline-flex items-center gap-1.5 text-[13px] font-extrabold text-[#24549c]">
									Ver integração
									<ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
								</span>
							</TrackedLink>
						))}

						{/* Hub CTA card */}
						<TrackedLink
							href="/integrations"
							event="landing_integrations_view_all"
							properties={{ location: "landing_integrations" }}
							className="group flex flex-col justify-between rounded-3xl border border-dashed border-[#24549c]/30 bg-[#24549c]/5 p-5 transition-colors duration-300 hover:bg-[#24549c]/10"
						>
							<div>
								<span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-[#24549c] text-white">
									<Plug className="h-5 w-5" />
								</span>
								<h3 className="mt-4 text-[18px] font-extrabold tracking-[-0.015em] text-[#171717]">Todas as integrações</h3>
								<p className="mt-1.5 text-[13px] leading-[1.6] text-[#171717]/65">Veja como cada conexão funciona e o que importamos, em detalhe.</p>
							</div>
							<span className="mt-5 inline-flex items-center gap-1.5 text-[13px] font-extrabold text-[#24549c]">
								Explorar todas
								<ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
							</span>
						</TrackedLink>
					</div>
				</Reveal>
			</div>
		</section>
	);
}
