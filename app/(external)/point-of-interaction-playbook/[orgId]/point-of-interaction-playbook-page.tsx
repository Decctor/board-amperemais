"use client";

import { hexToRgba, useOrgColors } from "@/components/Providers/OrgColorsProvider";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { TCashbackProgramEntity, TOrganizationEntity } from "@/services/drizzle/schema";
import LogoHorizontalRecompraCRM from "@/utils/svgs/logos/RECOMPRA - COMPLETE - HORIZONTAL - COLORFUL.svg";
import {
	ArrowRight,
	Building2,
	Database,
	Gift,
	MessageSquareQuote,
	Printer,
	QrCode,
	ScanLine,
	ShieldCheck,
	Smartphone,
	Sparkles,
	Tablet,
	TrendingUp,
	Users,
} from "lucide-react";
import Image from "next/image";
import type { ReactNode } from "react";
import {
	ApproveModalMockup,
	CashbackStepMockup,
	DashboardQueueMockup,
	FoundClientMockup,
	KioskConfirmationMockup,
	KioskHubMockup,
	MobileHubMockup,
	MobileWaitingMockup,
	ModeSelectionMockup,
	NewClientMockup,
	PanelFrame,
	PhoneFrame,
	SuccessMockup,
	TabletFrame,
} from "./_components/mockups";

type PlaybookOrg = {
	id: TOrganizationEntity["id"];
	nome: TOrganizationEntity["nome"];
	logoUrl: TOrganizationEntity["logoUrl"];
	telefone: TOrganizationEntity["telefone"];
	poiQrCodeKioskDataUrl: TOrganizationEntity["poiQrCodeKioskDataUrl"];
	poiQrCodeMobileDataUrl: TOrganizationEntity["poiQrCodeMobileDataUrl"];
};

type PointOfInteractionPlaybookPageProps = {
	org: PlaybookOrg;
	cashbackProgram?: Pick<TCashbackProgramEntity, "terminologia"> | null;
};

// ----------------------------------------------------------------------------
// Sheet primitives
// ----------------------------------------------------------------------------

function Sheet({ children, pageNumber, totalPages }: { children: ReactNode; pageNumber: number; totalPages: number }) {
	return (
		<div className="playbook-sheet relative flex flex-col bg-white text-neutral-900 shadow-2xl print:shadow-none">
			<div className="flex flex-1 flex-col px-12 py-10 print:px-12 print:py-10">{children}</div>
			<div className="flex items-center justify-between border-t border-neutral-200 px-12 py-3 text-[0.6rem] font-medium text-neutral-400">
				<span className="uppercase tracking-widest">Playbook · Ponto de Interação</span>
				<span>
					{pageNumber} / {totalPages}
				</span>
			</div>
		</div>
	);
}

function SectionTitle({ icon: Icon, eyebrow, title }: { icon: typeof Gift; eyebrow: string; title: string }) {
	const { colors } = useOrgColors();
	return (
		<div className="mb-6 flex items-center gap-3">
			<div
				className="flex h-12 w-12 items-center justify-center rounded-2xl"
				style={{ backgroundColor: hexToRgba(colors.primary, 0.12), color: colors.primary }}
			>
				<Icon className="h-6 w-6" />
			</div>
			<div>
				<p className="text-[0.65rem] font-bold uppercase tracking-[0.25em] text-neutral-400">{eyebrow}</p>
				<h2 className="text-2xl font-black uppercase leading-none tracking-tight text-neutral-900">{title}</h2>
			</div>
		</div>
	);
}

