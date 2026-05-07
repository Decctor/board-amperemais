"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Check, Copy, ExternalLink } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

type ShopShareCardProps = {
	organizationId: string;
	isActive: boolean;
};

export default function ShopShareCard({ organizationId, isActive }: ShopShareCardProps) {
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
		<Card>
			<CardHeader>
				<CardTitle className="text-base">Compartilhar loja</CardTitle>
				<CardDescription>Envie o link para seus clientes</CardDescription>
			</CardHeader>

			<CardContent className="flex flex-col gap-4">
				<div className="flex gap-2">
					<Input value={shopUrl} readOnly className="text-sm" />
					<Button variant="outline" size="icon" onClick={handleCopy}>
						{copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
					</Button>
				</div>

				<Button variant="outline" className="w-full gap-2" onClick={handleOpen} disabled={!isActive}>
					<ExternalLink className="w-4 h-4" />
					{isActive ? "Abrir loja" : "Ative a loja para visualizar"}
				</Button>

				{!isActive && (
					<p className="text-xs text-amber-600 dark:text-amber-400 text-center">
						Sua loja esta inativa. Ative para que os clientes possam acessar.
					</p>
				)}
			</CardContent>
		</Card>
	);
}
