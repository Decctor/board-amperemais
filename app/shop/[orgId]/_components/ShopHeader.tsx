"use client";

import { Badge } from "@/components/ui/badge";
import { MapPin, Package, Truck } from "lucide-react";
import Image from "next/image";
import { useShop } from "./ShopProvider";

export default function ShopHeader() {
	const { catalog } = useShop();
	const { organization, shopSettings } = catalog;
	const config = shopSettings.configuracoes;

	const locationParts = [
		organization.localizacaoBairro,
		organization.localizacaoCidade,
		organization.localizacaoEstado,
	].filter(Boolean);
	const locationSummary = locationParts.join(", ");

	return (
		<header className="relative">
			{config.headerCoverUrl && (
				<div className="relative w-full h-40 sm:h-52 bg-muted">
					{config.headerCoverTipo === "VIDEO" ? (
						<video
							src={config.headerCoverUrl}
							autoPlay
							loop
							muted
							playsInline
							className="w-full h-full object-cover"
						/>
					) : (
						<Image
							src={config.headerCoverUrl}
							alt={organization.nome}
							fill
							className="object-cover"
							priority
						/>
					)}
					<div className="absolute inset-0 bg-gradient-to-t from-background/80 to-transparent" />
				</div>
			)}

			<div className={`relative px-4 ${config.headerCoverUrl ? "-mt-12" : "pt-6"}`}>
				<div className="flex items-end gap-4">
					{organization.logoUrl ? (
						<div className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-2xl overflow-hidden border-4 border-background bg-background shadow-lg flex-shrink-0">
							<Image
								src={organization.logoUrl}
								alt={organization.nome}
								fill
								className="object-cover"
							/>
						</div>
					) : (
						<div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl border-4 border-background bg-primary/10 shadow-lg flex items-center justify-center flex-shrink-0">
							<span className="text-2xl font-black text-primary">
								{organization.nome.charAt(0).toUpperCase()}
							</span>
						</div>
					)}

					<div className="flex-1 min-w-0 pb-1">
						<h1 className="text-xl sm:text-2xl font-black truncate">{organization.nome}</h1>
						{locationSummary && (
							<p className="text-sm text-muted-foreground flex items-center gap-1 mt-0.5">
								<MapPin className="w-3 h-3 flex-shrink-0" />
								<span className="truncate">{locationSummary}</span>
							</p>
						)}
					</div>
				</div>

				<div className="flex items-center gap-2 mt-4 flex-wrap">
					{config.aceitaRetirada && (
						<Badge variant="secondary" className="gap-1.5">
							<Package className="w-3 h-3" />
							Retirada
						</Badge>
					)}
					{config.aceitaEntrega && (
						<Badge variant="secondary" className="gap-1.5">
							<Truck className="w-3 h-3" />
							Entrega
						</Badge>
					)}
				</div>
			</div>
		</header>
	);
}
