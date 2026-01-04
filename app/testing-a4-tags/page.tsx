"use client";

import LogoPrime from "@/utils/images/vertical-complete-logo.png";
import { BadgePercent } from "lucide-react";
import Image from "next/image";

// Helper to parse currency strings to numbers
function parseCurrency(val: string): number {
	// Remove "R$", dots, and trim
	// "R$ 578,00" -> "578,00" -> "578.00" -> 578.00
	const clean = val.replace(/[^0-9,]/g, "").replace(",", ".");
	return Number.parseFloat(clean);
}

// Helper to calculate discount percentage
function calculateDiscount(base: string | undefined, promo: string): number | null {
	if (!base) return null;

	const baseVal = parseCurrency(base);
	if (!baseVal || Number.isNaN(baseVal)) return null;

	let promoVal = 0;

	// Check for installments "4x R$126,50"
	const installmentMatch = promo.match(/(\d+)x\s*(.+)/i);
	if (installmentMatch) {
		const count = Number.parseInt(installmentMatch[1], 10);
		const value = parseCurrency(installmentMatch[2]);
		promoVal = count * value;
	} else if (promo.includes("%")) {
		return null; // Explicit percentage text, handle separately or visually
	} else {
		// Direct price "R$ 171,00" or simple "29,99"
		promoVal = parseCurrency(promo);
	}

	if (!promoVal || Number.isNaN(promoVal)) return null;

	// If promo is higher or equal to base, no discount (or negative)
	if (promoVal >= baseVal) return null;

	return Math.round(((baseVal - promoVal) / baseVal) * 100);
}

type TagItem = {
	code?: string;
	basePrice?: string; // "R$ 578,00"
	promoPrice: string; // "4x R$126,50", "20% DE DESCONTO", "R$171,00"
	description: string;
	calculatedDiscount?: number | null;
};

// Calculate discounts for static items
const ITEMS_RAW = [
	{
		code: "DDCEL55127BL03",
		basePrice: "R$ 578,00",
		promoPrice: "4x R$126,50",
		description: "DUCHA DUCALI ELETRONICA 5500W 127/220v BLACK",
	},
	{
		code: "7510059",
		basePrice: "R$ 553,00",
		promoPrice: "4x R$123,99",
		description: "CHUVEIRO ACQUA STORM ULTR BR/CR 127/5500",
	},
	{
		code: "",
		basePrice: "",
		promoPrice: "20% DE DESCONTO",
		description: "LINHA MILUZ",
	},
	{
		code: "",
		basePrice: "",
		promoPrice: "20% DE DESCONTO",
		description: "LINHA Habitat Black",
	},
	{
		code: "",
		basePrice: "",
		promoPrice: "20% DE DESCONTO",
		description: "SPOTs MEGALUX",
	},
	{
		code: "22.00.00.00.79",
		basePrice: "R$ 190,40",
		promoPrice: "R$ 171,00",
		description: "PAINEL LED SOBREPOR QUADRADO 45W 6500K",
	},
	{
		code: "3540500030",
		basePrice: "R$ 450,99",
		promoPrice: "4x R$ 112,80",
		description: "MOCHILA P/FERRAMENTAS BASE BORRACHA",
	},
	{
		code: "RL6K50GB",
		basePrice: "R$ 31,99",
		promoPrice: "29,99",
		description: "REFLETOR LED 50W 6500K BIVOLT - GLOW",
	},
	{
		code: "RL6K200GB",
		basePrice: "R$ 89,90",
		promoPrice: "85,99",
		description: "REFLETOR LED 200W 6500K IP65 BIVOLT - GLOW",
	},
	{
		code: "6001220230",
		basePrice: "R$ 841,83",
		promoPrice: "6x R$ 116,65",
		description: "ESMERILHADEIRA ANGULAR 7 2200W - 220V - VONDER",
	},
];

const ITEMS: TagItem[] = ITEMS_RAW.map((item) => ({
	...item,
	calculatedDiscount: calculateDiscount(item.basePrice, item.promoPrice),
}));

export default function TestingA4TagsPage() {
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
			<div className="bg-gray-100 min-h-screen p-8 print:p-0 print:bg-white">
				{/* Controls */}
				<div className="mb-8 print:hidden text-center no-print">
					<h1 className="text-2xl font-bold text-gray-800 mb-2">Gerador de Etiquetas A4 (Lista Personalizada)</h1>
					<button
						type="button"
						onClick={() => window.print()}
						className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition font-medium shadow-sm"
					>
						Imprimir PDF
					</button>
				</div>

				<div className="mx-auto w-[210mm]">
					{ITEMS.map((item, index) => (
						<div key={`${item.description}-${index}`} className="w-[210mm] h-[297mm] bg-white shadow-lg page-break-after mb-8 print:mb-0 relative">
							<A4PromoTag item={item} />
						</div>
					))}
				</div>
			</div>
		</>
	);
}

