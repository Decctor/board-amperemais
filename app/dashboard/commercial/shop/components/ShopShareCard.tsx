"use client";

import { Button } from "@/components/ui/button";
import { Copy, ExternalLink, Share } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import SectionWrapper from "@/components/ui/section-wrapper";

type ShopShareCardProps = {
	organizationId: string;
	shopQrCode: string;
	isActive: boolean;
};

export default function ShopShareCard({ organizationId, shopQrCode, isActive }: ShopShareCardProps) {
	const [copied, setCopied] = useState(false);

	const shopUrl = typeof window !== "undefined" ? `${window.location.origin}/shop/${organizationId}` : `/shop/${organizationId}`;

	const handleCopy = async () => {
		try {
			await navigator.clipboard.writeText(shopUrl);
			setCopied(true);
			toast.success("Link copiado!");
			setTimeout(() => setCopied(false), 2000);
		} catch {
			toast.error("Erro ao copiar link.");
		}
	};

	const handleOpen = () => {
		window.open(shopUrl, "_blank");
	};

	return (
		<SectionWrapper title="COMPARTILHAR LOJA" icon={<Share className="w-4 h-4 min-w-4 min-h-4" />} wrapperClassName="h-full">
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
					<Button variant="secondary" className="w-full flex items-center gap-1.5" onClick={handleCopy}>
						<Copy className="w-4 h-4" />
						COPIAR LINK
					</Button>
				</div>
			</div>

			{!isActive && (
				<p className="text-xs text-amber-600 dark:text-amber-400 text-center">Sua loja esta inativa. Ative para que os clientes possam acessar.</p>
			)}
		</SectionWrapper>
	);
}
