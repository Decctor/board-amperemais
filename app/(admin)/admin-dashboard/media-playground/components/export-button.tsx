"use client";

import { Button } from "@/components/ui/button";
import { getErrorMessage } from "@/lib/errors";
import { toPng } from "html-to-image";
import { Download, Loader2 } from "lucide-react";
import { type RefObject, useCallback, useState } from "react";
import { toast } from "sonner";
import type { TMediaExportPixelRatio } from "../export-config";

type ExportButtonProps = {
	contentRef: RefObject<HTMLDivElement | null>;
	width: number;
	height: number;
	designName: string;
	sizeLabel: string;
	/** Renders the layout at `width`×`height` CSS px, then rasterizes at this multiple (sharper PNG). */
	pixelRatio: TMediaExportPixelRatio;
};

export default function ExportButton({
	contentRef,
	width,
	height,
	designName,
	sizeLabel,
	pixelRatio,
}: ExportButtonProps) {
	const [isExporting, setIsExporting] = useState(false);

	const handleExport = useCallback(async () => {
		if (!contentRef.current || isExporting) return;

		setIsExporting(true);

		try {
			// 1. Wait for fonts to be ready
			await document.fonts.ready;

			// 2. Warmup hack — forces library to clone node and load resources
			try {
				await toPng(contentRef.current, { quality: 0.1, pixelRatio, width, height });
			} catch {
				// Ignore warmup errors
			}

			// 3. Real capture — pixelRatio scales canvas (see html-to-image toCanvas)
			const dataUrl = await toPng(contentRef.current, {
				quality: 1,
				pixelRatio,
				cacheBust: true,
				width,
				height,
				backgroundColor: "#ffffff",
				style: {
					transform: "scale(1)",
					transformOrigin: "top left",
				},
			});

			const outW = width * pixelRatio;
			const outH = height * pixelRatio;

			// 4. Trigger download
			const link = document.createElement("a");
			link.download = `recompra-${designName}-${sizeLabel}-${outW}x${outH}.png`;
			link.href = dataUrl;
			link.click();

			toast.success(
				pixelRatio === 1
					? `Imagem exportada: ${outW}×${outH}px`
					: `Imagem exportada: ${outW}×${outH}px (layout ${width}×${height}px @${pixelRatio}×)`,
			);
		} catch (err) {
			console.error("Export failed:", err);
			toast.error(`Erro ao exportar: ${getErrorMessage(err)}`);
		} finally {
			setIsExporting(false);
		}
	}, [contentRef, width, height, designName, sizeLabel, pixelRatio, isExporting]);

	const outW = width * pixelRatio;
	const outH = height * pixelRatio;

	return (
		<Button onClick={handleExport} disabled={isExporting} size="lg" className="flex items-center gap-2">
			{isExporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
			{isExporting
				? "Exportando..."
				: pixelRatio === 1
					? `Exportar PNG (${width}×${height})`
					: `Exportar PNG (${outW}×${outH} @${pixelRatio}×)`}
		</Button>
	);
}
