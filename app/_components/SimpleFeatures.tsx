import { BrandLogo } from "@/components/Brand/BrandLogo";
import type { ReactNode } from "react";
import {
	BadgePercent,
	Building2,
	CircleCheck,
	Delete,
	Grid3X3,
	Grid3x3Icon,
	Mail,
	MapPinIcon,
	Megaphone,
	Phone,
	ShoppingCart,
	UsersRound,
} from "lucide-react";
import { formatToPhone } from "@/lib/formatting";
export default function SimpleFeatures() {
	return (
		<section id="funcionalidades" className="py-24 px-5 lg:px-8">
			<div className="max-w-6xl mx-auto">
				<p className="text-xs font-black uppercase tracking-[0.12em] text-[#24549C] mb-3">Funcionalidades</p>
				<h2 className="text-4xl font-black text-slate-900 tracking-tight mb-20 leading-tight">
					Tudo que você precisa.
					<br />
					Nada que você não vai usar.
				</h2>

				<div className="space-y-28">
					<FeatureBlock
						tag="Ponto de Interação"
						title="Fidelidade digital no seu balcão. Sem complicação."
						desc="Tablet fixo ou QR Code no celular do cliente. Ele informa o WhatsApp, você lança o valor, o cashback é aplicado. Em segundos — sem treinamento de equipe, sem app para baixar."
						bullets={[
							"Aprovação de resgate com senha do operador",
							"QR Code para uso no celular do próprio cliente",
							"Aprovação ou recusa em tempo real pelo painel admin",
							"Suporte a desconto em valor ou troca por prêmios físicos",
						]}
						mockup={<POIMockup />}
						reverse={false}
					/>
					<FeatureBlock
						tag="WhatsApp Automático"
						title="Seu WhatsApp vendendo enquanto você atende o balcão."
						desc="Configure uma vez. O sistema avisa quando o cashback está pra vencer, manda mensagem quando o cliente some há 30 dias, celebra o aniversário. Você não precisa lembrar de nada."
						bullets={[
							"Gatilhos por evento: primeira compra, inatividade, aniversário",
							"Cashback expirando em X dias — reativação automática",
							"Funil de conversão com taxa de retorno por campanha",
							"Sem limites de contatos ou disparos",
						]}
						mockup={<WhatsAppMockup />}
						reverse={true}
					/>
					<FeatureBlock
						tag="Clientes em Risco"
						title="Saiba quem vai sumir antes que ele suma."
						desc="O sistema classifica sua base automaticamente: campeões, clientes em risco, inativos. Você vê em um painel claro e pode agir com um clique — sem planilha, sem achismo."
						bullets={[
							"Segmentação automática por frequência e recência de compra",
							"Alerta quando um bom cliente começa a sumir",
							"Ação direta: mande uma oferta para o segmento na hora",
							"Histórico completo de cada cliente",
						]}
						mockup={<RiskClientsMockup />}
						reverse={false}
					/>
					<FeatureBlock
						tag="Campanhas com Filtro"
						title="Mande a mensagem certa para a pessoa certa."
						desc="Quer avisar só quem não compra há 45 dias? Só os de uma cidade específica? Só quem já gastou mais de R$ 500? Você filtra, o sistema dispara."
						bullets={[
							"Filtro por recência, frequência, valor gasto, cidade",
							"Campanhas recorrentes: todo domingo, para inativos há 30 dias",
							"Preview do tamanho da audiência antes de enviar",
							"Resultado por campanha: enviados, lidos, convertidos, receita",
						]}
						mockup={<CampaignFiltersMockup />}
						reverse={true}
					/>
				</div>
			</div>
		</section>
	);
}

function FeatureBlock({
	tag,
	title,
	desc,
	bullets,
	mockup,
	reverse,
}: {
	tag: string;
	title: string;
	desc: string;
	bullets: string[];
	mockup: ReactNode;
	reverse: boolean;
}) {
	return (
		<div className={`grid lg:grid-cols-2 gap-16 items-center ${reverse ? "lg:[&>*:first-child]:order-2" : ""}`}>
			<div>
				<span className="inline-block bg-[#24549C]/10 border border-[#24549C]/20 text-[#24549C] text-[11px] font-black uppercase tracking-[0.08em] rounded-full px-3 py-1 mb-4">
					{tag}
				</span>
				<h3 className="text-2xl lg:text-3xl font-black text-slate-900 tracking-tight leading-tight mb-4">{title}</h3>
				<p className="text-base text-slate-500 leading-relaxed mb-6">{desc}</p>
				<ul className="space-y-2.5">
					{bullets.map((b) => (
						<li key={b} className="flex items-start gap-3 text-sm text-slate-600">
							<span className="w-5 h-5 rounded-full bg-[#24549C]/10 flex items-center justify-center shrink-0 mt-0.5">
								<span className="text-[10px] font-black text-[#24549C]">✓</span>
							</span>
							{b}
						</li>
					))}
				</ul>
			</div>
			<div>{mockup}</div>
		</div>
	);
}

