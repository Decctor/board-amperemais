import { BadgeCheck, MessageCircle, ShieldCheck } from "lucide-react";
import { LandingArt } from "./_primitives/LandingArt";
import { Reveal } from "./_primitives/Reveal";
import { Stamp } from "./_primitives/Stamp";

const POINTS = [
	{
		icon: BadgeCheck,
		title: "WhatsApp oficial.",
		text: "Envio pela API oficial da Meta, com o número da própria loja. Nada de chip avulso nem número desconhecido.",
	},
	{
		icon: ShieldCheck,
		title: "LGPD.",
		text: "Os dados dos seus clientes são seus. Consentimento registrado e exclusão sob demanda.",
	},
	{
		icon: MessageCircle,
		title: "Suporte humano.",
		text: "Time comercial e de suporte no WhatsApp, em horário comercial. Pagamento seguro via Stripe.",
	},
] as const;

const BADGES = ["API oficial da Meta", "LGPD", "Pagamento Stripe"];

export function LedgerTrust() {
	return (
		<section id="confianca" className="ledger-canvas-soft ledger-deferred relative py-20 lg:py-28">
			<div className="mx-auto max-w-7xl px-5 lg:px-8">
				<Reveal className="grid items-center gap-10 lg:grid-cols-12 lg:gap-14">
					<div className="ledger-fade order-2 lg:order-1 lg:col-span-5" style={{ "--i": 3 } as React.CSSProperties} data-stagger>
						<LandingArt src="/images/onboarding/whatsapp-connection.png" sizes="(max-width: 1023px) 360px, 460px" className="mx-auto w-full max-w-[340px] sm:max-w-[400px] lg:max-w-[470px]" />
					</div>

					<div className="order-1 lg:order-2 lg:col-span-7">
						<div className="mb-5 flex items-center gap-3">
							<span className="ledger-fade inline-block h-1.5 w-1.5 rounded-full bg-[#ffb900]" aria-hidden />
							<span className="ledger-fade text-[11px] font-extrabold uppercase tracking-[0.16em] text-[#24549c]" style={{ "--i": 1 } as React.CSSProperties} data-stagger>
								Oficial e seguro
							</span>
						</div>
						<h2 className="max-w-[18ch] font-extrabold leading-[1.05] tracking-[-0.02em] text-[#171717] text-[32px] sm:text-[42px] lg:text-[50px]">
							<span className="ledger-write block" style={{ "--i": 1 } as React.CSSProperties} data-stagger>
								Mensagem oficial. Dados protegidos.
							</span>
							<span className="ledger-fade mt-1 block text-[#171717]/55" style={{ "--i": 4 } as React.CSSProperties} data-stagger>
								Gente do outro lado.
							</span>
						</h2>

						<ul className="ledger-fade mt-8 space-y-5" style={{ "--i": 6 } as React.CSSProperties} data-stagger>
							{POINTS.map((point) => {
								const Icon = point.icon;
								return (
									<li key={point.title} className="flex items-start gap-4">
										<span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#24549c]/10 text-[#24549c]">
											<Icon className="h-5 w-5" strokeWidth={2.2} />
										</span>
										<div>
											<p className="text-[16px] font-extrabold tracking-[-0.01em] text-[#171717] lg:text-[17px]">{point.title}</p>
											<p className="mt-1 max-w-[52ch] text-[14px] leading-[1.6] text-[#171717]/65 lg:text-[15px]">{point.text}</p>
										</div>
									</li>
								);
							})}
						</ul>

						<div className="ledger-fade mt-8 flex flex-wrap gap-2" style={{ "--i": 8 } as React.CSSProperties} data-stagger>
							{BADGES.map((badge) => (
								<Stamp key={badge} variant="soft-blue" size="md">
									{badge}
								</Stamp>
							))}
						</div>
					</div>
				</Reveal>
			</div>
		</section>
	);
}
