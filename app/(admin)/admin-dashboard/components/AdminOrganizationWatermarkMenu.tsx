"use client";

import ResponsiveMenu from "@/components/Utils/ResponsiveMenu";
import ResponsiveMenuSection from "@/components/Utils/ResponsiveMenuSection";
import { getErrorMessage } from "@/lib/errors";
import { toPng } from "html-to-image";
import { Loader2, Ruler } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import PostPreviewShell from "../media-playground/components/post-preview-shell";
import OrganizationBrandWatermark, { getWatermarkCanvasSize } from "./OrganizationBrandWatermark/organization-brand-watermark";

// ─── Size Presets ────────────────────────────────────────────────
// Badge diameter (CSS px); the PNG is rasterized at `EXPORT_PIXEL_RATIO` for sharpness.
const EXPORT_PIXEL_RATIO = 2;

const SIZE_PRESETS = [
	{ key: "small", label: "Pequeno", diameter: 256 },
	{ key: "medium", label: "Médio", diameter: 384 },
	{ key: "large", label: "Grande", diameter: 512 },
] as const;

type SizePresetKey = (typeof SIZE_PRESETS)[number]["key"];

// Checkerboard so the user can tell the export background is transparent.
const CHECKERBOARD_STYLE: React.CSSProperties = {
	backgroundColor: "#ffffff",
	backgroundImage:
		"linear-gradient(45deg, #e5e7eb 25%, transparent 25%), linear-gradient(-45deg, #e5e7eb 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #e5e7eb 75%), linear-gradient(-45deg, transparent 75%, #e5e7eb 75%)",
	backgroundSize: "20px 20px",
	backgroundPosition: "0 0, 0 10px, 10px -10px, -10px 0",
};

type AdminOrganizationWatermarkMenuProps = {
	organizationName: string;
	organizationLogoUrl: string | null;
	closeModal: () => void;
};

/**
 * Resolves a remote image to a data URL so `html-to-image` can rasterize it
 * without cross-origin canvas tainting. Returns the original URL on failure so
 * the preview still renders (the export may degrade if CORS blocks it).
 */
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
			.replace(/[̀-ͯ]/g, "")
			.replace(/[^a-zA-Z0-9]+/g, "-")
			.replace(/^-|-$/g, "")
			.toLowerCase() || "organizacao"
	);
}

export default function AdminOrganizationWatermarkMenu({ organizationName, organizationLogoUrl, closeModal }: AdminOrganizationWatermarkMenuProps) {
	const [selectedSize, setSelectedSize] = useState<SizePresetKey>("medium");
	const [logoSrc, setLogoSrc] = useState<string | null>(null);
	const [isExporting, setIsExporting] = useState(false);
	const contentRef = useRef<HTMLDivElement>(null);

	const size = SIZE_PRESETS.find((preset) => preset.key === selectedSize) ?? SIZE_PRESETS[1];
	const canvas = getWatermarkCanvasSize(size.diameter);
	const outW = Math.round(canvas.width * EXPORT_PIXEL_RATIO);
	const outH = Math.round(canvas.height * EXPORT_PIXEL_RATIO);

	// Inline the organization logo as a data URL up front so the export is clean.
	useEffect(() => {
		if (!organizationLogoUrl) {
			setLogoSrc(null);
			return;
		}
		let active = true;
		resolveImageAsDataUrl(organizationLogoUrl)
			.then((dataUrl) => {
				if (active) setLogoSrc(dataUrl);
			})
			.catch(() => {
				// Fall back to the raw URL — preview still works, export relies on CORS.
				if (active) setLogoSrc(organizationLogoUrl);
			});
		return () => {
			active = false;
		};
	}, [organizationLogoUrl]);

	const handleExport = useCallback(async () => {
		if (!contentRef.current || isExporting) return;
		setIsExporting(true);
		try {
			// 1. Wait for fonts to be ready.
			await document.fonts.ready;

			// 2. Warmup pass — forces the library to clone the node and load resources.
			try {
				await toPng(contentRef.current, { quality: 0.1, pixelRatio: EXPORT_PIXEL_RATIO, width: canvas.width, height: canvas.height });
			} catch {
				// Ignore warmup errors.
			}

			// 3. Real capture — no backgroundColor keeps the PNG transparent.
			const dataUrl = await toPng(contentRef.current, {
				quality: 1,
				pixelRatio: EXPORT_PIXEL_RATIO,
				cacheBust: true,
				width: canvas.width,
				height: canvas.height,
				style: { transform: "scale(1)", transformOrigin: "top left" },
			});

			const link = document.createElement("a");
			link.download = `recompra-marca-dagua-${slugifyOrganizationName(organizationName)}-${outW}x${outH}.png`;
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
	}, [isExporting, canvas.width, canvas.height, outW, outH, organizationName, closeModal]);

	return (
		<ResponsiveMenu
			menuTitle="GERAR MARCA D'ÁGUA"
			menuDescription={`Gere um PNG transparente com a logo de ${organizationName} ao lado do ícone do Recompra.`}
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
						const presetCanvas = getWatermarkCanvasSize(preset.diameter);
						return (
							<button
								type="button"
								key={preset.key}
								onClick={() => setSelectedSize(preset.key)}
								className={`flex flex-col items-start rounded-lg border px-3 py-2 text-left text-sm font-medium transition-all ${
									selectedSize === preset.key
										? "border-primary bg-primary/10 text-foreground"
										: "border-border bg-card text-muted-foreground hover:text-foreground"
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

			<div className="border-border flex w-full items-center justify-center overflow-hidden rounded-xl border" style={CHECKERBOARD_STYLE}>
				<div className="w-full py-4">
					{logoSrc === null && organizationLogoUrl ? (
						<div className="flex h-40 items-center justify-center gap-2 text-sm text-muted-foreground">
							<Loader2 className="h-4 w-4 animate-spin" /> Carregando logo...
						</div>
					) : (
						<PostPreviewShell width={canvas.width} height={canvas.height} contentRef={contentRef}>
							<OrganizationBrandWatermark organizationName={organizationName} organizationLogoSrc={logoSrc} diameter={size.diameter} />
						</PostPreviewShell>
					)}
				</div>
			</div>
		</ResponsiveMenu>
	);
}
