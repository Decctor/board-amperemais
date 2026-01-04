"use client";
import ErrorComponent from "@/components/Layouts/ErrorComponent";
import type { TUtilsSalesPromoCampaignConfig } from "@/schemas/utils";
import LogoPrime from "@/utils/images/vertical-complete-logo.png";
import { BadgePercent } from "lucide-react";
import Image from "next/image";
type CampaignItem = TUtilsSalesPromoCampaignConfig["valor"]["dados"]["itens"][number];

export default function SalesCampaignTagsPage({ campaign, tagType }: { campaign: TUtilsSalesPromoCampaignConfig; tagType: string }) {
	const campaignData = campaign.valor.dados;
	const tagItems = tagType ? campaignData.itens.filter((item) => item.etiqueta === tagType) : campaignData.itens;

	// Determinar o tipo de etiqueta (A4 ou Grid)
	const isA4 = tagType === "PROMO-A4";
	const isGrid = tagType === "PROMO-GRID-1/16";

	console.log({
		"IS A4": isA4,
		"IS GRID": isGrid,
	});
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
						padding: 0;
					}
					.no-print {
						display: none !important;
					}
				}
			`}</style>

			{isA4 && <TagPromoA4 items={tagItems} campaign={campaignData} />}
			{isGrid && <TagPromoGrid items={tagItems} campaign={campaignData} />}
			{!isA4 && !isGrid && <ErrorComponent msg="Tipo de etiqueta não especificado. Use tagType=PROMO-A4 ou tagType=PROMO-GRID-1/16" />}
		</>
	);
}

// Componente individual de etiqueta
function PromoTag({
	item,
	campaign,
	className = "",
	isCompact = false,
}: {
	item: CampaignItem;
	campaign: TUtilsSalesPromoCampaignConfig["valor"]["dados"];
	className?: string;
	isCompact?: boolean;
}) {
	const discountPercent = Math.round(((item.valorBase - item.valorPromocional) / item.valorBase) * 100);
	const startDate = new Date(campaign.periodoEstatistico.inicio).toLocaleDateString("pt-BR");
	const endDate = new Date(campaign.periodoEstatistico.fim).toLocaleDateString("pt-BR");

	if (isCompact) {
		return (
			<div className={`relative bg-[#085D9E] overflow-hidden flex flex-col ${className}`}>
				<div className="w-full grow flex flex-col gap-2 bg-[#FFCB00] rounded-bl-2xl rounded-br-2xl p-2">
					<h1 className="text-center text-[0.7rem] text-[#085D9E] font-black leading-tight">SUPER OFERTAS DA SEMANA</h1>
					<div className="w-full grow bg-white flex flex-col gap-2 justify-end items-center p-2 rounded-lg relative">
						<div className="absolute top-0 right-0 bg-red-500 text-white flex items-center gap-1 rounded-tr-lg px-2 py-0.5">
							<span className="text-[0.6rem] font-semibold">{discountPercent}% OFF</span>
							<BadgePercent className="w-3 h-3 min-w-3 min-h-3" />
						</div>
						<div className="flex flex-col gap-0.5 items-center justify-center w-full mt-3">
							{/* Preço antigo */}
							<p className="text-[0.5rem] font-semibold text-black/80">
								DE <span className="line-through">R$ {item.valorBase.toFixed(2).replace(".", ",")}</span>
							</p>
							{/* Preço promocional */}
							<div className="flex items-baseline justify-center">
								<span className="text-lg font-black leading-none">R$</span>
								<span className="text-5xl font-black ml-0.5 leading-none">{Math.floor(item.valorPromocional)}</span>
								<span className="text-lg font-black leading-none">,{(item.valorPromocional % 1).toFixed(2).split(".")[1]}</span>
							</div>
						</div>
						{/* Nome do produto */}
						<h3 className="text-center text-[0.8rem] font-black text-black leading-tight line-clamp-2">{item.titulo}</h3>
					</div>
				</div>
				{/* Footer azul */}
				<div className="bg-[#085D9E] text-center flex flex-col gap-1 py-1.5 px-2 items-center justify-center">
					<p className="text-[0.4rem] font-semibold text-white italic leading-tight">
						OFERTA VÁLIDA DE {startDate} A {endDate}
					</p>
					<div className="relative w-16 h-8">
						<Image src={LogoPrime} alt="Logo Prime" fill={true} className="object-contain" />
					</div>
				</div>
			</div>
		);
	}
	// Versão A4 inteira - Exatamente como a imagem
	return (
		<div className={`relative bg-[#085D9E] overflow-hidden flex flex-col ${className}`}>
			<div className="w-full grow flex flex-col gap-16 bg-[#FFCB00] rounded-bl-4xl rounded-br-4xl py-12 px-12">
				<h1 className="text-center text-[3rem] text-[#085D9E] font-black leading-tight">SUPER OFERTAS DA SEMANA</h1>
				<div className="w-full grow bg-white flex flex-col gap-10 justify-end items-center px-12 py-16 rounded-xl relative">
					<div className="absolute top-0 right-0 bg-red-500 text-white flex items-center gap-1.5 rounded-tr-xl px-4 py-2">
						<span className="text-[2rem] font-semibold">{discountPercent}% OFF</span>
						<BadgePercent className="w-8 h-8 min-w-8 min-h-8" />
					</div>
					<div className="flex flex-col gap-1 items-center justify-center w-full">
						{/* Preço antigo */}
						<p className="text-xl font-semibold text-black/80">
							DE <span className="line-through">R$ {item.valorBase.toFixed(2).replace(".", ",")}</span>
						</p>
						{/* Preço promocional */}
						<div className="flex items-baseline justify-center">
							<span className="text-[2.5rem] font-black leading-none">R$</span>
							<span className="text-[7.5rem] font-black ml-0.5 leading-none">{Math.floor(item.valorPromocional)}</span>
							<span className="text-[2.5rem] font-black leading-none">,{(item.valorPromocional % 1).toFixed(2).split(".")[1]}</span>
						</div>
					</div>
					{/* Nome do produto */}
					<h3 className="text-center text-[2.5rem] font-black text-black leading-tight">{item.titulo}</h3>
				</div>
			</div>
			{/* Footer azul */}
			<div className="bg-[#085D9E] text-center flex flex-col gap-12 py-12 px-12 items-center justify-center">
				<p className="text-xs font-semibold text-white italic">
					OFERTA VÁLIDA DE {startDate} A {endDate}
				</p>
				<div className="relative w-46 h-32">
					<Image src={LogoPrime} alt="Logo Prime" fill={true} />
				</div>
			</div>
		</div>
	);
}

