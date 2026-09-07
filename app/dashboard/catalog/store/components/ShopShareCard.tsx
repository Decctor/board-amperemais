"use client";

import { Button } from "@/components/ui/button";
import { useCopyToClipboard } from "@/components/ui/copy-button";
import { Section } from "@/components/ui/section";
import { Check, Copy, ExternalLink, Share } from "lucide-react";

type ShopShareCardProps = {
	slug: string;
	shopQrCode: string;
	isActive: boolean;
};

export default function ShopShareCard({ slug, shopQrCode, isActive }: ShopShareCardProps) {
	const { copied, copy } = useCopyToClipboard({ resetAfterMs: 2000 });

	const shopUrl = typeof window !== "undefined" ? `${window.location.origin}/shop/${slug}` : `/shop/${slug}`;

	const handleOpen = () => {
		window.open(shopUrl, "_blank");
	};

	return (
		<Section.Root className="h-full">
			<Section.Header>
				<Section.Icon>
					<Share className="w-4 h-4 min-w-4 min-h-4" />
				</Section.Icon>
				<Section.Title>COMPARTILHAR LOJA</Section.Title>
			</Section.Header>
			<Section.Body>
				<div className="w-full flex items-center justify-center">
					<div className="bg-white p-3 rounded-xl flex flex-col items-center shadow-inner w-64 h-64">
						<div className="flex items-center justify-center rounded-lg overflow-hidden w-full h-full">
							{shopQrCode ? (
								<img src={shopQrCode} alt="QR Code" className="w-full h-full object-contain p-1" />
							) : (
								<p className="text-xs text-center px-2">QR Code indisponível</p>
							)}
						</div>
					</div>
				</div>
				<div className="flex items-center justify-center gap-3">
					<div className="w-full lg:w-1/2">
						<Button variant="brand" className="w-full flex items-center gap-1.5" onClick={handleOpen} disabled={!isActive}>
							<ExternalLink className="w-4 h-4" />
							{isActive ? "ACESSAR LOJA" : "ATIVE A LOJA PARA VISUALIZAR"}
						</Button>
					</div>
					<div className="w-full lg:w-1/2">
						<Button variant="secondary" className="w-full flex items-center gap-1.5" onClick={() => void copy(shopUrl)}>
							{copied ? <Check className="w-4 h-4 text-success" /> : <Copy className="w-4 h-4" />}
							{copied ? "LINK COPIADO" : "COPIAR LINK"}
						</Button>
					</div>
				</div>

				{!isActive && (
					<p className="text-xs text-warning-surface-foreground text-center">Sua loja está inativa. Ative para que os clientes possam acessar.</p>
				)}
			</Section.Body>
		</Section.Root>
	);
}
