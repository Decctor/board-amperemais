"use client";

import type { TGetFiscalOperationProfilesOutputDefault } from "@/app/api/fiscal/operation-profiles/route";
import ErrorComponent from "@/components/Layouts/ErrorComponent";
import LoadingComponent from "@/components/Layouts/LoadingComponent";
import ControlFiscalOperationProfile from "@/components/Modals/FiscalOperationProfile/ControlFiscalOperationProfile";
import NewFiscalOperationProfile from "@/components/Modals/FiscalOperationProfile/NewFiscalOperationProfile";
import { Button } from "@/components/ui/button";
import { Section } from "@/components/ui/section";
import { StatBadge } from "@/components/ui/stat-badge";
import { TooltipProvider } from "@/components/ui/tooltip";
import { getErrorMessage } from "@/lib/errors";
import { formatDateAsLocale } from "@/lib/formatting";
import { useFiscalOperationProfiles } from "@/lib/queries/fiscal";
import { cn } from "@/lib/utils";
import { useQueryClient } from "@tanstack/react-query";
import { BadgeCheck, BookText, Calendar, CircleCheck, CircleX, FileText, Flag, Hash, MapPin, PencilIcon, Plus, Receipt, User } from "lucide-react";
import { useState } from "react";
import { FISCAL_CONSUMER_PRESENCE_LABELS, FISCAL_DOCUMENT_TYPE_STYLES, FISCAL_FINALITY_LABELS } from "../../shared/fiscal-labels";

export function CompanyFiscalOperationProfiles() {
	const queryClient = useQueryClient();
	const [newProfileMenuIsOpen, setNewProfileMenuIsOpen] = useState(false);
	const [editingProfileId, setEditingProfileId] = useState<string | null>(null);
	const { data, queryKey, isLoading, isError, isSuccess, error } = useFiscalOperationProfiles();

	const handleOnMutate = async () => await queryClient.cancelQueries({ queryKey: queryKey });
	const handleOnSettled = async () => await queryClient.invalidateQueries({ queryKey: queryKey });
	return (
		<Section.Root>
			<Section.Header>
				<Section.Icon>
					<BadgeCheck className="h-4 w-4" />
				</Section.Icon>
				<Section.Title>PERFIS DE OPERAÇÃO FISCAL</Section.Title>
			</Section.Header>
			<Section.Body>
				<span id="fiscal-section-operation-profiles" />
				{isLoading ? <LoadingComponent /> : null}
				{isError ? <ErrorComponent msg={getErrorMessage(error)} /> : null}
				{isSuccess ? (
					data.length > 0 ? (
						<div className="flex flex-col gap-2 w-full">
							{data.map((profile) => (
								<CompanyFiscalOperationProfile key={profile.id} profile={profile} handleEditClick={() => setEditingProfileId(profile.id)} />
							))}
						</div>
					) : (
						<div className="flex items-center justify-center py-6">
							<p className="text-sm text-muted-foreground">Nenhum perfil de operação fiscal encontrado.</p>
						</div>
					)
				) : null}
				<div className="w-full flex items-center justify-center">
					<Button variant={"ghost"} size={"fit"} className="flex items-center gap-1 px-2 py-1 text-xs" onClick={() => setNewProfileMenuIsOpen(true)}>
						<Plus className="w-4 h-4 min-w-4 min-h-4" />
						ADICIONAR
					</Button>
				</div>
				{newProfileMenuIsOpen ? (
					<NewFiscalOperationProfile
						closeModal={() => setNewProfileMenuIsOpen(false)}
						callbacks={{ onMutate: handleOnMutate, onSettled: handleOnSettled }}
					/>
				) : null}
				{editingProfileId ? (
					<ControlFiscalOperationProfile
						operationProfileId={editingProfileId}
						closeModal={() => setEditingProfileId(null)}
						callbacks={{ onMutate: handleOnMutate, onSettled: handleOnSettled }}
					/>
				) : null}
			</Section.Body>
		</Section.Root>
	);
}

