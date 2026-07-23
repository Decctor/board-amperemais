"use client";

import { BrandLogo } from "@/components/Brand/BrandLogo";
import { hexToRgba, useOrgColors } from "@/components/Providers/OrgColorsProvider";
import { Button } from "@/components/ui/button";
import { ARTHUR_WHATSAPP_NUMBER, LUCAS_WHATSAPP_NUMBER } from "@/config/internal-coms";
import type { TOrganizationEntity } from "@/services/drizzle/schema";
import { Building2, Check, Database, Headphones, MessageSquareQuote, Phone, Printer, ShieldCheck, Smartphone, Sparkles, Tablet } from "lucide-react";
import Image from "next/image";
import type { ReactNode } from "react";
import { FaWhatsapp } from "react-icons/fa6";

type SummaryOrg = {
	id: TOrganizationEntity["id"];
	nome: TOrganizationEntity["nome"];
	logoUrl: TOrganizationEntity["logoUrl"];
	telefone: TOrganizationEntity["telefone"];
};

type PointOfInteractionSummaryPageProps = {
	org: SummaryOrg;
};

const KIOSK_STEPS = [
	"Operador digita o telefone do cliente no teclado do totem.",
	"Perfil aparece (ou cadastro rápido, se for cliente novo).",
	"Escolhe o modo: pontuar com desconto ou resgatar recompensa.",
	"Informa o valor da venda e o uso do saldo.",
	"Vendedor digita a senha de 5 dígitos no próprio totem. Pronto!",
];

const MOBILE_STEPS = [
	"Cliente escaneia o QR mobile e abre o fluxo no próprio celular.",
	"Identifica-se pelo telefone (ou se cadastra na hora).",
	"Escolhe o modo e os valores — sem passo de confirmação.",
	"Envia a solicitação e vê a tela “Aguardando aprovação”.",
	"No painel da loja, o operador aprova com a senha do vendedor.",
];

const KIOSK_COUNTER_PHRASE = "Oi, aproveita que estou passando sua venda e coloca seu telefone pra pontuar e ganhar cashback :)";

const MOBILE_COUNTER_PHRASE = "Oi, aproveita que estou passando sua venda e scaneia o código com seu telefone para pontuar e ganhar cashback :)";

const SUPPORT_CONTACTS = [
	{ name: "Lucas Fernandes", phone: "34 99662-6855", whatsapp: LUCAS_WHATSAPP_NUMBER },
	{ name: "Arthur Carvalho", phone: "34 99948-0791", whatsapp: ARTHUR_WHATSAPP_NUMBER },
] as const;

