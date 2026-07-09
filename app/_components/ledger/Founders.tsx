import { Handshake, MapPin, Sparkles } from "lucide-react";
import Image from "next/image";
import { Reveal } from "./_primitives/Reveal";

const FOUNDERS_IMAGE = "https://wawrqfehfafrrnfsycgs.supabase.co/storage/v1/object/public/files/public/RECOMPRACRM%20-%20FOUNDERS.jpg";

const FOUNDERS = [
	{ name: "Lucas", role: "Sócio-fundador" },
	{ name: "Arthur", role: "Sócio-fundador" },
];

const PILLARS = [
	{
		icon: MapPin,
		title: "Nascido no varejo real",
		text: "Construído perto de quem atende o balcão todo dia, não em um escritório distante da operação.",
	},
	{
		icon: Sparkles,
		title: "Produto com dono",
		text: "Cada decisão do RecompraCRM passa por quem fundou a empresa — sem terceirizar o que importa.",
	},
	{
		icon: Handshake,
		title: "Parceria de verdade",
		text: "Quando você fala com a gente, fala com quem tem interesse direto no resultado da sua loja.",
	},
];

export function LedgerFounders() {
	return (
		<section id="fundadores" className="ledger-canvas ledger-deferred relative overflow-hidden py-20 lg:py-28">
			<div className="absolute inset-x-0 top-0 h-px bg-[#24549c]/10" aria-hidden />
			<div className="mx-auto max-w-7xl px-5 lg:px-8">
				<Reveal>
					<div className="grid items-center gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:gap-16">
						{/* Photo */}
						<div className="ledger-fade relative order-2 lg:order-1" style={{ "--i": 3 } as React.CSSProperties} data-stagger>
							<div className="relative overflow-hidden rounded-3xl border border-[#e5e5e5] bg-white shadow-[0_28px_60px_-24px_rgba(36,84,156,0.4),0_6px_14px_rgba(0,0,0,0.05)]">
								<div className="relative aspect-[4/5] w-full sm:aspect-[5/4] lg:aspect-[4/5]">
									<Image
										src={FOUNDERS_IMAGE}
										alt="Lucas e Arthur, sócios-fundadores do RecompraCRM"
										fill
										sizes="(max-width: 1024px) 100vw, 560px"
										className="object-cover object-[center_28%]"
										priority={false}
									/>
									{/* gradient veil for caption legibility */}
									<div
										className="pointer-events-none absolute inset-x-0 bottom-0 h-2/5 bg-gradient-to-t from-[#0f1f3a]/80 via-[#0f1f3a]/25 to-transparent"
										aria-hidden
									/>
								</div>

								{/* Caption plate */}
								<div className="absolute inset-x-0 bottom-0 flex flex-wrap items-end justify-between gap-3 px-5 py-5 sm:px-6">
									<div className="flex flex-wrap items-center gap-x-2 gap-y-1">
										{FOUNDERS.map((founder, index) => (
											<span key={founder.name} className="flex items-center gap-2 text-white">
												{index > 0 ? <span className="text-[#ffb900]/80 text-[15px] font-bold">&</span> : null}
												<span className="text-[17px] font-extrabold tracking-[-0.01em] sm:text-[19px]">{founder.name}</span>
											</span>
										))}
									</div>
									<span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-[10px] font-extrabold uppercase tracking-[0.12em] text-white backdrop-blur-sm">
										<span className="ledger-pulse-dot inline-block h-1.5 w-1.5 rounded-full bg-[#ffb900]" />
										Sócios-fundadores
									</span>
								</div>
							</div>

							{/* Signature accent tag */}
							<div className="absolute -left-3 -top-3 hidden rotate-[-4deg] rounded-2xl bg-[#ffb900] px-4 py-2 shadow-[0_10px_24px_-10px_rgba(255,185,0,0.7)] sm:block">
								<p className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-[#171717]">Feito por quem usa</p>
							</div>
						</div>

						{/* Copy */}
						<div className="order-1 lg:order-2">
							<div className="mb-6 flex items-center gap-3">
								<span className="ledger-fade inline-flex h-7 w-7 items-center justify-center rounded-full bg-[#24549c] text-[11px] font-extrabold text-white ledger-tabular">
									08
								</span>
								<span
									className="ledger-fade text-[11px] font-extrabold uppercase tracking-[0.16em] text-[#24549c]"
									style={{ "--i": 1 } as React.CSSProperties}
									data-stagger
								>
									Fundadores
								</span>
								<span className="ledger-fade h-px flex-1 bg-[#24549c]/15" style={{ "--i": 2 } as React.CSSProperties} data-stagger />
							</div>

							<h2 className="font-extrabold text-[#171717] tracking-[-0.02em] leading-[1.05] text-[34px] sm:text-[42px] lg:text-[56px] max-w-[16ch]">
								<span className="block ledger-write" style={{ "--i": 1 } as React.CSSProperties} data-stagger>
									Quem está por trás
								</span>
								<span className="block ledger-fade text-[#24549c]" style={{ "--i": 4 } as React.CSSProperties} data-stagger>
									do RecompraCRM.
								</span>
							</h2>

							<p
								className="ledger-fade mt-6 max-w-[54ch] text-[15px] leading-[1.65] text-[#171717]/70 lg:text-[17px]"
								style={{ "--i": 6 } as React.CSSProperties}
								data-stagger
							>
								Lucas e Arthur fundaram o RecompraCRM depois de ver, de perto, lojas que vendiam bem mas perdiam o cliente logo
								depois da compra. A ferramenta que faltava não existia — então decidiram construí-la, do balcão para o código.
							</p>

							<div className="ledger-fade mt-8 space-y-4" style={{ "--i": 8 } as React.CSSProperties} data-stagger>
								{PILLARS.map((pillar) => (
									<div key={pillar.title} className="flex gap-4">
										<span className="mt-0.5 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#24549c]/10 text-[#24549c]">
											<pillar.icon className="h-5 w-5" strokeWidth={2.2} />
										</span>
										<div className="min-w-0">
											<p className="text-[15px] font-extrabold text-[#171717] sm:text-[16px]">{pillar.title}</p>
											<p className="mt-1 max-w-[52ch] text-[13px] leading-[1.6] text-[#171717]/65 sm:text-[14px]">{pillar.text}</p>
										</div>
									</div>
								))}
							</div>
						</div>
					</div>
				</Reveal>
			</div>
		</section>
	);
}
