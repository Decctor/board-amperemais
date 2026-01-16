"use client";

import LogoPrime from "@/utils/images/vertical-complete-logo.png";
import Image from "next/image";
import { useState } from "react";

type TagSize = "A6" | "A7" | "A8";

const ITEMS = [
	{
		codigo: "000000000013295559",
		nome: "PLACA+SUPORTE 4X4 CEGA COMPOSE - WEG",
		preco: 8.99,
	},
	{
		codigo: "615039VM",
		nome: "MODULO TOMADA 10A VERMELHA - (PIAL Plus+)",
		preco: 23.25,
	},
	{
		codigo: "612124NT",
		nome: "SUPORTE 4X4 - PIAL Plus+",
		preco: 3.99,
	},
	{
		codigo: "618516PT",
		nome: "PLACA 6 POSTOS 4X4 PRETA PIAL Plus .",
		preco: 20.59,
	},
	{
		codigo: "13295537",
		nome: "PLACA E SUPORTE 4X2 2 POSTOS - WEG",
		preco: 5.09,
	},
	{
		codigo: "611037PT",
		nome: "MODULO VARIADOR DIGITAL/ROTAT LED/FLC BIVOLT 1M PRETA - PIAL Plus+",
		preco: 106.4,
	},
	{
		codigo: "000000000013208266",
		nome: "SUPORTE PLASTICO 4X4 COMPOSE CINZA - WEG",
		preco: 3.55,
	},
	{
		codigo: "618503PT",
		nome: "PLACA 3 POSTOS 4X2 PRETA - PIAL Plus+LEGRAND",
		preco: 7.79,
	},
	{
		codigo: "13295562",
		nome: "PLACA+SUPORTE 4X4 4 POSTOS DISTANCIADAS COMPOSE - WEG",
		preco: 8.99,
	},
	{
		codigo: "618502CZ",
		nome: "PLACA 2 POSTOS JUNTOS 4X2 CINZA - PIAL Plus+ .",
		preco: 7.79,
	},
	{
		codigo: "57115005",
		nome: "MODULO INTERRUPTOR BIPOLAR PARALELO - (TRAMONTINA",
		preco: 22.3,
	},
	{
		codigo: "56121153",
		nome: "TAMPA P/CAIXA DE PISO EM ALUMINIO 4x4 - 2 POSTO",
		preco: 44.0,
	},
	{
		codigo: "57215005",
		nome: "MODULO INTERRUPTOR BIPOLAR PARALELO GRAFITE - TRAMONTINA",
		preco: 22.3,
	},
	{
		codigo: "618511BC",
		nome: "PLACA 2 POSTOS 4X4 BRANCO - (PIAL Plus+) .LEGRAND",
		preco: 20.59,
	},
	{
		codigo: "612008CZ",
		nome: "MODULO INTERRUPTOR BIPOLAR PARALELO CINZA - (PIAL Plus+)",
		preco: 94.2,
	},
	{
		codigo: "611037PT",
		nome: "MODULO VARIADOR DIGITAL/ROTAT LED/FLC BIVOLT 1M PRETA - PIAL Plus+",
		preco: 106.4,
	},
	{
		codigo: "618511CZ",
		nome: "PLACA 2 POSTOS 4X4 CINZA - (PIAL Plus+) .",
		preco: 20.59,
	},
	{
		codigo: "57303001",
		nome: "CAIXA DE SOBREPOR+TAMPA 1 POSTO P/CANALETA LIZFLEX- BRANCO . TRAMONTINA",
		preco: 5.99,
	},
	{
		codigo: "57215030",
		nome: "MODULO TOMADA 10A GRAFITE - TRAMONTINA",
		preco: 7.29,
	},
	{
		codigo: "618506BC",
		nome: "PLACA 2 POSTOS SEPARADOS 4X2 BRANCO - PIAL Plus+ .LEGRAND",
		preco: 7.79,
	},
	{
		codigo: "57106022",
		nome: "PLACA + SUPORTE 4X4 - 1 FURO 9,5MM -TRAMONTINA",
		preco: 10.95,
	},
	{
		codigo: "PA014621",
		nome: "ADAPTADOR FEMEA PRETO 2P+T 10 MARGIRIUS",
		preco: 8.5,
	},
	{
		codigo: "57115050",
		nome: "Módulo Tomada p/ Telefone 4P+RJ11 - Tramontina",
		preco: 11.4,
	},
	{
		codigo: "AN0603",
		nome: "ANUNCIADOR DE PRESENCA DE PLASTICO 5M BRANCO",
		preco: 64.67,
	},
	{
		codigo: "57106031",
		nome: 'PLACA + SUPORTE 4X4" - 6 POSTOS - (TRAMONTINA)',
		preco: 9.5,
	},
	{
		codigo: "57106006",
		nome: "PLACA + SUPORTE 4X2 - 2 POSTOS SEPARADOS - (TRAMONTINA)",
		preco: 4.85,
	},
	{
		codigo: "57170102",
		nome: "PLACA + TOMADA 2P+T 20A BRANCO P/MOVEIS - TRAMONTINA",
		preco: 10.3,
	},
	{
		codigo: "PA017679",
		nome: "PULSADOR SIMPLES 1NA VISOR AZUL .MARGIRIUS",
		preco: 26.14,
	},
	{
		codigo: "57115030",
		nome: "MODULO TRAMONTINA - TOMADA 10A BRANCO",
		preco: 6.0,
	},
	{
		codigo: "57106201",
		nome: "PLACA + SUPORTE 4X2 - CEGA - (TRAMONTINA)",
		preco: 4.85,
	},
	{
		codigo: "7589075",
		nome: "RESISTENCIA 127/5500 ELETRONICA ADV/TOP .LORENZETTI",
		preco: 57.39,
	},
	{
		codigo: "109046",
		nome: "RELE FOTO ELETRICO MODELO - QUALITRONIX",
		preco: 25.06,
	},
	{
		codigo: "9405000154",
		nome: "RESISTENCIA GORDUCHA/MAX/CRESCIMENTO 4T 5450W 127V .ZAGONEL",
		preco: 31.5,
	},
	{
		codigo: "51351230",
		nome: "CAIXA PADRAO 4X2 P/CANALETA 20/40/50MM .FAME",
		preco: 15.72,
	},
	{
		codigo: "07109424",
		nome: "INTERRUPTOR 1 TECLA PULSADORA CAMPAINHA -EXTERNA FAME",
		preco: 15.15,
	},
	{
		codigo: "PA002615",
		nome: "CHAVE BOIA 2012 SUP. E INF. - 1.2M CH. BOIA UNIP. 15a",
		preco: 44.69,
	},
	{
		codigo: "07409360",
		nome: "PLACA C/ FURO - (EXTERNA FAME) .",
		preco: 3.5,
	},
	{
		codigo: "077522",
		nome: "SENSOR PRESENCA PRETO SOBREPOR - QUALITRONIX",
		preco: 55.9,
	},
	{
		codigo: "010189",
		nome: "TIMER ANALOGICO GMT03A - 110/220V 60 HZ - SIBRATEC",
		preco: 85.56,
	},
	{
		codigo: "7589157",
		nome: "RESISTENCIA L.SHOW ULT 220/7500 . LORENZETTI",
		preco: 48.55,
	},
	{
		codigo: "7589048",
		nome: "RESISTENCIA 220V 6400W ADVANCED/TURBO .LORENZETTI",
		preco: 52.29,
	},
	{
		codigo: "7510155",
		nome: "CHUVEIRO LOREN SHOWER ELETRO 127V/5500W .LORENZETTI",
		preco: 149.9,
	},
	{
		codigo: "7589101",
		nome: "RESISTENCIA 127/5500 DUO SHOW/FUT .LORENZETTI",
		preco: 53.1,
	},
	{
		codigo: "3008-E40",
		nome: "CANO P/ CHUVEIRO TAM 37CM - KRONA",
		preco: 15.5,
	},
	{
		codigo: "DMOEL75220BR03",
		nome: "DUCHA MOMENT ELETRONICA 7500W 220V BRANCO - ZAGONEL",
		preco: 141.79,
	},
];

