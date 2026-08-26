const features = [
	"Ponto de Interação (tablet + QR Code)",
	"Programa de cashback configurável",
	"WhatsApp automático ilimitado",
	"Campanhas com filtro de audiência",
	"Painel de clientes em risco",
	"Business Intelligence de vendas",
	"Suporte incluso",
];

const guarantees = ["Sem cartão de crédito", "Cancele a qualquer momento", "Sem taxa de setup", "Dados protegidos (LGPD)"];

export default function SimplePricing() {
	return (
		<section id="planos" className="bg-slate-50/60 border-t border-b border-slate-100 py-24 px-5 lg:px-8">
			<div className="max-w-3xl mx-auto text-center">
				<p className="text-xs font-black uppercase tracking-[0.12em] text-[#24549C] mb-3">Plano único</p>
				<h2 className="text-4xl font-black text-slate-900 tracking-tight mb-4 leading-tight">Um plano. Tudo incluído.</h2>
				<p className="text-lg text-slate-500 max-w-md mx-auto mb-14">
					Sem tier básico que trava você. Sem surpresas na fatura. Tudo que sua loja precisa desde o primeiro dia.
				</p>

				<div className="max-w-lg mx-auto bg-white border-2 border-[#24549C]/20 rounded-2xl shadow-2xl shadow-blue-900/10 overflow-hidden">
					{/* amber accent bar */}
					<div className="h-1 bg-[#FFB900]" />

					<div className="p-10">
						<p className="text-[11px] font-black uppercase tracking-[0.1em] text-slate-400 mb-4">Plano Crescimento</p>

						<div className="flex items-center justify-center gap-0.5 mb-1">
							<span className="text-xl font-black text-slate-400 mt-3">R$</span>
							<span className="text-6xl font-black text-slate-900 leading-none tracking-tight">399</span>
							<span className="text-xl font-black text-slate-400 mt-4">,90</span>
						</div>
						<p className="text-sm text-slate-400 mb-8">por mês · cobrado mensalmente</p>

						<ul className="border border-slate-100 rounded-xl overflow-hidden mb-8">
							{features.map((f, i) => (
								<li key={f} className={`flex items-center gap-3 px-4 py-3.5 ${i < features.length - 1 ? "border-b border-slate-100" : ""}`}>
									<span className="w-5 h-5 rounded-full bg-[#FFB900]/20 flex items-center justify-center shrink-0">
										<span className="text-[10px] font-black text-[#24549C]">✓</span>
									</span>
									<span className="text-sm text-slate-700 text-left">{f}</span>
								</li>
							))}
						</ul>

						<a
							href="https://www.recompracrm.com.br/auth/signup"
							className="flex items-center justify-center w-full bg-[#FFB900] hover:bg-[#e6a700] text-zinc-900 font-black text-base px-6 py-4 rounded-xl hover:-translate-y-0.5 transition-all duration-200 shadow-lg shadow-amber-500/25"
						>
							Começar agora — 15 dias grátis →
						</a>

						<p className="text-xs text-slate-400 mt-4">
							Atende redes ou precisa de integração com ERP?{" "}
							<a href="https://wa.me/553499480791" className="text-[#24549C] font-semibold hover:underline">
								Fale com a gente
							</a>
						</p>
					</div>
				</div>

				<div className="flex flex-wrap justify-center gap-x-7 gap-y-2 mt-8">
					{guarantees.map((g) => (
						<span key={g} className="flex items-center gap-1.5 text-sm text-slate-400 font-medium">
							<span className="text-green-500 font-bold">✓</span>
							{g}
						</span>
					))}
				</div>
			</div>
		</section>
	);
}
