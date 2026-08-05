"use client";

import { Button } from "@/components/ui/button";
import { type TPoiTheme, getPoiAccentGradient, getPoiPrimaryGradient } from "@/lib/point-of-interaction/theme";
import { BadgeCheck, Camera, HeartHandshake, Maximize2, Printer, ScanLine, Smartphone, WalletCards } from "lucide-react";
import Image from "next/image";
import { useState } from "react";

type TPosterSize = "A4" | "A5" | "A6";
type TPosterStepIcon = "badge-check" | "camera" | "heart-handshake" | "scan" | "smartphone";

export type TClubQrPosterCopy = {
	eyebrow: string;
	titleLines: readonly [string, string];
	dividerLabel: string;
	steps: readonly {
		icon: TPosterStepIcon;
		title: string;
		description: string;
	}[];
	tagline: string;
};

type ClubQrPosterProps = {
	org: {
		nome: string;
		logoUrl: string | null;
	};
	// Título do programa de fidelidade (ex.: "Clube Recompra"); cai no nome da org quando ausente.
	programTitle?: string | null;
	theme: TPoiTheme;
	targetUrl: string;
	// Data URL do QR já persistido na organização (poiQrCodeKioskDataUrl / poiQrCodeMobileDataUrl).
	qrDataUrl: string | null;
	// Sobrescreve qualquer trecho do texto impresso; o que não vier usa o padrão do produto.
	copy?: Partial<TClubQrPosterCopy>;
};

const POSTER_SIZES = ["A4", "A5", "A6"] as const satisfies ReadonlyArray<TPosterSize>;

const POSTER_CONFIG: Record<
	TPosterSize,
	{
		widthMm: number;
		heightMm: number;
		header: string;
		logo: string;
		logoPadding: string;
		title: string;
		eyebrow: string;
		body: string;
		qrSize: number;
		qrPadding: string;
		scanBadge: string;
		divider: string;
		steps: string;
		stepCircle: string;
		stepIcon: string;
		stepText: string;
		tagline: string;
		footer: string;
		url: string;
	}
> = {
	A4: {
		widthMm: 210,
		heightMm: 297,
		header: "px-10 pb-16 pt-10",
		logo: "h-20 max-w-52",
		logoPadding: "p-3",
		title: "text-[2.8rem]",
		eyebrow: "text-sm",
		body: "px-10 pb-7 pt-7",
		qrSize: 230,
		qrPadding: "p-4",
		scanBadge: "mt-4 px-5 py-3 text-sm",
		divider: "my-6 text-xs",
		steps: "gap-5",
		stepCircle: "size-16",
		stepIcon: "size-7",
		stepText: "text-xs",
		tagline: "mt-6 text-sm",
		footer: "px-8 py-4 text-xs",
		url: "pt-4 text-[0.68rem]",
	},
	A5: {
		widthMm: 148,
		heightMm: 210,
		header: "px-7 pb-11 pt-7",
		logo: "h-14 max-w-40",
		logoPadding: "p-2.5",
		title: "text-[2rem]",
		eyebrow: "text-[0.68rem]",
		body: "px-7 pb-5 pt-5",
		qrSize: 168,
		qrPadding: "p-3",
		scanBadge: "mt-3 px-4 py-2 text-xs",
		divider: "my-4 text-[0.62rem]",
		steps: "gap-3",
		stepCircle: "size-12",
		stepIcon: "size-5",
		stepText: "text-[0.62rem]",
		tagline: "mt-4 text-[0.68rem]",
		footer: "px-6 py-3 text-[0.62rem]",
		url: "pt-3 text-[0.52rem]",
	},
	A6: {
		widthMm: 105,
		heightMm: 148,
		header: "px-4 pb-8 pt-4",
		logo: "h-10 max-w-28",
		logoPadding: "p-1.5",
		title: "text-[1.35rem]",
		eyebrow: "text-[0.5rem]",
		body: "px-4 pb-3 pt-3",
		qrSize: 112,
		qrPadding: "p-2",
		scanBadge: "mt-2 px-3 py-1.5 text-[0.52rem]",
		divider: "my-2.5 text-[0.48rem]",
		steps: "gap-1.5",
		stepCircle: "size-8",
		stepIcon: "size-3.5",
		stepText: "text-[0.45rem]",
		tagline: "mt-2.5 text-[0.48rem]",
		footer: "px-4 py-2 text-[0.48rem]",
		url: "pt-1.5 text-[0.4rem]",
	},
};

const STEP_ICONS = {
	"badge-check": BadgeCheck,
	camera: Camera,
	"heart-handshake": HeartHandshake,
	scan: ScanLine,
	smartphone: Smartphone,
} satisfies Record<TPosterStepIcon, typeof Camera>;

