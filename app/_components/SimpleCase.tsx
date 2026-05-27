const metrics = [
	{ value: "+R$ 17k", label: "em receita gerada por campanhas de WhatsApp" },
	{ value: "+46%", label: "de aumento no ticket médio dos clientes convertidos" },
	{ value: "−17 dias", label: "de antecipação no ciclo de recompra" },
];

export default function SimpleCase() {
	return (
		<section id="resultado" className="bg-gradient-to-br from-[#24549C] to-[#1a3d7a] py-24 px-5 lg:px-8">
			<div className="max-w-5xl mx-auto">
				<p className="text-xs font-black uppercase tracking-[0.12em] text-[#FFB900] mb-3">Resultado real</p>
				<h2 className="text-4xl font-black text-white tracking-tight mb-3 leading-tight">Sem achismo. Sem promessa vazia.</h2>
				<p className="text-white/55 text-lg mb-12">Um número real vale mais que qualquer feature.</p>

				<div className="bg-white/5 border border-white/10 rounded-2xl p-8 lg:p-12">
					<div className="grid md:grid-cols-3 gap-8 mb-10">
						{metrics.map((m) => (
							<div key={m.value}>
								<p className="text-[#FFB900] font-black text-5xl leading-none mb-3">{m.value}</p>
								<p className="text-white/50 text-sm leading-relaxed">{m.label}</p>
							</div>
						))}
					</div>

					<div className="h-px bg-white/10 mb-8" />

					<p className="text-white/75 text-base italic leading-relaxed mb-4">
						"Nenhum anúncio novo. Nenhum desconto agressivo. Só a mensagem certa, para quem já conhecia a loja, no momento certo."
					</p>
					<p className="text-white/35 text-sm font-medium">— Ampère Mais · Distribuidora de materiais elétricos · Ituiutaba, MG</p>
				</div>
			</div>
		</section>
	);
}