// Formato A4 inteira (1 etiqueta por página)
function TagPromoA4({ items, campaign }: { items: CampaignItem[]; campaign: TUtilsSalesPromoCampaignConfig["valor"]["dados"] }) {
	return (
		<>
			{items.map((item, index) => (
				<div
					key={`${item.titulo}-${index}`}
					className="w-[210mm] h-[297mm] mx-auto bg-white shadow-lg page-break-after"
					style={{ pageBreakAfter: "always" }}
				>
					<PromoTag item={item} campaign={campaign} className="w-full h-full" />
				</div>
			))}
			<style jsx>{`
				@media print {
					.page-break-after {
						page-break-after: always;
						box-shadow: none;
					}
					.page-break-after:last-child {
						page-break-after: auto;
					}
				}
			`}</style>
		</>
	);
}

// Formato Grid 4x4 (16 etiquetas por página)
function TagPromoGrid({ items, campaign }: { items: CampaignItem[]; campaign: TUtilsSalesPromoCampaignConfig["valor"]["dados"] }) {
	// Dividir itens em páginas de 16
	const pages: Array<{ items: CampaignItem[]; pageKey: string }> = [];
	for (let i = 0; i < items.length; i += 16) {
		const pageItems = items.slice(i, i + 16);
		const pageKey = pageItems.map((item) => item.titulo).join("-");
		pages.push({ items: pageItems, pageKey });
	}

	console.log({
		PAGES: pages,
	});
	return (
		<div className="w-full">
			{pages.map(({ items: pageItems, pageKey }, pageIndex) => (
				<div key={pageKey} className="w-[210mm] h-[297mm] mx-auto p-2 page-break-after">
					<div className="grid grid-cols-4 grid-rows-4 gap-1 w-full h-full">
						{pageItems.map((item, itemIndex) => {
							const globalIndex = pageIndex * 16 + itemIndex;
							return (
								<div key={`${item.titulo}-${globalIndex}`} className="w-full h-full">
									<PromoTag item={item} campaign={campaign} className="w-full h-full" isCompact />
								</div>
							);
						})}
					</div>
				</div>
			))}
			<style jsx>{`
				@media print {
					.page-break-after {
						page-break-after: always;
					}
					.page-break-after:last-child {
						page-break-after: auto;
					}
				}
			`}</style>
		</div>
	);
}