function FlowStep({ n, title, children, mockup, last = false }: { n: number; title: string; children: ReactNode; mockup: ReactNode; last?: boolean }) {
	const { colors } = useOrgColors();
	return (
		<div className="flex items-start gap-4 break-inside-avoid">
			<div className="flex flex-col items-center self-stretch">
				<div
					className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-sm font-black text-white"
					style={{ backgroundColor: colors.primary, color: colors.primaryForeground }}
				>
					{n}
				</div>
				{!last ? <div className="mt-1 w-px flex-1 bg-neutral-200" /> : null}
			</div>
			<div className={cn("flex flex-1 flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-6", last ? "pb-0" : "pb-6")}>
				<div className="flex-1">
					<h3 className="text-sm font-black uppercase tracking-tight text-neutral-900">{title}</h3>
					<p className="mt-1 text-xs leading-relaxed text-neutral-600">{children}</p>
				</div>
				<div className="flex-shrink-0">{mockup}</div>
			</div>
		</div>
	);
}

// ----------------------------------------------------------------------------
// Page
// ----------------------------------------------------------------------------

export default function PointOfInteractionPlaybookPage({ org }: PointOfInteractionPlaybookPageProps) {
	const { colors, getPrimaryGradientStyle } = useOrgColors();
	const gradient = getPrimaryGradientStyle();
	const totalPages = 8;

	function handlePrint() {
		window.print();
	}

	return (
		<div
			className="playbook-root min-h-screen bg-neutral-100 p-4 pb-24 print:bg-white print:p-0 print:pb-0"
			style={{ backgroundColor: hexToRgba(colors.primary, 0.06) }}
		>
			{/*
				Print model: one sheet = exactly one A4 page. Each sheet declares
				`break-before: page` (never `break-after`, which previously forced an empty
				trailing page) and a fixed `height: 297mm` so the footer — pushed down by the
				flex-1 content — lands at the bottom of the physical page even when the content
				is short. `overflow: hidden` guards against sub-millimetre rounding spilling
				onto a blank page; content is split across sheets so nothing is actually clipped.
				On screen we use `min-height: 297mm` so each sheet still previews as a full page.
			*/}
			<style>{`
				@page { size: A4 portrait; margin: 0; }
				.playbook-sheet { width: 210mm; }
				@media screen {
					.playbook-stack { display: flex; flex-direction: column; align-items: center; gap: 1.5rem; }
					.playbook-sheet { min-height: 297mm; }
				}
				@media print {
					.playbook-root { background: #fff !important; }
					.playbook-stack { display: block; }
					.playbook-sheet { height: 297mm; overflow: hidden; break-before: page; box-shadow: none !important; }
					.playbook-sheet:first-child { break-before: avoid; }
					html, body { background: #fff !important; }
				}
			`}</style>

			<div className="playbook-stack mx-auto max-w-[210mm]">
				{/* ============================ PAGE 1 — COVER ============================ */}
				<Sheet pageNumber={1} totalPages={totalPages}>
					<div className="flex flex-1 flex-col">
						{/* Brand hero */}
						<div className="relative overflow-hidden rounded-3xl px-10 py-12 text-center" style={gradient}>
							<div
								className="absolute inset-0 opacity-10"
								style={{ backgroundImage: `radial-gradient(circle, ${colors.primaryForeground} 1px, transparent 1px)`, backgroundSize: "18px 18px" }}
							/>
							<div className="relative z-10 flex flex-col items-center gap-4">
								<div className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-2xl bg-white p-2 shadow-lg">
									{org.logoUrl ? (
										<Image src={org.logoUrl} alt={org.nome} width={88} height={88} className="h-full w-full object-contain" />
									) : (
										<Building2 className="h-10 w-10" style={{ color: colors.primary }} />
									)}
								</div>
								<p className="rounded-lg bg-white/20 px-4 py-1 text-sm font-bold" style={{ color: colors.primaryForeground }}>
									{org.nome}
								</p>
								<h1 className="text-5xl font-black uppercase leading-none tracking-tighter" style={{ color: colors.primaryForeground }}>
									Playbook do
									<br />
									Ponto de Interação
								</h1>
								<p className="max-w-md text-sm font-semibold uppercase tracking-widest opacity-80" style={{ color: colors.primaryForeground }}>
									✦ Guia de pontuação e resgate ✦
								</p>
							</div>
						</div>

						{/* Intro */}
						<p className="mx-auto mt-8 max-w-xl text-center text-sm leading-relaxed text-neutral-600">
							Este guia mostra, passo a passo, como sua equipe usa o Ponto de Interação para <strong>pontuar clientes</strong>,{" "}
							<strong>resgatar recompensas</strong> e — o mais importante — <strong>capturar os dados de contato</strong> de quem compra com você.
						</p>

						{/* Two modes preview */}
						<div className="mt-8 grid flex-1 grid-cols-2 gap-6">
							<ModeCard
								icon={Tablet}
								title="Modo Kiosk"
								subtitle="Tablet no balcão"
								description="A própria loja conduz o fluxo no totem. A aprovação acontece ali mesmo, com a senha do vendedor."
								qrUrl={org.poiQrCodeKioskDataUrl}
								qrLabel="QR de configuração do totem"
								colors={colors}
							/>
							<ModeCard
								icon={Smartphone}
								title="Modo Mobile"
								subtitle="Celular do cliente"
								description="O cliente escaneia o QR e conduz no próprio celular. A aprovação é feita pelo painel da loja, em tempo real."
								qrUrl={org.poiQrCodeMobileDataUrl}
								qrLabel="QR para o cliente escanear"
								colors={colors}
							/>
						</div>
					</div>
				</Sheet>

				{/* ============================ PAGE 2 — WHY IT MATTERS ============================ */}
				<Sheet pageNumber={2} totalPages={totalPages}>
					<SectionTitle icon={Database} eyebrow="Antes de começar" title="Por que o Ponto de Interação importa" />

					<p className="text-sm leading-relaxed text-neutral-700">
						O maior ativo de uma pequena ou média empresa é <strong>saber quem são seus clientes e como falar com eles</strong>. O Ponto de Interação
						transforma cada compra numa oportunidade de capturar esses dados — especialmente o <strong>contato</strong> — de forma natural e com o cliente
						querendo participar.
					</p>

					<div className="mt-6 grid grid-cols-3 gap-3">
						<ValueCard icon={Users} title="Base de contatos" text="Telefone, nome e (opcional) CPF e aniversário a cada atendimento." colors={colors} />
						<ValueCard icon={TrendingUp} title="Campanhas" text="Promoções, datas especiais e ofertas direcionadas para quem já comprou." colors={colors} />
						<ValueCard icon={Sparkles} title="Reativação" text="Traga de volta quem sumiu, com base no histórico de compras." colors={colors} />
					</div>

					{/* The persuasion angle */}
					<div
						className="mt-8 rounded-2xl border-2 border-dashed p-6"
						style={{ borderColor: hexToRgba(colors.primary, 0.3), backgroundColor: hexToRgba(colors.primary, 0.05) }}
					>
						<div className="flex items-center gap-2">
							<MessageSquareQuote className="h-5 w-5" style={{ color: colors.primary }} />
							<h3 className="text-sm font-black uppercase tracking-tight">O cashback é a sua melhor desculpa para pedir o contato</h3>
						</div>
						<p className="mt-2 text-xs leading-relaxed text-neutral-600">
							Ninguém gosta de "entregar o telefone". Mas todo mundo gosta de <strong>ganhar</strong>. O fato de o cliente <strong>pontuar</strong> ao usar o
							Ponto de Interação é a tática de convencimento no dia a dia do balcão. Treine a equipe para oferecer, não para pedir:
						</p>
						<div className="mt-4 flex flex-col gap-2">
							<ScriptLine text="“Ei, preenche seus dados aqui pelo QR Code — você já ganha cashback pra usar nas próximas visitas.”" colors={colors} />
							<ScriptLine text="“Quer acumular pontos dessa compra? Leva 10 segundos e o desconto fica guardado no seu nome.”" colors={colors} />
							<ScriptLine text="“Faço seu cadastro rapidinho? Aí você recebe nossas promoções antes de todo mundo.”" colors={colors} />
						</div>
					</div>
				</Sheet>

				{/* ============================ PAGE 3 — DATA COLLECTION ============================ */}
				<Sheet pageNumber={3} totalPages={totalPages}>
					<SectionTitle icon={Users} eyebrow="O ativo mais importante" title="Onde os dados são coletados" />

					<p className="text-sm leading-relaxed text-neutral-700">
						A captura acontece logo na <strong>entrada do fluxo</strong>, ao digitar o telefone — vale para o kiosk e para o mobile. Se o cliente ainda não
						existe, aparece o cadastro rápido. É assim que sua base cresce em <strong>todo</strong> atendimento, sem fricção.
					</p>

					{/* New client capture */}
					<div className="mt-6 grid grid-cols-2 items-center gap-6 rounded-2xl border border-neutral-200 bg-white p-5">
						<div>
							<h3 className="text-sm font-black uppercase tracking-tight text-neutral-900">Cliente novo → cadastro</h3>
							<p className="mt-1 text-xs leading-relaxed text-neutral-600">O que é capturado a cada novo cliente:</p>
							<div className="mt-3 flex flex-col gap-1.5">
								<DataPoint label="Telefone" detail="chave de identificação — obrigatório" required colors={colors} />
								<DataPoint label="Nome completo" detail="para personalizar o atendimento" required colors={colors} />
								<DataPoint label="CPF / CNPJ" detail="opcional, para integrações fiscais" colors={colors} />
								<DataPoint label="Data de nascimento" detail="opcional, para campanhas de aniversário" colors={colors} />
							</div>
						</div>
						<div className="flex justify-center">
							<TabletFrame label="Cadastro de novo cliente">
								<NewClientMockup />
							</TabletFrame>
						</div>
					</div>

					{/* Returning client recognition */}
					<div className="mt-6 grid grid-cols-2 items-center gap-6 rounded-2xl border border-neutral-200 bg-white p-5">
						<div className="flex justify-center">
							<TabletFrame label="Cliente reconhecido">
								<FoundClientMockup />
							</TabletFrame>
						</div>
						<div>
							<h3 className="text-sm font-black uppercase tracking-tight text-neutral-900">Cliente recorrente → reconhecido</h3>
							<p className="mt-1 text-xs leading-relaxed text-neutral-600">
								Quem já está na base é identificado na hora: nome, telefone e <strong>saldo acumulado</strong> aparecem na tela. Use o nome no atendimento e
								mostre o saldo — é o que reforça o hábito de voltar e pontuar de novo.
							</p>
						</div>
					</div>

					<div
						className="mt-6 flex items-start gap-2 rounded-xl px-4 py-3 text-xs leading-relaxed"
						style={{ backgroundColor: hexToRgba(colors.primary, 0.06), color: "#404040" }}
					>
						<Sparkles className="mt-0.5 h-4 w-4 flex-shrink-0" style={{ color: colors.primary }} />
						<span>
							Cada cadastro vira um contato no seu CRM, pronto para receber <strong>campanhas, promoções e reativações</strong> — sem depender de listas
							compradas ou achismos.
						</span>
					</div>
				</Sheet>

				{/* ============================ PAGE 4 — KIOSK FLOW (1/2) ============================ */}
				<Sheet pageNumber={4} totalPages={totalPages}>
					<SectionTitle icon={Tablet} eyebrow="Modalidade 1" title="Fluxo Kiosk (tablet no balcão)" />
					<div
						className="mb-6 flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold"
						style={{ backgroundColor: hexToRgba(colors.primary, 0.1), color: colors.primary }}
					>
						<ShieldCheck className="h-4 w-4" />
						Aprovação no próprio totem: o vendedor digita a senha de 5 dígitos e a venda é processada na hora.
					</div>

					<div className="flex flex-col">
						<FlowStep
							n={1}
							title="Identificação do cliente"
							mockup={
								<TabletFrame label="Teclado do totem">
									<KioskHubMockup logoUrl={org.logoUrl} />
								</TabletFrame>
							}
						>
							O operador digita o telefone no teclado da tela. Se o cliente existe, o totem mostra o perfil e <strong>avança sozinho</strong>; se não, abre o
							cadastro rápido (captura de dados!).
						</FlowStep>

						<FlowStep
							n={2}
							title="Perfil encontrado"
							mockup={
								<TabletFrame label="Cliente identificado">
									<FoundClientMockup />
								</TabletFrame>
							}
						>
							Saldo disponível em destaque e contagem regressiva para avançar. O cliente vê o quanto já acumulou — reforçando o hábito de pontuar.
						</FlowStep>

						<FlowStep
							n={3}
							last
							title="Escolha do modo"
							mockup={
								<TabletFrame label="Desconto ou recompensa">
									<ModeSelectionMockup />
								</TabletFrame>
							}
						>
							<strong>Pontuar e obter descontos</strong> (usar saldo na compra) ou <strong>pontuar e resgatar recompensa</strong> (trocar saldo por um
							prêmio).
						</FlowStep>
					</div>

					<p className="mt-6 text-right text-[0.65rem] font-medium uppercase tracking-widest text-neutral-400">continua na próxima página →</p>
				</Sheet>

				{/* ============================ PAGE 5 — KIOSK FLOW (2/2) ============================ */}
				<Sheet pageNumber={5} totalPages={totalPages}>
					<SectionTitle icon={Tablet} eyebrow="Modalidade 1 · continuação" title="Fluxo Kiosk — confirmação" />

					<div className="flex flex-col">
						<FlowStep
							n={4}
							title="Venda e cashback"
							mockup={
								<TabletFrame label="Valor + cashback">
									<CashbackStepMockup />
								</TabletFrame>
							}
						>
							Informa o valor da venda e decide se usa o saldo como desconto. O sistema já calcula o limite permitido e o valor final.
						</FlowStep>

						<FlowStep
							n={5}
							title="Confirmação com senha do vendedor"
							mockup={
								<TabletFrame label="Senha do operador">
									<KioskConfirmationMockup />
								</TabletFrame>
							}
						>
							O vendedor confirma digitando a <strong>senha de 5 dígitos</strong> direto no totem. É o que identifica quem fez a venda e autoriza a operação
							— <strong>sem precisar do painel</strong>.
						</FlowStep>

						<div className="ml-12 mt-1 flex items-center gap-4 break-inside-avoid">
							<div className="flex flex-1 items-center justify-between gap-4">
								<div className="flex-1">
									<h3 className="flex items-center gap-1.5 text-sm font-black uppercase tracking-tight text-green-700">
										<ArrowRight className="h-4 w-4" /> Pronto!
									</h3>
									<p className="mt-1 text-xs leading-relaxed text-neutral-600">
										A tela de sucesso mostra o cashback gerado e o novo saldo. O totem volta ao início para o próximo cliente.
									</p>
								</div>
								<TabletFrame label="Sucesso">
									<SuccessMockup kind="sale" />
								</TabletFrame>
							</div>
						</div>
					</div>
				</Sheet>

				{/* ============================ PAGE 6 — MOBILE FLOW (1/2) ============================ */}
				<Sheet pageNumber={6} totalPages={totalPages}>
					<SectionTitle icon={Smartphone} eyebrow="Modalidade 2" title="Fluxo Mobile (QR no celular do cliente)" />
					<div className="mb-6 flex items-center gap-2 rounded-lg bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-700">
						<ScanLine className="h-4 w-4" />
						Aprovação pelo painel: a solicitação aparece em tempo real e o operador aprova com a senha do vendedor.
					</div>

					<div className="flex flex-col">
						<FlowStep
							n={1}
							title="Cliente escaneia o QR"
							mockup={
								<PhoneFrame label="Identificação">
									<MobileHubMockup logoUrl={org.logoUrl} />
								</PhoneFrame>
							}
						>
							O cliente aponta a câmera para o QR mobile (no display, no balcão, na embalagem) e abre o fluxo no <strong>próprio celular</strong>.
							Identifica-se pelo telefone — ou se cadastra na hora.
						</FlowStep>

						<FlowStep
							n={2}
							last
							title="Escolhe o modo e os valores"
							mockup={
								<PhoneFrame label="Seleção no celular">
									<ModeSelectionMockup phone />
								</PhoneFrame>
							}
						>
							Mesma lógica do kiosk (desconto ou recompensa), mas <strong>sem o passo de confirmação</strong> — o celular não tem a senha do vendedor.
						</FlowStep>
					</div>

					<p className="mt-6 text-right text-[0.65rem] font-medium uppercase tracking-widest text-neutral-400">continua na próxima página →</p>
				</Sheet>

				{/* ============================ PAGE 7 — MOBILE FLOW (2/2) ============================ */}
				<Sheet pageNumber={7} totalPages={totalPages}>
					<SectionTitle icon={Smartphone} eyebrow="Modalidade 2 · continuação" title="Fluxo Mobile — solicitação e aprovação" />

					<div className="mb-6 flex flex-col">
						<FlowStep
							n={3}
							title="Envia a solicitação e aguarda"
							mockup={
								<PhoneFrame label="Aguardando aprovação">
									<MobileWaitingMockup />
								</PhoneFrame>
							}
						>
							O cliente envia a solicitação e vê a tela <strong>"Aguardando aprovação"</strong>, que acompanha o status em tempo real até a loja responder.
						</FlowStep>
					</div>

					{/* Approval on the panel — highlighted */}
					<div
						className="rounded-2xl border-2 p-5 break-inside-avoid"
						style={{ borderColor: hexToRgba(colors.primary, 0.3), backgroundColor: hexToRgba(colors.primary, 0.04) }}
					>
						<h3 className="flex items-center gap-2 text-sm font-black uppercase tracking-tight">
							<span
								className="flex h-7 w-7 items-center justify-center rounded-full text-xs font-black"
								style={{ backgroundColor: colors.primary, color: colors.primaryForeground }}
							>
								4
							</span>
							Aprovação no painel da loja
						</h3>
						<p className="mt-2 text-xs leading-relaxed text-neutral-600">
							No painel do Ponto de Interação, a solicitação aparece <strong>automaticamente</strong> (consulta em tempo real). O operador confere os valores
							e clica em <strong>Aprovar</strong>.
						</p>
						<div className="mt-4 grid grid-cols-2 items-start gap-4">
							<PanelFrame label="Fila de solicitações (tempo real)">
								<DashboardQueueMockup />
							</PanelFrame>
							<div className="flex flex-col items-center gap-2">
								<ApproveModalMockup />
								<p className="px-2 text-center text-[0.6rem] text-neutral-500">
									Ao aprovar, informa-se a <strong>senha de 5 dígitos do vendedor</strong> que receberá a venda.
								</p>
							</div>
						</div>
					</div>

					<div className="mt-6 flex items-center gap-4 break-inside-avoid">
						<div className="flex flex-1 items-center justify-between gap-4">
							<div className="flex-1">
								<h3 className="flex items-center gap-1.5 text-sm font-black uppercase tracking-tight text-green-700">
									<ArrowRight className="h-4 w-4" /> Confirmação automática
								</h3>
								<p className="mt-1 text-xs leading-relaxed text-neutral-600">
									Assim que a loja aprova, a tela do cliente detecta e mostra o sucesso — cashback gerado e novo saldo. Sem ninguém precisar avisar.
								</p>
							</div>
							<PhoneFrame label="Sucesso no celular">
								<div className="pb-3">
									<SuccessMockup kind="prize" phone />
								</div>
							</PhoneFrame>
						</div>
					</div>
				</Sheet>

				{/* ============================ PAGE 8 — COMPARISON + TIPS ============================ */}
				<Sheet pageNumber={8} totalPages={totalPages}>
					<SectionTitle icon={QrCode} eyebrow="Resumo" title="Kiosk x Mobile e boas práticas" />

					<div className="overflow-hidden rounded-2xl border border-neutral-200">
						<div className="grid grid-cols-3 bg-neutral-50 text-[0.65rem] font-bold uppercase tracking-wider text-neutral-500">
							<div className="px-4 py-3" />
							<div className="flex items-center gap-1.5 px-4 py-3">
								<Tablet className="h-4 w-4" /> Kiosk
							</div>
							<div className="flex items-center gap-1.5 px-4 py-3">
								<Smartphone className="h-4 w-4" /> Mobile
							</div>
						</div>
						<CompareRow label="Dispositivo" kiosk="Tablet da loja" mobile="Celular do cliente" />
						<CompareRow label="Quem conduz" kiosk="O operador" mobile="O próprio cliente" />
						<CompareRow label="Onde aprova" kiosk="No próprio totem" mobile="No painel da loja" highlight />
						<CompareRow label="Senha do vendedor" kiosk="Digitada no totem" mobile="Digitada ao aprovar no painel" />
						<CompareRow label="Confirmação" kiosk="Imediata" mobile="Tempo real (após aprovar)" />
						<CompareRow label="Melhor para" kiosk="Balcão com fila / atendimento direto" mobile="Autoatendimento e mesas" />
					</div>

					<div className="mt-8">
						<h3 className="mb-3 text-sm font-black uppercase tracking-tight text-neutral-900">Boas práticas para a equipe</h3>
						<div className="grid grid-cols-2 gap-3">
							<TipCard text="Ofereça o cadastro em toda venda — fale do cashback, não do 'cadastro'." colors={colors} />
							<TipCard text="Deixe o QR mobile visível: no balcão, na maquininha, na embalagem." colors={colors} />
							<TipCard text="No kiosk, peça o telefone enquanto fecha a conta — não trava a fila." colors={colors} />
							<TipCard text="No mobile, fique de olho no painel: aprove as solicitações rápido." colors={colors} />
							<TipCard text="Use o nome do cliente no atendimento — a tela já mostra quem é." colors={colors} />
							<TipCard text="Cada senha de operador identifica um vendedor: use a sua." colors={colors} />
						</div>
					</div>

					{/* Powered by */}
					<div className="mt-auto flex items-center justify-center gap-2 px-2 py-4 bg-[#24549C] text-white">
						<p className="text-[0.65rem] font-medium">Powered by</p>
						<div className="relative h-5 w-24">
							<Image src={LogoHorizontalRecompraCRM} alt="RecompraCRM" fill className="object-contain" />
						</div>
					</div>
				</Sheet>
			</div>

			{/* ============================ PRINT CONTROLS ============================ */}
			<aside className="fixed right-6 top-1/2 z-20 hidden w-56 -translate-y-1/2 flex-col gap-3 rounded-2xl bg-card p-4 shadow-xl lg:flex print:hidden">
				<div className="flex flex-col gap-0.5">
					<div className="flex items-center gap-1.5">
						<Printer className="h-4 w-4" />
						<p className="text-sm font-semibold text-foreground">Imprimir / Salvar PDF</p>
					</div>
					<p className="text-xs text-muted-foreground">Formato A4 retrato, 8 páginas. Na impressão, escolha "Salvar como PDF".</p>
				</div>
				<Button type="button" className="w-full gap-2" onClick={handlePrint}>
					<Printer className="h-4 w-4" />
					IMPRIMIR
				</Button>
			</aside>

			<nav className="fixed bottom-4 left-1/2 z-20 flex -translate-x-1/2 items-center gap-2 rounded-full bg-card/95 p-2 shadow-xl backdrop-blur lg:hidden print:hidden">
				<Button type="button" className="h-11 gap-2 rounded-full px-5 text-sm font-semibold" onClick={handlePrint}>
					<Printer className="h-4 w-4" />
					IMPRIMIR / PDF
				</Button>
			</nav>
		</div>
	);
}

