"use client";

import ResponsiveMenu from "@/components/Utils/ResponsiveMenu";
import ResponsiveMenuSection from "@/components/Utils/ResponsiveMenuSection";
import { getErrorMessage } from "@/lib/errors";
import { toPng } from "html-to-image";
import { ImageIcon, LayoutTemplate, Loader2 } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { DEFAULT_MEDIA_EXPORT_PIXEL_RATIO, MEDIA_EXPORT_PIXEL_RATIO_OPTIONS, type TMediaExportPixelRatio } from "../media-playground/export-config";
import PostPreviewShell from "../media-playground/components/post-preview-shell";
import OrganizationBrandStory from "./OrganizationBrandStory/organization-brand-story";

// ─── Size Presets ────────────────────────────────────────────────
const SIZE_PRESETS = [
	{ key: "story", label: "Stories", width: 1080, height: 1920, description: "1080 × 1920" },
	{ key: "feed", label: "Feed", width: 1080, height: 1350, description: "1080 × 1350" },
	{ key: "square", label: "Quadrado", width: 1080, height: 1080, description: "1080 × 1080" },
] as const;

type SizePresetKey = (typeof SIZE_PRESETS)[number]["key"];

type AdminOrganizationStoryMenuProps = {
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

export default function AdminOrganizationStoryMenu({ organizationName, organizationLogoUrl, closeModal }: AdminOrganizationStoryMenuProps) {
	const [selectedSize, setSelectedSize] = useState<SizePresetKey>(SIZE_PRESETS[0].key);
	const [pixelRatio, setPixelRatio] = useState<TMediaExportPixelRatio>(DEFAULT_MEDIA_EXPORT_PIXEL_RATIO);
	const [logoSrc, setLogoSrc] = useState<string | null>(null);
	const [isExporting, setIsExporting] = useState(false);
	const contentRef = useRef<HTMLDivElement>(null);

	const size = SIZE_PRESETS.find((preset) => preset.key === selectedSize) ?? SIZE_PRESETS[0];

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
				await toPng(contentRef.current, { quality: 0.1, pixelRatio, width: size.width, height: size.height });
			} catch {
				// Ignore warmup errors.
			}

			// 3. Real capture.
			const dataUrl = await toPng(contentRef.current, {
				quality: 1,
				pixelRatio,
				cacheBust: true,
				width: size.width,
				height: size.height,
				style: { transform: "scale(1)", transformOrigin: "top left" },
			});

			const outW = size.width * pixelRatio;
			const outH = size.height * pixelRatio;

			const link = document.createElement("a");
			link.download = `recompra-${slugifyOrganizationName(organizationName)}-${size.key}-${outW}x${outH}.png`;
			link.href = dataUrl;
			link.click();

			toast.success(`Imagem exportada: ${outW}×${outH}px`);
			closeModal();
		} catch (err) {
			console.error("Export failed:", err);
			toast.error(`Erro ao exportar: ${getErrorMessage(err)}`);
		} finally {
			setIsExporting(false);
		}
	}, [isExporting, pixelRatio, size, organizationName, closeModal]);

	return (
		<ResponsiveMenu
			menuTitle="GERAR IMAGEM DA ORGANIZAÇÃO"
			menuDescription={`Gere uma imagem PNG combinando a marca do Recompra com a logo de ${organizationName}.`}
			menuActionButtonText={isExporting ? "EXPORTANDO..." : "BAIXAR PNG"}
			menuCancelButtonText="FECHAR"
			actionFunction={handleExport}
			actionIsLoading={isExporting}
			stateIsLoading={false}
			stateError={null}
			closeMenu={closeModal}
			dialogVariant="md"
			drawerVariant="lg"
			lockClose={isExporting}
		>
			<ResponsiveMenuSection title="FORMATO" icon={<LayoutTemplate className="h-4 w-4 min-h-4 min-w-4" />}>
				<div className="flex flex-wrap items-center gap-2">
					{SIZE_PRESETS.map((preset) => (
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
							<span className="text-xs opacity-60">{preset.description}</span>
						</button>
					))}
				</div>
			</ResponsiveMenuSection>

			<ResponsiveMenuSection title="RESOLUÇÃO" icon={<ImageIcon className="h-4 w-4 min-h-4 min-w-4" />}>
				<select
					value={pixelRatio}
					onChange={(event) => setPixelRatio(Number(event.target.value) as TMediaExportPixelRatio)}
					className="bg-card border-border focus:ring-primary/30 w-full max-w-xs rounded-lg border px-3 py-2 text-sm font-medium focus:outline-none focus:ring-2"
					aria-label="Resolução de exportação"
					title="Escala do PNG — valores maiores geram arquivo mais nítido e pesado"
				>
					{MEDIA_EXPORT_PIXEL_RATIO_OPTIONS.map((ratio) => (
						<option key={ratio} value={ratio}>
							{ratio}× ({size.width * ratio}×{size.height * ratio}px)
						</option>
					))}
				</select>
			</ResponsiveMenuSection>

			<div className="bg-secondary/30 border-border flex w-full items-center justify-center rounded-xl border border-dashed py-4">
				{logoSrc === null && organizationLogoUrl ? (
					<div className="flex h-40 items-center justify-center gap-2 text-sm text-muted-foreground">
						<Loader2 className="h-4 w-4 animate-spin" /> Carregando logo...
					</div>
				) : (
					<PostPreviewShell width={size.width} height={size.height} contentRef={contentRef}>
						<OrganizationBrandStory
							width={size.width}
							height={size.height}
							organizationName={organizationName}
							organizationLogoSrc={logoSrc}
						/>
					</PostPreviewShell>
				)}
			</div>
		</ResponsiveMenu>
	);
}
