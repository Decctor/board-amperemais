"use client";

import { BrandLogo } from "@/components/Brand/BrandLogo";
import {
	ArrowRight,
	BadgeDollarSign,
	BarChart3,
	Boxes,
	BrainCircuit,
	BriefcaseBusiness,
	Check,
	CircleDollarSign,
	ClipboardCheck,
	CloudCog,
	ContactRound,
	CreditCard,
	Database,
	FileText,
	Gift,
	Handshake,
	HeartHandshake,
	Landmark,
	LayoutDashboard,
	Megaphone,
	MessageCircleMore,
	PackageCheck,
	ReceiptText,
	RefreshCw,
	ScanLine,
	ShoppingBag,
	ShoppingCart,
	Sparkles,
	Store,
	Target,
	TrendingUp,
	Users,
	WalletCards,
	type LucideIcon,
} from "lucide-react";
import type { ReactNode } from "react";
import { BRAND, heroGradient, Kicker, Sheet, SheetFooter } from "./_shared";

const DOCUMENT_LABEL = "RecompraCRM no varejo · plano anual";

type Feature = {
	icon: LucideIcon;
	title: string;
	body: string;
	tag?: string;
};

const CRM_INTELLIGENCE: Feature[] = [
	{
		icon: LayoutDashboard,
		title: "BI comercial",
		body: "Receita, margem, ticket médio, itens por venda e evolução por período em uma leitura única.",
	},
	{
		icon: BrainCircuit,
		title: "Matriz RFM",
		body: "Segmenta automaticamente clientes por recência, frequência e valor para priorizar a próxima ação.",
	},
	{
		icon: ContactRound,
		title: "Visão 360º do cliente",
		body: "LTV, histórico, preferências, produtos recorrentes, dias de compra e relacionamento em um perfil.",
	},
	{
		icon: Boxes,
		title: "Inteligência de produto",
		body: "Giro, estoque baixo, ranking, margem e combinações de compra para orientar oferta e reposição.",
	},
	{
		icon: TrendingUp,
		title: "Metas e performance",
		body: "Metas globais e individuais, acompanhamento em tempo real e ranking por vendedor, parceiro ou loja.",
	},
	{
		icon: Database,
		title: "Base proprietária",
		body: "Clientes, vendas e produtos organizados para a empresa vender melhor sem depender de audiência alugada.",
	},
];

const CRM_ACTIVATION: Feature[] = [
	{
		icon: MessageCircleMore,
		title: "Campanhas automáticas",
		body: "WhatsApp por primeira compra, nova compra, aniversário, segmento RFM, inatividade e cashback expirando.",
	},
	{ icon: Gift, title: "Cashback e fidelidade", body: "Crédito percentual ou fixo, validade, resgate, prêmios e ponto de interação no balcão." },
	{
		icon: BadgeDollarSign,
		title: "Cupons inteligentes",
		body: "Regras por produto, público, valor mínimo, canal e limite de uso, com códigos globais ou individuais.",
	},
	{ icon: ScanLine, title: "Atribuição de receita", body: "Enviados, entregues, lidos, cliques, conversões e faturamento atribuído à campanha." },
	{ icon: Users, title: "Carteira comercial", body: "Agenda, fila de contatos, registro de interação e liderança ativa da base por vendedor." },
	{ icon: Megaphone, title: "Marketing conectado", body: "Audiências e eventos de compra alimentam ações de retenção e mídia com mais contexto." },
];

const ERP_FRONT: Feature[] = [
	{
		icon: ShoppingCart,
		title: "PDV conectado ao cliente",
		body: "Venda presencial, retirada, entrega ou comanda, com cliente, vendedor, itens, pagamentos e histórico no mesmo fluxo.",
	},
	{
		icon: BrainCircuit,
		title: "Cross-sell no momento certo",
		body: "Sugestão de itens complementares a partir do carrinho e do comportamento de compra do cliente.",
	},
	{
		icon: ReceiptText,
		title: "Análise automática do cupom",
		body: "O fechamento vira inteligência: mix, ticket, margem, cashback, cupom e campanha associados à venda.",
	},
	{
		icon: WalletCards,
		title: "Fechamento automático de caixa",
		body: "Abertura, sangria, suprimento, conferência de meios de pagamento e encerramento da sessão de venda.",
	},
	{
		icon: CreditCard,
		title: "Descontos e pagamentos",
		body: "Múltiplas formas de pagamento, desconto, acréscimo, cupom e cashback com regras centralizadas.",
	},
	{
		icon: FileText,
		title: "Fiscal integrado",
		body: "Preparado para emissão e acompanhamento de NFC-e/NF-e, impressão de cupom e rastreabilidade da operação.",
	},
];

const ERP_BACK: Feature[] = [
	{
		icon: PackageCheck,
		title: "Estoque e lotes",
		body: "Saldo, movimentações, estoque mínimo, giro, lotes, validade e etiquetas para operação e auditoria.",
	},
	{
		icon: ShoppingBag,
		title: "Compras e entrada",
		body: "Pedidos de compra, fornecedores e documentos de entrada conectados à atualização do estoque.",
	},
	{
		icon: ClipboardCheck,
		title: "Pedidos em Kanban / KDS",
		body: "Fila visual para receber, preparar, aprontar, despachar e concluir pedidos por canal.",
	},
	{ icon: Landmark, title: "Financeiro", body: "Contas financeiras, lançamentos, receitas, despesas e visão gerencial do fluxo." },
	{
		icon: Store,
		title: "Loja digital integrada",
		body: "Catálogo, carrinho, cliente, entrega, pagamento, cashback, cupons e acompanhamento do pedido em um canal próprio.",
	},
	{
		icon: RefreshCw,
		title: "Operação omnicanal",
		body: "Loja física, e-commerce, iFood e integrações compartilham cliente, produto, pedido e inteligência.",
	},
];