// Padrões do produto: no POI o cliente se identifica pelo TELEFONE — nunca por documento.
const DEFAULT_POSTER_COPY: TClubQrPosterCopy = {
	eyebrow: "Cadastro grátis · rápido e sem app",
	titleLines: ["Clube de benefícios", "no seu telefone"],
	dividerLabel: "Como participar",
	steps: [
		{ icon: "camera", title: "Abra a câmera", description: "do seu celular" },
		{ icon: "scan", title: "Escaneie o QR", description: "e faça o cadastro" },
		{ icon: "badge-check", title: "Informe o telefone", description: "no caixa da loja" },
	],
	tagline: "Seu telefone é sua carteirinha. Sem aplicativo e sem complicação.",
};

export function ClubQrPoster({ org, programTitle, theme, targetUrl, qrDataUrl, copy }: ClubQrPosterProps) {
	const [size, setSize] = useState<TPosterSize>("A5");
	const config = POSTER_CONFIG[size];
	const posterCopy: TClubQrPosterCopy = { ...DEFAULT_POSTER_COPY, ...copy };
	const clubName = programTitle?.trim() || org.nome;
	const primaryGradient = getPoiPrimaryGradient(theme);
	const accentGradient = getPoiAccentGradient(theme);

	return (
		<div
			className="flex min-h-full w-full items-start justify-center p-4 pb-24 print:block print:min-h-0 print:bg-white print:p-0 lg:p-8"
			style={{ backgroundColor: theme.tint }}
		>
			{/*
				A folha imprime sozinha mesmo dentro do shell do dashboard: `@page` fixa o formato e a
				regra de visibilidade apaga sidebar, header e controles sem precisar de rota isolada.
			*/}
			<style>{`@media print {
				@page { size: ${config.widthMm}mm ${config.heightMm}mm; margin: 0; }
				body { background: #ffffff !important; }
				body * { visibility: hidden !important; }
				[data-poi-poster], [data-poi-poster] * { visibility: visible !important; }
				[data-poi-poster] { position: fixed !important; inset: 0 !important; margin: 0 !important; }
			}`}</style>

			<article
				data-poi-poster=""
				className="relative flex flex-col overflow-hidden rounded-3xl bg-white shadow-2xl print:rounded-none print:shadow-none"
				style={{ width: `${config.widthMm}mm`, height: `${config.heightMm}mm` }}
			>
				<header
					className={`relative flex flex-col items-center overflow-hidden text-center ${config.header}`}
					style={{ backgroundColor: theme.primary, backgroundImage: primaryGradient, color: theme.primaryForeground }}
				>
					{/* Textura de pontos: dá material impresso, não chapado. */}
					<div
						className="pointer-events-none absolute inset-0 opacity-[0.12]"
						style={{
							backgroundImage: `radial-gradient(circle, ${theme.primaryForeground} 1px, transparent 1px)`,
							backgroundSize: size === "A6" ? "11px 11px" : "16px 16px",
						}}
					/>

					{org.logoUrl ? (
						<div
							className={`relative z-10 flex aspect-square items-center justify-center rounded-2xl bg-white shadow-md ${config.logoPadding} ${config.logo}`}
						>
							<Image src={org.logoUrl} alt={`Logo ${org.nome}`} width={200} height={200} priority className="size-full object-contain" />
						</div>
					) : (
						<p className={`relative z-10 rounded-2xl bg-white/20 px-4 py-2 font-black uppercase tracking-tight ${config.eyebrow}`}>{org.nome}</p>
					)}

					<div className="relative z-10 mt-4">
						<p className={`font-extrabold uppercase tracking-[0.22em] ${config.eyebrow}`} style={{ color: theme.accent }}>
							{posterCopy.eyebrow}
						</p>
						<h1 className={`mt-1 font-black uppercase leading-[0.92] tracking-tight ${config.title}`}>
							{posterCopy.titleLines[0]}
							<br />
							{posterCopy.titleLines[1]}
						</h1>
					</div>

					<div className="absolute inset-x-[-10%] -bottom-10 h-16 w-[120%] rounded-[50%_50%_0_0] bg-white" aria-hidden="true" />
				</header>

				<div className={`relative z-10 flex flex-1 flex-col items-center bg-white ${config.body}`}>
					<div className="relative flex flex-col items-center">
						<div className="rounded-[1.4rem]" style={{ backgroundImage: accentGradient, padding: size === "A6" ? "3px" : "4px" }}>
							<div className={`rounded-[1.15rem] bg-white ${config.qrPadding}`}>
								<div className="flex items-center justify-center" style={{ width: `${config.qrSize}px`, height: `${config.qrSize}px` }}>
									{qrDataUrl ? (
										<img src={qrDataUrl} alt={`QR Code para cadastro no ${clubName}`} className="size-full object-contain" />
									) : (
										<p className="px-2 text-center text-[0.6rem] font-bold uppercase text-neutral-400">QR Code indisponível</p>
									)}
								</div>
							</div>
						</div>

						<div
							className={`flex items-center gap-2 rounded-full font-extrabold uppercase tracking-widest shadow-sm ${config.scanBadge}`}
							style={{ backgroundColor: theme.primary, color: theme.primaryForeground }}
						>
							<ScanLine className={size === "A4" ? "size-6" : "size-4"} />
							Aponte a câmera aqui
						</div>
					</div>

					<div className={`flex w-full items-center gap-2 font-bold uppercase tracking-[0.16em] text-neutral-400 ${config.divider}`}>
						<span className="h-px flex-1 bg-neutral-200" />
						{posterCopy.dividerLabel}
						<span className="h-px flex-1 bg-neutral-200" />
					</div>

					<div className={`grid w-full grid-cols-3 ${config.steps}`}>
						{posterCopy.steps.map((step, index) => {
							const StepIcon = STEP_ICONS[step.icon];

							return (
								<div key={step.title} className="flex min-w-0 flex-col items-center text-center">
									<div
										className={`relative flex items-center justify-center rounded-full ${config.stepCircle}`}
										style={{ backgroundColor: theme.tint, color: theme.primary }}
									>
										<StepIcon className={config.stepIcon} />
										<span
											className="absolute -right-0.5 -top-0.5 flex size-4 items-center justify-center rounded-full text-[0.5rem] font-black"
											style={{ backgroundColor: theme.accent, color: theme.accentForeground }}
										>
											{index + 1}
										</span>
									</div>
									<p className={`mt-2 font-extrabold leading-tight text-neutral-800 ${config.stepText}`}>{step.title}</p>
									<p className={`mt-0.5 leading-tight text-neutral-500 ${config.stepText}`}>{step.description}</p>
								</div>
							);
						})}
					</div>

					<div className={`flex items-center justify-center gap-2 text-center font-semibold leading-snug text-neutral-500 ${config.tagline}`}>
						<WalletCards className={size === "A6" ? "size-3" : "size-4"} style={{ color: theme.primary }} />
						{posterCopy.tagline}
					</div>

					<p className={`mt-auto max-w-full truncate font-medium text-neutral-400 ${config.url}`}>{targetUrl.replace("https://", "")}</p>
				</div>

				<footer
					className={`flex items-center justify-between ${config.footer}`}
					style={{ backgroundColor: theme.primary, backgroundImage: primaryGradient, color: theme.primaryForeground }}
				>
					<span className="truncate font-bold">{clubName}</span>
					<span className="shrink-0 opacity-65">Uma experiência RecompraCRM</span>
				</footer>

				<div className="absolute inset-x-0 top-0 h-1.5" style={{ backgroundColor: theme.accent }} />
			</article>

			<aside className="fixed right-6 top-1/2 hidden w-64 -translate-y-1/2 flex-col gap-4 rounded-2xl border border-border bg-card p-4 shadow-xl print:hidden lg:flex">
				<div>
					<div className="flex items-center gap-2">
						<Maximize2 className="size-4" />
						<p className="text-sm font-extrabold uppercase">FORMATO DO PÔSTER</p>
					</div>
					<p className="mt-1 text-xs leading-relaxed text-muted-foreground">Escolha o tamanho do material antes de imprimir.</p>
				</div>

				<div className="grid gap-2">
					{POSTER_SIZES.map((posterSize) => (
						<Button
							key={posterSize}
							type="button"
							variant={size === posterSize ? "default" : "outline"}
							onClick={() => setSize(posterSize)}
							className="h-auto justify-between rounded-xl px-4 py-3"
						>
							<span className="font-extrabold">{posterSize}</span>
							<span className="text-xs opacity-65">
								{POSTER_CONFIG[posterSize].widthMm} × {POSTER_CONFIG[posterSize].heightMm} mm
							</span>
						</Button>
					))}
				</div>

				<Button type="button" onClick={() => window.print()} className="h-11 gap-2 rounded-xl" variant="brand">
					<Printer className="size-4" />
					IMPRIMIR PÔSTER
				</Button>
			</aside>

			<nav className="fixed bottom-4 left-1/2 z-20 flex max-w-[calc(100%-2rem)] -translate-x-1/2 items-center gap-1.5 rounded-full border border-border bg-card/95 p-2 shadow-xl print:hidden lg:hidden">
				{POSTER_SIZES.map((posterSize) => (
					<Button
						key={posterSize}
						type="button"
						size="sm"
						variant={size === posterSize ? "default" : "ghost"}
						onClick={() => setSize(posterSize)}
						className="rounded-full"
					>
						{posterSize}
					</Button>
				))}
				<Button type="button" size="sm" onClick={() => window.print()} className="gap-1.5 rounded-full" variant="brand">
					<Printer className="size-4" />
					IMPRIMIR
				</Button>
			</nav>
		</div>
	);
}
