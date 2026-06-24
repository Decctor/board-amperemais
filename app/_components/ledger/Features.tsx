import { CheckCircle2, Delete, MapPin, Phone, Search } from "lucide-react";
import { Reveal } from "./_primitives/Reveal";
import { Stamp } from "./_primitives/Stamp";
import RecompraCRMLogoIcon from "@/utils/svgs/logos/RECOMPRA - ICON - COLORFUL.svg";
import Image from "next/image";
import { cn } from "@/lib/utils";

type FeatureEntry = {
	index: string;
	header: string;
	title: string;
	desc: string;
	bullets: string[];
	stamp: string;
	stampVariant: "soft-blue" | "soft-amber" | "success";
	mockup: React.ReactNode;
};

const WHATSAPP_CAMPAIGN_HEADER_IMAGE_URL = "";

export function LedgerFeatures() {
	const entries: FeatureEntry[] = [
		{
			index: "01",
			header: "Campanhas inteligentes",
			title: "Gatilhos e filtros para agir no momento exato.",
			desc:
				"Não é só escolher uma lista e disparar. O RecompraCRM combina gatilhos de comportamento com filtros de audiência para cada comunicação chegar no contexto certo.",
			bullets: [
				"Gatilhos por primeira compra, nova compra, aniversário e RFM",
				"Filtros por recência, frequência, valor gasto, cidade e produto",
				"Campanhas recorrentes ou ações pontuais de lançamento",
				"Resultado por campanha: enviados, lidos, convertidos e receita",
			],
			stamp: "Hora certa",
			stampVariant: "soft-amber",
			mockup: <CampaignMockup />,
		},
		{
			index: "02",
			header: "WhatsApp da loja",
			title: "A comunicação sai pelo número e pela identidade da sua marca.",
			desc:
				"Campanhas automáticas não precisam parecer disparos genéricos. A mensagem chega pelo canal da própria empresa, com textos, imagens, vídeos e linguagem configurados para aquela marca.",
			bullets: [
				"Envio pelo número conectado da própria empresa",
				"Header visual da marca em campanhas com imagem",
				"Templates com variáveis como nome, saldo e última compra",
				"Funil de conversão com taxa de retorno por campanha",
			],
			stamp: "Lido ✓✓",
			stampVariant: "success",
			mockup: <WhatsAppMockup />,
		},
		{
			index: "03",
			header: "Clientes em Risco",
			title: "Saiba quem vai sumir antes que ele suma.",
			desc:
				"O sistema classifica sua base automaticamente: campeões, clientes em risco, inativos. Você vê em um painel claro e age com um clique — sem planilha, sem achismo.",
			bullets: [
				"Segmentação automática por frequência e recência",
				"Alerta quando um bom cliente começa a sumir",
				"Ação direta: oferta para o segmento na hora",
				"Histórico completo de cada cliente",
			],
			stamp: "Em risco · 47d",
			stampVariant: "soft-blue",
			mockup: <RiskMockup />,
		},
		{
			index: "04",
			header: "Programa de fidelidade",
			title: "Cashback e resgate para operações com venda presencial.",
			desc:
				"Para empresas com atendimento presencial, o ponto de interação fecha o ciclo de fidelidade: o cliente acumula, consulta e resgata benefícios sem baixar aplicativo.",
			bullets: [
				"Cashback acumulado a partir de vendas registradas",
				"Resgate no ponto de interação com senha do operador",
				"QR Code para uso no celular do próprio cliente",
				"Desconto direto ou troca por prêmios físicos",
			],
			stamp: "Fidelidade",
			stampVariant: "soft-blue",
			mockup: <PoiMockup />,
		},
	];

	return (
		<section id="inventario" className="ledger-canvas-soft ledger-deferred relative py-20 lg:py-28">
			<div className="mx-auto max-w-7xl px-5 lg:px-8">
				{/* Section header */}
				<Reveal className="mb-14 lg:mb-20">
					<div className="flex items-center gap-3 mb-6">
						<span className="ledger-fade inline-flex items-center justify-center w-7 h-7 rounded-full bg-[#24549c] text-white text-[11px] font-extrabold ledger-tabular">
							04
						</span>
						<span
							className="ledger-fade text-[11px] font-extrabold tracking-[0.16em] uppercase text-[#24549c]"
							style={{ "--i": 1 } as React.CSSProperties}
							data-stagger
						>
							Funcionalidades
						</span>
						<span className="ledger-fade flex-1 h-px bg-[#24549c]/15" style={{ "--i": 2 } as React.CSSProperties} data-stagger />
					</div>
					<h2 className="font-extrabold text-[#171717] tracking-[-0.02em] leading-[1.05] text-[34px] sm:text-[42px] lg:text-[56px] max-w-[20ch]">
						<span className="block ledger-write" style={{ "--i": 1 } as React.CSSProperties} data-stagger>
							Tudo que você precisa.
						</span>
						<span className="block text-[#171717]/55 ledger-fade mt-1" style={{ "--i": 4 } as React.CSSProperties} data-stagger>
							Nada que você não vai usar.
						</span>
					</h2>
				</Reveal>

				{/* Entries */}
				<div className="space-y-12 lg:space-y-20">
					{entries.map((entry, idx) => (
						<Reveal key={entry.index}>
							<article className={`grid lg:grid-cols-12 gap-8 lg:gap-12 items-center ${idx % 2 === 1 ? "lg:[&>div:first-child]:order-2" : ""}`}>
								{/* Text */}
								<div className="lg:col-span-7">
									<div className="flex items-center gap-3 mb-5">
										<span
											className="ledger-fade inline-flex items-center justify-center w-9 h-9 rounded-2xl bg-[#24549c]/10 text-[#24549c] text-[12px] font-extrabold ledger-tabular"
											style={{ "--i": 0 } as React.CSSProperties}
											data-stagger
										>
											{entry.index}
										</span>
										<span
											className="ledger-fade text-[11px] font-extrabold tracking-[0.16em] uppercase text-[#24549c]"
											style={{ "--i": 1 } as React.CSSProperties}
											data-stagger
										>
											{entry.header}
										</span>
										<span className="ledger-fade" style={{ "--i": 3 } as React.CSSProperties} data-stagger>
											<Stamp variant={entry.stampVariant} size="sm">
												{entry.stamp}
											</Stamp>
										</span>
									</div>

									<h3
										className="ledger-fade font-extrabold tracking-[-0.018em] leading-[1.1] text-[26px] lg:text-[36px] text-[#171717] mb-4 max-w-[22ch]"
										style={{ "--i": 2 } as React.CSSProperties}
										data-stagger
									>
										{entry.title}
									</h3>
									<p
										className="ledger-fade text-[15px] lg:text-[16px] leading-[1.65] text-[#171717]/70 max-w-[58ch] mb-6"
										style={{ "--i": 4 } as React.CSSProperties}
										data-stagger
									>
										{entry.desc}
									</p>

									<ul className="ledger-fade space-y-2.5 max-w-[56ch]" style={{ "--i": 6 } as React.CSSProperties} data-stagger>
										{entry.bullets.map((b) => (
											<li key={b} className="flex items-start gap-3">
												<span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-[#24549c]/10 shrink-0 mt-0.5">
													<CheckCircle2 className="w-3 h-3 text-[#24549c]" strokeWidth={2.5} />
												</span>
												<span className="flex-1 text-[14px] text-[#171717]/85 leading-snug">{b}</span>
											</li>
										))}
									</ul>
								</div>

								{/* Mockup */}
								<div className="lg:col-span-5">
									<div className="ledger-fade" style={{ "--i": 4 } as React.CSSProperties} data-stagger>
										{entry.mockup}
									</div>
								</div>
							</article>
						</Reveal>
					))}
				</div>
			</div>
		</section>
	);
}

/* ============ Mockups ============ */

function PoiMockup() {
	const keys = [7, 8, 9, 4, 5, 6, 1, 2, 3];
	return (
		<div className="max-w-[340px] mx-auto rounded-3xl bg-white border border-[#e5e5e5] shadow-[0_28px_60px_-20px_rgba(36,84,156,0.28),0_4px_8px_rgba(0,0,0,0.04)] overflow-hidden">
			{/* Header bar */}
			<div className="bg-[#24549c] text-white px-5 py-3.5 flex items-center justify-between">
				<p className="text-[11px] font-extrabold tracking-[0.14em] uppercase">Identificar cliente</p>
				<p className="text-[10px] font-bold tracking-[0.1em] uppercase opacity-70 ledger-tabular">PASSO 01/03</p>
			</div>
			{/* Display */}
			<div className="px-5 py-5 border-b border-[#e5e5e5] text-center">
				<p className="text-[10px] font-extrabold tracking-[0.16em] uppercase text-[#737373] mb-2">WhatsApp do cliente</p>
				<p className="text-[24px] font-extrabold text-[#171717] tracking-[0.04em] ledger-tabular">
					(34) 98765-4321
					<span className="ledger-cursor text-[#ffb900]" />
				</p>
			</div>
			{/* Keypad */}
			<div className="grid grid-cols-3 gap-2 p-4">
				{keys.map((n) => (
					<button
						key={n}
						type="button"
						className="h-12 rounded-xl bg-[#24549c] text-white text-[18px] font-extrabold ledger-tabular hover:bg-[#1a3d7a] transition-colors shadow-[0_4px_10px_-2px_rgba(36,84,156,0.25)]"
					>
						{n}
					</button>
				))}
				<button
					type="button"
					className="col-span-2 h-12 rounded-xl bg-[#24549c] text-white text-[18px] font-extrabold ledger-tabular hover:bg-[#1a3d7a] shadow-[0_4px_10px_-2px_rgba(36,84,156,0.25)]"
				>
					0
				</button>
				<button type="button" className="flex h-12 items-center justify-center rounded-xl bg-[#f7f9fc] border border-[#e5e5e5] text-[#171717]/65">
					<Delete className="h-5 w-5" />
				</button>
			</div>
		</div>
	);
}

function WhatsAppMockup() {
	const headerImageStyle = WHATSAPP_CAMPAIGN_HEADER_IMAGE_URL ? { backgroundImage: `url(${WHATSAPP_CAMPAIGN_HEADER_IMAGE_URL})` } : undefined;

	return (
		<div className="max-w-[340px] mx-auto rounded-3xl bg-white border border-[#e5e5e5] shadow-[0_28px_60px_-20px_rgba(36,84,156,0.28),0_4px_8px_rgba(0,0,0,0.04)] overflow-hidden">
			{/* Header */}
			<div className="bg-[#075e54] text-white px-4 py-3 flex items-center gap-3">
				<div className="w-8 h-8 relative rounded-full bg-[#24549c] border border-white flex items-center justify-center">
					<Image src={RecompraCRMLogoIcon} alt="RecompraCRM" fill />
				</div>
				<div className="flex-1">
					<p className="text-[13px] font-extrabold leading-tight">Loja Exemplo</p>
					<p className="text-[11px] text-white/65">conta oficial · 14:23</p>
				</div>
			</div>
			<div className="bg-[#ECE5DD] p-4 space-y-2">
				<div className="flex justify-center">
					<span className="text-[10px] text-[#171717]/55 bg-white/70 rounded-full px-3 py-0.5 font-semibold">hoje</span>
				</div>

				<div className="bg-white rounded-2xl rounded-tl-md p-3 max-w-[88%] shadow-sm">
					<div
						className={cn(
							"mb-3 aspect-[15/8] overflow-hidden rounded-xl border border-[#e5e5e5] bg-cover bg-center",
							WHATSAPP_CAMPAIGN_HEADER_IMAGE_URL ? "" : "bg-[linear-gradient(135deg,#24549c_0%,#1a3d7a_62%,#ffb900_62%,#ffb900_100%)]",
						)}
						style={headerImageStyle}
						aria-label="Imagem de cabeçalho da campanha"
					>
						{!WHATSAPP_CAMPAIGN_HEADER_IMAGE_URL ? (
							<div className="flex h-full items-end p-3">
								<p className="max-w-[16ch] text-[14px] font-extrabold leading-tight text-white">Semana especial para clientes da loja</p>
							</div>
						) : null}
					</div>
					<p className="text-[13px] text-[#171717] leading-snug">
						Oi, <strong>Maria</strong>! A Loja Exemplo separou uma condição para você aproveitar com seu saldo de{" "}
						<strong className="text-[#24549c] bg-[#ffb900]/30 px-1 rounded">R$ 28,50</strong>.
					</p>
					<div className="mt-2.5 pt-2 border-t border-[#e5e5e5]">
						<p className="text-[#24549c] text-[12px] font-extrabold text-center">Ver condição →</p>
					</div>
					<p className="text-[10px] text-[#171717]/40 text-right mt-1.5 ledger-tabular">09:14 ✓✓</p>
				</div>

				<div className="flex justify-center mt-1">
					<span className="text-[10px] text-[#171717]/55 bg-white/70 rounded-full px-3 py-0.5 font-semibold">3 dias depois</span>
				</div>

				<div className="bg-[#DCF8C6] rounded-2xl rounded-tr-md p-3 max-w-[80%] ml-auto shadow-sm">
					<p className="text-[13px] text-[#171717]">Vou passar aí hoje à tarde!</p>
					<p className="text-[10px] text-[#171717]/40 text-right mt-1 ledger-tabular">11:15 ✓✓</p>
				</div>
			</div>
		</div>
	);
}

function RiskMockup() {
	const clients = [
		{ name: "Maria Souza", phone: "(34) 98765-4321", segment: "EM RISCO", variant: "soft-amber" as const, recency: "47 dias", cb: "R$ 28,50" },
		{ name: "Ana Lima", phone: "(34) 95555-1010", segment: "HIBERNANDO", variant: "soft-blue" as const, recency: "62 dias", cb: "R$ 15,00" },
		{ name: "Carlos Ramos", phone: "(34) 91234-8877", segment: "PERDIDO", variant: "danger" as const, recency: "89 dias", cb: "R$ 64,20" },
	];

	return (
		<div className="max-w-[400px] mx-auto rounded-3xl bg-white border border-[#e5e5e5] shadow-[0_28px_60px_-20px_rgba(36,84,156,0.28),0_4px_8px_rgba(0,0,0,0.04)] overflow-hidden">
			<div className="bg-[#24549c] text-white px-5 py-3.5 flex items-center justify-between">
				<p className="text-[11px] font-extrabold tracking-[0.14em] uppercase">Clientes em risco</p>
				<div className="flex items-center gap-1.5">
					<Search className="h-3 w-3 opacity-70" />
					<p className="text-[10px] font-bold tracking-[0.1em] uppercase opacity-70 ledger-tabular">94 RESULTADOS</p>
				</div>
			</div>
			<ul className="divide-y divide-[#e5e5e5]">
				{clients.map((c) => (
					<li key={c.name} className="px-5 py-3.5">
						<div className="flex items-start justify-between gap-2 mb-2">
							<div>
								<p className="text-[14px] font-extrabold text-[#171717] tracking-tight">{c.name}</p>
								<p className="text-[10px] text-[#737373] flex items-center gap-1 mt-0.5">
									<Phone className="h-2.5 w-2.5" />
									<span className="ledger-tabular">{c.phone}</span>
								</p>
							</div>
							<Stamp variant={c.variant} size="xs">
								{c.segment}
							</Stamp>
						</div>
						<div className="flex items-center justify-between gap-2 pt-2 border-t border-dashed border-[#e5e5e5]">
							<p className="text-[10px] font-semibold tracking-wide uppercase text-[#737373]">Última: {c.recency}</p>
							<div className="inline-flex items-center gap-1.5">
								<span className="text-[9px] font-extrabold tracking-[0.1em] uppercase text-[#737373]">Cashback</span>
								<span className="text-[12px] font-extrabold text-[#171717] ledger-tabular bg-[#ffb900]/20 px-1.5 py-0.5 rounded">{c.cb}</span>
							</div>
						</div>
					</li>
				))}
			</ul>
		</div>
	);
}

function CampaignMockup() {
	return (
		<div className="max-w-[400px] mx-auto rounded-3xl bg-white border border-[#e5e5e5] shadow-[0_28px_60px_-20px_rgba(36,84,156,0.28),0_4px_8px_rgba(0,0,0,0.04)] overflow-hidden">
			<div className="bg-[#24549c] text-white px-5 py-3.5 flex items-center justify-between">
				<p className="text-[11px] font-extrabold tracking-[0.14em] uppercase">Campanha · recuperação</p>
				<span className="inline-flex items-center gap-1.5 rounded-full bg-[#ffb900] text-[#171717] px-2.5 py-0.5 text-[10px] font-extrabold tracking-[0.08em] uppercase">
					Ativa
				</span>
			</div>
			<div className="px-5 py-5">
				<p className="text-[10px] font-extrabold tracking-[0.14em] uppercase text-[#737373] mb-2.5">Filtros de audiência</p>
				<div className="flex flex-wrap gap-2 mb-4">
					<span className="text-[10px] font-bold tracking-wide rounded-full bg-[#24549c]/10 text-[#24549c] border border-[#24549c]/20 px-2.5 py-1">
						Em risco · Hibernando
					</span>
					<span className="inline-flex items-center gap-1 text-[10px] font-bold tracking-wide rounded-full bg-[#24549c]/10 text-[#24549c] border border-[#24549c]/20 px-2.5 py-1">
						<MapPin className="h-2.5 w-2.5" />
						Patos de Minas
					</span>
				</div>

				<div className="grid grid-cols-2 gap-2 mb-4">
					<div className="rounded-2xl bg-[#f7f9fc] border border-[#e5e5e5] p-3.5">
						<p className="text-[9px] font-extrabold tracking-[0.14em] uppercase text-[#737373] mb-1">Audiência</p>
						<p className="text-[28px] font-extrabold text-[#24549c] leading-none ledger-tabular">143</p>
						<p className="text-[10px] text-[#737373] mt-1">clientes</p>
					</div>
					<div className="rounded-2xl bg-[#ffb900]/12 border border-[#ffb900]/30 p-3.5">
						<p className="text-[9px] font-extrabold tracking-[0.14em] uppercase text-[#737373] mb-1">Potencial</p>
						<p className="text-[28px] font-extrabold text-[#171717] leading-none ledger-tabular">
							<span className="text-[14px] mr-0.5">~R$</span>4,2k
						</p>
						<p className="text-[10px] text-[#171717]/65 font-extrabold mt-1">+ retorno previsto</p>
					</div>
				</div>

				<div className="rounded-2xl bg-[#f7f9fc] border border-[#e5e5e5] p-3 mb-3">
					<p className="text-[9px] font-extrabold tracking-[0.14em] uppercase text-[#737373] mb-1.5">Prévia da mensagem</p>
					<p className="text-[12px] text-[#171717] leading-snug">
						Oi, <strong className="bg-[#ffb900]/35 px-0.5 rounded">{`{{NOME}}`}</strong>! Você tem{" "}
						<strong className="bg-[#ffb900]/35 px-0.5 rounded">{`R$ {{CASHBACK}}`}</strong> te esperando na Loja Exemplo.
					</p>
				</div>

				<div className="flex items-center gap-2 pt-2 border-t border-dashed border-[#e5e5e5]">
					<span className="text-[#ffb900] text-[14px] font-extrabold">↻</span>
					<p className="text-[11px] text-[#737373]">
						Repetir <strong className="text-[#171717]">todo domingo</strong> às <strong className="text-[#171717] ledger-tabular">10h00</strong>
					</p>
				</div>
			</div>
		</div>
	);
}
