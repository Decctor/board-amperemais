"use client";

import { Button } from "@/components/ui/button";
import { StatBadge } from "@/components/ui/stat-badge";
import { cn } from "@/lib/utils";
import type { TUseProductState } from "@/state-hooks/use-product-state";
import { ProductFiscalProfileOriginOptions } from "@/utils/select-options";
import { Barcode, BookOpen, FileText, Hash, Pencil, Ruler, Trash2 } from "lucide-react";

export type ProductFiscalProfileCardProps = {
	fiscalProfile: TUseProductState["state"]["productFiscalProfiles"][number];
	userHasFiscalConfigurePermission?: boolean;
	handleEditClick: () => void;
	handleDeleteClick: () => void;
};

export function ProductFiscalProfileCard({
	fiscalProfile,
	userHasFiscalConfigurePermission = true,
	handleEditClick,
	handleDeleteClick,
}: ProductFiscalProfileCardProps) {
	const origemLabel = ProductFiscalProfileOriginOptions.find((option) => option.value === fiscalProfile.origemMercadoria)?.label ?? fiscalProfile.origemMercadoria;

	return (
		<div className={cn("bg-card border-border flex w-full flex-col gap-2 rounded-xl border px-1.5 py-2 shadow-2xs sm:flex-row")}>
			<div className="flex items-center justify-center">
				<div
					className={cn(
						"flex h-10 min-h-10 w-10 min-w-10 items-center justify-center overflow-hidden rounded-lg",
						fiscalProfile.ativo ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground",
					)}
				>
					<FileText className="h-5 w-5" />
				</div>
			</div>
			<div className="flex grow flex-col gap-1.5">
				<div className="flex w-full flex-col items-start justify-between gap-2 md:flex-row md:items-center">
					<div className="flex flex-wrap items-center gap-2">
						<h1 className="text-xs font-bold tracking-tight lg:text-sm">NCM {fiscalProfile.ncm}</h1>
						<span className="text-[0.65rem] font-medium italic text-foreground/80">{origemLabel}</span>
					</div>
					<div className="flex flex-wrap items-center gap-2">
						{fiscalProfile.cfopPadrao ? (
							<StatBadge icon={<Hash className="h-4 min-h-4 w-4 min-w-4" />} value={`CFOP ${fiscalProfile.cfopPadrao}`} tooltipContent="CFOP padrão do perfil fiscal" />
						) : null}
						<StatBadge
							icon={<Ruler className="h-4 min-h-4 w-4 min-w-4" />}
							value={fiscalProfile.unidadeComercial}
							tooltipContent="Unidade comercial"
						/>
						<StatBadge
							icon={<BookOpen className="h-4 min-h-4 w-4 min-w-4" />}
							value={fiscalProfile.ativo ? "ATIVO" : "INATIVO"}
							tooltipContent={fiscalProfile.ativo ? "Perfil fiscal ativo" : "Perfil fiscal inativo"}
							valueClassName={fiscalProfile.ativo ? "text-emerald-600" : "text-muted-foreground"}
						/>
					</div>
				</div>
				{fiscalProfile.cest || fiscalProfile.codigoBeneficioFiscal ? (
					<div className="flex w-full flex-wrap items-center gap-2">
						{fiscalProfile.cest ? (
							<StatBadge icon={<Barcode className="h-4 min-h-4 w-4 min-w-4" />} value={`CEST ${fiscalProfile.cest}`} tooltipContent="Código CEST" />
						) : null}
						{fiscalProfile.codigoBeneficioFiscal ? (
							<StatBadge
								icon={<Hash className="h-4 min-h-4 w-4 min-w-4" />}
								value={`CBF ${fiscalProfile.codigoBeneficioFiscal}`}
								tooltipContent="Código de benefício fiscal"
							/>
						) : null}
					</div>
				) : null}
				{userHasFiscalConfigurePermission ? (
					<div className="flex w-full items-center justify-end">
						<Button onClick={handleEditClick} size="fit" variant="ghost" className="flex items-center gap-1 px-2 py-1 text-xs">
							<Pencil className="h-4 min-h-4 w-4 min-w-4" />
							EDITAR
						</Button>
						<Button
							onClick={handleDeleteClick}
							size="fit"
							variant="ghost"
							className="flex items-center gap-1 px-2 py-1 text-xs duration-300 ease-in-out hover:bg-destructive/10 hover:text-destructive"
						>
							<Trash2 className="h-4 min-h-4 w-4 min-w-4" />
							REMOVER
						</Button>
					</div>
				) : null}
			</div>
		</div>
	);
}