const ECOSYSTEM = [
	{
		name: "Enterprise",
		range: "Projeto sob medida",
		description: "Criação de sistemas de gestão, CRM, portais e integrações para operações com necessidades específicas.",
		ideal: "Redes, indústrias, distribuidores e operações com processo próprio",
		icon: CloudCog,
	},
	{
		name: "RecompraCRM",
		range: "R$ 299 a R$ 899 / mês",
		description: "Inteligência de clientes, automação de relacionamento, fidelidade e gestão comercial para gerar recompra.",
		ideal: "Varejo que já vende e quer aumentar recorrência e LTV",
		icon: HeartHandshake,
	},
	{
		name: "RecompraERP",
		range: "R$ 199 a R$ 1.899 / mês",
		description: "Venda, estoque, pedidos, caixa, fiscal, financeiro e canais digitais em uma operação conectada.",
		ideal: "Lojas que precisam controlar e expandir a operação",
		icon: Store,
	},
] as const;

export function RecompraCrmVarejoPlanoAnual() {
	return (
		<>
			<CoverSheet />
			<ThesisSheet />
			<EcosystemSheet />
			<CrmIntelligenceSheet />
			<CrmActivationSheet />
			<ErpFrontSheet />
			<ErpBackSheet />
			<EnterpriseSheet />
			<ProjectsSheet />
			<IcpSheet />
			<PartnershipSheet />
			<EconomicsSheet />
			<AnnualPlanSheet />
			<ClosingSheet />
		</>
	);
}

function CoverSheet() {
	return (
		<Sheet className="text-white">
			<div className="relative flex flex-1 flex-col overflow-hidden px-14 py-14" style={{ backgroundColor: BRAND.blueDeep }}>
				<div
					className="absolute inset-0 opacity-[0.14]"
					style={{ backgroundImage: "radial-gradient(circle, #fff 1.2px, transparent 1.2px)", backgroundSize: "21px 21px" }}
				/>
				<div className="absolute -right-40 top-28 h-[520px] w-[520px] rounded-full border-[82px] border-white/5" />
				<div
					className="absolute -bottom-44 -left-32 h-[480px] w-[480px] rounded-full"
					style={{ background: `radial-gradient(circle, ${BRAND.gold} 0%, transparent 66%)`, opacity: 0.3 }}
				/>

				<div className="relative z-10 flex items-center justify-between">
					<div className="relative h-14 w-44">
						<BrandLogo lockup="stacked" tone="white" fill className="object-contain object-left" priority />
					</div>
					<div className="text-right">
						<p className="text-[0.65rem] font-extrabold uppercase tracking-[0.28em] text-white/65">Visão comercial 2026–2027</p>
						<p className="mt-1 text-xs font-semibold text-white/45">Documento estratégico · julho de 2026</p>
					</div>
				</div>

				<div className="relative z-10 my-auto max-w-[650px]">
					<span className="inline-flex rounded-full bg-white/10 px-4 py-2 text-xs font-extrabold uppercase tracking-[0.2em] ring-1 ring-white/20">
						Plano anual de entrada no varejo
					</span>
					<h1 className="mt-7 text-[4.35rem] font-black leading-[0.9] tracking-[-0.045em] text-balance">
						A operação vende.
						<br />
						<span style={{ color: BRAND.gold }}>A inteligência faz vender de novo.</span>
					</h1>
					<p className="mt-8 max-w-[590px] text-[1.14rem] font-medium leading-relaxed text-white/78">
						RecompraCRM, RecompraERP e soluções Enterprise em um único ecossistema para transformar transações, clientes e rotinas do varejo em crescimento
						recorrente.
					</p>
				</div>

				<div className="relative z-10 grid grid-cols-3 overflow-hidden rounded-2xl bg-white/8 ring-1 ring-white/15">
					{["Gestão da operação", "Inteligência de clientes", "Receita recorrente"].map((item, index) => (
						<div key={item} className={`px-5 py-4 ${index ? "border-l border-white/15" : ""}`}>
							<span className="text-[0.6rem] font-black uppercase tracking-[0.24em] text-white/40">0{index + 1}</span>
							<p className="mt-1 text-sm font-extrabold">{item}</p>
						</div>
					))}
				</div>
			</div>
		</Sheet>
	);
}