export default function TestingPage() {
	const [tagSize, setTagSize] = useState<TagSize>("A7");

	// Determines items per page based on type
	const itemsPerPage = tagSize === "A6" ? 4 : tagSize === "A7" ? 8 : 16;

	// Grid class config
	const gridRowsMap = {
		A6: "grid-rows-2", // 2x2
		A7: "grid-rows-4", // 2x4
		A8: "grid-rows-4", // 4x4
	};
	const gridColsMap = {
		A6: "grid-cols-2",
		A7: "grid-cols-2",
		A8: "grid-cols-4",
	};

	// Chunk items
	const chunks = [];
	for (let i = 0; i < ITEMS.length; i += itemsPerPage) {
		chunks.push(ITEMS.slice(i, i + itemsPerPage));
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
					.page-break {
						page-break-after: always;
					}
				}
			`}</style>

			<div className="bg-gray-100 min-h-screen p-8 print:p-0 print:bg-white">
				<div className="max-w-[210mm] mx-auto print:max-w-none print:mx-0">
					{/* Header + Controls */}
					<div className="mb-8 print:hidden flex flex-col items-center gap-4">
						<div className="text-center">
							<h1 className="text-2xl font-bold text-gray-800 mb-1">Gerador de Etiquetas de Preço</h1>
							<p className="text-gray-600">Selecione o tamanho para pré-visualização e impressão</p>
						</div>

						<div className="flex gap-2">
							{(["A6", "A7", "A8"] as TagSize[]).map((size) => (
								<button
									key={size}
									type="button"
									onClick={() => setTagSize(size)}
									className={`px-6 py-2 rounded-lg font-bold transition shadow-sm ${
										tagSize === size ? "bg-[#085D9E] text-white ring-2 ring-[#085D9E] ring-offset-2" : "bg-white text-gray-600 hover:bg-gray-50"
									}`}
								>
									{size}
								</button>
							))}
						</div>

						<button
							type="button"
							onClick={() => window.print()}
							className="bg-[#FFCB00] text-[#085D9E] px-8 py-3 rounded-full hover:bg-yellow-400 transition font-black shadow-md flex items-center gap-2"
						>
							<span>IMPRIMIR / SALVAR PDF</span>
						</button>
					</div>

					{/* Pages */}
					{chunks.map((chunk, i) => (
						<div
							key={i.toString()}
							className={`w-[210mm] h-[297mm] bg-white grid ${gridColsMap[tagSize]} ${gridRowsMap[tagSize]} shadow-xl print:shadow-none mb-8 print:mb-0 page-break mx-auto`}
						>
							{chunk.map((item, index) => {
								const key = `${item.codigo}-${index}`;
								if (tagSize === "A6") return <TagItemA6 key={key} item={item} />;
								if (tagSize === "A7") return <TagItemA7 key={key} item={item} />;
								if (tagSize === "A8") return <TagItemA8 key={key} item={item} />;
								return null;
							})}
						</div>
					))}
				</div>
			</div>
		</>
	);
}

// ==========================================
// A6 COMPONENT (105mm x 148.5mm cell)
// Content Rotated 90deg to be Landscape
// ==========================================
function TagItemA6({ item }: { item: (typeof ITEMS)[0] }) {
	return (
		<div className="w-full h-full border border-gray-100/50 relative overflow-hidden flex items-center justify-center">
			<div className="w-[148.5mm] h-[105mm] absolute flex flex-col bg-white overflow-hidden" style={{ transform: "rotate(90deg)" }}>
				{/* Top Yellow Bar */}
				<div className="h-5 w-full bg-[#FFCB00] shrink-0" />

				<div className="flex-1 px-8 py-6 flex flex-col justify-between relative">
					{/* Content */}
					<div className="flex flex-col gap-3">
						<h2 className="text-[1.7rem] leading-tight font-black text-[#085D9E] uppercase line-clamp-2 tracking-tight">{item.nome}</h2>
						<div className="flex items-center gap-2">
							<span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Código</span>
							<span className="text-sm font-mono font-medium text-gray-600">{item.codigo}</span>
						</div>
					</div>

					{/* Price Section */}
					<div className="flex items-end justify-between mt-auto pt-4 border-t border-dashed border-gray-200">
						<div className="flex flex-col">
							<span className="text-[0.65rem] font-bold text-gray-400 uppercase tracking-wider mb-[-2px]">Preço Unitário</span>
							<div className="flex items-baseline text-[#085D9E]">
								<span className="text-3xl font-bold mr-1">R$</span>
								<span className="text-[5.5rem] font-black leading-none tracking-tighter tabular-nums">{Math.floor(item.preco)}</span>
								<div className="flex flex-col justify-start ml-1 h-[4.5rem]">
									<span className="text-3xl font-black leading-none">,{(item.preco % 1).toFixed(2).split(".")[1]}</span>
								</div>
							</div>
						</div>

						{/* Logo */}
						<div className="w-20 h-20 opacity-100 mb-2 relative shrink-0 bg-[#085D9E] rounded-full shadow-sm border-2 border-white/10">
							<Image src={LogoPrime} alt="Ampere" fill className="object-contain p-3" />
						</div>
					</div>
				</div>

				{/* Bottom Blue Bar */}
				<div className="h-4 w-full bg-[#085D9E] shrink-0" />
			</div>
		</div>
	);
}

// ==========================================
// A7 COMPONENT (105mm x 74.25mm cell)
// Landscape - No Rotation
// ==========================================
function TagItemA7({ item }: { item: (typeof ITEMS)[0] }) {
	return (
		<div className="w-full h-full border border-gray-100/50 relative overflow-hidden flex items-center justify-center">
			<div className="w-full h-full flex flex-col bg-white overflow-hidden">
				{/* Top Yellow Bar */}
				<div className="h-3.5 w-full bg-[#FFCB00] shrink-0" />

				<div className="flex-1 px-5 py-3 flex flex-col justify-between relative">
					{/* Content */}
					<div className="flex flex-col gap-1.5">
						<h2 className="text-[1.1rem] leading-[1.1] font-black text-[#085D9E] uppercase line-clamp-2 tracking-tight">{item.nome}</h2>
						<div className="flex items-center gap-2">
							<span className="text-[0.6rem] font-bold text-gray-400 uppercase tracking-widest">Código</span>
							<span className="text-xs font-mono font-medium text-gray-600">{item.codigo}</span>
						</div>
					</div>

					{/* Price Section */}
					<div className="flex items-end justify-between mt-auto pt-2 border-t border-dashed border-gray-200">
						<div className="flex flex-col">
							<span className="text-[0.5rem] font-bold text-gray-400 uppercase tracking-wider mb-[-2px]">Preço Unitário</span>
							<div className="flex items-baseline text-[#085D9E]">
								<span className="text-xl font-bold mr-0.5">R$</span>
								<span className="text-[3.5rem] font-black leading-none tracking-tighter tabular-nums">{Math.floor(item.preco)}</span>
								<div className="flex flex-col justify-start ml-0.5 h-[2.8rem]">
									<span className="text-xl font-black leading-none">,{(item.preco % 1).toFixed(2).split(".")[1]}</span>
								</div>
							</div>
						</div>

						{/* Logo */}
						<div className="w-14 h-14 opacity-100 mb-1 relative shrink-0 bg-[#085D9E] rounded-full shadow-sm border-[1.5px] border-white/10">
							<Image src={LogoPrime} alt="Ampere" fill className="object-contain p-2.5" />
						</div>
					</div>
				</div>

				{/* Bottom Blue Bar */}
				<div className="h-2.5 w-full bg-[#085D9E] shrink-0" />
			</div>
		</div>
	);
}

// ==========================================
// A8 COMPONENT (52.5mm x 74.25mm cell)
// Content Rotated 90deg to be Landscape
// ==========================================
function TagItemA8({ item }: { item: (typeof ITEMS)[0] }) {
	return (
		<div className="w-full h-full border border-gray-100/50 relative overflow-hidden flex items-center justify-center">
			{/* 
                A8 Cell is small: 52.5mm width x 74.25mm height.
                We want landscape content approx 74.25mm width x 52.5mm height.
                So we rotate 90.
            */}

			<div className="w-[74.25mm] h-[52.5mm] absolute flex flex-col bg-white overflow-hidden" style={{ transform: "rotate(90deg)" }}>
				{/* Top Yellow Bar */}
				<div className="h-2.5 w-full bg-[#FFCB00] shrink-0" />

				<div className="flex-1 px-3 py-2 flex flex-col justify-between relative">
					{/* Content */}
					<div className="flex flex-col gap-1">
						<h2 className="text-[0.8rem] leading-[1] font-black text-[#085D9E] uppercase line-clamp-2 tracking-tight">{item.nome}</h2>
						<div className="flex items-center gap-1">
							<span className="text-[0.5rem] font-bold text-gray-400 uppercase tracking-widest scale-75 origin-left">COD</span>
							<span className="text-[0.6rem] font-mono font-medium text-gray-600 truncate">{item.codigo}</span>
						</div>
					</div>

					{/* Price Section */}
					<div className="flex items-end justify-between mt-auto pt-1 border-t border-dashed border-gray-200">
						<div className="flex flex-col">
							<div className="flex items-baseline text-[#085D9E] -ml-0.5">
								<span className="text-sm font-bold mr-0.5">R$</span>
								<span className="text-[2.5rem] font-black leading-none tracking-tighter tabular-nums">{Math.floor(item.preco)}</span>
								<div className="flex flex-col justify-start ml-0.5 h-[2rem]">
									<span className="text-lg font-black leading-none">,{(item.preco % 1).toFixed(2).split(".")[1]}</span>
								</div>
							</div>
						</div>

						{/* Logo */}
						<div className="w-10 h-10 opacity-100 mb-0.5 relative shrink-0 bg-[#085D9E] rounded-full shadow-sm border-[1px] border-white/10">
							<Image src={LogoPrime} alt="Ampere" fill className="object-contain p-2" />
						</div>
					</div>
				</div>

				{/* Bottom Blue Bar */}
				<div className="h-2 w-full bg-[#085D9E] shrink-0" />
			</div>
		</div>
	);
}