export default function PointOfInteractionSummaryPage({ org }: PointOfInteractionSummaryPageProps) {
	const { colors, getPrimaryGradientStyle } = useOrgColors();
	const gradient = getPrimaryGradientStyle();

	function handlePrint() {
		window.print();
	}

	return (
		<div
			className="playbook-root flex min-h-screen justify-center bg-neutral-100 p-4 pb-24 print:bg-white print:p-0 print:pb-0"
			style={{ backgroundColor: hexToRgba(colors.primary, 0.06) }}
		>
			{/* Single A4 sheet. Fixed height + overflow hidden keeps it to exactly one page on print. */}
			<style>{`
				@page { size: A4 portrait; margin: 0; }
				.summary-sheet { width: 210mm; }
				@media screen { .summary-sheet { min-height: 297mm; } }
				@media print {
					.playbook-root { background: #fff !important; }
					.summary-sheet { height: 297mm; overflow: hidden; box-shadow: none !important; }
					html, body { background: #fff !important; }
				}
			`}</style>

			<section className="summary-sheet relative flex flex-col bg-white text-neutral-900 shadow-2xl print:shadow-none">
				<div className="flex flex-1 flex-col gap-5 px-10 py-8">
					{/* Hero */}
					<div className="relative overflow-hidden rounded-2xl px-8 py-6" style={gradient}>
						<div
							className="absolute inset-0 opacity-10"
							style={{ backgroundImage: `radial-gradient(circle, ${colors.primaryForeground} 1px, transparent 1px)`, backgroundSize: "16px 16px" }}
						/>
						<div className="relative z-10 flex items-center gap-4">
							<div className="flex h-16 w-16 flex-shrink-0 items-center justify-center overflow-hidden rounded-xl bg-white p-1.5 shadow-md">
								{org.logoUrl ? (
									<Image src={org.logoUrl} alt={org.nome} width={56} height={56} className="h-full w-full object-contain" />
								) : (
									<Building2 className="h-8 w-8" style={{ color: colors.primary }} />
								)}
							</div>
							<div className="min-w-0">
								<p className="text-[0.65rem] font-bold uppercase tracking-[0.3em] opacity-80" style={{ color: colors.primaryForeground }}>
									Guia rápido · {org.nome}
								</p>
								<h1 className="text-3xl font-black uppercase leading-none tracking-tight" style={{ color: colors.primaryForeground }}>
									Ponto de Interação
								</h1>
								<p className="mt-1 text-xs font-semibold uppercase tracking-widest opacity-80" style={{ color: colors.primaryForeground }}>
									Pontuação · Resgate · Coleta de contatos
								</p>
							</div>
						</div>
					</div>

					{/* Value banner */}
					<div
						className="flex items-start gap-3 rounded-xl px-5 py-3.5"
						style={{ backgroundColor: hexToRgba(colors.primary, 0.08), borderLeft: `4px solid ${colors.primary}` }}
					>
						<p className="text-sm leading-relaxed text-neutral-700">
							<strong>Todo cliente que pontua deixa o contato com você.</strong> Use o cashback como âncora para cadastrar — é a sua base crescendo a cada
							atendimento, pronta para campanhas, promoções e reativações.
						</p>
					</div>

					{/* Two flows */}
					<div className="grid grid-cols-2 items-start gap-5">
						<FlowColumn
							icon={Tablet}
							title="Modo Kiosk"
							subtitle="Tablet no balcão"
							approval="Aprovação no próprio totem, com a senha do vendedor."
							steps={KIOSK_STEPS}
							counterPhrase={KIOSK_COUNTER_PHRASE}
							colors={colors}
						/>
						<FlowColumn
							icon={Smartphone}
							title="Modo Mobile"
							subtitle="Celular do cliente"
							approval="Aprovação pelo painel da loja, em tempo real."
							steps={MOBILE_STEPS}
							counterPhrase={MOBILE_COUNTER_PHRASE}
							colors={colors}
						/>
					</div>

					{/* Data captured + counter reminders */}
					<div className="grid grid-cols-2 gap-5">
						<div className="flex flex-col gap-2 rounded-2xl border border-neutral-200 bg-white p-5">
							<div className="flex items-center gap-2">
								<div
									className="flex h-9 w-9 items-center justify-center rounded-xl"
									style={{ backgroundColor: hexToRgba(colors.primary, 0.12), color: colors.primary }}
								>
									<Database className="h-5 w-5" />
								</div>
								<h3 className="text-sm font-black uppercase tracking-tight">O que você coleta</h3>
							</div>
							<div className="mt-1 flex flex-col gap-1.5">
								<DataPoint label="Telefone" detail="chave do cliente" required colors={colors} />
								<DataPoint label="Nome" detail="para personalizar o atendimento" required colors={colors} />
								<DataPoint label="CPF / CNPJ" detail="opcional" colors={colors} />
								<DataPoint label="Aniversário" detail="opcional — campanhas de data" colors={colors} />
							</div>
						</div>

						<div className="flex flex-col gap-2 rounded-2xl border border-neutral-200 bg-white p-5">
							<div className="flex items-center gap-2">
								<div
									className="flex h-9 w-9 items-center justify-center rounded-xl"
									style={{ backgroundColor: hexToRgba(colors.primary, 0.12), color: colors.primary }}
								>
									<Sparkles className="h-5 w-5" />
								</div>
								<h3 className="text-sm font-black uppercase tracking-tight">Lembretes no balcão</h3>
							</div>
							<ul className="mt-1 flex flex-col gap-1.5">
								<TipItem colors={colors}>Ofereça em toda venda — fale do cashback, não do “cadastro”.</TipItem>
								<TipItem colors={colors}>Use o nome do cliente: a tela já mostra quem é.</TipItem>
								<TipItem colors={colors}>No mobile, fique de olho no painel e aprove rápido.</TipItem>
								<TipItem colors={colors}>Cada senha de operador identifica um vendedor: use a sua.</TipItem>
							</ul>
						</div>
					</div>
				</div>

				{/* Support note */}
				<div className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1 px-10 py-1.5 text-xs">
					<div className="flex items-center gap-1 text-neutral-600">
						<Headphones className="h-3 w-3" style={{ color: colors.primary }} />
						<span className="font-bold uppercase tracking-wider">Suporte</span>
					</div>
					<span className="text-neutral-300">·</span>
					{SUPPORT_CONTACTS.map((contact, index) => (
						<div key={contact.name} className="flex items-center gap-2">
							{index > 0 ? <span className="text-neutral-300">·</span> : null}
							<a
								href={`https://wa.me/${contact.whatsapp}?text=${encodeURIComponent("Olá! Preciso de suporte com o Ponto de Interação.")}`}
								target="_blank"
								rel="noopener noreferrer"
								className="inline-flex items-center gap-1 rounded-full bg-neutral-50 px-2 py-0.5 text-neutral-600 transition-colors hover:bg-green-50 hover:text-neutral-900 print:bg-transparent print:px-0 print:pointer-events-none"
							>
								<FaWhatsapp className="h-3 w-3 shrink-0 text-green-500" />
								<span className="font-semibold text-neutral-800">{contact.name}</span>
								<Phone className="h-2.5 w-2.5 shrink-0 text-neutral-400" />
								<span className="font-medium tabular-nums">{contact.phone}</span>
							</a>
						</div>
					))}
				</div>

				{/* Footer */}
				<div className="flex items-center justify-between border-t bg-[#24549C] text-white px-10 py-3">
					<span className="text-[0.6rem] font-medium uppercase tracking-widest">Ponto de Interação · Guia rápido</span>
					<div className="flex items-center gap-1.5">
						<span className="text-[0.6rem] font-medium">Powered by</span>
						<div className="relative h-4 w-20">
							<BrandLogo lockup="horizontal" tone="color-on-dark" alt="RecompraCRM" fill className="object-contain" />
						</div>
					</div>
				</div>
			</section>

			{/* Print control */}
			<aside className="fixed right-6 top-1/2 z-20 hidden w-56 -translate-y-1/2 flex-col gap-3 rounded-2xl bg-card p-4 shadow-xl lg:flex print:hidden">
				<div className="flex flex-col gap-0.5">
					<div className="flex items-center gap-1.5">
						<Printer className="h-4 w-4" />
						<p className="text-sm font-semibold text-foreground">Imprimir / Salvar PDF</p>
					</div>
					<p className="text-xs text-muted-foreground">Resumo de 1 página (A4) para colar na parede ou no display.</p>
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

function FlowColumn({
	icon: Icon,
	title,
	subtitle,
	approval,
	steps,
	counterPhrase,
	colors,
}: {
	icon: typeof Tablet;
	title: string;
	subtitle: string;
	approval: string;
	steps: string[];
	counterPhrase: string;
	colors: { primary: string; primaryForeground: string };
}) {
	return (
		<div className="flex flex-col gap-3 rounded-2xl border border-neutral-200 bg-white p-5">
			<div className="flex items-center gap-2.5">
				<div
					className="flex h-10 w-10 items-center justify-center rounded-xl"
					style={{ backgroundColor: hexToRgba(colors.primary, 0.12), color: colors.primary }}
				>
					<Icon className="h-5 w-5" />
				</div>
				<div>
					<h2 className="text-lg font-black uppercase leading-none tracking-tight">{title}</h2>
					<p className="text-[0.65rem] font-bold uppercase tracking-widest text-neutral-400">{subtitle}</p>
				</div>
			</div>

			<div className="flex items-start gap-2 rounded-lg px-3 py-2" style={{ backgroundColor: hexToRgba(colors.primary, 0.08) }}>
				<ShieldCheck className="mt-0.5 h-4 w-4 flex-shrink-0" style={{ color: colors.primary }} />
				<p className="text-[0.7rem] font-semibold leading-snug" style={{ color: colors.primary }}>
					{approval}
				</p>
			</div>

			<ol className="flex flex-col gap-2.5">
				{steps.map((step, i) => (
					<li key={i} className="flex items-start gap-2.5">
						<span
							className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full text-[0.7rem] font-black"
							style={{ backgroundColor: colors.primary, color: colors.primaryForeground }}
						>
							{i + 1}
						</span>
						<span className="text-xs leading-snug text-neutral-700">{step}</span>
					</li>
				))}
			</ol>

			<div
				className="rounded-lg border border-dashed px-3 py-2.5"
				style={{ borderColor: hexToRgba(colors.primary, 0.3), backgroundColor: hexToRgba(colors.primary, 0.04) }}
			>
				<div className="mb-1 flex items-center gap-1.5">
					<MessageSquareQuote className="h-3 w-3" style={{ color: colors.primary }} />
					<span className="text-[0.6rem] font-bold uppercase tracking-wider text-neutral-500">Frase de balcão</span>
				</div>
				<p className="text-[0.7rem] font-medium italic leading-snug text-neutral-700">“{counterPhrase}”</p>
			</div>
		</div>
	);
}

function DataPoint({ label, detail, required, colors }: { label: string; detail: string; required?: boolean; colors: { primary: string } }) {
	return (
		<div className="flex items-start gap-2">
			<div className="mt-1.5 h-2 w-2 flex-shrink-0 rounded-full" style={{ backgroundColor: colors.primary }} />
			<p className="text-xs leading-snug text-neutral-700">
				<span className="font-bold text-neutral-900">{label}</span>
				{required ? <span className="ml-1 text-[0.6rem] font-bold uppercase tracking-wider text-red-500">obrigatório</span> : null}
				<span className="text-neutral-500"> — {detail}</span>
			</p>
		</div>
	);
}

function TipItem({ children, colors }: { children: ReactNode; colors: { primary: string } }) {
	return (
		<li className="flex items-start gap-2">
			<Check className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" style={{ color: colors.primary }} />
			<span className="text-xs leading-snug text-neutral-700">{children}</span>
		</li>
	);
}
