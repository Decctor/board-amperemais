"use client";
import ErrorComponent from "@/components/Layouts/ErrorComponent";
import type { TUtilsSalesPromoCampaignConfig } from "@/schemas/utils";

type CampaignItem = TUtilsSalesPromoCampaignConfig["valor"]["dados"]["itens"][number];

export default function SalesCampaignTagsPage({ campaign, tagType }: { campaign: TUtilsSalesPromoCampaignConfig; tagType: string }) {
	const campaignData = campaign.valor.dados;
	const tagItems = tagType ? campaignData.itens.filter((item) => item.etiqueta === tagType) : campaignData.itens;

	// Determinar o tipo de etiqueta (A4 ou Grid)
	const isA4 = tagType === "PROMO-A4";
	const isGrid = tagType === "PROMO-GRID-1/16";

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

			<div className="bg-gray-100 min-h-screen">
				{/* Print Controls */}
				<div className="no-print fixed top-4 right-4 z-50 flex gap-2">
					<button type="button" onClick={() => window.print()} className="bg-blue-600 text-white px-4 py-2 rounded-lg shadow-lg hover:bg-blue-700">
						🖨️ Imprimir
					</button>
				</div>

				{isA4 && <TagPromoA4 items={tagItems} campaign={campaignData} />}
				{isGrid && <TagPromoGrid items={tagItems} campaign={campaignData} />}
				{!isA4 && !isGrid && <ErrorComponent msg="Tipo de etiqueta não especificado. Use tagType=PROMO-A4 ou tagType=PROMO-GRID-1/16" />}
			</div>
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
		// Versão compacta para grid 4x4
		return (
			<div className={`relative bg-white border-2 border-[#FFD700] rounded overflow-hidden flex flex-col ${className}`} style={{ fontSize: "0.25rem" }}>
				{/* Conteúdo */}
				<div className="bg-white p-1 flex flex-col items-center justify-center relative flex-1">
					{/* Badge de desconto */}
					<div className="absolute top-0.5 right-0.5 bg-[#E30613] text-white px-1 rounded-sm flex items-center gap-0.5 text-[0.7em]">
						<span className="font-bold">{discountPercent}% OFF</span>
						<span className="text-[1em]">🏷️</span>
					</div>

					{/* Preço antigo */}
					<div className="text-center mt-1">
						<p className="text-[0.6em] font-semibold text-gray-600">
							DE <span className="line-through">R$ {item.valorBase.toFixed(2).replace(".", ",")}</span>
						</p>
					</div>

					{/* Preço promocional */}
					<div className="text-center my-0.5">
						<div className="flex items-baseline justify-center">
							<span className="text-[1.2em] font-black">R$</span>
							<span className="text-[2.8em] font-black ml-0.5">{Math.floor(item.valorPromocional)}</span>
							<span className="text-[1.2em] font-black">,{(item.valorPromocional % 1).toFixed(2).split(".")[1]}</span>
						</div>
					</div>

					{/* Nome do produto */}
					<div className="text-center mt-0.5">
						<h3 className="text-[0.8em] font-black text-gray-900 leading-tight px-1 line-clamp-2">{item.produtoNome}</h3>
					</div>
				</div>

				{/* Footer azul */}
				<div className="bg-[#0066CC] text-white text-center py-0.5 px-1">
					<p className="text-[0.5em] font-semibold mb-0.5">
						OFERTA VÁLIDA DE {startDate} A {endDate}
					</p>
					<div className="flex items-center justify-center gap-0.5">
						<div className="text-[1em]">⚡</div>
						<div>
							<p className="text-[0.7em] font-bold">ampère</p>
							<p className="text-[0.4em] -mt-0.5">materiais elétricos</p>
						</div>
					</div>
				</div>
			</div>
		);
	}

	// Versão A4 inteira - Exatamente como a imagem
	return (
		<div className={`relative flex flex-col ${className}`} style={{ border: "16px solid #FFD700" }}>
			{/* Header amarelo com título */}
			<div className="bg-[#FFD700] text-center py-8 px-6" style={{ borderBottom: "4px dashed #FFFFFF" }}>
				<h1 className="text-[#0066CC] font-black text-5xl leading-tight tracking-wide uppercase">{campaign.titulo}</h1>
			</div>

			{/* Conteúdo central branco */}
			<div className="bg-white flex-1 flex flex-col items-center justify-center relative px-8 py-12">
				{/* Badge de desconto */}
				<div className="absolute top-8 right-8 bg-[#E30613] text-white px-6 py-3 rounded-lg flex items-center gap-2 shadow-xl">
					<span className="font-black text-3xl">{discountPercent}% OFF</span>
					<span className="text-4xl">🏷️</span>
				</div>

				{/* Preço antigo */}
				<div className="text-center mb-6">
					<p className="text-3xl font-bold text-gray-700">
						DE <span className="line-through">R$ {item.valorBase.toFixed(2).replace(".", ",")}</span>
					</p>
				</div>

				{/* Preço promocional - GRANDE */}
				<div className="text-center my-8">
					<div className="flex items-baseline justify-center">
						<span className="text-6xl font-black">R$</span>
						<span className="text-[180px] font-black leading-none mx-4">{Math.floor(item.valorPromocional)}</span>
						<span className="text-6xl font-black">,{(item.valorPromocional % 1).toFixed(2).split(".")[1]}</span>
					</div>
				</div>

				{/* Nome do produto */}
				<div className="text-center mt-8 max-w-3xl">
					<h2 className="text-4xl font-black text-gray-900 leading-tight">{item.produtoNome}</h2>
				</div>
			</div>

			{/* Footer azul */}
			<div className="bg-[#0066CC] text-white text-center py-6 px-8">
				<p className="text-xl font-bold mb-4 tracking-wide">
					OFERTA VÁLIDA DE {startDate} A {endDate}
				</p>
				<div className="flex items-center justify-center gap-3">
					<div className="text-5xl">⚡</div>
					<div className="text-left">
						<p className="text-3xl font-black tracking-wider">ampère</p>
						<p className="text-sm tracking-widest -mt-1">materiais elétricos</p>
					</div>
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
					key={`${item.produtoId}-${index}`}
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
		const pageKey = pageItems.map((item) => item.produtoId).join("-");
		pages.push({ items: pageItems, pageKey });
	}

	return (
		<div className="w-full">
			{pages.map(({ items: pageItems, pageKey }, pageIndex) => (
				<div key={pageKey} className="w-[210mm] h-[297mm] mx-auto p-2 page-break-after">
					<div className="grid grid-cols-4 grid-rows-4 gap-1 w-full h-full">
						{pageItems.map((item, itemIndex) => {
							const globalIndex = pageIndex * 16 + itemIndex;
							return (
								<div key={`${item.produtoId}-${globalIndex}`} className="w-full h-full">
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
