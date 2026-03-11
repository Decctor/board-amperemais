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
	{
		slug: "como-recompracrm-pode-ajudar-seu-petshop",
		title: "Como o RecompraCRM pode ajudar o seu pet shop a fidelizar tutores e aumentar a recorrência",
		headline: "Estratégias de retenção para pet shops e casas de ração",
		description:
			"Pet shops têm tudo para ter clientes fiéis — compras recorrentes, vínculo emocional e alta frequência. Veja como cashback, campanhas no WhatsApp e análise RFM turbulam a recompra.",
		category: "casos-de-uso",
		categoryLabel: "Caso de Uso",
		coverEmoji: "🐾",
		publishedAt: "2026-03-11",
		readingTime: "6 min",
		seo: {
			keywords: [
				"crm petshop",
				"fidelizar clientes petshop",
				"cashback pet shop",
				"programa fidelidade pet",
				"marketing pet shop",
				"retenção clientes pet shop",
				"sistema fidelidade petshop",
			],
		},
		relatedSlugs: ["como-recompracrm-pode-ajudar-sua-sorveteria", "como-recompracrm-pode-ajudar-sua-loja-de-roupas"],
		sections: [
			{
				type: "text",
				heading: "Pet shops: o varejo com mais potencial de recorrência",
				body: "Ração acaba. Antipulgas vence. Banho e tosa têm agenda fixa. O pet shop é, por natureza, um dos segmentos do varejo com maior frequência de recompra — mas a maioria dos lojistas não aproveita esse potencial.\n\nSem um sistema de fidelização, o tutor simplesmente compra onde for mais conveniente: no marketplace, no concorrente que abriu mais perto, ou no supermercado que colocou a ração em promoção. O desafio não é fazer o cliente gostar de você — é fazer ele lembrar de você.\n\nO RecompraCRM foi pensado para resolver exatamente isso: criar vínculos automáticos que trazem o tutor de volta, compra após compra.",
			},
			{
				type: "feature-highlight",
				icon: "💸",
				title: "Cashback: o motivo perfeito para o tutor voltar à loja",
				body: "Imagine: o tutor compra um saco de ração de R$ 180 e recebe R$ 9 de cashback para usar na próxima visita. Parece pouco? Pense que ele compra ração todo mês. Em 3 meses, já tem R$ 27 acumulados — o suficiente para um pacote de petiscos ou um banho.\n\nO cashback cria um ciclo virtuoso: quanto mais o tutor compra, mais ele acumula, mais motivo tem para voltar. E como os créditos têm prazo de validade, existe urgência natural para retornar antes que expirem.\n\nVocê configura o percentual (3%, 5%, 8% — o que fizer sentido para a margem do seu negócio), define o prazo de expiração e o sistema faz o resto. Sem cartõezinhos, sem planilhas, sem trabalho manual.",
			},
			{
				type: "stats",
				items: [
					{ value: "78%", label: "Dos tutores compram em pet shops pelo menos 1× por mês" },
					{ value: "2.3×", label: "Aumento na frequência de visitas com programa de cashback ativo" },
					{ value: "R$ 180", label: "Ticket médio mensal por tutor em pet shops brasileiros" },
				],
			},
			{
				type: "feature-highlight",
				icon: "📱",
				title: "Campanhas WhatsApp: lembre o tutor na hora certa",
				body: "O grande diferencial do pet shop é que as necessidades do pet são previsíveis. Ração acaba a cada 30 dias. Antipulgas vence a cada 3 meses. Vacinas têm calendário fixo.\n\nO RecompraCRM usa essa previsibilidade a seu favor: crie campanhas automáticas que enviam uma mensagem pelo WhatsApp quando o tutor provavelmente está precisando repor um produto. Exemplos:\n\n• **30 dias sem compra**: \"Oi, [nome]! A ração do [nome do pet] já deve estar acabando. Temos estoque fresquinho e você tem R$ 12 de cashback para usar!\"\n• **Cashback expirando**: \"Seu cashback de R$ 18 vence em 5 dias. Passe na loja e aproveite!\"\n• **Aniversário do pet**: \"Parabéns pro [nome do pet]! Passe na loja e ganhe um mimo especial.\"\n\nTudo automático, personalizado e sem precisar digitar uma mensagem sequer.",
			},
			{
				type: "quote",
				text: "Depois que implementamos as campanhas automáticas de reposição, nossos clientes começaram a voltar como um relógio. A taxa de recompra subiu 40% em dois meses.",
				author: "Dono de pet shop em Uberlândia",
			},
			{
				type: "feature-highlight",
				icon: "📊",
				title: "Análise RFM: identifique tutores fiéis, em risco e perdidos",
				body: "A análise RFM (Recência, Frequência e Valor Monetário) do RecompraCRM classifica automaticamente cada tutor em categorias como Campeões, Fiéis, Em Risco e Perdidos.\n\nPara um pet shop, isso é extremamente valioso. Você descobre, por exemplo, que a Dona Maria — que comprava R$ 250 por mês — não aparece há 60 dias. Antes que ela se torne um cliente perdido, o sistema já envia uma campanha personalizada com um incentivo para trazê-la de volta.\n\nDo outro lado, você identifica seus Campeões — os tutores que compram toda semana e indicam a loja para amigos — e pode criar ações VIP exclusivas para eles.",
			},
			{
				type: "feature-highlight",
				icon: "🖥️",
				title: "PDI no balcão: experiência rápida e sem fricção",
				body: "O Ponto de Interação (PDI) é um tablet instalado no caixa do pet shop. O atendente registra a venda, o sistema identifica o tutor pelo telefone, acumula o cashback automaticamente e mostra o saldo na tela.\n\nSe o tutor quiser usar o cashback, basta confirmar com um toque. Sem app, sem cadastro longo, sem perguntas. Em 10 segundos, a venda está registrada e o tutor sai sabendo exatamente quanto tem de crédito para a próxima visita.\n\nAlém disso, o ranking de vendedores na tela motiva a equipe a registrar cada venda corretamente — gamificação natural que melhora a operação.",
			},
			{
				type: "text",
				heading: "Resultado: mais tutores voltando, menos perdidos para o marketplace",
				body: "Pet shops que usam o RecompraCRM conseguem competir com marketplaces e grandes redes não pelo preço, mas pelo relacionamento. O tutor sente que é reconhecido, que a loja lembra dele e do pet, e que tem um motivo financeiro concreto para voltar.\n\nO ciclo natural de recompra do pet shop — ração mensal, banho quinzenal, consulta semestral — vira uma máquina de fidelização quando combinado com cashback inteligente e comunicação automática pelo WhatsApp.\n\nE o melhor: tudo roda no piloto automático. Você continua focado no atendimento e no cuidado com os pets — o RecompraCRM cuida da retenção.",
			},
		],
		cta: {
			headline: "Pronto para fidelizar os tutores do seu pet shop?",
			sub: "Agende uma demonstração gratuita e veja como o RecompraCRM funciona para pet shops. Setup em menos de 1 dia.",
			buttonText: "Agendar Demo Gratuita",
			whatsappMessage: "Olá! Vi o artigo sobre pet shops no blog do RecompraCRM e gostaria de agendar uma demonstração.",
		},
	},
	{
		slug: "como-recompracrm-pode-ajudar-sua-loja-de-roupas",
		title: "Como o RecompraCRM pode ajudar a sua loja de roupas a fidelizar clientes e vender mais",
		headline: "Estratégias de retenção para lojas de moda e vestuário",
		description:
			"Moda é sazonal e a concorrência é feroz. Veja como cashback, campanhas automáticas no WhatsApp e segmentação inteligente ajudam lojas de roupa a transformar compradores em clientes fiéis.",
		category: "casos-de-uso",
		categoryLabel: "Caso de Uso",
		coverEmoji: "👗",
		publishedAt: "2026-03-11",
		readingTime: "6 min",
		seo: {
			keywords: [
				"crm loja de roupas",
				"fidelizar clientes moda",
				"cashback loja de roupa",
				"programa fidelidade moda",
				"marketing loja de roupas",
				"retenção clientes vestuário",
				"sistema fidelidade loja roupa",
			],
		},
		relatedSlugs: ["como-recompracrm-pode-ajudar-sua-sorveteria", "como-recompracrm-pode-ajudar-seu-petshop"],
		sections: [
			{
				type: "text",
				heading: "O dilema da loja de roupas: muitas visitas, pouca recorrência",
				body: "No varejo de moda, a maioria dos clientes entra, compra e desaparece por meses — às vezes para sempre. A troca de coleção, as promoções do concorrente e o crescimento do e-commerce tornam a fidelização um desafio constante.\n\nDiferente de segmentos como alimentação ou pet, moda tem um ciclo de compra mais longo e mais imprevisível. O cliente pode gostar muito da sua loja, mas simplesmente não ter motivo concreto para voltar no mês seguinte.\n\nÉ aí que entra o RecompraCRM: criar motivos reais, tangíveis e automáticos para o cliente voltar — sem parecer insistente e sem aumentar o custo de aquisição.",
			},
			{
				type: "feature-highlight",
				icon: "💸",
				title: "Cashback: o incentivo que transforma compras sazonais em visitas regulares",
				body: "Numa loja de roupas, o cashback funciona como um ímã de recompra. O cliente compra um look de R$ 350 e recebe R$ 17,50 de crédito (com 5% de cashback). Na hora de comprar um presente, acessório ou peça de inverno, ele lembra que tem crédito na sua loja — e volta.\n\nO prazo de validade dos créditos é configurável: 30, 60 ou 90 dias. Para moda, recomendamos prazos um pouco mais longos (60-90 dias) para acompanhar o ciclo natural de compra do segmento. Mas com uma sacada: enviar um lembrete por WhatsApp quando o cashback estiver prestes a vencer.\n\nEsse combo — cashback acumulado + urgência de expiração + lembrete automático — é o que gera a recompra que antes não existia.",
			},
			{
				type: "stats",
				items: [
					{ value: "73%", label: "Dos consumidores escolhem lojas que oferecem benefícios de fidelidade" },
					{ value: "40%", label: "Aumento médio no ticket quando o cliente tem cashback para usar" },
					{ value: "60 dias", label: "Prazo ideal de expiração de cashback para o varejo de moda" },
				],
			},
			{
				type: "feature-highlight",
				icon: "📱",
				title: "Campanhas WhatsApp: lance coleções, liquide estoque, traga clientes de volta",
				body: "O WhatsApp é o canal mais poderoso para o varejo de moda no Brasil. O RecompraCRM transforma ele numa ferramenta de vendas automática:\n\n• **Nova coleção**: Envie uma prévia exclusiva para seus clientes VIP (Campeões e Fiéis) antes de publicar nas redes sociais.\n• **Liquidação**: Segmente clientes que compraram peças da coleção anterior e ofereça descontos nas peças remanescentes.\n• **Reativação**: Clientes que não compram há 60+ dias recebem um convite personalizado com cashback extra.\n• **Aniversário**: Envie uma mensagem especial com cashback bônus no mês do aniversário do cliente.\n\nCada campanha pode ter gatilhos automáticos, segmentação por perfil RFM e até cashback bônus embutido — tudo configurado uma vez e rodando no piloto automático.",
			},
			{
				type: "quote",
				text: "Sempre tive dificuldade em manter contato com os clientes entre as coleções. Com o WhatsApp automático e o cashback, agora tenho clientes voltando para 'dar uma olhadinha' — e saindo com sacola cheia.",
				author: "Proprietária de boutique feminina",
			},
			{
				type: "feature-highlight",
				icon: "📊",
				title: "Análise RFM: separe os fashionistas fiéis dos caçadores de promoção",
				body: "No varejo de moda, nem todo cliente é igual. Tem quem compra só na liquidação (e nunca paga preço cheio), quem vem a cada nova coleção (e gasta bem), e quem comprou uma vez e nunca mais.\n\nA análise RFM do RecompraCRM classifica automaticamente cada cliente em segmentos como Campeões, Fiéis, Prometendo, Em Risco e Perdidos. Com isso, você pode:\n\n• **Campeões**: Criar um programa VIP com acesso antecipado a coleções e eventos exclusivos.\n• **Em Risco**: Enviar uma campanha de reativação com cashback bônus antes que o cliente migre para o concorrente.\n• **Perdidos**: Fazer uma última tentativa com uma oferta irrecusável — ou aceitar e focar recursos nos clientes mais promissores.\n\nIsso evita o erro clássico de tratar todos os clientes igual e desperdiçar verba de marketing com quem não vai converter.",
			},
			{
				type: "feature-highlight",
				icon: "🖥️",
				title: "PDI no provador ou no caixa: experiência premium sem complicação",
				body: "O PDI do RecompraCRM pode ficar no caixa ou até próximo ao provador. O atendente identifica o cliente pelo telefone, vê o histórico de compras, saldo de cashback e preferências — tudo na tela.\n\nNa hora de fechar a venda, o cliente vê o cashback sendo acumulado em tempo real. Se quiser resgatar, é só confirmar. A experiência é fluida, moderna e reforça a imagem de uma loja que valoriza o relacionamento.\n\nPara lojas com equipe de vendas, o ranking de vendedores no PDI cria uma competição saudável que motiva a equipe e melhora o atendimento.",
			},
			{
				type: "text",
				heading: "Resultado: mais clientes voltando entre coleções, menos dependência de liquidação",
				body: "Lojas de roupas que usam o RecompraCRM reduzem a dependência de promoções agressivas para gerar movimento. O cashback cria um motivo financeiro para o cliente voltar, as campanhas de WhatsApp mantêm a marca presente, e a análise RFM garante que cada ação de marketing é direcionada ao público certo.\n\nO ciclo de moda — que antes significava picos de venda seguidos de vale — se torna mais suave e previsível. E o melhor: todo esse mecanismo roda automaticamente enquanto você e sua equipe focam no que mais importam: curadoria, atendimento e experiência na loja.",
			},
		],
		cta: {
			headline: "Pronto para fidelizar os clientes da sua loja de roupas?",
			sub: "Agende uma demonstração gratuita e veja o RecompraCRM funcionando para o varejo de moda. Setup em menos de 1 dia.",
			buttonText: "Agendar Demo Gratuita",
			whatsappMessage: "Olá! Vi o artigo sobre lojas de roupas no blog do RecompraCRM e gostaria de agendar uma demonstração.",
		},
	},
];

export function getBlogPost(slug: string): BlogPost | undefined {
	return BLOG_POSTS.find((p) => p.slug === slug);
}

export function getBlogPostsByCategory(category: BlogPost["category"]): BlogPost[] {
	return BLOG_POSTS.filter((p) => p.category === category);
}
