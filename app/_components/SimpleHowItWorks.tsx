const steps = [
	{
		n: 1,
		title: "Cliente se identifica no balcão",
		desc: "Tablet ou QR Code no celular. O cliente informa o WhatsApp e o sistema já sabe quem é ele, quantas vezes comprou e quanto tem de cashback disponível. Sem cadastro longo. Sem app.",
	},
	{
		n: 2,
		title: "A compra gera cashback automaticamente",
		desc: "Você define a porcentagem. O cliente recebe uma mensagem no WhatsApp confirmando o saldo. Sem papel, sem cartão fidelidade, sem controle manual.",
	},
	{
		n: 3,
		title: "O sistema trabalha por você",
		desc: "Quando o cliente some, quando o cashback está pra vencer, quando ele faz a primeira compra: o RecompraCRM manda a mensagem certa, na hora certa, sem você precisar lembrar de nada.",
	},
];

export default function SimpleHowItWorks() {
	return (
		<section id="como-funciona" className="bg-slate-50/60 border-t border-b border-slate-100 py-24 px-5 lg:px-8">
			<div className="max-w-5xl mx-auto">
				<p className="text-xs font-black uppercase tracking-[0.12em] text-[#24549C] mb-3">Como funciona</p>
				<h2 className="text-4xl font-black text-slate-900 tracking-tight mb-14 leading-tight">
					Em 3 passos, sua loja começa
					<br />a reter clientes
				</h2>

				<div className="grid md:grid-cols-3 gap-px bg-slate-200 rounded-2xl overflow-hidden shadow-sm">
					{steps.map((step) => (
						<div key={step.n} className="bg-white p-8">
							<div className="w-9 h-9 rounded-full bg-[#24549C] text-white flex items-center justify-center font-black text-sm mb-5 shrink-0">
								{step.n}
							</div>
							<h3 className="font-black text-slate-900 text-lg mb-3 leading-snug">{step.title}</h3>
							<p className="text-slate-500 text-sm leading-relaxed">{step.desc}</p>
						</div>
					))}
				</div>
			</div>
		</section>
	);
}