function ThesisSheet() {
	return (
		<StandardSheet index="02 / 14" kicker="Nossa tese" title="O varejo não precisa escolher entre controlar a operação e conhecer o cliente.">
			<p className="max-w-[690px] text-[1.02rem] leading-relaxed text-neutral-600">
				ERPs tradicionais registram o que aconteceu. CRMs tradicionais organizam oportunidades. O Recompra ocupa o espaço entre os dois: usa a venda real
				para decidir quem abordar, com qual oferta e em qual momento, enquanto mantém a rotina da loja conectada.
			</p>

			<div className="mt-9 grid grid-cols-[1fr_auto_1fr_auto_1fr] items-stretch">
				<ThesisBlock label="Operação" title="Tudo o que a loja faz" items={["PDV e caixa", "Estoque e compras", "Pedidos e fiscal"]} />
				<FlowArrow />
				<ThesisBlock label="Inteligência" title="Tudo o que os dados revelam" items={["RFM e LTV", "Margem e giro", "Próxima melhor ação"]} emphasized />
				<FlowArrow />
				<ThesisBlock label="Crescimento" title="Tudo o que volta em receita" items={["Cashback e cupons", "Campanhas automáticas", "Canais próprios"]} />
			</div>

			<div className="mt-10 rounded-3xl px-8 py-7 text-white" style={heroGradient}>
				<div className="grid grid-cols-[0.8fr_1.2fr] gap-8">
					<div>
						<Kicker tone="white">Posicionamento</Kicker>
						<h3 className="mt-3 text-3xl font-black leading-tight">O sistema operacional da recompra no varejo.</h3>
					</div>
					<div className="flex flex-col justify-center">
						<p className="text-base leading-relaxed text-white/82">
							Não vendemos somente software. Entregamos uma camada de crescimento sobre a operação: dados organizados, automações que trabalham todos os dias
							e acompanhamento humano para a estratégia sair da tela.
						</p>
						<p className="mt-4 text-[0.68rem] font-bold uppercase tracking-[0.17em] text-white/45">
							Leitura competitiva baseada nas ofertas públicas de RD Station CRM, Bling e Omie · julho de 2026
						</p>
					</div>
				</div>
			</div>

			<div className="mt-8 flex items-center gap-4 rounded-2xl bg-neutral-100 px-6 py-5">
				<Target className="h-8 w-8 shrink-0" style={{ color: BRAND.blue }} />
				<p className="text-[0.96rem] leading-relaxed text-neutral-700">
					<strong className="font-black text-neutral-950">A categoria que queremos liderar:</strong> crescimento orientado por dados transacionais para o
					varejo brasileiro, com CRM, ERP e execução consultiva no mesmo parceiro.
				</p>
			</div>
		</StandardSheet>
	);
}

function EcosystemSheet() {
	return (
		<StandardSheet index="03 / 14" kicker="Portfólio" title="Três portas de entrada. Uma plataforma para crescer.">
			<p className="max-w-[650px] text-base leading-relaxed text-neutral-600">
				O cliente pode começar pela dor mais urgente e ampliar sem reconstruir sua base. Cada produto abre receita própria e também cria oportunidades
				para os demais.
			</p>
			<div className="mt-8 flex flex-col gap-5">
				{ECOSYSTEM.map((product, index) => (
					<div key={product.name} className="grid grid-cols-[72px_1fr_190px] items-center gap-5 rounded-3xl border border-neutral-200 px-6 py-6">
						<div
							className="flex h-16 w-16 items-center justify-center rounded-2xl text-white"
							style={{ backgroundColor: index === 1 ? BRAND.blue : BRAND.blueDeep }}
						>
							<product.icon className="h-8 w-8" />
						</div>
						<div>
							<div className="flex items-center gap-3">
								<h3 className="text-2xl font-black">{product.name}</h3>
								<span
									className="rounded-full px-3 py-1 text-[0.65rem] font-black uppercase tracking-wider"
									style={{ backgroundColor: index === 1 ? BRAND.gold : "rgba(36,84,156,0.1)", color: index === 1 ? BRAND.ink : BRAND.blue }}
								>
									{product.range}
								</span>
							</div>
							<p className="mt-2 text-[0.91rem] leading-relaxed text-neutral-600">{product.description}</p>
						</div>
						<div className="border-l border-neutral-200 pl-5">
							<span className="text-[0.62rem] font-black uppercase tracking-[0.18em] text-neutral-400">Melhor encaixe</span>
							<p className="mt-2 text-[0.79rem] font-bold leading-snug text-neutral-700">{product.ideal}</p>
						</div>
					</div>
				))}
			</div>

			<div className="mt-8 grid grid-cols-[1fr_1fr] gap-5">
				<div className="rounded-2xl bg-neutral-100 p-6">
					<h4 className="text-sm font-black uppercase tracking-wide">Modelo comercial</h4>
					<p className="mt-2 text-sm leading-relaxed text-neutral-600">
						Assinatura recorrente conforme plano e módulos, mais implementação definida pelo escopo, integrações, migração, treinamento e nível de
						personalização.
					</p>
				</div>
				<div className="rounded-2xl p-6" style={{ backgroundColor: "rgba(255,185,0,0.13)" }}>
					<h4 className="text-sm font-black uppercase tracking-wide">A lógica da expansão</h4>
					<p className="mt-2 text-sm leading-relaxed text-neutral-700">
						CRM revela demanda de gestão. ERP gera dados para retenção. Enterprise resolve o que é estratégico e específico. Cada venda aumenta o potencial
						da conta.
					</p>
				</div>
			</div>
		</StandardSheet>
	);
}

function CrmIntelligenceSheet() {
	return (
		<FeatureSheet
			index="04 / 14"
			kicker="RecompraCRM · inteligência"
			title="Da venda registrada à próxima decisão comercial."
			lead="O RecompraCRM organiza o comportamento real de compra para que dono, gestor e vendedor saibam onde está a receita escondida na base."
			features={CRM_INTELLIGENCE}
			callout="A diferença prática: o vendedor não recebe uma lista fria. Recebe contexto, prioridade e um motivo concreto para falar com cada cliente."
		/>
	);
}

function CrmActivationSheet() {
	return (
		<FeatureSheet
			index="05 / 14"
			kicker="RecompraCRM · ativação"
			title="Relacionamento que acontece mesmo quando a equipe está ocupada."
			lead="Segmentação, benefício, mensagem e mensuração trabalham como um ciclo. A estratégia deixa de depender de planilha, memória ou campanha esporádica."
			features={CRM_ACTIVATION}
			callout="O objetivo não é disparar mais mensagens. É criar mais motivos relevantes para o cliente voltar e provar quais ações geraram faturamento."
			gold
		/>
	);
}