// ----------------------------------------------------------------------------
// Small building blocks
// ----------------------------------------------------------------------------

function ModeCard({
	icon: Icon,
	title,
	subtitle,
	description,
	qrUrl,
	qrLabel,
	colors,
}: {
	icon: typeof Tablet;
	title: string;
	subtitle: string;
	description: string;
	qrUrl: string | null;
	qrLabel: string;
	colors: { primary: string; primaryForeground: string };
}) {
	return (
		<div className="flex flex-col items-center gap-3 rounded-2xl border border-neutral-200 bg-white p-5 text-center">
			<div className="flex items-center gap-2">
				<div
					className="flex h-9 w-9 items-center justify-center rounded-xl"
					style={{ backgroundColor: hexToRgba(colors.primary, 0.12), color: colors.primary }}
				>
					<Icon className="h-5 w-5" />
				</div>
				<div className="text-left">
					<h3 className="text-base font-black uppercase leading-none tracking-tight">{title}</h3>
					<p className="text-[0.65rem] font-bold uppercase tracking-widest text-neutral-400">{subtitle}</p>
				</div>
			</div>
			<p className="text-xs leading-relaxed text-neutral-600">{description}</p>
			<div
				className="flex h-28 w-28 items-center justify-center overflow-hidden rounded-xl"
				style={{ backgroundColor: hexToRgba(colors.primary, 0.05) }}
			>
				{qrUrl ? <img src={qrUrl} alt={qrLabel} className="h-full w-full object-contain p-1.5" /> : <QrCode className="h-10 w-10 text-neutral-300" />}
			</div>
			<p className="text-[0.6rem] font-medium uppercase tracking-wider text-neutral-400">{qrLabel}</p>
		</div>
	);
}

