import { AlertTriangle, CheckCircle2, Coins, Store, Zap } from "lucide-react";
import { ArtChip, LandingArt } from "./_primitives/LandingArt";
import { Reveal } from "./_primitives/Reveal";
import { SectionHeader } from "./_primitives/SectionHeader";
import { Stamp } from "./_primitives/Stamp";

type FeatureEntry = {
	index: string;
	header: string;
	title: string;
	desc: string;
	bullets: string[];
	stamp: string;
	stampVariant: "soft-blue" | "soft-amber" | "success";
	art: string;
	overlay: React.ReactNode;
};

const ART_SIZES = "(max-width: 1023px) 360px, 420px";

const ENTRIES: FeatureEntry[] = [
	{
		index: "01",
		header: "Campanhas inteligentes",
		title: "Gatilhos e filtros para agir no momento exato.",
		desc: "Não é escolher uma lista e disparar. O RecompraCRM combina gatilhos de comportamento com filtros de audiência para cada mensagem chegar no contexto certo.",
		bullets: [
			"Gatilhos por primeira compra, nova compra, aniversário e RFM",
			"Filtros por recência, frequência, valor gasto, cidade e produto",
			"Campanhas recorrentes ou ações pontuais de lançamento",
			"Resultado por campanha: enviados, lidos, convertidos e receita",
		],
		stamp: "Hora certa",
		stampVariant: "soft-amber",
		art: "/images/landing/campaign-triggers.png",
		overlay: (
			<ArtChip className="top-[8%] right-[2%]" tone="amber" icon={<Zap />}>
				Aniversário · Inatividade · RFM
			</ArtChip>
		),
	},
	{
		index: "02",
		header: "WhatsApp da loja",
		title: "Sai pelo seu número, com a sua marca.",
		desc: "Campanha automática não precisa parecer disparo genérico. A mensagem chega pelo canal da própria empresa, com texto, imagem e linguagem configurados para aquela marca.",
		bullets: [
			"Envio pelo número conectado da própria empresa",
			"Header visual da marca em campanhas com imagem",
			"Templates com variáveis como nome, saldo e última compra",
			"Funil de conversão com taxa de retorno por campanha",
		],
		stamp: "Lido ✓✓",
		stampVariant: "success",
		art: "/images/onboarding/whatsapp-gateway.png",
		overlay: (
			<div className="absolute bottom-[9%] left-[2%] z-10 max-w-[64%] rounded-2xl rounded-bl-md bg-white p-3 shadow-[0_14px_32px_-14px_rgba(36,84,156,0.45),0_2px_6px_rgba(0,0,0,0.06)]">
				<p className="text-[12px] leading-snug text-[#171717] sm:text-[13px]">
					Oi, <strong>Maria</strong>! Seu saldo de <strong className="rounded bg-[#ffb900]/35 px-1 text-[#24549c]">R$ 28,50</strong> vence em 5 dias.
				</p>
				<p className="ledger-tabular mt-1.5 text-right text-[10px] text-[#171717]/40">09:14 ✓✓</p>
			</div>
		),
	},
	{
		index: "03",
		header: "Clientes em risco",
		title: "Saiba quem vai sumir antes que ele suma.",
		desc: "O sistema classifica sua base automaticamente: campeões, clientes em risco, inativos. Você vê em um painel claro e age com um clique.",
		bullets: [
			"Segmentação automática por frequência e recência",
			"Alerta quando um bom cliente começa a sumir",
			"Ação direta: oferta para o segmento na hora",
			"Histórico completo de cada cliente",
		],
		stamp: "Em risco · 47d",
		stampVariant: "soft-blue",
		art: "/images/landing/at-risk-lens.png",
		overlay: (
			<>
				<ArtChip className="top-[10%] left-[0%]" tone="white" icon={<AlertTriangle className="text-[#e6a700]" />}>
					Em risco · 47 dias sem comprar
				</ArtChip>
				<ArtChip className="right-[2%] bottom-[10%]" tone="blue" icon={<CheckCircle2 />}>
					Oferta enviada
				</ArtChip>
			</>
		),
	},
	{
		index: "04",
		header: "Programa de fidelidade",
		title: "Cashback e resgate para quem vende no balcão.",
		desc: "O ponto de interação fecha o ciclo: o cliente acumula, consulta e resgata benefícios informando o telefone, sem baixar aplicativo.",
		bullets: [
			"Cashback acumulado a partir de vendas registradas",
			"Resgate no ponto de interação com senha do operador",
			"QR Code para uso no celular do próprio cliente",
			"Desconto direto ou troca por prêmios físicos",
		],
		stamp: "Fidelidade",
		stampVariant: "soft-blue",
		art: "/images/onboarding/cashback-reward.png",
		overlay: (
			<>
				<ArtChip className="top-[6%] left-[2%]" tone="amber" icon={<Coins />}>
					Saldo · R$ 28,50
				</ArtChip>
				<ArtChip className="right-[0%] bottom-[8%]" tone="blue" icon={<Store />}>
					Resgate no balcão · sem app
				</ArtChip>
			</>
		),
	},
];

