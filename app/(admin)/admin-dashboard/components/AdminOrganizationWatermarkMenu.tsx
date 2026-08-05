"use client";

import type { CSSProperties, ReactNode, RefObject } from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toPng } from "html-to-image";
import { Loader2, Palette, Ruler, SlidersHorizontal } from "lucide-react";
import { toast } from "sonner";

import ResponsiveMenu from "@/components/Utils/ResponsiveMenu";
import ResponsiveMenuSection from "@/components/Utils/ResponsiveMenuSection";
import { Slider } from "@/components/ui/slider";
import { getErrorMessage } from "@/lib/errors";
import { DEFAULT_LOGO_CHIP_COLOR, getImageEdgeColor } from "@/lib/organizations/logo-color";
import OrganizationBrandWatermark, {
	getWatermarkCanvasSize,
	RECOMPRA_BRAND_BLUE,
	RECOMPRA_BRAND_YELLOW,
} from "./OrganizationBrandWatermark/organization-brand-watermark";

const EXPORT_PIXEL_RATIO = 2;
const DEFAULT_OUTER_PADDING_PERCENT = 125;
const MAX_OUTER_PADDING_PERCENT = 160;

const SIZE_PRESETS = [
	{ key: "small", label: "Pequeno", diameter: 256 },
	{ key: "medium", label: "Médio", diameter: 384 },
	{ key: "large", label: "Grande", diameter: 512 },
] as const;

const BACKGROUND_OPTIONS = [
	{ key: "transparent", label: "Sem fundo", filename: "sem-fundo", color: null },
	{ key: "blue", label: "Azul", filename: "fundo-azul", color: RECOMPRA_BRAND_BLUE },
	{ key: "yellow", label: "Amarelo", filename: "fundo-amarelo", color: RECOMPRA_BRAND_YELLOW },
] as const;

const OUTER_PADDING_PRESETS = [36, 75, 100, 125, 160] as const;

type SizePresetKey = (typeof SIZE_PRESETS)[number]["key"];
type BackgroundOptionKey = (typeof BACKGROUND_OPTIONS)[number]["key"];

const CHECKERBOARD_STYLE: CSSProperties = {
	backgroundColor: "#ffffff",
	backgroundImage:
		"linear-gradient(45deg, #e5e7eb 25%, transparent 25%), linear-gradient(-45deg, #e5e7eb 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #e5e7eb 75%), linear-gradient(-45deg, transparent 75%, #e5e7eb 75%)",
	backgroundSize: "20px 20px",
	backgroundPosition: "0 0, 0 10px, 10px -10px, -10px 0",
};

const DEFAULT_ORGANIZATION_BADGE_BACKGROUND = DEFAULT_LOGO_CHIP_COLOR;

type AdminOrganizationWatermarkMenuProps = {
	organizationName: string;
	organizationLogoUrl: string | null;
	closeModal: () => void;
};

type WatermarkPreviewShellProps = {
	width: number;
	height: number;
	contentRef: RefObject<HTMLDivElement | null>;
	children: ReactNode;
};

async function resolveImageAsDataUrl(url: string): Promise<string> {
	const response = await fetch(url, { mode: "cors", cache: "no-cache" });
	if (!response.ok) throw new Error(`Falha ao carregar logo (${response.status}).`);
	const blob = await response.blob();

	return await new Promise<string>((resolve, reject) => {
		const reader = new FileReader();
		reader.onloadend = () => resolve(reader.result as string);
		reader.onerror = () => reject(new Error("Falha ao ler a logo da organização."));
		reader.readAsDataURL(blob);
	});
}

function slugifyOrganizationName(name: string) {
	return (
		name
			.normalize("NFD")
			.replace(/[\u0300-\u036f]/g, "")
			.replace(/[^a-zA-Z0-9]+/g, "-")
			.replace(/^-|-$/g, "")
			.toLowerCase() || "organizacao"
	);
}

function WatermarkPreviewShell({ width, height, contentRef, children }: WatermarkPreviewShellProps) {
	const containerRef = useRef<HTMLDivElement>(null);
	const [scale, setScale] = useState(0.4);

	useEffect(() => {
		function updateScale() {
			if (!containerRef.current) return;
			const availableWidth = Math.max(containerRef.current.clientWidth - 40, 0);
			setScale(Math.min(availableWidth / width, 0.65));
		}

		updateScale();
		const observer = new ResizeObserver(updateScale);
		if (containerRef.current) observer.observe(containerRef.current);
		return () => observer.disconnect();
	}, [width]);

	return (
		<div ref={containerRef} className="flex w-full flex-col items-center">
			<div
				style={{
					width: `${width * scale}px`,
					height: `${height * scale}px`,
					overflow: "hidden",
					borderRadius: "8px",
					boxShadow: "0 8px 32px rgba(0,0,0,0.15), 0 2px 8px rgba(0,0,0,0.1)",
				}}
			>
				<div
					ref={contentRef}
					style={{
						width: `${width}px`,
						height: `${height}px`,
						transform: `scale(${scale})`,
						transformOrigin: "top left",
					}}
				>
					{children}
				</div>
			</div>
			<p className="mt-2 text-xs text-muted-foreground">
				{width} × {height}px • Preview em {Math.round(scale * 100)}%
			</p>
		</div>
	);
}