function POIMockup() {
	const keys = [7, 8, 9, 4, 5, 6, 1, 2, 3];

	return (
		<div className="max-w-[430px] mx-auto rounded-2xl border border-slate-200 bg-[#f8fafc] p-3 shadow-xl">
			<div className="bg-brand text-brand-foreground px-6 py-7 md:px-8 md:py-10 flex flex-col items-center gap-5 rounded-t">
				<div className="flex items-center gap-5">
					<div className="w-16 h-16 md:w-20 md:h-20 flex-shrink-0 flex items-center justify-center relative rounded-2xl overflow-hidden bg-brand-secondary shadow-lg ring-2 ring-white">
						<BrandLogo lockup="icon" tone="color-on-dark" alt="RecompraCRM" fill className="object-contain p-1.5 rounded-2xl" />
					</div>
					<div className="flex flex-col gap-0.5 min-w-0">
						<h1 className="text-xl md:text-2xl font-black tracking-tight leading-tight truncate">RecompraCRM</h1>
						<p className="text-sm font-medium">(34) 09246-5388</p>
					</div>
				</div>
			</div>
			<div className="flex flex-col gap-2.5">
				<div className=" flex flex-col gap-2.5 rounded-2xl rounded-tl-none rounded-tr-none border border-slate-200 bg-white px-3.5 py-4 text-center shadow-sm">
					<div className="flex items-center gap-3.5 w-fit self-center">
						<div className="bg-green-100 p-1 rounded-xl flex-shrink-0">
							<BadgePercent className="w-3.5 h-3.5 text-green-700" />
						</div>
						<div className="flex flex-col min-w-0">
							<span className="text-[0.65rem] font-bold uppercase text-muted-foreground tracking-widest">Acúmulo e Resgate de Pontos</span>
						</div>
					</div>
					<div>
						<p className="mb-1.5 text-[9px] font-bold uppercase tracking-widest text-slate-400">Número de telefone</p>
						<p className="text-2xl font-black tracking-wider text-slate-900">(34) 98765-4321</p>
					</div>
				</div>

				<div className="grid grid-cols-3 gap-2">
					{keys.map((n) => (
						<button key={n} type="button" className="h-12 rounded-xl bg-[#24549C] text-xl font-black text-white shadow-sm transition-all hover:opacity-90">
							{n}
						</button>
					))}
					<button type="button" className="col-span-2 h-12 rounded-xl bg-[#24549C] text-xl font-black text-white shadow-sm">
						0
					</button>
					<button type="button" className="flex h-12 items-center justify-center rounded-xl bg-red-500 text-white shadow-sm">
						<Delete className="h-5 w-5" />
					</button>
				</div>
			</div>
		</div>
	);
}