type CompanyFiscalOperationProfileProps = {
	profile: TGetFiscalOperationProfilesOutputDefault[number];
	handleEditClick: () => void;
};
function CompanyFiscalOperationProfile({ profile, handleEditClick }: CompanyFiscalOperationProfileProps) {
	return (
		<TooltipProvider>
			<div
				className={cn(
					"bg-card border-primary/20 flex w-full flex-col gap-1 rounded-xl border px-3 py-4 shadow-2xs",
					!profile.ativo ? "opacity-70" : null,
				)}
			>
				<div className="w-full flex items-center justify-between flex-col md:flex-row gap-2">
					<div className="flex items-center gap-2 flex-wrap">
						<h1 className="text-xs font-bold tracking-tight lg:text-sm">{profile.nome}</h1>
						<div className="flex items-center gap-1">
							<Flag className="w-4 h-4 min-w-4 min-h-4" />
							<h1 className="py-0.5 text-center text-[0.65rem] font-medium italic">{FISCAL_FINALITY_LABELS[profile.finalidade]}</h1>
						</div>
						<div className="flex items-center gap-1">
							<User className="w-4 h-4 min-w-4 min-h-4" />
							<h1 className="py-0.5 text-center text-[0.65rem] font-medium italic">
								{profile.consumidorFinal ? "CONSUMIDOR FINAL" : "NÃO CONSUMIDOR FINAL"}
							</h1>
						</div>
					</div>
					<div className="flex items-center gap-3 flex-col md:flex-row gap-y-1">
						<div className="flex items-center gap-3 flex-wrap">
							<StatBadge
								icon={<Receipt className="w-4 min-w-4 h-4 min-h-4" />}
								value={profile.tipoDocumento}
								tooltipContent="Tipo do documento fiscal emitido por este perfil"
								className={cn(FISCAL_DOCUMENT_TYPE_STYLES[profile.tipoDocumento])}
							/>
							<StatBadge
								icon={<Hash className="w-4 min-w-4 h-4 min-h-4" />}
								value={`CFOP ${profile.cfopPadrao}`}
								tooltipContent="CFOP padrão aplicado aos itens da emissão"
							/>
							{profile.seriePadrao ? (
								<StatBadge
									icon={<BookText className="w-4 min-w-4 h-4 min-h-4" />}
									value={`SÉRIE ${profile.seriePadrao.serie}`}
									tooltipContent={`Série padrão — próximo número: ${profile.seriePadrao.proximoNumero}`}
								/>
							) : null}
							<StatBadge
								icon={profile.ativo ? <CircleCheck className="w-4 min-w-4 h-4 min-h-4" /> : <CircleX className="w-4 min-w-4 h-4 min-h-4" />}
								value={profile.ativo ? "ATIVO" : "INATIVO"}
								tooltipContent={profile.ativo ? "Perfil disponível para emissão" : "Perfil desativado"}
								className={cn(profile.ativo ? "bg-green-500 dark:bg-green-600 text-white" : "bg-red-500 dark:bg-red-600 text-white")}
							/>
						</div>
					</div>
				</div>
				{profile.descricao ? <p className="text-xs text-muted-foreground tracking-tight">{profile.descricao}</p> : null}
				<div className="w-full flex items-center justify-between gap-2 flex-wrap">
					<div className="flex items-center gap-2 flex-wrap">
						<div className={cn("flex items-center gap-1.5 text-[0.65rem] font-bold text-primary")}>
							<FileText className="w-3 min-w-3 h-3 min-h-3" />
							<p className="text-xs font-medium tracking-tight uppercase">NATUREZA: {profile.naturezaOperacao}</p>
						</div>
						<div className={cn("flex items-center gap-1.5 text-[0.65rem] font-bold text-primary")}>
							<MapPin className="w-3 min-w-3 h-3 min-h-3" />
							<p className="text-xs font-medium tracking-tight uppercase">PRESENÇA: {FISCAL_CONSUMER_PRESENCE_LABELS[profile.presencaConsumidor]}</p>
						</div>
						{profile.dataInsercao ? (
							<div className={cn("flex items-center gap-1.5 text-[0.65rem] font-bold text-primary")}>
								<Calendar className="w-3 min-w-3 h-3 min-h-3" />
								<p className="text-xs font-medium tracking-tight uppercase">CADASTRADO EM: {formatDateAsLocale(profile.dataInsercao)}</p>
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
