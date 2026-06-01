"use client";

import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { ProductFiscalProfileOriginOptions } from "@/utils/select-options";
import { Barcode, BookOpen, FileText, Hash, Pencil, Ruler, Trash2 } from "lucide-react";
import type { ComponentProps, ReactNode } from "react";

export type TProductFiscalProfileCardData = {
	origemMercadoria: string;
	ncm: string;
	cest: string | null;
	cfopPadrao: string | null;
	unidadeComercial: string;
	codigoBeneficioFiscal: string | null;
	ativo: boolean;
};

export type ProductFiscalProfileCardProps = {
	fiscalProfile: TProductFiscalProfileCardData;
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
	const origemLabel =
		ProductFiscalProfileOriginOptions.find((option) => option.value === fiscalProfile.origemMercadoria)?.label ?? fiscalProfile.origemMercadoria;

	return (
		<div className={cn("bg-card border-border flex w-full gap-1.5 rounded-xl border px-1.5 py-2 shadow-2xs")}>
			<div className="flex w-full flex-col items-start justify-between gap-2 md:flex-row md:items-center">
				<div className="flex flex-wrap items-center gap-2">
					<h1 className="text-xs font-bold tracking-tight lg:text-sm">NCM {fiscalProfile.ncm}</h1>
					<span className="text-[0.65rem] font-medium italic text-foreground/80">{origemLabel}</span>
				</div>
				<div className="flex flex-wrap items-center gap-2">
					{fiscalProfile.cfopPadrao ? (
						<FiscalProfileChip icon={<Hash />} label={`CFOP ${fiscalProfile.cfopPadrao}`} tooltip="CFOP padrão do perfil fiscal" />
					) : null}
					<FiscalProfileChip icon={<Ruler />} label={fiscalProfile.unidadeComercial} tooltip="Unidade comercial" />
					<FiscalProfileChip
						icon={<BookOpen />}
						label={fiscalProfile.ativo ? "ATIVO" : "INATIVO"}
						tooltip={fiscalProfile.ativo ? "Perfil fiscal ativo" : "Perfil fiscal inativo"}
						variant={fiscalProfile.ativo ? "success" : "muted"}
					/>
				</div>
			</div>
			{fiscalProfile.cest || fiscalProfile.codigoBeneficioFiscal ? (
				<div className="flex w-full flex-wrap items-center gap-2">
					{fiscalProfile.cest ? <FiscalProfileChip icon={<Barcode />} label={`CEST ${fiscalProfile.cest}`} tooltip="Código CEST" /> : null}
					{fiscalProfile.codigoBeneficioFiscal ? (
						<FiscalProfileChip icon={<Hash />} label={`CBF ${fiscalProfile.codigoBeneficioFiscal}`} tooltip="Código de benefício fiscal" />
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
	);
}

type FiscalProfileChipProps = {
	icon: ReactNode;
	label: ReactNode;
	tooltip: string;
	variant?: ComponentProps<typeof Chip.Root>["variant"];
};

function FiscalProfileChip({ icon, label, tooltip, variant = "secondary" }: FiscalProfileChipProps) {
	return (
		<Tooltip>
			<TooltipTrigger asChild>
				<Chip.Root variant={variant} size="md" shape="xl">
					<Chip.Icon>{icon}</Chip.Icon>
					<Chip.Label caps>{label}</Chip.Label>
				</Chip.Root>
			</TooltipTrigger>
			<TooltipContent>{tooltip}</TooltipContent>
		</Tooltip>
	);
}
