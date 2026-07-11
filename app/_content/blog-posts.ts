export type ContentSection =
	| { type: "text"; heading?: string; body: string }
	| { type: "feature-highlight"; icon: string; title: string; body: string }
	| { type: "stats"; items: { value: string; label: string }[] }
	| { type: "quote"; text: string; author?: string }
	| { type: "image"; src: string; alt: string; caption?: string };

// Pergunta/resposta usada para renderizar a seção de FAQ e o schema FAQPage (JSON-LD).
export type FAQItem = { question: string; answer: string };

export type BlogPost = {
	slug: string;
	title: string;
	headline: string; // short subtitle shown on cards
	description: string; // meta description
	category: "casos-de-uso" | "dicas" | "novidades";
	categoryLabel: string;
	coverEmoji: string; // emoji used as visual placeholder
	coverImage?: {
		src: string;
		alt: string;
		caption?: string;
	};
	author?: string; // autor exibido e usado no JSON-LD (default: "Equipe RecompraCRM")
	publishedAt: string; // ISO date
	updatedAt?: string; // ISO date — usado em dateModified do JSON-LD
	readingTime: string;
	sections: ContentSection[];
	faqs?: FAQItem[];
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
		slug: "como-criar-campanha-festa-junina-para-loja",
		title: "Seu cliente vai gastar em junho. A questão é: vai ser na sua loja?",
		headline: "Um calendário prático para transformar a Festa Junina em uma campanha que movimenta sua loja durante o mês inteiro.",
		description:
			"Veja como criar uma campanha de Festa Junina para movimentar sua loja em junho, aproveitar o Dia dos Namorados e vender sem depender apenas de descontos.",
		category: "dicas",
		categoryLabel: "Dicas de Gestão",
		coverEmoji: "🎉",
		coverImage: {
			src: "https://wawrqfehfafrrnfsycgs.supabase.co/storage/v1/object/public/files/public/imagem-junho-ilustrativa.png",
			alt: "Loja de bairro decorada para uma campanha de Festa Junina, com bandeirinhas, luzes e clientes entrando",
		},
		publishedAt: "2026-06-01",
		readingTime: "6 min",
		seo: {
			keywords: [
				"campanha festa junina para loja",
				"como vender mais em junho",
				"marketing festa junina varejo",
				"promoção dia dos namorados loja",
				"campanhas para varejo",
				"ações de festa junina para loja",
				"como movimentar loja física",
			],
		},
		relatedSlugs: ["como-fechar-a-semana-no-varejo-e-preparar-a-proxima"],
		sections: [
			{
				type: "text",
				heading: "Junho não precisa ser um mês morno para o varejo",
				body:
					"Junho costuma passar despercebido por muitos lojistas. Não tem Black Friday. Não tem Natal. À primeira vista, parece não ter uma grande oportunidade comercial.\n\nMas o seu cliente continua saindo de casa, comprando presentes para o Dia dos Namorados, se preparando para festas, cuidando da aparência e procurando experiências diferentes.\n\nEle vai gastar. A questão é onde.\n\nA oportunidade de junho está justamente no espaço que outras empresas deixam vazio. Enquanto muita gente espera a próxima data forte do calendário, sua loja pode criar um motivo para ser lembrada durante o mês inteiro.",
			},
			{
				type: "text",
				heading: "Promoção não é apenas desconto",
				body:
					"Existe uma diferença importante entre dar desconto e fazer uma promoção.\n\nDesconto é reduzir sua margem e esperar que o preço mais baixo seja suficiente para atrair o cliente. O problema é simples: quase sempre haverá alguém disposto a cobrar menos.\n\nPromover é criar um motivo para o cliente visitar sua loja. Pode ser uma experiência, um lançamento, um mimo ou a sensação de participar de algo especial.\n\nEm junho, esse motivo pode ser o **Arraiá da sua loja**.\n\nNão se trata apenas de colocar bandeirinhas na vitrine. A proposta é criar uma campanha completa, com identidade visual consistente, ações semanais e momentos específicos para gerar movimento.",
			},
			{
				type: "image",
				src: "https://wawrqfehfafrrnfsycgs.supabase.co/storage/v1/object/public/files/public/imagem-junho-planejamento.png",
				alt: "Lojista organizando o calendário de uma campanha de Festa Junina com ações distribuídas ao longo do mês",
				caption: "Uma campanha forte não acontece em um único dia: ela cria motivos para o cliente voltar ao longo do mês.",
			},
			{
				type: "text",
				heading: "Um calendário prático para junho de 2026",
				body:
					"Você não precisa inventar uma ação nova todos os dias. O mais importante é criar uma sequência clara, com um tema central e momentos de destaque durante o mês.",
			},
			{
				type: "feature-highlight",
				icon: "🎊",
				title: "Semana 1: abertura do Arraiá — 1 a 7 de junho",
				body:
					"Comece anunciando a campanha em todos os canais: WhatsApp, stories, vitrine e foto de perfil da equipe.\n\nEscolha um produto ou serviço temático para revelar primeiro aos clientes mais fiéis. Um áudio curto no WhatsApp funciona bem: quem já compra com você recebe a novidade antes das redes sociais. Isso cria pertencimento.\n\nDurante a semana, escolha um primeiro dia de movimento na loja. Ofereça algo simbólico: uma pipoca, um pequeno mimo ou uma participação em sorteio. O valor está na experiência, não no custo do presente.",
			},
			{
				type: "feature-highlight",
				icon: "💛",
				title: "Semana 2: Dia dos Namorados — 8 a 14 de junho",
				body:
					"Em 2026, o Dia dos Namorados cai na sexta-feira, **12 de junho**. Aproveite a conexão natural entre Festa Junina, casal e casamento na roça.\n\nCrie uma oferta para duas pessoas ou um combo de presentes. Dê um nome com personalidade:\n\n• **Casal Caipira**\n• **Arraiá dos Apaixonados**\n• **São João a Dois**\n\nNos dias anteriores, publique bastidores da preparação e sugestões de presentes. No dia 12, uma live curta pode apresentar a ideia, celebrar a data e incluir um sorteio simples.",
			},
			{
				type: "feature-highlight",
				icon: "📅",
				title: "Semana 3: transforme o dia mais fraco — 15 a 21 de junho",
				body:
					"Qual é o dia com menos movimento na sua loja?\n\nEscolha esse dia e crie uma ação recorrente. Pode ser um produto exclusivo, uma experiência especial ou uma vantagem em um serviço específico.\n\nQuando a ação se repete, o cliente aprende que existe um bom motivo para visitar sua loja naquele dia. Aos poucos, ele começa a planejar a visita.",
			},
			{
				type: "feature-highlight",
				icon: "✨",
				title: "Semana 4: encerramento de São João — 22 a 30 de junho",
				body:
					"A semana de **24 de junho**, Dia de São João, é o momento mais forte da campanha.\n\nSe você tem uma loja física, organize uma experiência presencial simples: decoração especial, música ambiente e um mimo para quem visitar o espaço.\n\nSe sua operação é digital, faça uma live de encerramento, anuncie o resultado do sorteio e agradeça aos clientes que participaram.\n\nDepois, envie uma mensagem individual para cada pessoa que comprou durante o mês. Use o nome do cliente e mencione o produto ou serviço escolhido. Esse cuidado ajuda sua loja a continuar sendo lembrada em julho.",
			},
			{
				type: "text",
				heading: "A campanha precisa aparecer em todos os canais",
				body:
					"Uma boa campanha não exige uma produção cara. Ela exige consistência.\n\nAtualize a foto de perfil da equipe, publique stories diariamente e mantenha o status do WhatsApp alinhado ao tema da semana. Quando o cliente percebe a mesma mensagem em diferentes pontos de contato, entende que algo está acontecendo.\n\n• **Foto de perfil:** use uma versão temática com o nome da loja e uma referência ao Arraiá.\n• **Stories:** publique bastidores, clientes sendo atendidos, produtos do dia e contagens regressivas.\n• **Foto de capa:** atualize na primeira semana com a arte da campanha.\n• **Status do WhatsApp:** escolha uma frase curta para o tema da semana e mude toda segunda-feira.",
			},
			{
				type: "text",
				heading: "Comece por uma pergunta",
				body:
					"Qual produto ou serviço da sua loja faria sentido em um combo de Dia dos Namorados?\n\nEscolha uma opção e comece por ela. Uma boa campanha não precisa nascer enorme. Precisa nascer clara, aparecer com frequência e dar ao cliente um motivo para participar.",
			},
			{
				type: "quote",
				text: "Promoção não é o que você faz quando as vendas caem. É o que você faz para evitar que elas caiam.",
			},
		],
		faqs: [
			{
				question: "Como criar uma campanha de Festa Junina para a minha loja?",
				answer:
					"Em vez de uma ação única, monte um calendário para o mês inteiro com um tema central — o Arraiá da sua loja. Divida em quatro semanas: abertura, Dia dos Namorados, transformação do dia mais fraco e encerramento no São João. Comunique com consistência no WhatsApp, stories, vitrine e status, e feche com uma mensagem individual para quem comprou.",
			},
			{
				question: "Preciso dar desconto para a campanha de junho funcionar?",
				answer:
					"Não. Desconto reduz a margem e sempre haverá quem cobre menos. Promoção é criar um motivo para o cliente visitar a loja — uma experiência, um lançamento, um mimo ou a sensação de participar de algo especial. Em junho, esse motivo pode ser um Arraiá temático, com ações semanais em vez de preço baixo.",
			},
			{
				question: "Como aproveitar o Dia dos Namorados dentro da campanha junina?",
				answer:
					"Em 2026 o Dia dos Namorados cai na sexta, 12 de junho. Conecte a data ao tema caipira com um combo para casais e um nome com personalidade, como Casal Caipira ou Arraiá dos Apaixonados. Publique bastidores e sugestões de presente nos dias anteriores e faça uma live curta no dia.",
			},
			{
				question: "Como o RecompraCRM ajuda na campanha de Festa Junina?",
				answer:
					"O RecompraCRM organiza sua base para você segmentar quem recebe cada oferta primeiro, disparar campanhas no WhatsApp por comportamento e acompanhar o resultado de cada ação. Assim a campanha junina deixa de ser um esforço solto e vira recompra mensurável, com clientes voltando ao longo do mês.",
			},
		],
		cta: {
			headline: "Quer transformar campanhas em clientes voltando para comprar?",
			sub: "Conheça o RecompraCRM e veja como organizar sua base, segmentar clientes e acompanhar os resultados das suas campanhas.",
			buttonText: "Agendar Demo Gratuita",
			whatsappMessage: "Olá! Vi o artigo sobre a campanha de Festa Junina no blog do RecompraCRM e gostaria de agendar uma demonstração.",
		},
	},
	{
		slug: "como-fechar-a-semana-no-varejo-e-preparar-a-proxima",
		title: "Como fechar a semana no varejo e começar a próxima vendendo com mais método",
		headline: "Um ritual simples de sexta-feira para transformar dados da semana em campanhas, foco comercial e recompra.",
		description:
			"Veja como usar o fechamento de sexta-feira para analisar campanhas, preparar ações sazonais e começar a próxima semana com mais clareza no varejo.",
		category: "dicas",
		categoryLabel: "Dicas de Gestão",
		coverEmoji: "📋",
		publishedAt: "2026-05-22",
		readingTime: "5 min",
		seo: {
			keywords: [
				"fechamento semanal varejo",
				"gestão de loja física",
				"campanhas para varejo",
				"planejamento semanal varejo",
				"como vender mais no varejo",
				"crm para varejo",
				"recompra no varejo",
			],
		},
		relatedSlugs: ["como-criar-campanha-festa-junina-para-loja"],
		sections: [
			{
				type: "text",
				heading: "Sexta-feira não serve só para fechar o caixa",
				body:
					"Sexta-feira, 18h. Muitos varejistas estão olhando para o caixa, conferindo o movimento da semana e tentando entender se o resultado foi bom ou ruim.\n\nEsse fechamento é importante. Mas o varejista que cresce com mais consistência faz uma coisa a mais: ele não usa a sexta apenas para olhar para trás. Ele usa a sexta para abrir a próxima semana.\n\nUm pré-fechamento simples, feito com método, ajuda a identificar o que vendeu melhor, o que ficou parado, quais campanhas trouxeram resultado e quais clientes bons precisam ser acionados antes que esfriem.",
			},
			{
				type: "feature-highlight",
				icon: "🎯",
				title: "1. Campanha boa não é só desconto",
				body:
					"As campanhas que mais performam no varejo raramente dependem apenas de baixar preço. Elas costumam ter quatro elementos claros: produto foco, prazo definido, comunicação frequente e equipe sabendo exatamente o que oferecer.\n\nUma campanha fraca geralmente não falha porque a oferta era ruim. Ela falha porque ninguém consegue responder com clareza:\n\n• O que estamos vendendo esta semana?\n• Para quem vamos oferecer primeiro?\n• Como o vendedor deve abordar?\n• Onde isso aparece dentro da loja?\n• Quantas vezes vamos comunicar?\n\n**Ação para segunda-feira:** escolha um produto ou categoria foco, defina uma meta simples e monte uma lista de clientes que devem receber essa oferta primeiro.",
			},
			{
				type: "feature-highlight",
				icon: "🍂",
				title: "2. Quando o clima muda, a compra também muda",
				body:
					"No outono e no inverno, o comportamento de compra muda junto com a rotina do cliente. Algumas categorias ganham força naturalmente. Outras precisam ser reposicionadas. E algumas precisam de campanha para não ficarem paradas no estoque.\n\nO erro de muitos lojistas é esperar o cliente sentir a necessidade para só então tentar vender. O varejo mais profissional se antecipa: olha para calendário, clima, estoque e histórico de compra antes da demanda aparecer.\n\n**Ação para segunda-feira:** liste quais produtos da sua loja fazem mais sentido para os dias frios e monte uma comunicação simples, como: “Produtos que ajudam você a se preparar para os dias mais frios”. Não precisa complicar. Precisa começar antes.",
			},
			{
				type: "feature-highlight",
				icon: "🔥",
				title: "3. Junho começa antes de junho para quem vende com método",
				body:
					"Datas sazonais não começam no dia da data. Quem vende bem em períodos como mês junino prepara estoque, campanha, vitrine, conteúdo, lista de clientes e abordagem da equipe com antecedência.\n\nA pergunta que sua loja deveria fazer ainda hoje é: quais produtos, kits, combos ou ofertas podem fazer sentido para junho?\n\nIsso vale para mercado, moda, construção, decoração, pet shop, material elétrico, cosméticos, farmácia e praticamente qualquer varejo que saiba conectar produto com ocasião de compra.\n\n**Ação para segunda-feira:** escolha uma primeira campanha junina simples e responda:\n\n• Qual produto vamos destacar?\n• Qual cliente tem mais chance de comprar?\n• Qual mensagem vamos enviar?\n• Qual vitrine ou exposição vamos montar?\n• Qual meta queremos bater?",
			},
			{
				type: "stats",
				items: [
					{ value: "30 min", label: "Tempo suficiente para fazer um pré-fechamento semanal com a equipe" },
					{ value: "1 foco", label: "Produto ou categoria principal para orientar campanha, vitrine e abordagem" },
					{ value: "6 perguntas", label: "Roteiro simples para sair da sexta com a próxima semana encaminhada" },
				],
			},
			{
				type: "text",
				heading: "O ritual de 30 minutos para fechar a semana com método",
				body:
					"Quem só fecha o caixa olha para o passado. Quem fecha a semana com método prepara o próximo resultado.\n\nAntes de encerrar a sexta-feira, reúna sua equipe por 30 minutos e responda:\n\n• O que vendeu melhor?\n• O que não girou?\n• Qual campanha trouxe mais resultado?\n• Quem foi o vendedor destaque?\n• Quais clientes bons não compraram?\n• O que vamos vender na próxima semana?\n\nEsse ritual simples muda a forma como a loja começa a segunda-feira. Em vez de abrir a semana no improviso, a equipe já sabe qual produto empurrar, quais clientes acionar e qual meta perseguir.",
			},
			{
				type: "quote",
				text: "Varejo consistente não depende só de movimento. Depende de transformar o que aconteceu na semana em decisão para a próxima.",
				author: "RecompraCRM",
			},
			{
				type: "text",
				heading: "Como o RecompraCRM ajuda nesse processo",
				body:
					"O RecompraCRM foi criado para dar método a essa rotina. Com histórico de compras, campanhas no WhatsApp, segmentação por comportamento, cashback e dashboards de vendas, a loja consegue sair do achismo e transformar a base de clientes em uma agenda comercial.\n\nNa prática, o gestor enxerga quem comprou, quem sumiu, quais campanhas performaram, quais clientes têm maior potencial de recompra e quais ações fazem sentido para a próxima semana.\n\nO fechamento deixa de ser apenas contábil. Ele vira uma ferramenta de crescimento.",
			},
		],
		faqs: [
			{
				question: "O que é o fechamento semanal no varejo?",
				answer:
					"É um ritual de cerca de 30 minutos na sexta-feira em que a equipe não apenas confere o caixa, mas prepara a próxima semana. Você revisa o que vendeu bem, o que ficou parado, quais campanhas performaram e quais bons clientes não compraram — saindo da sexta com a semana seguinte já encaminhada.",
			},
			{
				question: "Quais perguntas fazer no fechamento de sexta-feira?",
				answer:
					"Responda seis perguntas com a equipe: o que vendeu melhor? O que não girou? Qual campanha trouxe mais resultado? Quem foi o vendedor destaque? Quais clientes bons não compraram? E o que vamos vender na próxima semana? Esse roteiro transforma o fechamento em decisão comercial.",
			},
			{
				question: "Quanto tempo leva o ritual de fechamento semanal?",
				answer:
					"Cerca de 30 minutos são suficientes. O objetivo não é uma reunião longa, e sim definir um produto ou categoria foco, uma meta simples e a lista de clientes a acionar — para que a equipe comece a segunda-feira com método, e não no improviso.",
			},
			{
				question: "Como o RecompraCRM ajuda no planejamento semanal da loja?",
				answer:
					"Com histórico de compras, campanhas no WhatsApp, segmentação por comportamento, cashback e dashboards de vendas, o RecompraCRM mostra quem comprou, quem sumiu, quais campanhas performaram e quais clientes têm maior potencial de recompra. O fechamento deixa de ser contábil e vira uma agenda comercial para a próxima semana.",
			},
		],
		cta: {
			headline: "Quer fechar a semana com mais clareza comercial?",
			sub: "Agende uma demonstração gratuita e veja como o RecompraCRM ajuda sua loja a planejar campanhas, acionar clientes e gerar mais recompra.",
			buttonText: "Agendar Demo Gratuita",
			whatsappMessage: "Olá! Vi o artigo sobre fechamento semanal no varejo e gostaria de conhecer o RecompraCRM.",
		},
	},
];

export function getBlogPost(slug: string): BlogPost | undefined {
	return BLOG_POSTS.find((p) => p.slug === slug);
}

export function getBlogPostsByCategory(category: BlogPost["category"]): BlogPost[] {
	return BLOG_POSTS.filter((p) => p.category === category);
}
