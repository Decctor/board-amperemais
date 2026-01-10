import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import {
	BarChart3,
	MessageCircle,
	Users,
	Target,
	Megaphone,
	BadgePercent,
	Brain,
	TrendingUp,
	Shield,
	Zap,
	CheckCircle2,
	ArrowRight,
	Grid3X3,
	ShoppingCart,
	Handshake,
	Package,
	Sparkles,
} from "lucide-react";

export default function LandingPage() {
	return (
		<div className="min-h-screen bg-background">
			{/* Header */}
			<header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-50">
				<div className="container mx-auto px-4 py-4 flex items-center justify-between">
					<div className="flex items-center gap-2">
						<div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
							<Sparkles className="w-5 h-5 text-primary-foreground" />
						</div>
						<span className="text-xl font-bold">RecompraCRM</span>
					</div>
					<div className="flex items-center gap-4">
						<Link href="/auth/signin">
							<Button variant="ghost">Entrar</Button>
						</Link>
						<Link href="/auth/signin">
							<Button>Agende uma demo</Button>
						</Link>
					</div>
				</div>
			</header>

			{/* Hero Section */}
			<section className="container mx-auto px-4 py-20 md:py-32">
				<div className="max-w-4xl mx-auto text-center space-y-8">
					<h1 className="text-5xl md:text-7xl font-bold tracking-tight">
						Gestão Comercial.
						<br />
						<span className="text-primary">Troque as planilhas</span>
						<br />
						por inteligência de verdade.
					</h1>
					<p className="text-xl md:text-2xl text-muted-foreground max-w-2xl mx-auto">
						Plataforma completa de CRM, Business Intelligence e automação de marketing para escalar suas vendas.
					</p>
					<div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
						<Link href="/auth/signin">
							<Button size="lg" className="text-lg px-8">
								Agende uma demo
								<ArrowRight className="ml-2 w-5 h-5" />
							</Button>
						</Link>
						<Link href="/auth/signin">
							<Button size="lg" variant="outline" className="text-lg px-8">
								Abra sua conta
							</Button>
						</Link>
					</div>
				</div>
			</section>

			{/* Features Grid */}
			<section className="container mx-auto px-4 py-20">
				<div className="max-w-6xl mx-auto">
					<h2 className="text-4xl md:text-5xl font-bold text-center mb-4">
						É como um raio-x do seu negócio
					</h2>
					<p className="text-xl text-muted-foreground text-center mb-12 max-w-2xl mx-auto">
						Comece organizando sua gestão comercial na plataforma. Tudo integrado em um só lugar.
					</p>

					<div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
						<Card>
							<CardHeader>
								<div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
									<BarChart3 className="w-6 h-6 text-primary" />
								</div>
								<CardTitle>Business Intelligence</CardTitle>
								<CardDescription>
									Análise avançada de dados, dashboards interativos e insights estratégicos para tomada de decisão em tempo real.
								</CardDescription>
							</CardHeader>
						</Card>

						<Card>
							<CardHeader>
								<div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
									<MessageCircle className="w-6 h-6 text-primary" />
								</div>
								<CardTitle>WhatsApp Hub</CardTitle>
								<CardDescription>
									Central unificada de atendimento via WhatsApp com múltiplos atendentes, histórico completo e automações inteligentes.
								</CardDescription>
							</CardHeader>
						</Card>

						<Card>
							<CardHeader>
								<div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
									<Brain className="w-6 h-6 text-primary" />
								</div>
								<CardTitle>IA para Atendimento</CardTitle>
								<CardDescription>
									Assistente virtual inteligente que atende clientes automaticamente, consulta histórico e transfere para humanos quando necessário.
								</CardDescription>
							</CardHeader>
						</Card>

						<Card>
							<CardHeader>
								<div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
									<Grid3X3 className="w-6 h-6 text-primary" />
								</div>
								<CardTitle>Análise RFM</CardTitle>
								<CardDescription>
									Segmentação avançada de clientes com base em Recência, Frequência e Valor Monetário para estratégias personalizadas.
								</CardDescription>
							</CardHeader>
						</Card>

						<Card>
							<CardHeader>
								<div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
									<Megaphone className="w-6 h-6 text-primary" />
								</div>
								<CardTitle>Campanhas Automatizadas</CardTitle>
								<CardDescription>
									Crie campanhas de marketing via WhatsApp com templates personalizados e execução automática baseada em gatilhos.
								</CardDescription>
							</CardHeader>
						</Card>

						<Card>
							<CardHeader>
								<div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
									<BadgePercent className="w-6 h-6 text-primary" />
								</div>
								<CardTitle>Programas de Cashback</CardTitle>
								<CardDescription>
									Gerencie programas de recompensa com regras personalizadas de acumulação, validade e resgate automático.
								</CardDescription>
							</CardHeader>
						</Card>

						<Card>
							<CardHeader>
								<div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
									<Users className="w-6 h-6 text-primary" />
								</div>
								<CardTitle>Gestão de Clientes</CardTitle>
								<CardDescription>
									CRM completo com histórico de compras, insights de comportamento e perfil completo de cada cliente.
								</CardDescription>
							</CardHeader>
						</Card>

						<Card>
							<CardHeader>
								<div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
									<Target className="w-6 h-6 text-primary" />
								</div>
								<CardTitle>Metas e Objetivos</CardTitle>
								<CardDescription>
									Defina e acompanhe metas de vendas por vendedor, equipe ou período com dashboards em tempo real.
								</CardDescription>
							</CardHeader>
						</Card>

						<Card>
							<CardHeader>
								<div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
									<ShoppingCart className="w-6 h-6 text-primary" />
								</div>
								<CardTitle>Gestão de Vendas</CardTitle>
								<CardDescription>
									Controle completo de vendas, produtos e estoque com análises detalhadas de performance e rentabilidade.
								</CardDescription>
							</CardHeader>
						</Card>

						<Card>
							<CardHeader>
								<div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
									<Handshake className="w-6 h-6 text-primary" />
								</div>
								<CardTitle>Gestão de Parceiros</CardTitle>
								<CardDescription>
									Gerencie relacionamentos com parceiros comerciais, acompanhe performance e integre campanhas colaborativas.
								</CardDescription>
							</CardHeader>
						</Card>

						<Card>
							<CardHeader>
								<div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
									<Package className="w-6 h-6 text-primary" />
								</div>
								<CardTitle>Catálogo de Produtos</CardTitle>
								<CardDescription>
									Organize seu catálogo de produtos com categorias, busca inteligente e integração com atendimento via IA.
								</CardDescription>
							</CardHeader>
						</Card>

						<Card>
							<CardHeader>
								<div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
									<TrendingUp className="w-6 h-6 text-primary" />
								</div>
								<CardTitle>Relatórios Avançados</CardTitle>
								<CardDescription>
									Relatórios customizados, exportação de dados e análises detalhadas para decisões estratégicas baseadas em dados.
								</CardDescription>
							</CardHeader>
						</Card>
					</div>
				</div>
			</section>

			{/* How It Works */}
			<section className="bg-muted/50 py-20">
				<div className="container mx-auto px-4">
					<div className="max-w-6xl mx-auto">
						<h2 className="text-4xl md:text-5xl font-bold text-center mb-4">
							Painel de Dados
						</h2>
						<p className="text-xl text-muted-foreground text-center mb-16 max-w-2xl mx-auto">
							O Painel de Dados dá uma visão 360º e em tempo real das finanças por áreas, usuários ou categorias de vendas.
						</p>

						<div className="grid md:grid-cols-3 gap-8 mb-16">
							<div className="text-center space-y-4">
								<div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center mx-auto">
									<CheckCircle2 className="w-8 h-8 text-primary-foreground" />
								</div>
								<h3 className="text-2xl font-semibold">Inteligência Artificial</h3>
								<p className="text-muted-foreground">
									Nossa IA estuda o comportamento da sua empresa e oferece dicas para melhores tomadas de decisão. É como um analista a mais para o seu comercial.
								</p>
							</div>

							<div className="text-center space-y-4">
								<div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center mx-auto">
									<Zap className="w-8 h-8 text-primary-foreground" />
								</div>
								<h3 className="text-2xl font-semibold">Integrações</h3>
								<p className="text-muted-foreground">
									Integre todos os dados com os principais ERPs do mercado em poucos minutos e agilize todo o seu processo de conciliação e análise.
								</p>
							</div>

							<div className="text-center space-y-4">
								<div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center mx-auto">
									<Shield className="w-8 h-8 text-primary-foreground" />
								</div>
								<h3 className="text-2xl font-semibold">Segurança</h3>
								<p className="text-muted-foreground">
									Seus dados protegidos com criptografia de ponta a ponta, backup automático e controle de acesso granular por usuário.
								</p>
							</div>
						</div>
					</div>
				</div>
			</section>

			{/* Testimonials */}
			<section className="container mx-auto px-4 py-20">
				<div className="max-w-4xl mx-auto">
					<h2 className="text-4xl md:text-5xl font-bold text-center mb-16">
						O que nossos clientes dizem
					</h2>

					<div className="grid md:grid-cols-2 gap-8">
						<Card>
							<CardHeader>
								<CardDescription>
									"Aqui utilizamos RecompraCRM. É excelente! Para quem quer organizar o comercial e escalar de forma agressiva no digital, recomendo de olhos fechados."
								</CardDescription>
							</CardHeader>
							<CardFooter className="flex items-center gap-3">
								<div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
									<Users className="w-6 h-6 text-primary" />
								</div>
								<div>
									<p className="font-semibold">Cliente RecompraCRM</p>
									<p className="text-sm text-muted-foreground">Varejo</p>
								</div>
							</CardFooter>
						</Card>

						<Card>
							<CardHeader>
								<CardDescription>
									"Muitos dos nossos processos, antes, eram mensais e levávamos de 2 a 3 dias pra fazer o lançamento das campanhas. Hoje, conseguimos fazer tudo automaticamente, evitando erros e ganhando mais tempo."
								</CardDescription>
							</CardHeader>
							<CardFooter className="flex items-center gap-3">
								<div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
									<Users className="w-6 h-6 text-primary" />
								</div>
								<div>
									<p className="font-semibold">Cliente RecompraCRM</p>
									<p className="text-sm text-muted-foreground">E-commerce</p>
								</div>
							</CardFooter>
						</Card>
					</div>
				</div>
			</section>

			{/* Final CTA */}
			<section className="bg-primary text-primary-foreground py-20">
				<div className="container mx-auto px-4 text-center">
					<div className="max-w-3xl mx-auto space-y-8">
						<h2 className="text-4xl md:text-5xl font-bold">
							Clareza pra decidir.
							<br />
							Liberdade pra crescer.
						</h2>
						<p className="text-xl opacity-90">
							Faça Simples. Abra sua conta.
						</p>
						<div className="flex flex-col sm:flex-row gap-4 justify-center">
							<Link href="/auth/signin">
								<Button size="lg" variant="secondary" className="text-lg px-8">
									Agende uma demo
								</Button>
							</Link>
							<Link href="/auth/signin">
								<Button size="lg" variant="outline" className="text-lg px-8 border-primary-foreground/20 text-primary-foreground hover:bg-primary-foreground/10">
									Abra sua conta
								</Button>
							</Link>
						</div>
					</div>
				</div>
			</section>

			{/* Footer */}
			<footer className="border-t bg-card py-12">
				<div className="container mx-auto px-4">
					<div className="grid md:grid-cols-4 gap-8 mb-8">
						<div>
							<div className="flex items-center gap-2 mb-4">
								<div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
									<Sparkles className="w-5 h-5 text-primary-foreground" />
								</div>
								<span className="font-bold">RecompraCRM</span>
							</div>
							<p className="text-sm text-muted-foreground">
								Plataforma de otimização de vendas.
							</p>
						</div>

						<div>
							<h3 className="font-semibold mb-4">Produtos</h3>
							<ul className="space-y-2 text-sm text-muted-foreground">
								<li>Business Intelligence</li>
								<li>CRM e Automação</li>
								<li>WhatsApp Hub</li>
								<li>Análise RFM</li>
							</ul>
						</div>

						<div>
							<h3 className="font-semibold mb-4">Recursos</h3>
							<ul className="space-y-2 text-sm text-muted-foreground">
								<li>Campanhas Automatizadas</li>
								<li>Programas de Cashback</li>
								<li>Metas e Objetivos</li>
								<li>Relatórios Avançados</li>
							</ul>
						</div>

						<div>
							<h3 className="font-semibold mb-4">Outros</h3>
							<ul className="space-y-2 text-sm text-muted-foreground">
								<li>
									<Link href="/legal" className="hover:underline">
										Termos e Políticas
									</Link>
								</li>
								<li>Portal de Privacidade</li>
								<li>Canais de Atendimento</li>
							</ul>
						</div>
					</div>

					<div className="border-t pt-8 text-center text-sm text-muted-foreground">
						<p>© {new Date().getFullYear()} RecompraCRM. Todos os direitos reservados.</p>
						<p className="mt-2">Segurança em primeiro lugar. Feito com muita dedicação especialmente para sua empresa.</p>
					</div>
				</div>
			</footer>
		</div>
	);
}
