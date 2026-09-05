"use client";

import type { TGetFiscalSeriesOutputDefault } from "@/app/api/fiscal/series/route";
import ErrorComponent from "@/components/Layouts/ErrorComponent";
import LoadingComponent from "@/components/Layouts/LoadingComponent";
import ControlFiscalSeries from "@/components/Modals/FiscalSeries/ControlFiscalSeries";
import NewFiscalSeries from "@/components/Modals/FiscalSeries/NewFiscalSeries";
import { Button } from "@/components/ui/button";
import { SectionWrapper } from "@/components/ui/section-wrapper";
import { StatBadge } from "@/components/ui/stat-badge";
import { TooltipProvider } from "@/components/ui/tooltip";
import { getErrorMessage } from "@/lib/errors";
import { formatDateAsLocale } from "@/lib/formatting";
import { useFiscalSeries } from "@/lib/queries/fiscal";
import { cn } from "@/lib/utils";
import { useQueryClient } from "@tanstack/react-query";
import { BookText, Calendar, CircleCheck, CircleX, Globe, Hash, PencilIcon, Plus, Receipt } from "lucide-react";
import { useState } from "react";
import { FISCAL_DOCUMENT_TYPE_STYLES, FISCAL_ENVIRONMENT_LABELS, FISCAL_ENVIRONMENT_STYLES } from "../../shared/fiscal-labels";

export function CompanyFiscalSeries() {
	const queryClient = useQueryClient();
	const [newSeriesMenuIsOpen, setNewSeriesMenuIsOpen] = useState(false);
	const [editingSeriesId, setEditingSeriesId] = useState<string | null>(null);
	const { data, queryKey, isLoading, isError, isSuccess, error } = useFiscalSeries();

	const handleOnMutate = async () => await queryClient.cancelQueries({ queryKey });
	const handleOnSettled = async () => await queryClient.invalidateQueries({ queryKey });

	return (
		<SectionWrapper title="SÉRIES FISCAIS" icon={<BookText className="h-4 w-4" />}>
			<span id="fiscal-section-series" />
			<p className="text-xs text-muted-foreground tracking-tight">
				As séries definem o contador de numeração dos documentos fiscais emitidos. Devem estar sincronizadas com a SEFAZ — alterações manuais do próximo
				número podem causar rejeições.
			</p>
			{isLoading ? <LoadingComponent /> : null}
			{isError ? <ErrorComponent msg={getErrorMessage(error)} /> : null}
			{isSuccess ? (
				data.length > 0 ? (
					<div className="flex flex-col gap-2 w-full">
						{data.map((series) => (
							<CompanyFiscalSeriesCard key={series.id} series={series} handleEditClick={() => setEditingSeriesId(series.id)} />
						))}
					</div>
				) : (
					<div className="flex items-center justify-center py-6">
						<p className="text-sm text-muted-foreground">Nenhuma série fiscal cadastrada.</p>
					</div>
				)
			) : null}
			<div className="w-full flex items-center justify-center">
				<Button variant={"ghost"} size={"fit"} className="flex items-center gap-1 px-2 py-1 text-xs" onClick={() => setNewSeriesMenuIsOpen(true)}>
					<Plus className="w-4 h-4 min-w-4 min-h-4" />
					ADICIONAR
				</Button>
			</div>
			{newSeriesMenuIsOpen ? (
				<NewFiscalSeries closeModal={() => setNewSeriesMenuIsOpen(false)} callbacks={{ onMutate: handleOnMutate, onSettled: handleOnSettled }} />
			) : null}
			{editingSeriesId ? (
				<ControlFiscalSeries
					fiscalSeriesId={editingSeriesId}
					closeModal={() => setEditingSeriesId(null)}
					callbacks={{ onMutate: handleOnMutate, onSettled: handleOnSettled }}
				/>
			) : null}
		</SectionWrapper>
	);
}

type CompanyFiscalSeriesCardProps = {
	series: TGetFiscalSeriesOutputDefault[number];
	handleEditClick: () => void;
};
function CompanyFiscalSeriesCard({ series, handleEditClick }: CompanyFiscalSeriesCardProps) {
	return (
		<TooltipProvider>
			<div
				className={cn("bg-card border-primary/20 flex w-full flex-col gap-1 rounded-xl border px-3 py-4 shadow-2xs", !series.ativo ? "opacity-70" : null)}
			>
				<div className="w-full flex items-center justify-between flex-col md:flex-row gap-2">
					<div className="flex items-center gap-2 flex-wrap">
						<h1 className="text-xs font-bold tracking-tight lg:text-sm">SÉRIE {series.serie}</h1>
						<div className="flex items-center gap-1">
							<Hash className="w-4 h-4 min-w-4 min-h-4" />
							<h1 className="py-0.5 text-center text-[0.65rem] font-medium italic">PRÓXIMO Nº {series.proximoNumero}</h1>
						</div>
					</div>
					<div className="flex items-center gap-3 flex-wrap">
						<StatBadge
							icon={<Receipt className="w-4 min-w-4 h-4 min-h-4" />}
							value={series.tipoDocumento}
							tooltipContent="Tipo de documento emitido por esta série"
							className={cn(FISCAL_DOCUMENT_TYPE_STYLES[series.tipoDocumento])}
						/>
						<StatBadge
							icon={<Globe className="w-4 min-w-4 h-4 min-h-4" />}
							value={FISCAL_ENVIRONMENT_LABELS[series.ambiente]}
							tooltipContent={
								series.ambiente === "PRODUCAO" ? "Série em produção (documentos com valor fiscal)" : "Série em homologação (testes sem valor fiscal)"
							}
							className={cn(FISCAL_ENVIRONMENT_STYLES[series.ambiente])}
						/>
						<StatBadge
							icon={series.ativo ? <CircleCheck className="w-4 min-w-4 h-4 min-h-4" /> : <CircleX className="w-4 min-w-4 h-4 min-h-4" />}
							value={series.ativo ? "ATIVA" : "INATIVA"}
							tooltipContent={series.ativo ? "Série disponível para emissão" : "Série desativada"}
							className={cn(series.ativo ? "bg-green-500 dark:bg-green-600 text-white" : "bg-red-500 dark:bg-red-600 text-white")}
						/>
					</div>
				</div>
				<div className="w-full flex items-center justify-between gap-2 flex-wrap">
					<div className="flex items-center gap-2 flex-wrap">
						{series.dataInsercao ? (
							<div className={cn("flex items-center gap-1.5 text-[0.65rem] font-bold text-primary")}>
								<Calendar className="w-3 min-w-3 h-3 min-h-3" />
								<p className="text-xs font-medium tracking-tight uppercase">CADASTRADA EM: {formatDateAsLocale(series.dataInsercao)}</p>
							</div>
						) : null}
					</div>
					<Button variant="ghost" className="flex items-center gap-1.5" size="sm" onClick={handleEditClick}>
						<PencilIcon className="w-3 min-w-3 h-3 min-h-3" />
						EDITAR
					</Button>
				</div>
			</div>
		</TooltipProvider>
	);
}