function ErpFrontSheet() {
	return (
		<FeatureSheet
			index="06 / 14"
			kicker="RecompraERP · frente de loja"
			title="Um PDV que não encerra a relação quando imprime o cupom."
			lead="A venda já nasce conectada a cliente, produto, pagamento, vendedor, benefício e canal. O caixa fecha; a inteligência continua trabalhando."
			features={ERP_FRONT}
			callout="Cross-sell, fidelidade e análise do cupom deixam de ser sistemas paralelos. Tornam-se parte natural da venda."
		/>
	);
}

function ErpBackSheet() {
	return (
		<FeatureSheet
			index="07 / 14"
			kicker="RecompraERP · operação"
			title="Do estoque ao pedido entregue, uma única linha de informação."
			lead="O backoffice conecta abastecimento, execução, financeiro e canais digitais para reduzir retrabalho e tornar a operação legível."
			features={ERP_BACK}
			callout="Próximo módulo estratégico: gestão completa de comandas, com abertura, consumo, transferência, divisão, pagamento e histórico conectados ao cliente."
			gold
		/>
	);
}

function EnterpriseSheet() {
	const steps = [
		{ n: "01", title: "Descoberta", body: "Mapeamos rotina, gargalos, sistemas, riscos e resultado esperado." },
		{ n: "02", title: "Desenho", body: "Definimos escopo, integrações, experiência e indicadores de sucesso." },
		{ n: "03", title: "Construção", body: "Entregas incrementais, testes com operação real e visibilidade do avanço." },
		{ n: "04", title: "Evolução", body: "Suporte, dados de uso, melhoria contínua e novas frentes de valor." },
	];
	return (
		<StandardSheet index="08 / 14" kicker="Enterprise" title="Quando o processo é estratégico, o sistema precisa se adaptar à empresa.">
			<div className="grid grid-cols-[1.05fr_0.95fr] gap-8">
				<div>
					<p className="text-base leading-relaxed text-neutral-600">
						Criamos soluções sob demanda para operações que não cabem em um software genérico. O ponto de partida pode ser um portal, hub de clientes,
						integração, automação, aplicativo de equipe ou módulo de gestão.
					</p>
					<div className="mt-7 rounded-3xl p-7 text-white" style={heroGradient}>
						<Kicker tone="white">O que podemos construir</Kicker>
						<div className="mt-5 grid grid-cols-2 gap-x-5 gap-y-4">
							{[
								"Portais B2B e B2C",
								"CRM verticalizado",
								"Apps de força de vendas",
								"Integrações com legado",
								"Hubs de dados e clientes",
								"Automação operacional",
								"Painéis executivos",
								"Jornadas omnicanal",
							].map((item) => (
								<div key={item} className="flex items-center gap-2 text-sm font-bold">
									<Check className="h-4 w-4" style={{ color: BRAND.gold }} />
									{item}
								</div>
							))}
						</div>
					</div>
				</div>
				<div className="rounded-3xl bg-neutral-100 p-7">
					<h3 className="text-xl font-black">O ativo que o cliente leva</h3>
					<ul className="mt-5 flex flex-col gap-4">
						{[
							["Aderência", "Fluxos desenhados para a operação real."],
							["Propriedade de dados", "Informação organizada e disponível para decisão."],
							["Integração", "Menos ilhas e menos digitação repetida."],
							["Evolução", "Produto que acompanha o negócio, não só o contrato."],
						].map(([title, body]) => (
							<li key={title} className="flex gap-3">
								<Sparkles className="mt-0.5 h-5 w-5 shrink-0" style={{ color: BRAND.blue }} />
								<p className="text-sm leading-relaxed text-neutral-600">
									<strong className="font-black text-neutral-950">{title}:</strong> {body}
								</p>
							</li>
						))}
					</ul>
				</div>
			</div>

			<div className="mt-9 grid grid-cols-4 gap-3">
				{steps.map((step) => (
					<div key={step.n} className="rounded-2xl border border-neutral-200 p-5">
						<span className="text-xs font-black" style={{ color: BRAND.goldText }}>
							{step.n}
						</span>
						<h4 className="mt-2 font-black">{step.title}</h4>
						<p className="mt-2 text-xs leading-relaxed text-neutral-500">{step.body}</p>
					</div>
				))}
			</div>

			<p className="mt-7 text-[0.78rem] leading-relaxed text-neutral-500">
				Escopo, propriedade intelectual, integrações, níveis de serviço e cronograma são definidos em proposta específica. O Enterprise não é “software
				infinito”; é engenharia orientada a uma oportunidade de negócio clara.
			</p>
		</StandardSheet>
	);
}

