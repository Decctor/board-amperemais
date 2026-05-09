"use client";

import { useOrgColors } from "@/components/Providers/OrgColorsProvider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatLocation, formatToPhone } from "@/lib/formatting";
import { ArrowLeft, ChevronRight, Heart, MapPin, Package, Phone, Search, Truck } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useShop } from "./ShopProvider";
import { FaWhatsapp } from "react-icons/fa";
export default function ShopHeader() {
	const { catalog } = useShop();
	const { organization, shopSettings } = catalog;
	const config = shopSettings.configuracoes;
	const { colors, getPrimaryGradientStyle } = useOrgColors();
	const primaryGradientStyle = getPrimaryGradientStyle();

	const showCoverImage = Boolean(config.headerCoverUrl && config.headerCoverTipo === "IMAGEM");

	const formattedLocation = formatLocation({
		location: {
			cep: organization.localizacaoCep,
			uf: organization.localizacaoEstado ?? "",
			cidade: organization.localizacaoCidade ?? "",
			bairro: organization.localizacaoBairro,
			endereco: organization.localizacaoLogradouro,
			numeroOuIdentificador: organization.localizacaoNumero,
			complemento: organization.localizacaoComplemento,
		},
		includeCity: true,
		includeUf: true,
		includeCEP: true,
	});

	const phoneDisplay = organization.telefone ? formatToPhone(organization.telefone) : null;

	const modalityParts: string[] = [];
	if (config.aceitaRetirada) modalityParts.push("Retirada");
	if (config.aceitaEntrega) modalityParts.push("Entrega");
	const modalityLine = modalityParts.join(" • ");

	const shopModeLabel = shopSettings.modo === "CARDAPIO" ? "Cardápio" : "Catálogo";

	async function handleShareStore() {
		const url = typeof window !== "undefined" ? window.location.href : "";
		try {
			if (navigator.share) {
				try {
					await navigator.share({ title: organization.nome, url });
				} catch (e) {
					if ((e as DOMException)?.name === "AbortError") return;
					await navigator.clipboard.writeText(url);
					toast.success("Link da loja copiado.");
				}
				return;
			}
			await navigator.clipboard.writeText(url);
			toast.success("Link da loja copiado.");
		} catch {
			toast.error("Não foi possível copiar o link.");
		}
	}

	return (
		<header className="w-full flex flex-col bg-background relative pb-2">
			{/* Hero: cover image or brand gradient (same height; video uses gradient) */}
			<div className={"relative w-full h-[11.5rem] sm:h-56 overflow-hidden"}>
				{showCoverImage && config.headerCoverUrl ? (
					<>
						<Image src={config.headerCoverUrl} alt={organization.nome} fill className="object-cover" priority sizes="100vw" />
						<div className="absolute inset-0 bg-linear-to-b from-black/25 via-transparent to-black/50" />
					</>
				) : (
					<div className="absolute inset-0" style={primaryGradientStyle}>
						<div
							className="absolute inset-0 opacity-[0.12]"
							style={{
								backgroundImage: `radial-gradient(circle, ${colors.primaryForeground} 1px, transparent 1px)`,
								backgroundSize: "18px 18px",
							}}
						/>
						<div className="absolute inset-0 bg-linear-to-b from-transparent via-transparent to-black/35" />
					</div>
				)}
			</div>

			{/* Overlapping card */}
			<div className="relative z-10 -mt-12 sm:-mt-14 px-3 sm:px-4">
				<div className="relative rounded-t-[1.75rem] rounded-b-2xl bg-card text-card-foreground shadow-lg border border-border/60 pt-12 sm:pt-14 pb-4 px-4">
					{/* Logo: half on hero, half on card */}
					<div className="absolute left-1/2 top-0 -translate-x-1/2 -translate-y-1/2">
						{organization.logoUrl ? (
							<div className="relative size-18 sm:size-20 rounded-full overflow-hidden border-[3px] border-background bg-background shadow-lg ring-1 ring-black/5">
								<Image src={organization.logoUrl} alt={organization.nome} fill className="object-cover" sizes="80px" />
							</div>
						) : (
							<div className="size-18 sm:size-20 rounded-full border-[3px] border-background bg-brand text-brand-foreground shadow-lg flex items-center justify-center ring-1 ring-black/5">
								<span className="text-2xl font-black">{organization.nome.charAt(0).toUpperCase()}</span>
							</div>
						)}
					</div>

					<div className="flex items-start justify-center gap-2 pt-1">
						<div className="flex-1 min-w-0 text-center">
							<div className="inline-flex items-center justify-center gap-1 max-w-full">
								<h1 className="text-lg sm:text-xl font-black text-foreground leading-tight truncate">{organization.nome}</h1>
							</div>
						</div>
					</div>

					<div className="my-4 h-px bg-border" />

					<ShopHeaderLocationPhoneInformations formattedPhone={phoneDisplay} formattedLocation={formattedLocation} />
					<ShopHeaderModalityInformations acceptsDelivery={config.aceitaEntrega} acceptsPickup={config.aceitaRetirada} />

					<p className="mt-3 text-xs text-muted-foreground text-center leading-relaxed px-1">Valores e formas de pagamento ao finalizar no carrinho.</p>
				</div>
			</div>
		</header>
	);
}

type ShopHeaderLocationPhoneInformationsProps = {
	formattedPhone: string | null;
	formattedLocation: string | null;
};
function ShopHeaderLocationPhoneInformations({ formattedPhone, formattedLocation }: ShopHeaderLocationPhoneInformationsProps) {
	if (!formattedPhone && !formattedLocation) return null;
	return (
		<div className="flex flex-col gap-2.5">
			{formattedPhone ? (
				<a href={`https://wa.me/${formattedPhone?.replace(/\D/g, "")}`} className="flex items-center gap-3 text-sm">
					<div className="flex w-9 h-9 min-w-9 min-h-9 items-center justify-center rounded-full bg-brand text-brand-foreground">
						<FaWhatsapp className="size-4" />
					</div>
					<span className="tracking-tight text-xs sm:text-sm font-medium">{formattedPhone}</span>
				</a>
			) : null}
			{formattedLocation ? (
				<div className="flex items-center gap-3 text-sm">
					<div className="flex w-9 h-9 min-w-9 min-h-9 items-center justify-center rounded-full bg-brand text-brand-foreground">
						<MapPin className="size-4" />
					</div>
					<p className="tracking-tight text-xs sm:text-sm font-medium">{formattedLocation}</p>
				</div>
			) : null}
		</div>
	);
}

type ShopHeaderModalityInformationsProps = {
	acceptsDelivery: boolean;
	acceptsPickup: boolean;
};
function ShopHeaderModalityInformations({ acceptsDelivery, acceptsPickup }: ShopHeaderModalityInformationsProps) {
	if (!acceptsDelivery && !acceptsPickup) return null;
	return (
		<div className="mt-4 flex flex-wrap items-center gap-2">
			{acceptsPickup && (
				<Badge variant={null} className="gap-1 rounded-full bg-brand-secondary px-3 py-1 font-semibold text-brand-secondary-foreground">
					<Package className="w-3.5 h-3.5" />
					ACEITA RETIRADA
				</Badge>
			)}
			{acceptsDelivery && (
				<Badge variant={null} className="gap-1 rounded-full bg-brand-secondary px-3 py-1 font-semibold text-brand-secondary-foreground">
					<Truck className="w-3.5 h-3.5" />
					ACEITA ENTREGA
				</Badge>
			)}
		</div>
	);
}
