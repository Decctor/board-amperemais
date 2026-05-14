import Link from "next/link";

export default function SimpleHero() {
	return (
		<section className="bg-gradient-to-b from-slate-50 via-white to-blue-50/40 pt-28 pb-20 px-5 lg:px-8">
			<div className="max-w-6xl mx-auto grid lg:grid-cols-2 gap-16 items-center">
				<div>
					<h1 className="text-5xl lg:text-6xl font-black text-slate-900 leading-[1.1] tracking-tight mb-6">
						Seu cliente comprou.
						<br />
						<span className="text-[#24549C]">Vai voltar?</span>
					</h1>

					<p className="text-lg text-slate-600 leading-relaxed max-w-lg mb-8">
						A maioria das lojas não sabe responder essa pergunta e perde venda sem perceber. O RecompraCRM transforma cada compra em relacionamento:
						cashback no balcão, WhatsApp automático, e visão clara de quem está sumindo.
					</p>

					<div className="flex flex-wrap gap-3 mb-8">
						<Link
							href="/auth/signup"
							className="inline-flex items-center bg-[#24549C] hover:bg-[#1e4682] text-white font-bold px-7 py-3.5 rounded-xl shadow-lg shadow-blue-900/15 hover:shadow-blue-900/25 hover:-translate-y-0.5 transition-all duration-200 text-[15px]"
						>
							Testar 15 dias grátis →
						</Link>
						<a
							href="#como-funciona"
							className="inline-flex items-center bg-white border-2 border-slate-200 hover:border-[#24549C]/30 text-slate-700 font-semibold px-7 py-3.5 rounded-xl hover:-translate-y-0.5 transition-all duration-200 text-[15px]"
						>
							Ver como funciona
						</a>
					</div>

					<div className="flex flex-wrap gap-x-5 gap-y-2">
						{["Sem app para o cliente baixar", "Sem integração com sistema", "Ativo em menos de 24h"].map((t) => (
							<span key={t} className="flex items-center gap-1.5 text-sm text-slate-500 font-medium">
								<span className="w-1.5 h-1.5 rounded-full bg-[#FFB900] shrink-0" />
								{t}
							</span>
						))}
					</div>
				</div>

				<div className="hidden lg:flex justify-center">
					<POIMockupHero />
				</div>
			</div>
		</section>
	);
}

function POIMockupHero() {
	return (
		<div className="relative w-full max-w-[340px]">
			<div className="absolute -inset-6 bg-[#24549C]/6 rounded-[48px] blur-3xl" />
			<div className="relative bg-[#1a2f5a] rounded-[28px] p-5 border border-white/8 shadow-2xl shadow-blue-950/50">
				{/* title bar */}
				<div className="flex items-center gap-2 pb-4 border-b border-white/8 mb-4">
					<div className="flex gap-1.5">
						<div className="w-2.5 h-2.5 rounded-full bg-red-500/70" />
						<div className="w-2.5 h-2.5 rounded-full bg-yellow-500/70" />
						<div className="w-2.5 h-2.5 rounded-full bg-green-500/70" />
					</div>
					<span className="flex-1 text-center text-[11px] text-white/30 font-medium">RecompraCRM · POI</span>
				</div>

				{/* step indicators */}
				<div className="flex items-center justify-center gap-1.5 mb-5">
					<div className="flex items-center gap-1">
						<div className="w-5 h-5 rounded-full border border-[#FFB900] bg-[#FFB900]/15 flex items-center justify-center">
							<span className="text-[9px] font-black text-[#FFB900]">✓</span>
						</div>
						<span className="text-[10px] font-bold text-[#FFB900]">Cliente</span>
					</div>
					<div className="h-px w-5 bg-white/15" />
					<div className="flex items-center gap-1">
						<div className="w-5 h-5 rounded-full border border-[#FFB900] flex items-center justify-center">
							<span className="text-[9px] font-bold text-[#FFB900]">2</span>
						</div>
						<span className="text-[10px] font-bold text-[#FFB900]">Venda</span>
					</div>
					<div className="h-px w-5 bg-white/15" />
					<div className="flex items-center gap-1">
						<div className="w-5 h-5 rounded-full border border-white/20 flex items-center justify-center">
							<span className="text-[9px] font-bold text-white/25">3</span>
						</div>
						<span className="text-[10px] text-white/30">Confirmar</span>
					</div>
				</div>

				{/* client card */}
				<div className="bg-green-950/60 border border-green-700/30 rounded-2xl p-3.5 mb-2.5">
					<p className="text-[9px] text-green-400/80 font-black uppercase tracking-[0.1em] mb-2">Cliente identificado</p>
					<div className="flex items-center gap-2.5">
						<div className="w-9 h-9 rounded-full bg-white/8 flex items-center justify-center text-xs font-black text-white/80 shrink-0 border border-white/10">
							JS
						</div>
						<div>
							<p className="text-white font-black text-sm leading-tight">João Santos</p>
							<p className="text-white/40 text-[11px]">12 compras · jan/24</p>
						</div>
					</div>
				</div>

				{/* cashback */}
				<div className="bg-[#FFB900]/10 border border-[#FFB900]/25 rounded-2xl p-3.5 flex items-center justify-between mb-2.5">
					<div>
						<p className="text-[9px] text-[#FFB900]/65 font-black uppercase tracking-[0.08em] mb-1">Cashback disponível</p>
						<p className="text-[#FFB900] font-black text-xl leading-none">R$ 28,50</p>
						<p className="text-[#FFB900]/45 text-[10px] mt-1">Vence em 18 dias</p>
					</div>
					<button className="bg-[#FFB900] text-zinc-950 text-[11px] font-black px-3 py-2 rounded-xl">Resgatar</button>
				</div>

				{/* sale value */}
				<div className="bg-white/4 border border-white/8 rounded-2xl p-3.5 mb-2.5">
					<p className="text-[9px] text-white/30 font-bold uppercase tracking-[0.08em] mb-1.5">Valor da compra</p>
					<p className="text-white font-black text-2xl">R$ 187,00</p>
				</div>

				{/* confirm */}
				<button className="w-full bg-[#24549C] text-white font-bold text-sm py-3 rounded-2xl">Confirmar venda ✓</button>
			</div>
		</div>
	);
}
