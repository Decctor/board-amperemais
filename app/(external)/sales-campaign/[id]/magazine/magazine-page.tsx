"use client";

import type { TUtilsSalesPromoCampaignConfig } from "@/schemas/utils";
import LogoPrime from "@/utils/images/vertical-complete-logo.png"; // Use the same logo reference
import { MapPin, Phone } from "lucide-react";
// We use a regular img tag for print consistency often, or Next Image.
// Given the reference used img with src, we'll stick to that or Next Image with objectFit.
import Image from "next/image";

type SalesCampaignMagazineProps = {
	campaign: TUtilsSalesPromoCampaignConfig;
	campaignItems: {
		id: string;
		imagemCapaUrl: string | null;
	}[];
};

export default function SalesCampaignMagazine({ campaign, campaignItems }: SalesCampaignMagazineProps) {
	const items = campaign.valor.dados.itens;
	const campaignTitle = campaign.valor.dados.titulo || "NOSSAS OFERTAS PARA SUA CASA !"; // Fallback if no description

	// Chunk items into groups of 12 (3 cols x 4 rows)
	const itemsPerPage = 9;
	const chunks = [];
	for (let i = 0; i < items.length; i += itemsPerPage) {
		chunks.push(items.slice(i, i + itemsPerPage));
	}

	return (
		<>
			<style jsx global>{`
				@media print {
					@page {
						size: A4;
						margin: 0;
					}
					body {
						margin: 0;
						print-color-adjust: exact;
						-webkit-print-color-adjust: exact;
					}
					.page-break-after {
						page-break-after: always;
                        box-shadow: none !important;
					}
					.page-break-after:last-child {
						page-break-after: auto;
					}
                    .no-print {
                        display: none !important;
                    }
				}
			`}</style>

			<div className="bg-gray-100 min-h-screen p-8 print:p-0 print:bg-white flex flex-col items-center">
				{/* Controls */}
				<div className="mb-8 print:hidden text-center no-print w-full max-w-[210mm]">
					<h1 className="text-2xl font-bold text-gray-800 mb-2">Gerador de Encarte (Magazine)</h1>
					<button
						type="button"
						onClick={() => window.print()}
						className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition font-medium shadow-sm"
					>
						Imprimir PDF
					</button>
				</div>

				{chunks.map((chunk, index) => (
					<MagazinePageWrapper key={index.toString()} items={chunk} campaignItems={campaignItems} campaignTitle={campaignTitle} />
				))}
			</div>
		</>
	);
}

function MagazinePageWrapper({
	items,
	campaignItems,
	campaignTitle,
}: {
	items: TUtilsSalesPromoCampaignConfig["valor"]["dados"]["itens"];
	campaignItems: { id: string; imagemCapaUrl: string | null }[];
	campaignTitle: string;
}) {
	return (
		<div className="w-[210mm] h-[297mm] bg-[#085D9E] flex flex-col page-break-after relative overflow-hidden text-white shadow-2xl print:shadow-none mb-8 print:mb-0">
			{/* Header */}
			<header className="px-8 py-4 flex items-center justify-between">
				{/* Logo */}
				<div className="w-28 h-14 relative">
					<Image src={LogoPrime} alt="Ampere" fill className="object-contain" />
				</div>

				{/* Contact Info */}
				<div className="flex flex-col items-end gap-0.5 text-xs sm:text-xs font-medium">
					<div className="flex items-center gap-1.5">
						<MapPin className="w-3.5 h-3.5" />
						<span>R. Vinte e Seis, 102 - Centro, Ituiutaba</span>
					</div>
					<div className="flex items-center gap-1.5">
						<Phone className="w-3.5 h-3.5 fill-white" />
						<span>(34) 3112-0907</span>
					</div>
				</div>
			</header>

			{/* Campaign Title */}
			<div className="w-full text-center py-1 px-4 mb-2">
				<h1 className="text-[1.8rem] font-black uppercase tracking-wide leading-tight line-clamp-2">{campaignTitle}</h1>
			</div>

			{/* Grid Content */}
			<div className="grid grid-cols-3 grid-rows-3 gap-3 w-full grow px-6 pb-6">
				{items.map((item, idx) => (
					<MagazineCard key={`${item.titulo}-${idx}`} item={item} campaignItems={campaignItems} />
				))}
			</div>

			{/* Footer Stripe (Optional, similar to image bottom) */}
			{/* Image shows a clean blue bottom, effectively the page bg. */}
		</div>
	);
}

function MagazineCard({
	item,
	campaignItems,
}: {
	item: TUtilsSalesPromoCampaignConfig["valor"]["dados"]["itens"][number];
	campaignItems: { id: string; imagemCapaUrl: string | null }[];
}) {
	// Logic to find image
	const images = item.produtos
		.map((p) => {
			const coverImageUrl = campaignItems.find((c) => c.id === p.id)?.imagemCapaUrl;
			if (!coverImageUrl) return null;
			return coverImageUrl;
		})
		.filter((i) => !!i) as string[];

	const displayImage = item.imagemCapaUrl ? item.imagemCapaUrl : images.length > 0 ? images[0] : null;

	// Price Logic
	const hasBasePrice = !!item.valorBase;
	const promoValue = item.valorPromocional;

	// Formatting helper
	const formatMoney = (val: number | null | undefined) =>
		val ? val.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "0,00";
	const splitMoney = (val: number | null | undefined) => {
		const str = formatMoney(val);
		const [int, dec] = str.split(",");
		return { int, dec };
	};

	const promoParts = splitMoney(promoValue ?? 0);

	return (
		<div className="bg-white rounded-[1.2rem] p-2 flex flex-col items-center justify-between shadow-md relative overflow-hidden h-full">
			{/* Image Area */}
			<div className="w-full h-[40%] relative mt-1 flex items-center justify-center">
				{displayImage ? (
					<Image src={displayImage} alt={item.titulo} fill className="object-contain" />
				) : (
					<div className="w-full h-full bg-gray-100 flex items-center justify-center rounded-lg text-gray-300">
						<span className="text-[0.5rem] font-bold">SEM IMAGEM</span>
					</div>
				)}
			</div>

			{/* Price Area */}
			<div className="flex flex-col items-center justify-center gap-0 mb-1 mt-auto">
				{hasBasePrice && <span className="text-[0.6rem] font-extrabold text-[#FBBF24] line-through decoration">DE R$ {formatMoney(item.valorBase)}</span>}

				<div className="flex items-baseline text-[#FFCB00] leading-none mb-1">
					<span className="text-sm font-black mr-1">R$</span>
					<span className="text-[2.2rem] font-black tracking-tighter">{promoParts.int}</span>
					<span className="text-lg font-black">,{promoParts.dec}</span>
				</div>
			</div>

			{/* Title */}
			<div className="w-full px-1 text-center flex items-center justify-center">
				<h3 className="text-[0.6rem] sm:text-[0.65rem] font-black uppercase text-black leading-tight line-clamp-3">{item.titulo}</h3>
			</div>
		</div>
	);
}