function A4PromoTag({ item }: { item: TagItem }) {
	// Determine formatting logic
	// Case 1: Percentage discount (e.g., "20% DE DESCONTO")
	const isPercentage = item.promoPrice.includes("%");

	// Case 2: Installments (e.g., "4x ...")
	const isInstallment = /\dx/i.test(item.promoPrice);

	return (
		<div className="relative bg-[#085D9E] overflow-hidden flex flex-col w-full h-full">
			{/* Top Yellow Section */}
			<div className="w-full grow flex flex-col gap-8 bg-[#FFCB00] rounded-bl-[4rem] rounded-br-[4rem] p-12 pb-16">
				<h1 className="text-center text-[3.5rem] text-[#085D9E] font-black leading-tight tracking-tight">SUPER OFERTAS DA SEMANA</h1>

				{/* White Content Card */}
				<div className="w-full grow bg-white flex flex-col justify-center items-center px-8 py-12 rounded-3xl relative shadow-sm">
					{/* Discount Badge */}
					{item.basePrice && !isPercentage && (
						<div className="absolute top-0 right-0 bg-red-600 text-white flex items-center gap-2 rounded-tr-3xl rounded-bl-3xl px-6 py-3 shadow-md">
							{item.calculatedDiscount ? (
								<>
									<span className="text-[2rem] font-black tracking-wide leading-none">{item.calculatedDiscount}%</span>
									<span className="text-[0.8rem] font-bold leading-tight -ml-1">OFF</span>
								</>
							) : (
								<span className="text-[1.5rem] font-bold tracking-wide">OFERTA</span>
							)}
							<BadgePercent className="w-8 h-8" />
						</div>
					)}

					{/* Case 1: Simple Discount Line (e.g., "20% DE DESCONTO") */}
					{isPercentage && (
						<div className="flex flex-col items-center justify-center grow gap-4">
							<span className="text-[6rem] font-black text-[#085D9E] text-center leading-[1.1]">{item.promoPrice}</span>
							<p className="text-[2rem] font-bold text-gray-500 mt-4 text-center">EM TODA A LINHA</p>
						</div>
					)}

					{/* Case 2: Product Pricing */}
					{!isPercentage && (
						<div className="flex flex-col items-center justify-center w-full grow">
							{/* Base Price (De ...) */}
							{item.basePrice && (
								<p className="text-[2rem] font-bold text-gray-500 mb-2">
									DE <span className="line-through text-gray-400 decoration-[3px]">{item.basePrice}</span>
								</p>
							)}

							{/* Promo Price */}
							<div className="flex flex-col items-center">
								{isInstallment ? (
									// Installment Layout
									<div className="flex flex-col items-center">
										<p className="text-[2rem] font-black text-[#085D9E] mb-[-10px]">POR APENAS</p>
										<span className="text-[7rem] font-black text-[#085D9E] leading-none tracking-tighter text-center">{item.promoPrice.replace(/ /g, "")}</span>
									</div>
								) : (
									// Standard Price Layout
									<div className="flex flex-col items-center">
										<p className="text-[2rem] font-black text-[#085D9E]">POR</p>
										<span className="text-[8rem] font-black text-[#085D9E] leading-none tracking-tighter">{item.promoPrice.replace("R$", "").trim()}</span>
									</div>
								)}
							</div>
						</div>
					)}

					{/* Product Name */}
					<h3 className="text-center text-[2.8rem] font-black text-black leading-[1.2] mt-8 uppercase w-full">{item.description}</h3>

					{/* Code */}
					{item.code && <p className="text-xl font-mono font-bold text-gray-400 mt-4">CÓD: {item.code}</p>}
				</div>
			</div>

			{/* Footer Blue Section */}
			<div className="bg-[#085D9E] text-center flex flex-col gap-6 py-10 px-12 items-center justify-center shrink-0">
				<p className="text-[1.2rem] font-semibold text-white/90 italic tracking-wider">OFERTAS VÁLIDAS ENQUANTO DURAREM OS ESTOQUES</p>
				<div className="relative w-64 h-32">
					<Image src={LogoPrime} alt="Logo Prime" fill={true} className="object-contain" />
				</div>
			</div>
		</div>
	);
}