function ProjectsSheet() {
	const projects = [
		{
			name: "Casa do Marceneiro",
			context: "Rede de 5 lojas",
			thesis: "Fidelização no balcão, reativação da base e rotina comercial para transformar fluxo recorrente em relacionamento mensurável.",
			assets: ["Cashback no ponto de interação", "Matriz RFM", "Campanhas de reativação"],
		},
		{
			name: "Pontual Supermercados",
			context: "Supermercado",
			thesis: "Usar promoções e cupons personalizados como fonte de inteligência, conectando campanha, resgate e faturamento.",
			assets: ["Integração de dados", "Mensuração de campanha", "Cupons por perfil"],
		},
		{
			name: "Prático Supermercados",
			context: "Projeto Enterprise",
			thesis: "Hub de Clientes integrado ao ERP para formar base proprietária e abrir caminho para fidelidade, CRM e comércio digital.",
			assets: ["Cadastro com benefício", "Integração ERPFlex", "Roadmap de expansão"],
		},
	];
	return (
		<StandardSheet
			index="09 / 14"
			kicker="Projetos e teses aplicadas"
			title="Não partimos de funcionalidades soltas. Partimos de uma oportunidade real."
		>
			<p className="max-w-[690px] text-base leading-relaxed text-neutral-600">
				As propostas já desenvolvidas mostram nossa capacidade de ler operações diferentes, encontrar a alavanca comercial e desenhar uma solução
				aplicável. São referências de abordagem, não resultados financeiros publicados.
			</p>
			<div className="mt-8 flex flex-col gap-5">
				{projects.map((project, index) => (
					<div key={project.name} className="grid grid-cols-[150px_1fr_210px] items-center gap-6 rounded-3xl border border-neutral-200 p-6">
						<div>
							<span className="text-[0.62rem] font-black uppercase tracking-wider" style={{ color: index === 2 ? BRAND.goldText : BRAND.blue }}>
								{project.context}
							</span>
							<h3 className="mt-2 text-xl font-black leading-tight">{project.name}</h3>
						</div>
						<p className="border-x border-neutral-200 px-6 text-sm leading-relaxed text-neutral-600">{project.thesis}</p>
						<ul className="flex flex-col gap-2">
							{project.assets.map((asset) => (
								<li key={asset} className="flex items-center gap-2 text-xs font-bold text-neutral-700">
									<Check className="h-3.5 w-3.5" style={{ color: BRAND.blue }} />
									{asset}
								</li>
							))}
						</ul>
					</div>
				))}
			</div>
			<div className="mt-8 flex items-center gap-4 rounded-2xl px-6 py-5" style={{ backgroundColor: "rgba(255,185,0,0.13)" }}>
				<BrainCircuit className="h-8 w-8 shrink-0" style={{ color: BRAND.goldText }} />
				<p className="text-sm leading-relaxed text-neutral-700">
					<strong className="font-black text-neutral-950">Nosso método comercial:</strong> entender onde a operação perde dados, tempo, margem ou
					recorrência; desenhar uma primeira vitória; provar valor; expandir a conta.
				</p>
			</div>
		</StandardSheet>
	);
}

function IcpSheet() {
	const signals = [
		"Tem loja física, delivery, televendas ou rede de unidades",
		"Vende com frequência, mas conhece pouco a base de clientes",
		"Depende de planilhas, sistemas isolados ou processos manuais",
		"Tem produtos de recompra, manutenção, reposição ou consumo",
		"Quer aumentar margem e recorrência, não só gerar novos leads",
		"Tem um decisor acessível e uma dor com impacto financeiro",
	];
	const verticals = [
		["Material de construção", "Reposição, carteira de profissionais, cross-sell e reativação."],
		["Supermercados e lojas", "Base por CPF, cupons, fidelidade, PDV e canais digitais."],
		["Food service", "Pedidos, KDS, delivery, comanda, cashback e canal próprio."],
		["Pet, auto e serviços", "Ciclos previsíveis de retorno, lembretes e histórico."],
		["Distribuição e indústria", "Portal B2B, representantes, pedidos e projetos Enterprise."],
	];
	return (
		<StandardSheet index="10 / 14" kicker="Mercado prioritário" title="Onde nossa proposta cria valor mais rápido.">
			<div className="grid grid-cols-[0.9fr_1.1fr] gap-9">
				<div>
					<h3 className="text-xl font-black">Sinais de uma boa oportunidade</h3>
					<ul className="mt-5 flex flex-col gap-3">
						{signals.map((signal) => (
							<li key={signal} className="flex items-start gap-3 rounded-xl bg-neutral-100 px-4 py-3">
								<Check className="mt-0.5 h-4 w-4 shrink-0" style={{ color: BRAND.blue }} />
								<span className="text-[0.82rem] font-semibold leading-snug text-neutral-700">{signal}</span>
							</li>
						))}
					</ul>
				</div>
				<div>
					<h3 className="text-xl font-black">Verticais com tese pronta</h3>
					<div className="mt-5 flex flex-col gap-3">
						{verticals.map(([title, body], index) => (
							<div key={title} className="grid grid-cols-[32px_150px_1fr] items-center gap-3 border-b border-neutral-200 pb-3">
								<span
									className="flex h-8 w-8 items-center justify-center rounded-full text-xs font-black text-white"
									style={{ backgroundColor: index === 1 ? BRAND.goldText : BRAND.blue }}
								>
									{index + 1}
								</span>
								<strong className="text-sm font-black">{title}</strong>
								<span className="text-xs leading-relaxed text-neutral-500">{body}</span>
							</div>
						))}
					</div>
				</div>
			</div>

			<div className="mt-10 rounded-3xl p-7 text-white" style={{ backgroundColor: BRAND.blueDeep }}>
				<div className="grid grid-cols-[1fr_1.4fr] gap-8">
					<h3 className="text-2xl font-black leading-tight">A pergunta que abre a conversa</h3>
					<p className="text-base leading-relaxed text-white/80">
						“Depois que uma venda termina, sua empresa sabe quem deve voltar, quando deve voltar e o que oferecer para essa pessoa?”
					</p>
				</div>
			</div>
			<p className="mt-6 text-xs leading-relaxed text-neutral-500">
				Evite começar pela demonstração. Comece pelo custo do problema: cliente que some, estoque que não gira, equipe sem prioridade, pedido
				retrabalhado, canal com margem comprimida ou decisão sem dado.
			</p>
		</StandardSheet>
	);
}

