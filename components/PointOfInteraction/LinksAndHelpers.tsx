"use client";

import { TAuthUserSession } from "@/lib/authentication/types";
import { POI_QR_CODE_TO_DATA_URL_OPTIONS } from "@/lib/organizations/poi-qr-codes";
import { cn, copyToClipboard } from "@/lib/utils";
import { BadgePercent, BookOpen, Copy, ExternalLink, FileText, QrCode, UserPlus } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { Button } from "../ui/button";

type TPoiLinkFlow = "sale" | "signup";

type TPoiLinkDefinition = {
	key: string;
	title: string;
	label: string;
	path: string;
};

// QRs são determinísticos (URL + opções fixas), então são gerados on-the-fly aqui —
// com window.location.origin, sempre coerentes com o ambiente atual, sem depender
// dos data URLs persistidos na organização.
function getPoiLinksForFlow(orgId: string, flow: TPoiLinkFlow): TPoiLinkDefinition[] {
	if (flow === "signup") {
		return [
			{
				key: "club",
				title: "CLUBE DE BENEFÍCIOS - CADASTRO E CONSULTA",
				label: "LINK DO CLUBE",
				path: `/point-of-interaction/${orgId}?mode=mobile&flow=profile`,
			},
		];
	}
	return [
		{
			key: "kiosk",
			title: "PONTO DE INTERAÇÃO - MODO KIOSK",
			label: "LINK POI KIOSK",
			path: `/point-of-interaction/${orgId}?mode=kiosk`,
		},
		{
			key: "mobile",
			title: "PONTO DE INTERAÇÃO - MODO MOBILE",
			label: "LINK POI MOBILE",
			path: `/point-of-interaction/${orgId}?mode=mobile`,
		},
	];
}

