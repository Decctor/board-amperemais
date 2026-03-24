"use client";

import Image from "next/image";
import LogoHorizontalRecompraCRM from "@/utils/svgs/logos/RECOMPRA - COMPLETE - HORIZONTAL - COLORFUL.svg";
import { TCashbackProgramEntity, TOrganizationEntity } from "@/services/drizzle/schema";
import { hexToRgba, useOrgColors } from "@/components/Providers/OrgColorsProvider";
import { Camera, Gift, Phone, Scan, Smartphone } from "lucide-react";
import { getCashbackUnitLabel } from "@/lib/formatting";

type PointOfInteractionDisplayPageProps = {
	org: {
		id: TOrganizationEntity["id"];
		cnpj: TOrganizationEntity["cnpj"];
		nome: TOrganizationEntity["nome"];
		logoUrl: TOrganizationEntity["logoUrl"];
		telefone: TOrganizationEntity["telefone"];
		poiQrCodeMobileDataUrl: TOrganizationEntity["poiQrCodeMobileDataUrl"];
	};
	cashbackProgram?: {
		terminologia: TCashbackProgramEntity["terminologia"];
	};
};

export default function PointOfInteractionDisplayPage({ org, cashbackProgram }: PointOfInteractionDisplayPageProps) {
	const { colors, getPrimaryGradientStyle } = useOrgColors();

	const steps = [
		{
			icon: <Smartphone className="w-6 h-6" />,
			label: (
				<span className="text-[10px] font-semibold text-center leading-tight text-gray-600">
					Abra sua <br /> câmera
				</span>
			),
		},
		{
			icon: <Scan className="w-6 h-6" />,
			label: (
				<span className="text-[10px] font-semibold text-center leading-tight text-gray-600">
					Escaneie o <br /> QR
				</span>
			),
		},
		{
			icon: <Gift className="w-6 h-6" />,
			label: (
				<span className="text-[10px] font-semibold text-center leading-tight text-gray-600">
					Pontue e/ou <br /> resgate prêmios
				</span>
			),
		},
	];

	return (
		<div
			className="min-h-screen flex items-center justify-center p-8 print:p-0 print:min-h-0"
			style={{ backgroundColor: hexToRgba(colors.primary, 0.08) }}
		>
			{/* A5 Container */}
			<div className="w-[148mm] h-[210mm] bg-white shadow-2xl print:shadow-none relative overflow-hidden flex flex-col mx-auto rounded-2xl print:rounded-none">
				{/* Header */}
				<div className="relative flex flex-col items-center justify-center pt-7 pb-10 px-6 overflow-hidden" style={getPrimaryGradientStyle()}>
					{/* Decorative dots pattern */}
					<div
						className="absolute inset-0 opacity-10"
						style={{
							backgroundImage: `radial-gradient(circle, ${colors.primaryForeground} 1px, transparent 1px)`,
							backgroundSize: "16px 16px",
						}}
					/>

					{/* Logo or Org Name */}
					{org.logoUrl ? (
						<div className="flex items-center justify-center relative z-10 mb-3 bg-white rounded p-2 shadow-lg" style={{ width: "120px", height: "64px" }}>
							<div className="relative w-12 h-12 rounded-full overflow-hidden">
								<Image src={org.logoUrl} alt={`Logo ${org.nome}`} fill className="object-contain" sizes="50px 50px" />
							</div>
						</div>
					) : (
						<p className="relative z-10 text-base font-bold mb-2 text-center px-2 py-1 rounded-lg bg-white/20" style={{ color: colors.primaryForeground }}>
							{org.nome}
						</p>
					)}

					{/* Main Headline */}
					<div className="relative z-10 text-center">
						<h2 className="text-4xl font-black leading-none tracking-tight uppercase" style={{ color: colors.primaryForeground }}>
							Ganhe E RESGATE
						</h2>
						<h2 className="text-4xl font-black leading-none tracking-tight uppercase" style={{ color: colors.primaryForeground }}>
							{cashbackProgram ? getCashbackUnitLabel(cashbackProgram.terminologia) : "Cashback!"}
						</h2>
						<p className="text-xs font-semibold mt-1 uppercase tracking-widest opacity-80" style={{ color: colors.primaryForeground }}>
							✦ FÁCIL E RÁPIDO ✦
						</p>
					</div>

					{/* Wave separator */}
					<div className="absolute -bottom-px left-0 right-0 w-full overflow-hidden leading-none">
						<svg className="relative block w-full h-[32px]" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 120" preserveAspectRatio="none">
							<path d="M0,60 C150,100 350,0 600,60 C850,120 1050,20 1200,60 L1200,120 L0,120 Z" fill="white" />
						</svg>
					</div>
				</div>

				{/* Body */}
				<div className="flex-1 flex flex-col items-center px-6 pt-6 pb-4 z-10 bg-white">
					{/* QR Code Card */}
					<div className="relative w-full flex flex-col items-center">
						{/* Outer decorative ring */}
						<div className="p-1 rounded-2xl" style={{ background: getPrimaryGradientStyle().background }}>
							<div className="bg-white p-3 rounded-xl flex flex-col items-center shadow-inner">
								<div
									className="flex items-center justify-center rounded-lg overflow-hidden"
									style={{ width: "180px", height: "180px", backgroundColor: hexToRgba(colors.primary, 0.04) }}
								>
									{org.poiQrCodeMobileDataUrl ? (
										<img src={org.poiQrCodeMobileDataUrl} alt="QR Code" className="w-full h-full object-contain p-1" />
									) : (
										<p className="text-xs text-center px-2" style={{ color: hexToRgba(colors.primary, 0.5) }}>
											QR Code indisponível
										</p>
									)}
								</div>
							</div>
						</div>

						{/* Scan label badge */}
						<div
							className="mt-2 flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-bold uppercase tracking-widest shadow-sm"
							style={{ backgroundColor: colors.primary, color: colors.primaryForeground }}
						>
							<Camera className="w-6 h-6" /> &nbsp;Aponte a câmera aqui
						</div>
					</div>

					{/* Divider */}
					<div className="w-full flex items-center gap-2 my-3">
						<div className="flex-1 h-px" style={{ backgroundColor: hexToRgba(colors.primary, 0.2) }} />
						<span className="text-xs font-semibold uppercase tracking-widest" style={{ color: hexToRgba(colors.primary, 0.5) }}>
							como funciona
						</span>
						<div className="flex-1 h-px" style={{ backgroundColor: hexToRgba(colors.primary, 0.2) }} />
					</div>

					{/* Steps */}
					<div className="w-full flex justify-around gap-2">
						{steps.map((step, i) => (
							<div key={i} className="flex flex-col items-center gap-1 flex-1">
								<div
									className="w-12 h-12 rounded-full flex items-center justify-center text-lg shadow-sm"
									style={{ backgroundColor: hexToRgba(colors.primary, 0.12) }}
								>
									{step.icon}
								</div>
								{step.label}
							</div>
						))}
					</div>

					{/* Tagline */}
					<p className="text-[11px] text-center text-gray-400 font-medium mt-3 leading-snug px-4">
						Acumule pontos a cada compra e troque por benefícios exclusivos.
					</p>
				</div>

				{/* Footer */}
				<div className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-[#24549C] text-white">
					<p className="text-[11px] font-medium tracking-tight">Powered by</p>
					<div className="w-24 h-6 relative">
						<Image src={LogoHorizontalRecompraCRM} alt="RecompraCRM" fill className="object-contain" />
					</div>
				</div>
			</div>
		</div>
	);
}
