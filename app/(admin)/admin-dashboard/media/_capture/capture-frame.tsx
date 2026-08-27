"use client";

import { Button } from "@/components/ui/button";
import { copyNodeToClipboard, exportNode, type TExportFormat } from "@/lib/media/export-node";
import { cn } from "@/lib/utils";
import { Check, Copy, Download, Maximize2, Moon, Sun } from "lucide-react";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { CAPTURE_BACKGROUNDS, CAPTURE_PRESETS, CONTENT_WIDTH_PRESETS, type TCaptureBackground, type TCapturePreset } from "./presets";

const PIXEL_RATIOS = [1, 2, 3];

type CaptureFrameProps = {
	/** Nome base do arquivo exportado, sem extensão. */
	filename: string;
	/** Preset de canvas inicial. */
	defaultPresetKey?: string;
	/** Largura inicial de renderização do conteúdo. */
	defaultContentWidth?: number;
	/** Fundo inicial do frame. */
	defaultBackgroundKey?: string;
	children: React.ReactNode;
};

/** Espera dois frames de pintura para o recharts terminar de medir antes da captura. */
function waitForPaint() {
	return new Promise<void>((resolve) => {
		requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
	});
}

export function CaptureFrame({
	filename,
	defaultPresetKey = "fit",
	defaultContentWidth = 1440,
	defaultBackgroundKey = "surface",
	children,
}: CaptureFrameProps) {
	const captureRef = useRef<HTMLDivElement>(null);
	const contentRef = useRef<HTMLDivElement>(null);
	const previewViewportRef = useRef<HTMLDivElement>(null);

	const [preset, setPreset] = useState<TCapturePreset>(
		() => CAPTURE_PRESETS.find((item) => item.key === defaultPresetKey) ?? CAPTURE_PRESETS[0],
	);
	const [background, setBackground] = useState<TCaptureBackground>(
		() => CAPTURE_BACKGROUNDS.find((item) => item.key === defaultBackgroundKey) ?? CAPTURE_BACKGROUNDS[0],
	);
	const [contentWidth, setContentWidth] = useState(defaultContentWidth);
	const [padding, setPadding] = useState(48);
	const [theme, setTheme] = useState<"light" | "dark">("light");
	const [pixelRatio, setPixelRatio] = useState(2);
	const [scaleMode, setScaleMode] = useState<"auto" | "manual">("auto");
	const [manualScale, setManualScale] = useState(1);
	const [isCapturing, setIsCapturing] = useState(false);
	const [justCopied, setJustCopied] = useState(false);

	// Altura natural do conteúdo, medida para dimensionar o wrapper escalado.
	const [contentHeight, setContentHeight] = useState(0);
	// Zoom só de visualização — fica FORA do nó capturado, então não afeta o export.
	const [previewZoom, setPreviewZoom] = useState(1);

	useLayoutEffect(() => {
		const node = contentRef.current;
		if (!node) return;
		const observer = new ResizeObserver(() => setContentHeight(node.offsetHeight));
		observer.observe(node);
		setContentHeight(node.offsetHeight);
		return () => observer.disconnect();
	}, []);

	const autoScale = (() => {
		if (!preset.width) return 1;
		const availableWidth = preset.width - padding * 2;
		const widthScale = availableWidth / contentWidth;
		if (!preset.height || !contentHeight) return Math.min(widthScale, 1);
		const heightScale = (preset.height - padding * 2) / contentHeight;
		return Math.min(widthScale, heightScale, 1);
	})();

	const scale = scaleMode === "auto" ? autoScale : manualScale;
	const frameWidth = preset.width ?? contentWidth * scale + padding * 2;
	const frameHeight = preset.height ?? contentHeight * scale + padding * 2;

	// O frame de captura pode ser maior que a coluna de preview — reduzimos só a exibição.
	useEffect(() => {
		const viewport = previewViewportRef.current;
		if (!viewport) return;
		const recompute = () => {
			const available = viewport.clientWidth;
			setPreviewZoom(available > 0 && frameWidth > available ? available / frameWidth : 1);
		};
		const observer = new ResizeObserver(recompute);
		observer.observe(viewport);
		recompute();
		return () => observer.disconnect();
	}, [frameWidth]);

	const runCapture = useCallback(
		async (action: (node: HTMLElement) => Promise<unknown>, successMessage: string, errorMessage: string) => {
			const node = captureRef.current;
			if (!node) return;
			setIsCapturing(true);
			try {
				// Deixa o data-capturing chegar ao DOM e o recharts assentar antes de serializar.
				await waitForPaint();
				await action(node);
				toast.success(successMessage);
			} catch {
				toast.error(errorMessage);
			} finally {
				setIsCapturing(false);
			}
		},
		[],
	);

	const handleExport = useCallback(
		(format: TExportFormat) =>
			runCapture(
				(node) =>
					exportNode(node, `${filename}-${preset.key}${format === "svg" ? "" : `@${pixelRatio}x`}`, format, {
						pixelRatio,
						backgroundColor: background.color ?? undefined,
					}),
				`Exportado em ${format === "jpeg" ? "JPEG" : format.toUpperCase()}.`,
				"Não foi possível exportar o frame.",
			),
		[background.color, filename, pixelRatio, preset.key, runCapture],
	);

	const handleCopy = useCallback(
		() =>
			runCapture(
				async (node) => {
					await copyNodeToClipboard(node, { pixelRatio, backgroundColor: background.color ?? undefined });
					setJustCopied(true);
					setTimeout(() => setJustCopied(false), 2000);
				},
				"PNG copiado para a área de transferência.",
				"Não foi possível copiar o frame.",
			),
		[background.color, pixelRatio, runCapture],
	);

	return (
		<div className="flex w-full flex-col gap-4 xl:flex-row xl:items-start">
			<aside className="flex w-full shrink-0 flex-col gap-5 rounded-2xl border border-border bg-card p-4 xl:w-[290px] xl:sticky xl:top-4">
				<ControlGroup label="Formato">
					<div className="flex flex-wrap gap-1.5">
						{CAPTURE_PRESETS.map((item) => (
							<Chip key={item.key} active={item.key === preset.key} onClick={() => setPreset(item)}>
								{item.label}
							</Chip>
						))}
					</div>
				</ControlGroup>

				<ControlGroup label="Largura do conteúdo">
					<div className="flex flex-wrap gap-1.5">
						{CONTENT_WIDTH_PRESETS.map((item) => (
							<Chip key={item.key} active={item.width === contentWidth} onClick={() => setContentWidth(item.width)}>
								{item.label}
							</Chip>
						))}
					</div>
					<RangeRow
						label={`${contentWidth}px`}
						min={360}
						max={1920}
						step={20}
						value={contentWidth}
						onChange={setContentWidth}
					/>
				</ControlGroup>

				<ControlGroup label="Escala">
					<div className="flex items-center gap-1.5">
						<Chip active={scaleMode === "auto"} onClick={() => setScaleMode("auto")}>
							<Maximize2 className="size-3" />
							Automática
						</Chip>
						<Chip
							active={scaleMode === "manual"}
							onClick={() => {
								setManualScale(Number(scale.toFixed(2)));
								setScaleMode("manual");
							}}
						>
							Manual
						</Chip>
					</div>
					{scaleMode === "manual" ? (
						<RangeRow label={`${Math.round(scale * 100)}%`} min={0.2} max={1.5} step={0.01} value={manualScale} onChange={setManualScale} />
					) : (
						<p className="text-xs text-muted-foreground">{Math.round(scale * 100)}% — ajustado ao formato</p>
					)}
				</ControlGroup>

				<ControlGroup label="Fundo">
					<div className="flex flex-wrap gap-1.5">
						{CAPTURE_BACKGROUNDS.map((item) => (
							<Chip key={item.key} active={item.key === background.key} onClick={() => setBackground(item)}>
								<span
									className={cn(
										"size-3 rounded-full border border-black/15",
										item.surface && "bg-background",
										!item.surface && !item.color && "bg-[repeating-conic-gradient(#ccc_0_25%,#fff_0_50%)] bg-[length:8px_8px]",
									)}
									style={item.color ? { backgroundColor: item.color } : undefined}
								/>
								{item.label}
							</Chip>
						))}
					</div>
					<RangeRow label={`Margem ${padding}px`} min={0} max={160} step={4} value={padding} onChange={setPadding} />
				</ControlGroup>

				<ControlGroup label="Tema">
					<div className="flex items-center gap-1.5">
						<Chip active={theme === "light"} onClick={() => setTheme("light")}>
							<Sun className="size-3" />
							Claro
						</Chip>
						<Chip active={theme === "dark"} onClick={() => setTheme("dark")}>
							<Moon className="size-3" />
							Escuro
						</Chip>
					</div>
				</ControlGroup>

				<ControlGroup label="Resolução">
					<div className="flex items-center gap-1.5">
						{PIXEL_RATIOS.map((ratio) => (
							<Chip key={ratio} active={ratio === pixelRatio} onClick={() => setPixelRatio(ratio)}>
								{ratio}x
							</Chip>
						))}
					</div>
					<p className="text-xs text-muted-foreground">
						{Math.round(frameWidth * pixelRatio)}×{Math.round(frameHeight * pixelRatio)}px no arquivo final
					</p>
				</ControlGroup>

				<div className="flex flex-col gap-2 border-t border-border pt-4">
					<Button size="sm" disabled={isCapturing} onClick={() => handleExport("png")}>
						<Download className="size-3.5" />
						Baixar PNG
					</Button>
					<div className="flex gap-2">
						<Button size="sm" variant="outline" className="flex-1" disabled={isCapturing} onClick={() => handleExport("jpeg")}>
							JPEG
						</Button>
						<Button size="sm" variant="outline" className="flex-1" disabled={isCapturing} onClick={() => handleExport("svg")}>
							SVG
						</Button>
					</div>
					<Button size="sm" variant="ghost" disabled={isCapturing} onClick={handleCopy}>
						{justCopied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
						{justCopied ? "Copiado" : "Copiar PNG"}
					</Button>
				</div>
			</aside>

			<div
				ref={previewViewportRef}
				className="flex min-w-0 flex-1 justify-center overflow-hidden rounded-2xl border border-border bg-[repeating-conic-gradient(var(--color-muted)_0_25%,transparent_0_50%)] bg-[length:16px_16px] p-4"
			>
				{/* Wrapper de zoom apenas visual — fora do nó capturado. */}
				<div
					style={{
						width: frameWidth * previewZoom,
						height: frameHeight * previewZoom,
					}}
				>
					<div className={cn(theme === "dark" && "dark")} style={{ transform: `scale(${previewZoom})`, transformOrigin: "top left" }}>
						{/* O `dark` fica no wrapper de fora porque a variante do projeto é `&:is(.dark *)`:
						    só descendentes recebem os tokens escuros, então o próprio frame precisa ser um. */}
						<div
							ref={captureRef}
							data-capturing={isCapturing ? "true" : undefined}
							// `text-foreground` é obrigatório, não decorativo: sem ele os títulos sem classe de cor
							// herdam a cor JÁ COMPUTADA lá de fora (tema claro) e somem no fundo escuro.
							className={cn("flex items-center justify-center overflow-hidden text-foreground", background.surface && "bg-background")}
							style={{
								width: frameWidth,
								height: frameHeight,
								padding,
								backgroundColor: background.color ?? undefined,
							}}
						>
							<div style={{ width: contentWidth * scale, height: contentHeight * scale }}>
								<div ref={contentRef} style={{ width: contentWidth, transform: `scale(${scale})`, transformOrigin: "top left" }}>
									{children}
								</div>
							</div>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}

function ControlGroup({ label, children }: { label: string; children: React.ReactNode }) {
	return (
		<div className="flex flex-col gap-2">
			<span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{label}</span>
			{children}
		</div>
	);
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
	return (
		<button
			type="button"
			onClick={onClick}
			className={cn(
				"flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold transition",
				active ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:border-foreground/30",
			)}
		>
			{children}
		</button>
	);
}

function RangeRow({
	label,
	min,
	max,
	step,
	value,
	onChange,
}: {
	label: string;
	min: number;
	max: number;
	step: number;
	value: number;
	onChange: (value: number) => void;
}) {
	return (
		<div className="flex items-center gap-2">
			<input
				type="range"
				min={min}
				max={max}
				step={step}
				value={value}
				onChange={(event) => onChange(Number(event.target.value))}
				className="h-1 flex-1 cursor-pointer appearance-none rounded-full bg-muted accent-primary"
			/>
			<span className="w-16 shrink-0 text-right text-[11px] tabular-nums text-muted-foreground">{label}</span>
		</div>
	);
}