type PointOfInteractionLinksAndHelpersProps = {
	organization: NonNullable<TAuthUserSession["membership"]>["organizacao"];
};
export function PointOfInteractionLinksAndHelpers({ organization }: PointOfInteractionLinksAndHelpersProps) {
	const [linkFlow, setLinkFlow] = useState<TPoiLinkFlow>("sale");
	const [qrDataUrls, setQrDataUrls] = useState<Record<string, string>>({});

	const flowLinks = getPoiLinksForFlow(organization.id, linkFlow);

	function getAbsolutePoiUrl(path: string) {
		const baseUrl = typeof window !== "undefined" ? window.location.origin : (process.env.NEXT_PUBLIC_APP_URL ?? "");
		return `${baseUrl}${path}`;
	}

	useEffect(() => {
		let cancelled = false;
		async function generateQrCodes() {
			const entries = await Promise.all(
				getPoiLinksForFlow(organization.id, linkFlow).map(async (link) => {
					const dataUrl = await QRCode.toDataURL(`${window.location.origin}${link.path}`, POI_QR_CODE_TO_DATA_URL_OPTIONS);
					return [link.path, dataUrl] as const;
				}),
			);
			if (!cancelled) setQrDataUrls((prev) => ({ ...prev, ...Object.fromEntries(entries) }));
		}
		generateQrCodes();
		return () => {
			cancelled = true;
		};
	}, [organization.id, linkFlow]);

	return (
		<div className="bg-card border-border flex w-full flex-col gap-3 rounded-xl border px-3 py-4 shadow-2xs md:h-full md:min-h-0 md:overflow-y-auto">
			<div className="flex flex-col">
				<div className="flex items-center justify-between">
					<h1 className="text-xs font-medium tracking-tight uppercase">UTILITÁRIOS</h1>
					<div className="flex items-center gap-2">
						<QrCode className="w-4 h-4 min-w-4 min-h-4" />
					</div>
				</div>
				<p className="text-[0.65rem] text-muted-foreground">Links e utilitários do Ponto de Interação.</p>
			</div>

			{/* Fluxo de venda (caixa) x fluxo de cadastro (clube: QR de mesa, link do vendedor) */}
			<div className="w-full shrink-0 grid grid-cols-2 gap-1 rounded-lg bg-muted p-1">
				{(
					[
						{ flow: "sale", label: "FLUXO DE VENDA", icon: BadgePercent },
						{ flow: "signup", label: "FLUXO DE CADASTRO", icon: UserPlus },
					] as const
				).map(({ flow, label, icon: Icon }) => (
					<button
						key={flow}
						type="button"
						aria-pressed={linkFlow === flow}
						onClick={() => setLinkFlow(flow)}
						className={cn(
							"flex h-8 items-center justify-center gap-1.5 rounded-md px-2 text-[0.65rem] font-bold uppercase tracking-wide transition-colors",
							"focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
							linkFlow === flow ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
						)}
					>
						<Icon className="w-3.5 h-3.5 shrink-0" />
						{label}
					</button>
				))}
			</div>
			{linkFlow === "signup" ? (
				<p className="text-[0.65rem] text-muted-foreground text-center -mt-1.5">
					Cadastro e consulta do clube de benefícios — ideal para QR codes em mesas e para o link pessoal do atendente.
				</p>
			) : null}

			{flowLinks.map((link) => (
				<div key={link.key} className="w-full flex flex-col gap-1.5">
					<h1 className="text-xs font-medium tracking-tight uppercase">{link.title}</h1>
					<div className="bg-primary/10 flex aspect-square w-[35%] self-center items-center justify-center overflow-hidden rounded-md">
						{qrDataUrls[link.path] ? (
							<img src={qrDataUrls[link.path]} alt={`QR Code — ${link.title}`} className="h-full w-full object-contain" />
						) : (
							<p className="text-foreground/70 text-center text-[0.6rem] font-medium uppercase">Gerando QR...</p>
						)}
					</div>
					<div className="w-full flex items-center justify-center">
						<div className="flex items-center gap-3 px-2 py-1 rounded-lg bg-primary/10 text-foreground">
							<p className="text-xs font-medium tracking-tight">{link.label}</p>
							<div className="flex items-center gap-1.5">
								<Button
									onClick={() => copyToClipboard(getAbsolutePoiUrl(link.path))}
									size="fit"
									className="flex items-center justify-center p-2 rounded-lg"
									variant={"ghost-brand"}
								>
									<Copy className="w-4 h-4 min-w-4 min-h-4" />
								</Button>
								<Button size="fit" className="flex items-center justify-center p-2 rounded-lg" variant={"brand"} asChild>
									<Link href={link.path}>
										<ExternalLink className="w-4 h-4 min-w-4 min-h-4" />
									</Link>
								</Button>
							</div>
						</div>
					</div>
				</div>
			))}

			<div className="w-full flex flex-col gap-1.5 mt-2 pt-4 border-t border-border">
				<h1 className="text-xs font-medium tracking-tight uppercase">MATERIAL PARA DISPLAY</h1>
				<p className="text-[0.65rem] text-muted-foreground mb-2">Display pronto para impressão no formato A5 para engajar seus clientes.</p>
				<div className="w-full flex items-center justify-center">
					<Button variant={"ghost-brand"} className="flex items-center gap-1.5" asChild>
						<Link href={`/point-of-interaction-display/${organization.id}`} target="_blank">
							<ExternalLink className="w-4 h-4" />
							ABRIR DISPLAY
						</Link>
					</Button>
				</div>
			</div>

			<div className="w-full flex flex-col gap-1.5 mt-2 pt-4 border-t border-border">
				<h1 className="text-xs font-medium tracking-tight uppercase">PLAYBOOK DE USO</h1>
				<p className="text-[0.65rem] text-muted-foreground mb-2">
					Guia passo a passo (A4, imprimível em PDF) dos fluxos kiosk e mobile para treinar a equipe.
				</p>
				<div className="w-full flex items-center justify-center gap-2 flex-wrap">
					<Button variant={"ghost-brand"} className="flex items-center gap-1.5" asChild>
						<Link href={`/point-of-interaction-playbook/${organization.id}`} target="_blank">
							<BookOpen className="w-4 h-4" />
							ABRIR PLAYBOOK
						</Link>
					</Button>
					<Button variant={"ghost-brand"} className="flex items-center gap-1.5" asChild>
						<Link href={`/point-of-interaction-playbook/${organization.id}/summary`} target="_blank">
							<FileText className="w-4 h-4" />
							RESUMO (1 PÁGINA)
						</Link>
					</Button>
				</div>
			</div>
		</div>
	);
}