function RiskClientsMockup() {
	const clients = [
		{
			name: "Maria Souza",
			phone: "(34) 98765-4321",
			email: "maria@exemplo.com",
			channel: "Balcão",
			segment: "EM RISCO",
			segmentCls: "bg-yellow-300 text-yellow-950",
			recency: "Última compra: há 47 dias",
			total: "8 compras · R$ 320,00",
			cashback: "R$ 28,50",
		},

		{
			name: "Ana Lima",
			phone: "(34) 95555-1010",
			email: "ana@exemplo.com",
			channel: "Indicação",
			segment: "HIBERNANDO",
			segmentCls: "bg-purple-500 text-white",
			recency: "Última compra: há 62 dias",
			total: "5 compras · R$ 540,00",
			cashback: "R$ 15,00",
		},
		{
			name: "Carlos Ramos",
			phone: "(34) 91234-8877",
			email: null,
			channel: "WhatsApp",
			segment: "PERDIDOS",
			segmentCls: "bg-red-500 text-white",
			recency: "Última compra: há 89 dias",
			total: "14 compras · R$ 890,00",
			cashback: "R$ 64,20",
		},
	];

	return (
		<div className="rounded-xl border border-[#24549C]/20 bg-white px-3 py-4 shadow-xl">
			<div className="mb-3 flex items-center justify-between gap-2">
				<div className="flex items-center gap-2">
					<UsersRound className="h-4 w-4 text-slate-900" />
					<h4 className="text-xs font-medium uppercase tracking-tight text-slate-900">CLIENTES</h4>
				</div>
				<p className="text-[11px] text-slate-400">94 clientes encontrados.</p>
			</div>

			<div className="flex max-h-[440px] flex-col gap-2 overflow-hidden">
				{clients.map((c) => (
					<div key={c.name} className="rounded-xl border border-[#24549C]/20 bg-white px-3 py-3 shadow-2xs">
						<div className="flex flex-col gap-2">
							<div className="flex items-start justify-between gap-2">
								<div className="min-w-0 space-y-1">
									<p className="truncate text-sm font-semibold tracking-tight text-slate-900">{c.name}</p>
									<div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[10px] text-slate-500">
										<span className="inline-flex items-center gap-1">
											<Phone className="h-3 w-3" />
											{c.phone}
										</span>
										{c.email ? (
											<span className="inline-flex min-w-0 items-center gap-1">
												<Mail className="h-3 w-3" />
												<span className="truncate">{c.email}</span>
											</span>
										) : null}
										<span className="inline-flex items-center gap-1">
											<Megaphone className="h-3 w-3" />
											{c.channel}
										</span>
									</div>
								</div>
								<span
									className={`flex shrink-0 items-center gap-1.5 rounded-xl px-2.5 py-1 text-[10px] font-medium uppercase tracking-tight ${c.segmentCls}`}
								>
									<Grid3X3 className="h-3.5 w-3.5" />
									{c.segment}
								</span>
							</div>

							<div className="flex flex-wrap items-center gap-1.5">
								<span className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Notas RFM</span>
								{["R 2", "F 4", "M 4"].map((score) => (
									<span key={score} className="rounded-md bg-slate-100 px-2 py-0.5 font-mono text-[10px] tabular-nums text-slate-700">
										{score}
									</span>
								))}
							</div>

							<div className="h-px bg-slate-100" />

							<div className="grid grid-cols-2 gap-2">
								<div className="rounded-md border border-slate-200 bg-slate-50 px-2.5 py-2">
									<p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Recência</p>
									<p className="mt-1 text-xs font-semibold text-slate-900">{c.recency}</p>
								</div>
								<div className="rounded-md border border-slate-200 bg-slate-50 px-2.5 py-2">
									<p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Histórico</p>
									<p className="mt-1 text-xs font-semibold text-slate-900">{c.total}</p>
								</div>
							</div>

							<div className="flex items-center gap-2 rounded-md border border-[#24549C]/30 bg-[#24549C]/10 px-2.5 py-2">
								<BadgePercent className="h-3.5 w-3.5 text-[#24549C]" />
								<span className="text-[10px] font-bold uppercase tracking-wide text-[#24549C]">Cashback disponível</span>
								<span className="ml-auto text-xs font-black tabular-nums text-[#24549C]">{c.cashback}</span>
							</div>
						</div>
					</div>
				))}
			</div>
		</div>
	);
}

