import type { ContentSection } from "./blog-posts";

export type FeaturePage = {
	slug: string;
	title: string;
	headline: string;
	description: string;
	coverEmoji: string;
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
	relatedBlogSlugs: string[];
	relatedFeatureSlugs: string[];
};

export const FEATURE_PAGES: FeaturePage[] = [
	{
		slug: "programa-de-cashback",
		title: "Programa de Cashback para Varejo — RecompraCRM",
		headline: "Transforme cada venda em motivo para o cliente voltar",
		description:
			"Crie um programa de cashback personalizado para sua loja física. Configure percentuais, prazos e regras — o RecompraCRM automatiza tudo enquanto você foca nas vendas.",
		coverEmoji: "💸",
		seo: {
			keywords: [
				"programa cashback loja",
				"cashback fidelização clientes",
				"sistema cashback varejo",
				"cashback loja física",
				"programa de fidelidade cashback",
				"como criar programa cashback",
				"software cashback varejo",
			],
		},
		relatedBlogSlugs: [
			"como-recompracrm-pode-ajudar-sua-sorveteria",
			"como-recompracrm-pode-ajudar-seu-petshop",
			"como-recompracrm-pode-ajudar-sua-loja-de-roupas",
		],
		relatedFeatureSlugs: ["campanhas-whatsapp", "ponto-de-interacao", "business-intelligence"],
		sections: [
			{
				type: "text",
				heading: "O que é cashback e por que ele funciona no varejo",
				body: "Cashback é simples: o cliente compra na sua loja e recebe de volta uma porcentagem do valor gasto — um crédito que só pode ser usado em uma próxima visita. Esse mecanismo cria um vínculo poderoso entre o consumidor e o seu negócio.\n\nAo contrário dos tradicionais cartões de pontos (que demoram séculos para render algo), o cashback é tangível e imediato. O cliente sabe exatamente quanto acumulou, sente que está ganhando dinheiro de volta, e tem um incentivo concreto para voltar antes que o crédito expire.",
			},
			{
				type: "stats",
				items: [
					{ value: "5×", label: "Mais barato reter um cliente do que conquistar um novo" },
					{ value: "68%", label: "Dos consumidores preferem lojas que oferecem cashback" },
					{ value: "2.3×", label: "Aumento médio na frequência de visitas após adotar cashback" },
				],
			},
			{
				type: "feature-highlight",
				icon: "⚙️",
				title: "Configure do seu jeito — sem complicação",
				body: "No RecompraCRM, você define as regras do cashback em minutos:\n\n• **Percentual de retorno**: de 1% a 20%, você escolhe o que faz sentido para a margem do seu negócio.\n• **Prazo de validade**: créditos expiram em 30, 60 ou 90 dias — criando urgência para o cliente voltar logo.\n• **Valor mínimo para resgate**: evite resgates insignificantes definindo um saldo mínimo.\n• **Promoções pontuais**: duplique o cashback em datas especiais para turbinar o movimento.\n\nTudo configurável pelo painel administrativo, sem precisar de TI ou suporte técnico.",
			},
			{
				type: "feature-highlight",
				icon: "🖥️",
				title: "Integrado ao PDI — experiência fluida no caixa",
				body: "O cashback funciona em perfeita sincronia com o Ponto de Interação (PDI), nosso totem de balcão. O atendente registra a venda, o sistema calcula e acumula o cashback automaticamente, e o cliente vê o saldo atualizado na tela em tempo real.\n\nNa hora de resgatar, basta o cliente informar o CPF ou telefone. Sem app para baixar, sem cartão para carregar, sem atrito. O resgate é processado na hora, descontado do total da compra.",
			},
			{
				type: "feature-highlight",
				icon: "📱",
				title: "Notificações automáticas por WhatsApp",
				body: "Cada vez que o cliente acumula ou usa cashback, ele recebe uma notificação automática pelo WhatsApp com o extrato atualizado. Isso reforça a sensação de valor e mantém sua marca presente no celular do cliente sem esforço da sua equipe.\n\nAlém disso, quando o cashback está próximo de expirar, o sistema envia um lembrete automático — criando urgência e trazendo o cliente de volta antes que ele esqueça.",
			},
			{
				type: "feature-highlight",
				icon: "📊",
				title: "Relatórios que revelam o ROI real do cashback",
				body: "Através do painel de Business Intelligence do RecompraCRM, você acompanha em tempo real:\n\n• Quanto de cashback foi distribuído e resgatado por período\n• Quais clientes mais acumulam e mais resgatam\n• Taxa de retorno de clientes após acumular cashback\n• Comparativo de ticket médio: clientes com e sem cashback\n• ROI do programa — você vê exatamente quanto cada real de cashback gerou em receita",
			},
			{
				type: "text",
				heading: "Funciona para qualquer segmento do varejo físico",
				body: "O programa de cashback do RecompraCRM já foi implementado com sucesso em sorveterias, petshops, lojas de moda, farmácias, padarias, lojas de ferragens e muito mais. Qualquer negócio com venda direta ao consumidor e interesse em aumentar a frequência de compra pode se beneficiar.\n\nO setup é feito em menos de um dia. Nossa equipe configura o sistema junto com você, treina os atendentes e você já começa a acumular dados desde a primeira venda.",
			},
		],
		cta: {
			headline: "Implante o cashback na sua loja esta semana",
			sub: "Agende uma demonstração gratuita. Veja o programa funcionando ao vivo e tire todas as suas dúvidas com um especialista.",
			buttonText: "Agendar Demo Gratuita",
			whatsappMessage: "Olá! Quero saber mais sobre o Programa de Cashback do RecompraCRM para minha loja.",
		},
	},
];

export function getFeaturePage(slug: string): FeaturePage | undefined {
	return FEATURE_PAGES.find((p) => p.slug === slug);
}
