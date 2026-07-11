"use client";

import ErrorComponent from "@/components/Layouts/ErrorComponent";
import LoadingComponent from "@/components/Layouts/LoadingComponent";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getErrorMessage } from "@/lib/errors";
import { useAdminBrandAssetTemplates } from "@/lib/queries/brand-assets";
import { Download, Palette } from "lucide-react";

function buildAssetUrl({ template, variant, format, download }: { template: string; variant: string; format: "png" | "svg"; download?: boolean }) {
	const searchParams = new URLSearchParams({ template, variant, format });
	if (download) searchParams.set("download", "true");
	return `/api/admin/brand-assets?${searchParams.toString()}`;
}

export default function BrandAssetsAdminPage() {
	const templatesQuery = useAdminBrandAssetTemplates();

	if (templatesQuery.isLoading) return <LoadingComponent />;
	if (templatesQuery.isError) return <ErrorComponent msg={getErrorMessage(templatesQuery.error)} />;

	const templates = templatesQuery.data ?? [];

	return (
		<div className="flex w-full flex-col gap-6">
			<div className="flex flex-col gap-1">
				<h1 className="flex items-center gap-2 text-2xl font-bold">
					<Palette className="size-6" />
					Assets da Marca
				</h1>
				<p className="text-sm text-muted-foreground">Fundos, capas e outros assets gerados direto da codebase, sempre com os logos e cores oficiais.</p>
			</div>

			{templates.length === 0 ? <p className="text-sm text-muted-foreground">Nenhum template de asset registrado.</p> : null}

			{templates.map((template) => (
				<section key={template.name} className="flex flex-col gap-3">
					<div className="flex flex-wrap items-center gap-2">
						<h2 className="text-lg font-semibold">{template.name}</h2>
						<Badge variant="outline">
							{template.width}×{template.height}
						</Badge>
					</div>
					<p className="text-sm text-muted-foreground">{template.description}</p>

					<div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
						{template.variants.map((variant) => (
							<div key={variant} className="flex flex-col gap-2 rounded-xl border border-border bg-card p-3">
								<div className="overflow-hidden rounded-lg border border-border/60" style={{ aspectRatio: `${template.width} / ${template.height}` }}>
									{/* Preview renderizado sob demanda pela própria rota de assets */}
									{/* eslint-disable-next-line @next/next/no-img-element */}
									<img
										src={buildAssetUrl({ template: template.name, variant, format: "png" })}
										alt={`${template.name} — variante ${variant}`}
										loading="lazy"
										className="h-full w-full object-cover"
									/>
								</div>
								<div className="flex items-center justify-between gap-2">
									<Badge variant="secondary" className="capitalize">
										{variant}
									</Badge>
									<div className="flex items-center gap-1.5">
										<Button asChild variant="outline" size="sm">
											<a href={buildAssetUrl({ template: template.name, variant, format: "png", download: true })}>
												<Download className="size-3.5" />
												PNG
											</a>
										</Button>
										<Button asChild variant="outline" size="sm">
											<a href={buildAssetUrl({ template: template.name, variant, format: "svg", download: true })}>
												<Download className="size-3.5" />
												SVG
											</a>
										</Button>
									</div>
								</div>
							</div>
						))}
					</div>
				</section>
			))}
		</div>
	);
}