export default function AdminOrganizationWatermarkMenu({ organizationName, organizationLogoUrl, closeModal }: AdminOrganizationWatermarkMenuProps) {
	const [selectedSize, setSelectedSize] = useState<SizePresetKey>("medium");
	const [selectedBackground, setSelectedBackground] = useState<BackgroundOptionKey>("transparent");
	const [outerPaddingPercent, setOuterPaddingPercent] = useState(DEFAULT_OUTER_PADDING_PERCENT);
	const [logoSrc, setLogoSrc] = useState<string | null>(null);
	const [organizationBadgeBackgroundColor, setOrganizationBadgeBackgroundColor] = useState(DEFAULT_ORGANIZATION_BADGE_BACKGROUND);
	const [isExporting, setIsExporting] = useState(false);
	const contentRef = useRef<HTMLDivElement>(null);

	const size = SIZE_PRESETS.find((preset) => preset.key === selectedSize) ?? SIZE_PRESETS[1];
	const background = BACKGROUND_OPTIONS.find((option) => option.key === selectedBackground) ?? BACKGROUND_OPTIONS[0];
	const canvas = getWatermarkCanvasSize(size.diameter, outerPaddingPercent);
	const outW = Math.round(canvas.width * EXPORT_PIXEL_RATIO);
	const outH = Math.round(canvas.height * EXPORT_PIXEL_RATIO);

	useEffect(() => {
		if (!organizationLogoUrl) {
			setLogoSrc(null);
			setOrganizationBadgeBackgroundColor(DEFAULT_ORGANIZATION_BADGE_BACKGROUND);
			return;
		}

		let active = true;
		resolveImageAsDataUrl(organizationLogoUrl)
			.then((dataUrl) => {
				if (!active) return;
				setLogoSrc(dataUrl);
				return getImageEdgeColor(dataUrl);
			})
			.then((edgeColor) => {
				if (active) setOrganizationBadgeBackgroundColor(edgeColor ?? DEFAULT_ORGANIZATION_BADGE_BACKGROUND);
			})
			.catch(() => {
				if (!active) return;
				setLogoSrc(organizationLogoUrl);
				setOrganizationBadgeBackgroundColor(DEFAULT_ORGANIZATION_BADGE_BACKGROUND);
			});

		return () => {
			active = false;
		};
	}, [organizationLogoUrl]);

	const handleExport = useCallback(async () => {
		if (!contentRef.current || isExporting) return;
		setIsExporting(true);

		try {
			await document.fonts.ready;

			try {
				await toPng(contentRef.current, {
					quality: 0.1,
					pixelRatio: EXPORT_PIXEL_RATIO,
					width: canvas.width,
					height: canvas.height,
					backgroundColor: background.color ?? undefined,
				});
			} catch {
				// Warmup only.
			}

			const dataUrl = await toPng(contentRef.current, {
				quality: 1,
				pixelRatio: EXPORT_PIXEL_RATIO,
				cacheBust: true,
				width: canvas.width,
				height: canvas.height,
				backgroundColor: background.color ?? undefined,
				style: { transform: "scale(1)", transformOrigin: "top left" },
			});

			const link = document.createElement("a");
			link.download = `recompra-marca-dagua-${slugifyOrganizationName(organizationName)}-${background.filename}-${outW}x${outH}.png`;
			link.href = dataUrl;
			link.click();

			toast.success(`Marca d'água exportada: ${outW}×${outH}px`);
			closeModal();
		} catch (err) {
			console.error("Export failed:", err);
			toast.error(`Erro ao exportar: ${getErrorMessage(err)}`);
		} finally {
			setIsExporting(false);
		}
	}, [isExporting, canvas.width, canvas.height, background.color, background.filename, outW, outH, organizationName, closeModal]);

	return (
		<ResponsiveMenu
			menuTitle="GERAR MARCA D'ÁGUA"
			menuDescription={`Gere um PNG com a logo de ${organizationName} ao lado do ícone do Recompra.`}
			menuActionButtonText={isExporting ? "EXPORTANDO..." : "BAIXAR PNG"}
			menuCancelButtonText="FECHAR"
			actionFunction={handleExport}
			actionIsLoading={isExporting}
			stateIsLoading={false}
			stateError={null}
			closeMenu={closeModal}
			dialogVariant="sm"
			drawerVariant="fit"
			lockClose={isExporting}
		>
			<ResponsiveMenuSection title="TAMANHO" icon={<Ruler className="h-4 w-4 min-h-4 min-w-4" />}>
				<div className="flex flex-wrap items-center gap-2">
					{SIZE_PRESETS.map((preset) => {
						const presetCanvas = getWatermarkCanvasSize(preset.diameter, outerPaddingPercent);
						const active = selectedSize === preset.key;

						return (
							<button
								type="button"
								key={preset.key}
								onClick={() => setSelectedSize(preset.key)}
								className={`flex flex-col items-start rounded-lg border px-3 py-2 text-left text-sm font-medium transition-all ${
									active ? "border-primary bg-primary/10 text-foreground" : "border-border bg-card text-muted-foreground hover:text-foreground"
								}`}
							>
								<span>{preset.label}</span>
								<span className="text-xs opacity-60">
									{Math.round(presetCanvas.width * EXPORT_PIXEL_RATIO)} × {Math.round(presetCanvas.height * EXPORT_PIXEL_RATIO)}px
								</span>
							</button>
						);
					})}
				</div>
			</ResponsiveMenuSection>

			<ResponsiveMenuSection title="FUNDO" icon={<Palette className="h-4 w-4 min-h-4 min-w-4" />}>
				<div className="grid grid-cols-3 gap-2">
					{BACKGROUND_OPTIONS.map((option) => {
						const active = selectedBackground === option.key;

						return (
							<button
								type="button"
								key={option.key}
								onClick={() => setSelectedBackground(option.key)}
								className={`flex min-h-16 flex-col items-center justify-center gap-1 rounded-lg border px-2 py-2 text-xs font-semibold transition-all ${
									active ? "border-primary bg-primary/10 text-foreground" : "border-border bg-card text-muted-foreground hover:text-foreground"
								}`}
							>
								<span
									className="h-5 w-5 rounded-full border border-border"
									style={option.color ? { backgroundColor: option.color } : CHECKERBOARD_STYLE}
									aria-hidden
								/>
								<span>{option.label}</span>
							</button>
						);
					})}
				</div>
			</ResponsiveMenuSection>

			<ResponsiveMenuSection title="PADDING EXTERNO" icon={<SlidersHorizontal className="h-4 w-4 min-h-4 min-w-4" />}>
				<div className="flex flex-col gap-3 rounded-lg border border-border bg-card px-3 py-3">
					<div className="flex items-center justify-between gap-3 text-sm">
						<span className="font-medium text-foreground">Distância das bordas</span>
						<span className="rounded-md bg-primary/10 px-2 py-1 text-xs font-semibold text-foreground">{outerPaddingPercent}%</span>
					</div>
					<Slider
						value={[outerPaddingPercent]}
						min={4}
						max={MAX_OUTER_PADDING_PERCENT}
						step={1}
						onValueChange={(value) => setOuterPaddingPercent(value[0] ?? DEFAULT_OUTER_PADDING_PERCENT)}
					/>
					<div className="flex flex-wrap items-center gap-2">
						{OUTER_PADDING_PRESETS.map((preset) => {
							const active = outerPaddingPercent === preset;

							return (
								<button
									type="button"
									key={preset}
									onClick={() => setOuterPaddingPercent(preset)}
									className={`rounded-md border px-2.5 py-1 text-xs font-semibold transition-all ${
										active ? "border-primary bg-primary/10 text-foreground" : "border-border bg-background text-muted-foreground hover:text-foreground"
									}`}
								>
									{preset}%
								</button>
							);
						})}
					</div>
				</div>
			</ResponsiveMenuSection>

			<div
				className="flex w-full items-center justify-center overflow-hidden rounded-xl border border-border"
				style={background.color ? { backgroundColor: background.color } : CHECKERBOARD_STYLE}
			>
				<div className="w-full py-4">
					{logoSrc === null && organizationLogoUrl ? (
						<div className="flex h-40 items-center justify-center gap-2 text-sm text-muted-foreground">
							<Loader2 className="h-4 w-4 animate-spin" /> Carregando logo...
						</div>
					) : (
						<WatermarkPreviewShell width={canvas.width} height={canvas.height} contentRef={contentRef}>
							<OrganizationBrandWatermark
								organizationName={organizationName}
								organizationLogoSrc={logoSrc}
								diameter={size.diameter}
								backgroundColor={background.color}
								outerPaddingPercent={outerPaddingPercent}
								organizationBadgeBackgroundColor={organizationBadgeBackgroundColor}
							/>
						</WatermarkPreviewShell>
					)}
				</div>
			</div>
		</ResponsiveMenu>
	);
}