function ValueCard({ icon: Icon, title, text, colors }: { icon: typeof Users; title: string; text: string; colors: { primary: string } }) {
	return (
		<div className="flex flex-col gap-2 rounded-2xl border border-neutral-200 bg-white p-4">
			<div
				className="flex h-9 w-9 items-center justify-center rounded-xl"
				style={{ backgroundColor: hexToRgba(colors.primary, 0.12), color: colors.primary }}
			>
				<Icon className="h-5 w-5" />
			</div>
			<h3 className="text-sm font-black uppercase tracking-tight text-neutral-900">{title}</h3>
			<p className="text-xs leading-relaxed text-neutral-600">{text}</p>
		</div>
	);
}

function ScriptLine({ text, colors }: { text: string; colors: { primary: string } }) {
	return (
		<div className="flex items-start gap-2 rounded-lg bg-white px-3 py-2">
			<MessageSquareQuote className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" style={{ color: colors.primary }} />
			<p className="text-xs font-medium italic leading-relaxed text-neutral-700">{text}</p>
		</div>
	);
}

function CompareRow({ label, kiosk, mobile, highlight }: { label: string; kiosk: string; mobile: string; highlight?: boolean }) {
	return (
		<div className={cn("grid grid-cols-3 border-t border-neutral-200 text-xs", highlight && "bg-amber-50")}>
			<div className="px-4 py-2.5 font-bold uppercase tracking-wide text-neutral-500">{label}</div>
			<div className="px-4 py-2.5 font-medium text-neutral-700">{kiosk}</div>
			<div className="px-4 py-2.5 font-medium text-neutral-700">{mobile}</div>
		</div>
	);
}

function TipCard({ text, colors }: { text: string; colors: { primary: string } }) {
	return (
		<div className="flex items-start gap-2 rounded-xl border border-neutral-200 bg-white p-3">
			<div className="mt-0.5 h-2 w-2 flex-shrink-0 rounded-full" style={{ backgroundColor: colors.primary }} />
			<p className="text-xs leading-relaxed text-neutral-700">{text}</p>
		</div>
	);
}

function DataPoint({ label, detail, required, colors }: { label: string; detail: string; required?: boolean; colors: { primary: string } }) {
	return (
		<div className="flex items-start gap-2">
			<div className="mt-1 h-2 w-2 flex-shrink-0 rounded-full" style={{ backgroundColor: colors.primary }} />
			<p className="text-xs leading-snug text-neutral-700">
				<span className="font-bold text-neutral-900">{label}</span>
				{required ? <span className="ml-1 text-[0.6rem] font-bold uppercase tracking-wider text-red-500">obrigatório</span> : null}
				<span className="text-neutral-500"> — {detail}</span>
			</p>
		</div>
	);
}
