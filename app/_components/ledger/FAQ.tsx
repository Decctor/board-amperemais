import type { FAQItem } from "@/app/_content/blog-posts";
import { Plus } from "lucide-react";
import { Reveal } from "./_primitives/Reveal";

// Perguntas frequentes da landing. Exportadas para que a página gere o
// schema FAQPage (JSON-LD) a partir da mesma fonte de verdade.
export const LANDING_FAQS: FAQItem[] = [
	{
		question: "O que é o RecompraCRM?",
		answer:
			"O RecompraCRM é um sistema de fidelização com cashback automático para lojas físicas. Ele reúne programa de cashback, campanhas automáticas no WhatsApp, Ponto de Interação no balcão e análise RFM de clientes, tudo em uma plataforma feita para fazer o cliente voltar a comprar e aumentar a previsibilidade de vendas do varejo.",
	},
	{
		question: "Quanto custa o RecompraCRM?",
		answer:
			"São dois caminhos com a mesma plataforma completa: o plano Plataforma custa R$399,90 por mês, no modelo self-service em que você opera. O plano Plataforma + Gestor de Crescimento custa R$899,90 por mês e inclui uma equipe que opera as campanhas por você (done-for-you). Ambos têm 15 dias grátis, sem cartão de crédito e sem taxa de setup.",
	},
	{
		question: "Preciso instalar algum aplicativo ou equipamento?",
		answer:
			"Não. O RecompraCRM roda no navegador e o Ponto de Interação funciona em qualquer tablet ou celular. Seus clientes não baixam aplicativo nem carregam cartão: acumulam e resgatam cashback informando CPF ou telefone no balcão, em segundos.",
	},
	{
		question: "Para que tipo de loja o RecompraCRM funciona?",
		answer:
			"Para qualquer varejo físico com venda direta ao consumidor: sorveterias, petshops, lojas de roupas, farmácias, padarias, ferragens e mais. Se o seu negócio quer aumentar a frequência de compra e trazer clientes de volta, o RecompraCRM se adapta às regras da sua operação.",
	},
	{
		question: "Como o RecompraCRM faz meus clientes voltarem?",
		answer:
			"Cada compra gera cashback com validade, criando um motivo concreto para o cliente retornar antes de o crédito expirar. O sistema ainda dispara campanhas automáticas no WhatsApp em momentos-chave — aniversário, cliente sumido, cashback expirando — e identifica quem está em risco de abandono pela análise RFM.",
	},
	{
		question: "O RecompraCRM tem período de teste grátis?",
		answer:
			"Sim. Você tem 15 dias grátis para testar a plataforma, sem cartão de crédito e sem taxa de setup. Pode cancelar quando quiser. Para o plano com Gestor de Crescimento, o começo é uma conversa de diagnóstico, com vagas limitadas.",
	},
];

export function LedgerFAQ() {
	return (
		<section id="faq" className="ledger-canvas ledger-deferred relative py-20 lg:py-28 overflow-hidden">
			<div className="relative mx-auto max-w-3xl px-5 lg:px-8">
				<Reveal className="mb-12 lg:mb-16 text-center">
					<div className="flex items-center justify-center gap-3 mb-6">
						<span className="ledger-fade inline-flex items-center justify-center w-7 h-7 rounded-full bg-[#24549c] text-white text-[11px] font-extrabold ledger-tabular">
							06
						</span>
						<span className="ledger-fade text-[11px] font-extrabold tracking-[0.16em] uppercase text-[#24549c]" data-stagger>
							Dúvidas
						</span>
					</div>
					<h2 className="font-extrabold text-[#171717] tracking-[-0.02em] leading-[1.05] text-[34px] sm:text-[44px] lg:text-[56px] max-w-[16ch] mx-auto">
						Perguntas frequentes
					</h2>
				</Reveal>

				<Reveal>
					<div className="flex flex-col gap-3">
						{LANDING_FAQS.map((faq) => (
							<details
								key={faq.question}
								className="group rounded-2xl border border-[#171717]/12 bg-white px-5 py-4 lg:px-6 lg:py-5 [&_summary::-webkit-details-marker]:hidden"
							>
								<summary className="flex cursor-pointer items-center justify-between gap-4 list-none text-[16px] lg:text-[18px] font-extrabold text-[#171717]">
									{faq.question}
									<Plus className="w-5 h-5 shrink-0 text-[#24549c] transition-transform group-open:rotate-45" />
								</summary>
								<p className="mt-3 text-[15px] leading-relaxed text-[#171717]/70">{faq.answer}</p>
							</details>
						))}
					</div>
				</Reveal>
			</div>
		</section>
	);
}