function PartnershipSheet() {
	const roles = [
		{
			name: "Executivo de contas",
			commission: "30% implementação + 20% recorrência",
			icon: BriefcaseBusiness,
			promise: "Constrói uma carteira e lidera a relação comercial com o cliente.",
			duties: [
				"Prospecção e diagnóstico",
				"Condução da oportunidade",
				"Liderança do cliente na implantação",
				"Cadência durante a recorrência",
				"Mapeamento de expansão da conta",
			],
		},
		{
			name: "Representante",
			commission: "20% implementação + 5% recorrência",
			icon: Handshake,
			promise: "Abre portas qualificadas e monetiza sua rede de relacionamento.",
			duties: [
				"Identificação da oportunidade",
				"Apresentação e conexão",
				"Contexto sobre decisores e dor",
				"Apoio na negociação inicial",
				"Relacionamento institucional",
			],
		},
	];
	return (
		<StandardSheet index="11 / 14" kicker="Canais de parceria" title="Duas formas de construir receita com a Recompra.">
			<p className="max-w-[690px] text-base leading-relaxed text-neutral-600">
				Nós tocamos produto, tecnologia, implantação e suporte. O parceiro transforma relacionamento de mercado em oportunidade e escolhe o nível de
				protagonismo que quer assumir na conta.
			</p>
			<div className="mt-8 grid grid-cols-2 gap-6">
				{roles.map((role, index) => (
					<div key={role.name} className="overflow-hidden rounded-3xl border border-neutral-200">
						<div className="p-6 text-white" style={{ backgroundColor: index === 0 ? BRAND.blue : BRAND.blueDeep }}>
							<role.icon className="h-8 w-8" />
							<h3 className="mt-4 text-2xl font-black">{role.name}</h3>
							<p className="mt-2 text-sm leading-relaxed text-white/75">{role.promise}</p>
							<span className="mt-5 inline-flex rounded-full px-4 py-2 text-xs font-black" style={{ backgroundColor: BRAND.gold, color: BRAND.ink }}>
								{role.commission}
							</span>
						</div>
						<div className="p-6">
							<span className="text-[0.62rem] font-black uppercase tracking-[0.18em] text-neutral-400">Responsabilidades</span>
							<ul className="mt-4 flex flex-col gap-3">
								{role.duties.map((duty) => (
									<li key={duty} className="flex items-center gap-2 text-sm font-semibold text-neutral-700">
										<Check className="h-4 w-4" style={{ color: BRAND.blue }} />
										{duty}
									</li>
								))}
							</ul>
						</div>
					</div>
				))}
			</div>
			<div className="mt-7 grid grid-cols-[1fr_auto_1fr] items-center gap-5 rounded-2xl bg-neutral-100 p-6">
				<p className="text-sm font-bold text-neutral-700">Parceiro: relacionamento, oportunidade e liderança comercial</p>
				<ArrowRight className="h-5 w-5 text-neutral-400" />
				<p className="text-sm font-bold text-neutral-700">Recompra: solução, implantação, operação técnica e suporte</p>
			</div>
		</StandardSheet>
	);
}

function EconomicsSheet() {
	const examples = [
		{ role: "Executivo de contas", implementation: "R$ 1.500", monthly: "R$ 179,80", year: "R$ 3.657,60" },
		{ role: "Representante", implementation: "R$ 1.000", monthly: "R$ 44,95", year: "R$ 1.539,40" },
	];
	return (
		<StandardSheet index="12 / 14" kicker="Economia da parceria" title="Ganhe na entrada. Continue ganhando enquanto a conta permanece ativa.">
			<div className="rounded-3xl p-7 text-white" style={heroGradient}>
				<div className="grid grid-cols-[1fr_1.2fr] items-center gap-9">
					<div>
						<CircleDollarSign className="h-10 w-10" style={{ color: BRAND.gold }} />
						<h3 className="mt-4 text-3xl font-black leading-tight">Uma carteira vale mais do que uma comissão isolada.</h3>
					</div>
					<p className="text-base leading-relaxed text-white/82">
						A implementação remunera a conquista e o trabalho inicial. A recorrência premia a continuidade do relacionamento, a retenção e a expansão do
						cliente.
					</p>
				</div>
			</div>

			<div className="mt-8">
				<div className="flex items-end justify-between">
					<div>
						<h3 className="text-xl font-black">Exemplo ilustrativo por cliente</h3>
						<p className="mt-1 text-sm text-neutral-500">Implementação de R$ 5.000 + mensalidade de R$ 899</p>
					</div>
					<span className="rounded-full bg-neutral-100 px-3 py-1.5 text-[0.62rem] font-black uppercase tracking-wider text-neutral-500">
						12 meses ativos
					</span>
				</div>
				<div className="mt-5 overflow-hidden rounded-2xl border border-neutral-200">
					<div className="grid grid-cols-[1.2fr_1fr_1fr_1fr] bg-neutral-100 px-5 py-3 text-[0.64rem] font-black uppercase tracking-wider text-neutral-500">
						<span>Modelo</span>
						<span>Na implementação</span>
						<span>Por mês</span>
						<span>Total no 1º ano</span>
					</div>
					{examples.map((row) => (
						<div key={row.role} className="grid grid-cols-[1.2fr_1fr_1fr_1fr] border-t border-neutral-200 px-5 py-5 text-sm">
							<strong className="font-black">{row.role}</strong>
							<span className="font-bold">{row.implementation}</span>
							<span className="font-bold" style={{ color: BRAND.blue }}>
								{row.monthly}
							</span>
							<span className="font-black" style={{ color: BRAND.goldText }}>
								{row.year}
							</span>
						</div>
					))}
				</div>
			</div>

			<div className="mt-8 grid grid-cols-3 gap-4">
				{[
					["Receita composta", "Cada nova conta soma à recorrência das anteriores."],
					["Expansão", "Novos módulos e unidades aumentam o valor da carteira."],
					["Previsibilidade", "Boa liderança de conta reduz cancelamento e protege receita."],
				].map(([title, body]) => (
					<div key={title} className="rounded-2xl bg-neutral-100 p-5">
						<h4 className="text-sm font-black">{title}</h4>
						<p className="mt-2 text-xs leading-relaxed text-neutral-500">{body}</p>
					</div>
				))}
			</div>
			<p className="mt-7 text-[0.68rem] leading-relaxed text-neutral-400">
				Exemplo sem promessa de renda. Valores de implementação variam por escopo. Regras finais devem constar no contrato de parceria, incluindo
				pagamento sobre valores efetivamente recebidos, impostos, estornos, inadimplência, cancelamento, titularidade da conta e prazo de recorrência.
			</p>
		</StandardSheet>
	);
}

