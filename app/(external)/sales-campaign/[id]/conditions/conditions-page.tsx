"use client";
import ErrorComponent from "@/components/Layouts/ErrorComponent";
import { Button } from "@/components/ui/button";
import { getErrorMessage } from "@/lib/errors";
import type { TUtilsSalesPromoCampaignConfig } from "@/schemas/utils";
import LogoPrime from "@/utils/images/vertical-complete-logo.png";
import dayjs from "dayjs";
import { toPng } from "html-to-image";
import { BadgePercent, Download } from "lucide-react";
// Remove Next/Image from here if not used elsewhere, or keep it for outside the ref
// import Image from "next/image";
import { useCallback, useRef } from "react";
import { toast } from "sonner";

export default function SalesCampaignConditionsPage({
	campaign,
	campaignItems,
}: {
	campaign: TUtilsSalesPromoCampaignConfig;
	campaignItems: {
		id: string;
		imagemCapaUrl: string | null;
	}[];
}) {
	const currentDateDayjs = dayjs();

	const campaignProductsMatchingCondition = campaign.valor.dados.itens.filter((item) => {
		if (!item.anuncioData) return false;
		const anuncioDateDayjs = dayjs(item.anuncioData);
		return anuncioDateDayjs.isSame(currentDateDayjs, "date");
	});

	if (campaignProductsMatchingCondition.length === 0) {
		return <ErrorComponent msg="Nenhum produto encontrado com condição especial para a data atual." />;
	}

	return (
		<div className="w-full flex flex-col gap-2 items-center h-full bg-background">
			{campaignProductsMatchingCondition.map((item, index) => (
				<SalesCampaignConditionItem key={`${item.titulo}-${index}`} item={item} campaignItems={campaignItems} />
			))}
		</div>
	);
}

function SalesCampaignConditionItem({
	item,
	campaignItems,
}: {
	item: TUtilsSalesPromoCampaignConfig["valor"]["dados"]["itens"][number];
	campaignItems: {
		id: string;
		imagemCapaUrl: string | null;
	}[];
}) {
	const ref = useRef<HTMLDivElement>(null);

	const handleDownloadImage = useCallback(async () => {
		if (ref.current === null) {
			return;
		}

		try {
			// 1. Wait for fonts to be ready (crucial for Next.js fonts)
			await document.fonts.ready;

			// 2. THE "WARMUP" HACK
			// We call the function once to force the library to clone the node and load resources.
			// We catch errors here silently because the first attempt often has glitches.
			try {
				await toPng(ref.current, { quality: 0.1, pixelRatio: 1 });
			} catch (e) {
				// Ignore warmup errors
			}

			// 3. The Actual Capture
			// We enforce pixelRatio: 1 to ensure the canvas size isn't too large for the browser
			const dataUrl = await toPng(ref.current, {
				quality: 1,
				pixelRatio: 1, // FORCE THIS TO 1
				cacheBust: true,
				backgroundColor: "white", // Force white background
				width: 500, // Explicitly match your CSS width
				height: 500, // Explicitly match your CSS height
				style: {
					background: "white",
				},
			});

			const link = document.createElement("a");
			link.download = `${item.titulo}.png`;
			link.href = dataUrl;
			link.click();
		} catch (err) {
			console.error(err);
			toast.error(getErrorMessage(err));
		}
	}, [item.titulo]);

	const campaignImages = item.produtos
		.map((p) => {
			const coverImageUrl = campaignItems.find((c) => c.id === p.id)?.imagemCapaUrl;
			if (!coverImageUrl) return null;
			return coverImageUrl;
		})
		.filter((i) => !!i) as string[];
	const conditionValue = item.anuncioValorPromocional ?? item.valorPromocional;
	const discountPercent = Math.round(((item.valorBase - conditionValue) / item.valorBase) * 100);

	return (
		<div className="flex flex-col gap-3 p-3 rounded-lg shadow-lg bg-card">
			{/* IMPORTANT: The content inside this ref needs to use standard HTML tags 
               where possible to avoid canvas generation issues.
            */}
			<div ref={ref} className="w-[500px] h-[500px] shrink-0">
				<div className="relative bg-[#085D9E] overflow-hidden flex flex-col w-full h-full gap-3">
					<div className="w-full grow flex flex-col gap-2 bg-[#FFCB00] rounded-bl-2xl rounded-br-2xl px-6 py-4">
						<h1 className="text-center text-[1.5rem] text-[#085D9E] font-black leading-tight">OFERTA ESPECIAL DO DIA !!!</h1>
						<div className="w-full grow bg-white flex flex-col gap-2 justify-end items-center p-2 rounded-lg relative">
							<div className="absolute top-0 right-0 bg-red-500 text-white flex items-center gap-1 rounded-tr-lg px-2 py-1">
								<span className="text-xl font-semibold">{discountPercent}% OFF</span>
								<BadgePercent className="w-6 h-6 min-w-6 min-h-6" />
							</div>

							{/* IF YOU UNCOMMENT THE DYNAMIC IMAGE LATER, USE THIS FORMAT: */}
							{campaignImages.length > 0 ? (
								<div className="w-full flex items-center justify-center">
									<div className="relative w-32 h-32">
										<img
											src={campaignImages[0]}
											alt={item.titulo}
											className="w-full h-full object-contain"
											// 'crossOrigin' is crucial for external images to work with canvas
											crossOrigin="anonymous"
										/>
									</div>
								</div>
							) : null}

							<div className="flex flex-col gap-0.5 items-center justify-center w-full mt-3">
								<p className="text-[0.5rem] font-semibold text-black/80">
									DE <span className="line-through">R$ {item.valorBase.toFixed(2).replace(".", ",")}</span>
								</p>
								<div className="flex items-baseline justify-center text-black">
									<span className="text-lg font-black leading-none">R$</span>
									<span className="text-5xl font-black ml-0.5 leading-none">{Math.floor(conditionValue)}</span>
									<span className="text-lg font-black leading-none">,{(conditionValue % 1).toFixed(2).split(".")[1]}</span>
								</div>
							</div>
							<h3 className="text-center text-[0.8rem] font-black text-black leading-tight line-clamp-2">{item.titulo}</h3>
						</div>
					</div>

					{/* Footer azul */}
					<div className="bg-[#085D9E] text-center flex flex-col gap-1 py-4 px-2 items-center justify-center">
						<div className="relative w-32 h-16 flex justify-center items-center">
							{/* FIX APPLIED HERE:
                                1. Replaced <Image> with <img>.
                                2. Used LogoPrime.src because static imports in Next.js return an object.
                                3. Added w-full h-full object-contain classes directly.
                            */}
							<img src={LogoPrime.src} alt="Logo Prime" className="w-full h-full object-contain" />
						</div>
					</div>
				</div>
			</div>
			<div className="w-full flex items-center justify-center gap-2 flex-wrap">
				<Button onClick={handleDownloadImage} size="default" variant="ghost" className="flex items-center gap-1 px-2 py-1 text-xs">
					<Download className="w-4 h-4 min-w-4 min-h-4" />
					BAIXAR IMAGEM
				</Button>
			</div>
		</div>
	);
}
