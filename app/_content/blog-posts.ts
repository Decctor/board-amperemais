export type ContentSection =
	| { type: "text"; heading?: string; body: string }
	| { type: "feature-highlight"; icon: string; title: string; body: string }
	| { type: "stats"; items: { value: string; label: string }[] }
	| { type: "quote"; text: string; author?: string }
	| { type: "image"; src: string; alt: string; caption?: string };

export type BlogPost = {
	slug: string;
	title: string;
	headline: string; // short subtitle shown on cards
	description: string; // meta description
	category: "casos-de-uso" | "dicas" | "novidades";
	categoryLabel: string;
	coverEmoji: string; // emoji used as visual placeholder
	publishedAt: string; // ISO date
	readingTime: string;
	sections: ContentSection[];
	cta: {
		headline: string;
		sub: string;
		buttonText: string;
		whatsappMessage: string;
	};
	seo: {
		keywords: string[];
	};
	relatedSlugs: string[];
};

export const BLOG_POSTS: BlogPost[] = [
	{
		slug: "como-recompracrm-pode-ajudar-sua-sorveteria",
		title: "Como o RecompraCRM pode ajudar a sua sorveteria a fidelizar clientes e vender mais",
		headline: "Estratégias de retenção para sorveterias e gelatarias",
		description:
			"Descubra como programas de cashback, campanhas automáticas no WhatsApp e análise de dados podem transformar sua sorveteria em uma máquina de recompra.",
		category: "casos-de-uso",
		categoryLabel: "Caso de Uso",
		coverEmoji: "🍦",
		publishedAt: "2026-03-10",
		readingTime: "6 min",
		seo: {
			keywords: [
				"crm sorveteria",
				"fidelizar clientes sorveteria",
				"programa cashback sorveteria",
				"como fidelizar clientes gelato",
				"marketing sorveteria",
				"retenção clientes sorveteria",
				"sistema fidelidade sorveteria",
			],
		},
		relatedSlugs: ["como-recompracrm-pode-ajudar-seu-petshop", "como-recompracrm-pode-ajudar-sua-loja-de-roupas"],
		sections: [
			{
				type: "text",
				heading: "O desafio de gerir uma sorveteria no Brasil",
				body: "Administrar uma sorveteria ou gelataria no Brasil é um negócio apaixonante — mas também desafiador. As vendas disparam no verão e despencam no inverno, a concorrência cresce a cada estação e atrair um cliente novo custa, em média, cinco vezes mais do que manter um cliente fiel.\n\nA boa notícia: a grande maioria dos clientes de sorveterias já quer voltar. O problema é que, sem um sistema de fidelização, eles simplesmente vão esquecer — ou cair na tentação do concorrente que inaugurou na esquina.\n\nO RecompraCRM foi pensado exatamente para isso: transformar clientes ocasionais em frequentadores assíduos, de forma automática e sem demandar tempo extra do gestor.",
			},
			{
				type: "feature-highlight",
				icon: "💸",
				title: "Programa de Cashback: o maior motivador de recompra",
				body: "Imagine que toda vez que um cliente comprar na sua sorveteria, ele receba de volta uma porcentagem do valor gasto — um crédito que só pode ser usado em uma próxima visita. Esse é o cashback, e é o principal motor de retenção do RecompraCRM.\n\nVocê configura a porcentagem (ex.: 5% de cashback), o prazo de validade dos créditos e as regras de uso. O sistema calcula e acumula automaticamente, sem nenhum trabalho manual. Na próxima visita, o cliente resgata o saldo direto no PDI (nosso ponto de interação) e a experiência é fluida — sem cartõezinhos de papel ou filas na caixa.",
			},
			{
				type: "stats",
				items: [
					{ value: "5×", label: "Mais caro adquirir um cliente novo do que reter um existente" },
					{ value: "68%", label: "Dos consumidores afirmam que programas de cashback os motivam a voltar" },
					{ value: "30 dias", label: "Prazo médio para ver os primeiros resultados com o RecompraCRM" },
				],
			},
			{
				type: "feature-highlight",
				icon: "📱",
				title: "Campanhas automáticas no WhatsApp: fale no momento certo",
				body: "Sorveteria vende muito mais no verão. Mas e no inverno? O RecompraCRM permite criar campanhas segmentadas no WhatsApp para reativar clientes inativos, divulgar sabores novos, promover combos de inverno (chocolate quente + sorvete, por que não?) e lembrar clientes que têm cashback prestes a expirar.\n\nAs campanhas são enviadas automaticamente, baseadas no comportamento de cada cliente. Quem não visita há 30 dias recebe uma mensagem personalizada com um incentivo. Quem visitou recentemente recebe uma novidade do cardápio. Tudo sem precisar mexer no celular.",
			},
			{
				type: "quote",
				text: "Nosso movimento no inverno caiu muito. Com as campanhas automáticas do WhatsApp, conseguimos trazer de volta clientes que estavam sumidos há meses.",
				author: "Proprietária de gelataria artesanal",
			},
			{
				type: "feature-highlight",
				icon: "📊",
				title: "Análise RFM: descubra quem são seus melhores clientes",
				body: "RFM significa Recência, Frequência e Valor Monetário — os três pilares que definem quão valioso é cada cliente para o seu negócio. O RecompraCRM analisa automaticamente todo o histórico de compras e classifica cada cliente em categorias: Campeões, Fiéis, Em Risco, Perdidos, entre outras.\n\nPara uma sorveteria, isso é ouro puro. Você descobre quem são os clientes que vêm toda semana (e merecem um mimo especial), quem está sumindo (e precisa de um empurrãozinho), e quem veio uma vez e nunca mais. Com isso, suas campanhas ficam cirúrgicas — e o ROI dispara.",
			},
			{
				type: "feature-highlight",
				icon: "🖥️",
				title: "PDI — Ponto de Interação: a experiência do cliente na loja",
				body: "O PDI é um totem ou tablet instalado no balcão da sua sorveteria. O atendente registra cada venda, o cliente vê seu saldo de cashback na tela e resgata os créditos com um toque. Rápido, visual e sem fricção.\n\nO resultado? O cliente sai da loja já sabendo quanto tem de crédito para a próxima visita. Isso cria um gatilho mental poderoso: a antecipação de voltar.",
			},
			{
				type: "text",
				heading: "Resultado: mais recompras, menos dependência do verão",
				body: "Sorveterias que usam o RecompraCRM conseguem nivelar melhor o faturamento ao longo do ano, reduzindo a dependência da sazonalidade. Campanhas de inverno com ofertas criativas, combinadas com cashback acumulado, criam um fluxo constante de clientes mesmo nos meses mais frios.\n\nE o melhor: tudo isso acontece de forma automatizada. Você e sua equipe continuam focados no que fazem de melhor — fazer sorvetes incríveis.",
			},
		],
		cta: {
			headline: "Pronto para transformar sua sorveteria?",
			sub: "Agende uma demonstração gratuita e veja o RecompraCRM em ação. Configuração em menos de 1 dia.",
			buttonText: "Agendar Demo Gratuita",
			whatsappMessage: "Olá! Vi o artigo sobre sorveterias no blog do RecompraCRM e gostaria de agendar uma demonstração.",
		},
	},
];

export function getBlogPost(slug: string): BlogPost | undefined {
	return BLOG_POSTS.find((p) => p.slug === slug);
}

export function getBlogPostsByCategory(category: BlogPost["category"]): BlogPost[] {
	return BLOG_POSTS.filter((p) => p.category === category);
}