function CampaignFiltersMockup() {
	return (
		<div className="bg-white rounded-2xl border border-slate-200 shadow-xl overflow-hidden">
			<div className="flex items-center justify-between px-5 py-3.5 bg-slate-50 border-b border-slate-200">
				<p className="font-semibold text-sm text-slate-900">CAMPANHA — RECUPERAÇÃO DE INATIVOS</p>
				<span className="flex items-center gap-1.5 rounded-full bg-green-500/15 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-green-600">
					<CircleCheck className="h-3.5 w-3.5" />
					ATIVA
				</span>
			</div>

			<div className="p-5">
				<p className="text-[10px] text-slate-400 font-black uppercase tracking-[0.08em] mb-2.5">Filtros de audiência</p>
				<div className="flex flex-wrap gap-2 mb-4">
					{[
						{
							label: "Hibernando, Precisam de Atenção ou Em risco",
							icon: <Grid3x3Icon className="w-3.5 h-3.5" />,
						},
						{
							label: "Cidade: Prata",
							icon: <MapPinIcon className="w-3.5 h-3.5" />,
						},
					].map((f) => (
						<span
							key={f.label}
							className="flex items-center gap-1.5 bg-slate-100 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-700 font-medium"
						>
							{f.icon}
							{f.label}
						</span>
					))}
				</div>

				<div className="bg-[#24549C]/6 border border-[#24549C]/15 rounded-2xl px-4 py-3.5 flex items-center justify-between mb-4">
					<div>
						<p className="text-3xl font-black text-[#24549C] leading-none">143</p>
						<p className="text-xs text-slate-500 mt-1">clientes nesta audiência</p>
					</div>
					<div className="text-right">
						<p className="text-xl font-black text-[#FFB900] leading-none">~R$ 4.200</p>
						<p className="text-[11px] text-slate-400 mt-1">potencial estimado</p>
					</div>
				</div>

				<div className="bg-[#ECE5DD] rounded-xl p-3 mb-3">
					<p className="text-[10px] text-zinc-500 font-black uppercase tracking-[0.07em] mb-2">Prévia da mensagem</p>
					<div className="bg-white rounded-lg rounded-tl-none p-2.5 max-w-[92%] shadow-sm">
						<p className="text-xs text-zinc-800 leading-snug">
							Oi, <strong>{"{{NOME_DO_CLIENTE}}"}</strong>! Faz um tempo que não te vemos. Você tem <strong>{"R$ {{CASHBACK_ACUMULADO_DISPONIVEL}}"}</strong>{" "}
							te esperando na Loja Exemplo.
						</p>
						<p className="text-[10px] text-zinc-400 text-right mt-1">agora ✓✓</p>
					</div>
				</div>

				<div className="flex items-center gap-2.5 pt-3 border-t border-slate-100">
					<span className="text-[#FFB900] text-base font-black">↻</span>
					<p className="text-xs text-slate-500">
						Repetir <strong className="text-slate-700">todo domingo</strong>, às <strong className="text-slate-700">10h00</strong>
					</p>
				</div>
			</div>
		</div>
	);
}

function WhatsAppMockup() {
	return (
		<div className="max-w-[340px] mx-auto shadow-xl rounded-2xl overflow-hidden border border-slate-200">
			{/* WhatsApp header */}
			<div className="bg-[#075E54] px-4 py-3 flex items-center gap-3">
				<div className="w-9 h-9 rounded-full relative bg-brand-secondary border border-white">
					<BrandLogo lockup="icon" tone="color-on-dark" alt="WhatsApp" width={36} height={36} className="absolute top-0 left-0" />
				</div>
				<div>
					<p className="text-white font-semibold text-sm leading-tight">RecompraCRM</p>
					<p className="text-white/55 text-[11px]">online agora</p>
				</div>
			</div>

			{/* Chat area */}
			<div className="bg-[#ECE5DD] p-4 space-y-2">
				<div className="flex justify-center">
					<span className="text-[10px] text-zinc-500 bg-zinc-200/70 rounded-full px-3 py-0.5">hoje</span>
				</div>

				{/* Brand message 1 */}
				<div className="bg-white rounded-xl rounded-tl-none p-3 max-w-[90%] shadow-sm">
					<p className="text-sm text-zinc-800 leading-snug">
						Oi, <strong>Maria</strong>! Você tem <strong className="text-[#24549C]">R$ 28,50</strong> de cashback na Loja Exemplo e ele vence em{" "}
						<strong>3 dias</strong>.
					</p>
					<p className="text-sm text-zinc-800 mt-1.5">Que tal aproveitar na sua próxima visita?</p>
					<div className="mt-2 pt-2 border-t border-zinc-100">
						<p className="text-[#075E54] text-xs font-semibold text-center">Ver meu saldo →</p>
					</div>
					<p className="text-[10px] text-zinc-400 text-right mt-1">09:14 ✓✓</p>
				</div>

				<div className="flex justify-center mt-2">
					<span className="text-[10px] text-zinc-500 bg-zinc-200/70 rounded-full px-3 py-0.5">3 dias depois</span>
				</div>

				{/* Brand message 2 */}
				<div className="bg-white rounded-xl rounded-tl-none p-3 max-w-[90%] shadow-sm">
					<p className="text-sm text-zinc-800 leading-snug">
						Maria, seu cashback de <strong className="text-[#24549C]">R$ 28,50</strong> expira <strong>hoje</strong>! Não perca — é seu dinheiro de volta.
					</p>
					<p className="text-[10px] text-zinc-400 text-right mt-1.5">11:02 ✓✓</p>
				</div>

				{/* User reply */}
				<div className="bg-[#DCF8C6] rounded-xl rounded-tr-none p-3 max-w-[90%] ml-auto shadow-sm">
					<p className="text-sm text-zinc-800">Vou passar aí hoje à tarde!</p>
					<p className="text-[10px] text-zinc-400 text-right mt-1">11:15 ✓✓</p>
				</div>
			</div>
		</div>
	);
}
