import { Plus } from "lucide-react";
import type { FAQItem } from "@/app/_content/blog-posts";

type ArticleFAQProps = {
	faqs: FAQItem[];
	title?: string;
};

// Seção de perguntas frequentes. Usa <details>/<summary> nativos para ser
// semântica, acessível e legível por agentes de IA mesmo sem JavaScript.
export function ArticleFAQ({ faqs, title = "Perguntas frequentes" }: ArticleFAQProps) {
	if (faqs.length === 0) return null;

	return (
		<section className="mt-16 pt-12 border-t border-slate-100">
			<h2 className="text-xl font-black text-slate-900 mb-8">{title}</h2>
			<div className="flex flex-col gap-3">
				{faqs.map((faq) => (
					<details
						key={faq.question}
						className="group rounded-2xl border border-slate-200 bg-white px-5 py-4 [&_summary::-webkit-details-marker]:hidden"
					>
						<summary className="flex cursor-pointer items-center justify-between gap-4 text-base font-bold text-slate-900 list-none">
							{faq.question}
							<Plus className="w-5 h-5 shrink-0 text-[#24549C] transition-transform group-open:rotate-45" />
						</summary>
						<p className="mt-3 text-slate-600 leading-relaxed">{faq.answer}</p>
					</details>
				))}
			</div>
		</section>
	);
}

// Gera o objeto JSON-LD FAQPage a partir da lista de perguntas.
export function buildFAQPageJsonLd(faqs: FAQItem[]) {
	return {
		"@context": "https://schema.org",
		"@type": "FAQPage",
		mainEntity: faqs.map((faq) => ({
			"@type": "Question",
			name: faq.question,
			acceptedAnswer: {
				"@type": "Answer",
				text: faq.answer,
			},
		})),
	};
}