export function LedgerFeatures() {
	return (
		<section id="inventario" className="ledger-canvas-soft ledger-deferred relative py-20 lg:py-28">
			<div className="mx-auto max-w-7xl px-5 lg:px-8">
				<SectionHeader
					eyebrow="Funcionalidades"
					title={
						<>
							<span className="ledger-write block" style={{ "--i": 1 } as React.CSSProperties} data-stagger>
								Tudo que você precisa.
							</span>
							<span className="ledger-fade mt-1 block text-[#171717]/55" style={{ "--i": 4 } as React.CSSProperties} data-stagger>
								Nada que você não vai usar.
							</span>
						</>
					}
				/>

				<div className="space-y-14 lg:space-y-24">
					{ENTRIES.map((entry, idx) => (
						<Reveal key={entry.index}>
							<article className={`grid items-center gap-8 lg:grid-cols-12 lg:gap-12 ${idx % 2 === 1 ? "lg:[&>div:first-child]:order-2" : ""}`}>
								{/* Text */}
								<div className="lg:col-span-7">
									<div className="mb-5 flex flex-wrap items-center gap-3">
										<span
											className="ledger-fade ledger-tabular inline-flex h-9 w-9 items-center justify-center rounded-2xl bg-[#24549c]/10 text-[12px] font-extrabold text-[#24549c]"
											style={{ "--i": 0 } as React.CSSProperties}
											data-stagger
										>
											{entry.index}
										</span>
										<span className="ledger-fade text-[11px] font-extrabold uppercase tracking-[0.16em] text-[#24549c]" style={{ "--i": 1 } as React.CSSProperties} data-stagger>
											{entry.header}
										</span>
										<span className="ledger-fade" style={{ "--i": 3 } as React.CSSProperties} data-stagger>
											<Stamp variant={entry.stampVariant} size="sm">
												{entry.stamp}
											</Stamp>
										</span>
									</div>

									<h3
										className="ledger-fade mb-4 max-w-[22ch] text-[26px] font-extrabold leading-[1.1] tracking-[-0.018em] text-[#171717] lg:text-[36px]"
										style={{ "--i": 2 } as React.CSSProperties}
										data-stagger
									>
										{entry.title}
									</h3>
									<p className="ledger-fade mb-6 max-w-[58ch] text-[15px] leading-[1.65] text-[#171717]/70 lg:text-[16px]" style={{ "--i": 4 } as React.CSSProperties} data-stagger>
										{entry.desc}
									</p>

									<ul className="ledger-fade max-w-[56ch] space-y-2.5" style={{ "--i": 6 } as React.CSSProperties} data-stagger>
										{entry.bullets.map((bullet) => (
											<li key={bullet} className="flex items-start gap-3">
												<span className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#24549c]/10">
													<CheckCircle2 className="h-3 w-3 text-[#24549c]" strokeWidth={2.5} />
												</span>
												<span className="flex-1 text-[14px] leading-snug text-[#171717]/85">{bullet}</span>
											</li>
										))}
									</ul>
								</div>

								{/* Art */}
								<div className="lg:col-span-5">
									<div className="ledger-fade" style={{ "--i": 4 } as React.CSSProperties} data-stagger>
										<LandingArt src={entry.art} sizes={ART_SIZES} className="mx-auto w-full max-w-[340px] sm:max-w-[380px] lg:max-w-[440px]">
											{entry.overlay}
										</LandingArt>
									</div>
								</div>
							</article>
						</Reveal>
					))}
				</div>
			</div>
		</section>
	);
}
