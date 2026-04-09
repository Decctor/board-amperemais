"use client";

import { useRef, useState } from "react";
import ExportButton from "./components/export-button";
import PostPreviewShell from "./components/post-preview-shell";
import CampeoesPost from "./components/designs/campeoes/campeoes-post";

// ─── Design Registry ─────────────────────────────────────────────
const DESIGNS = [
	{
		key: "campeoes",
		label: "Campanha CAMPEÕES — Ampère+",
		component: CampeoesPost,
	},
] as const;

// ─── Size Presets ────────────────────────────────────────────────
const SIZE_PRESETS = [
	{ key: "feed", label: "Feed", width: 1080, height: 1350, description: "1080 × 1350" },
	{ key: "reels", label: "Reels / Stories", width: 1080, height: 1920, description: "1080 × 1920" },
	{ key: "square", label: "Quadrado", width: 1080, height: 1080, description: "1080 × 1080" },
] as const;

export default function MediaPlaygroundPage() {
	const [selectedDesign, setSelectedDesign] = useState(DESIGNS[0].key);
	const [selectedSize, setSelectedSize] = useState(SIZE_PRESETS[0].key);
	const contentRef = useRef<HTMLDivElement>(null);

	const design = DESIGNS.find((d) => d.key === selectedDesign) ?? DESIGNS[0];
	const size = SIZE_PRESETS.find((s) => s.key === selectedSize) ?? SIZE_PRESETS[0];
	const DesignComponent = design.component;

	return (
		<div className="w-full flex flex-col gap-6 p-6">
			{/* ─── Header ────────────────────────────────────── */}
			<div className="flex flex-col gap-1">
				<h1 className="text-xl font-bold tracking-tight">Media Playground</h1>
				<p className="text-sm text-muted-foreground">
					Crie e exporte posts para Instagram com componentes do app.
				</p>
			</div>

			{/* ─── Controls ──────────────────────────────────── */}
			<div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 flex-wrap">
				{/* Design selector */}
				<div className="flex flex-col gap-1.5">
					<label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Design</label>
					<select
						value={selectedDesign}
						onChange={(e) => setSelectedDesign(e.target.value)}
						className="bg-card border border-primary/20 rounded-lg px-3 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/30"
					>
						{DESIGNS.map((d) => (
							<option key={d.key} value={d.key}>
								{d.label}
							</option>
						))}
					</select>
				</div>

				{/* Size toggle buttons */}
				<div className="flex flex-col gap-1.5">
					<label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Formato</label>
					<div className="flex items-center gap-1 bg-secondary rounded-lg p-1">
						{SIZE_PRESETS.map((preset) => (
							<button
								type="button"
								key={preset.key}
								onClick={() => setSelectedSize(preset.key)}
								className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
									selectedSize === preset.key
										? "bg-primary text-primary-foreground shadow-sm"
										: "text-muted-foreground hover:text-foreground"
								}`}
							>
								{preset.label}
								<span className="ml-1.5 opacity-60">{preset.description}</span>
							</button>
						))}
					</div>
				</div>

				{/* Export button */}
				<div className="flex flex-col gap-1.5 sm:ml-auto">
					<label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Exportar</label>
					<ExportButton
						contentRef={contentRef}
						width={size.width}
						height={size.height}
						designName={design.key}
						sizeLabel={size.key}
					/>
				</div>
			</div>

			{/* ─── Preview ───────────────────────────────────── */}
			<div className="w-full flex justify-center py-4 bg-secondary/30 rounded-xl border border-dashed border-primary/10">
				<PostPreviewShell width={size.width} height={size.height} contentRef={contentRef}>
					<DesignComponent width={size.width} height={size.height} />
				</PostPreviewShell>
			</div>
		</div>
	);
}