function AnnualPlanSheet() {
	const quarters = [
		{
			q: "T1",
			title: "Fundação",
			months: "Meses 1–3",
			focus: "Mensagem, oferta e primeiras vitórias",
			actions: ["Treinar parceiros", "Escolher 2 verticais", "Padronizar diagnóstico", "Fechar contas-farol"],
		},
		{
			q: "T2",
			title: "Validação",
			months: "Meses 4–6",
			focus: "Provar implantação e repetibilidade",
			actions: ["Publicar casos autorizados", "Refinar onboarding", "Criar kits por vertical", "Ativar indicações"],
		},
		{
			q: "T3",
			title: "Escala",
			months: "Meses 7–9",
			focus: "Aumentar cobertura e produtividade",
			actions: ["Expandir parceiros", "Rotina de pipeline", "Campanhas conjuntas", "Upsell CRM + ERP"],
		},
		{
			q: "T4",
			title: "Consolidação",
			months: "Meses 10–12",
			focus: "Reter, expandir e planejar o próximo ciclo",
			actions: ["Revisão de carteira", "Expansão por unidade", "Prêmio de performance", "Plano anual seguinte"],
		},
	];
	return (
		<StandardSheet index="13 / 14" kicker="Plano de 12 meses" title="Começar focado. Provar rápido. Escalar com método.">
			<p className="max-w-[670px] text-base leading-relaxed text-neutral-600">
				A entrada no varejo deve combinar produto, canal e prova. O plano prioriza poucas verticais no início para construir linguagem, implantação e
				referências que possam ser repetidas.
			</p>
			<div className="mt-8 grid grid-cols-4 gap-3">
				{quarters.map((quarter, index) => (
					<div key={quarter.q} className="overflow-hidden rounded-2xl border border-neutral-200">
						<div className="p-5 text-white" style={{ backgroundColor: index === 0 ? BRAND.blue : BRAND.blueDeep }}>
							<span className="text-xs font-black" style={{ color: BRAND.gold }}>
								{quarter.q}
							</span>
							<h3 className="mt-2 text-xl font-black">{quarter.title}</h3>
							<p className="mt-1 text-[0.68rem] font-bold uppercase tracking-wider text-white/45">{quarter.months}</p>
						</div>
						<div className="p-5">
							<p className="min-h-12 text-xs font-bold leading-relaxed text-neutral-700">{quarter.focus}</p>
							<ul className="mt-4 flex flex-col gap-2.5">
								{quarter.actions.map((action) => (
									<li key={action} className="flex items-start gap-2 text-[0.72rem] leading-snug text-neutral-500">
										<Check className="mt-0.5 h-3.5 w-3.5 shrink-0" style={{ color: BRAND.blue }} />
										{action}
									</li>
								))}
							</ul>
						</div>
					</div>
				))}
			</div>

			<div className="mt-8 grid grid-cols-[1fr_1.2fr] gap-6">
				<div className="rounded-3xl bg-neutral-100 p-6">
					<h3 className="text-lg font-black">Placar semanal do canal</h3>
					<div className="mt-4 grid grid-cols-2 gap-3 text-xs font-bold text-neutral-600">
						{[
							"Contas mapeadas",
							"Conversas qualificadas",
							"Diagnósticos realizados",
							"Propostas enviadas",
							"Receita contratada",
							"Receita recorrente ativa",
						].map((metric) => (
							<div key={metric} className="flex items-center gap-2">
								<BarChart3 className="h-4 w-4" style={{ color: BRAND.blue }} />
								{metric}
							</div>
						))}
					</div>
				</div>
				<div className="rounded-3xl p-6" style={{ backgroundColor: "rgba(255,185,0,0.13)" }}>
					<h3 className="text-lg font-black">Metas a calibrar nos primeiros 30 dias</h3>
					<p className="mt-3 text-sm leading-relaxed text-neutral-700">
						Ticket de implementação, ciclo de venda, taxa de diagnóstico para proposta, taxa de fechamento, tempo de implantação, ativação, retenção e
						expansão. O canal só escala quando essas medidas são visíveis.
					</p>
				</div>
			</div>
		</StandardSheet>
	);
}

function ClosingSheet() {
	const playbook = [
		["01", "Mapeie", "Escolha 20 contas onde você já tem acesso ou credibilidade."],
		["02", "Descubra", "Converse sobre recompra, operação, dados, margem e gargalos."],
		["03", "Desenhe", "Traga a Recompra para montar a primeira vitória e o escopo."],
		["04", "Lidere", "Conduza a decisão e permaneça próximo durante a entrega."],
		["05", "Expanda", "Use resultado e confiança para abrir módulos, unidades e indicações."],
	];
	return (
		<Sheet className="text-white">
			<div className="relative flex flex-1 flex-col px-14 py-14" style={{ backgroundColor: BRAND.blueDeep }}>
				<div
					className="absolute inset-0 opacity-[0.11]"
					style={{ backgroundImage: "radial-gradient(circle, #fff 1px, transparent 1px)", backgroundSize: "19px 19px" }}
				/>
				<div className="relative z-10 flex items-center justify-between">
					<div className="relative h-12 w-40">
						<BrandLogo lockup="stacked" tone="white" fill className="object-contain object-left" />
					</div>
					<span className="text-[0.64rem] font-black uppercase tracking-[0.24em] text-white/45">14 / 14</span>
				</div>

				<div className="relative z-10 mt-14">
					<Kicker tone="white">Primeiro movimento</Kicker>
					<h2 className="mt-4 max-w-[690px] text-[3.5rem] font-black leading-[0.96] tracking-tight">
						Não precisamos conquistar o varejo inteiro.
						<br />
						<span style={{ color: BRAND.gold }}>Precisamos transformar bem as primeiras contas.</span>
					</h2>
				</div>

				<div className="relative z-10 mt-10 grid grid-cols-5 gap-3">
					{playbook.map(([n, title, body]) => (
						<div key={n} className="rounded-2xl bg-white/8 p-4 ring-1 ring-white/12">
							<span className="text-xs font-black" style={{ color: BRAND.gold }}>
								{n}
							</span>
							<h3 className="mt-3 text-base font-black">{title}</h3>
							<p className="mt-2 text-[0.7rem] leading-relaxed text-white/58">{body}</p>
						</div>
					))}
				</div>

				<div className="relative z-10 mt-auto grid grid-cols-[1fr_auto] items-end gap-8 border-t border-white/15 pt-9">
					<div>
						<p className="max-w-[570px] text-xl font-bold leading-relaxed text-white/88">
							Se você conhece empresas que vendem todos os dias, mas ainda não transformam cada venda em aprendizado e recompra, existe uma carteira para
							construir com a gente.
						</p>
						<p className="mt-5 text-sm font-extrabold uppercase tracking-[0.18em]" style={{ color: BRAND.gold }}>
							Vamos escolher as primeiras 20 contas.
						</p>
					</div>
					<div className="rounded-2xl bg-white p-4">
						<div className="relative h-10 w-40">
							<BrandLogo lockup="horizontal-badge" tone="color-on-light" fill className="object-contain" />
						</div>
						<p className="mt-2 text-center text-[0.65rem] font-bold text-neutral-500">recompracrm.com.br</p>
					</div>
				</div>
			</div>
		</Sheet>
	);
}

function StandardSheet({ index, kicker, title, children }: { index: string; kicker: string; title: string; children: ReactNode }) {
	return (
		<Sheet>
			<div className="flex flex-1 flex-col px-14 pt-14">
				<Kicker>{kicker}</Kicker>
				<h2 className="mt-4 max-w-[720px] text-[2.65rem] font-black leading-[1.02] tracking-tight text-balance">{title}</h2>
				<div className="mt-6">{children}</div>
			</div>
			<SheetFooter index={index} label={DOCUMENT_LABEL} />
		</Sheet>
	);
}

function FeatureSheet({
	index,
	kicker,
	title,
	lead,
	features,
	callout,
	gold = false,
}: {
	index: string;
	kicker: string;
	title: string;
	lead: string;
	features: Feature[];
	callout: string;
	gold?: boolean;
}) {
	return (
		<StandardSheet index={index} kicker={kicker} title={title}>
			<p className="max-w-[680px] text-base leading-relaxed text-neutral-600">{lead}</p>
			<div className="mt-8 grid grid-cols-2 gap-x-7 gap-y-5">
				{features.map((feature, index) => (
					<div key={feature.title} className="grid grid-cols-[48px_1fr] gap-4 border-b border-neutral-200 pb-5">
						<div
							className="flex h-12 w-12 items-center justify-center rounded-2xl"
							style={{
								backgroundColor: gold && index === 1 ? "rgba(255,185,0,0.18)" : "rgba(36,84,156,0.1)",
								color: gold && index === 1 ? BRAND.goldText : BRAND.blue,
							}}
						>
							<feature.icon className="h-5 w-5" />
						</div>
						<div>
							<h3 className="text-base font-black">{feature.title}</h3>
							<p className="mt-1.5 text-[0.78rem] leading-relaxed text-neutral-500">{feature.body}</p>
						</div>
					</div>
				))}
			</div>
			<div
				className="mt-8 flex items-center gap-4 rounded-2xl px-6 py-5"
				style={{ backgroundColor: gold ? "rgba(255,185,0,0.13)" : "rgba(36,84,156,0.07)" }}
			>
				<ArrowRight className="h-6 w-6 shrink-0" style={{ color: gold ? BRAND.goldText : BRAND.blue }} />
				<p className="text-[0.9rem] font-bold leading-relaxed text-neutral-700">{callout}</p>
			</div>
		</StandardSheet>
	);
}

function ThesisBlock({ label, title, items, emphasized = false }: { label: string; title: string; items: string[]; emphasized?: boolean }) {
	return (
		<div className={`rounded-2xl p-5 ${emphasized ? "text-white" : "bg-neutral-100"}`} style={emphasized ? { backgroundColor: BRAND.blue } : undefined}>
			<span className={`text-[0.6rem] font-black uppercase tracking-[0.18em] ${emphasized ? "text-white/55" : "text-neutral-400"}`}>{label}</span>
			<h3 className="mt-2 text-base font-black leading-tight">{title}</h3>
			<ul className="mt-4 flex flex-col gap-2">
				{items.map((item) => (
					<li key={item} className={`flex items-center gap-2 text-xs font-bold ${emphasized ? "text-white/75" : "text-neutral-600"}`}>
						<Check className="h-3.5 w-3.5" style={{ color: emphasized ? BRAND.gold : BRAND.blue }} />
						{item}
					</li>
				))}
			</ul>
		</div>
	);
}

function FlowArrow() {
	return (
		<div className="flex w-10 items-center justify-center">
			<ArrowRight className="h-5 w-5 text-neutral-300" />
		</div>
	);
}
