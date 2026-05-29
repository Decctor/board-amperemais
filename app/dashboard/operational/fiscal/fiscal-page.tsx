"use client";
import { TAuthUserSession } from "@/lib/authentication/types";
import { parseAsStringEnum, useQueryState } from "nuqs";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
	AlertTriangle,
	BadgeCheck,
	BookText,
	Calendar,
	Check,
	CheckCheck,
	CircleCheck,
	CircleX,
	Clock,
	DollarSign,
	FileIcon,
	FileText,
	Flag,
	Globe,
	Hash,
	KeyRound,
	MapPin,
	MoreHorizontal,
	PencilIcon,
	Percent,
	Plus,
	Receipt,
	RefreshCcw,
	Save,
	Settings,
	User,
	Zap,
} from "lucide-react";
import { useFiscalDocumentById, useFiscalDocuments, useFiscalOperationProfiles, useFiscalSeries, useFiscalSettings, useFiscalTaxGroups } from "@/lib/queries/fiscal";
import {
	cancelFiscalDocumentMutation,
	emitFiscalDocumentMutation,
	syncFiscalCompany,
	syncFiscalCompanyCertificate,
	syncFiscalDocumentMutation,
	updateFiscalSettings,
} from "@/lib/mutations/fiscal";
import { TUseInternalFiscalSettingsState, useInternalFiscalSettingsState } from "@/state-hooks/use-internal-fiscal-settings-state";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/errors";
import LoadingComponent from "@/components/Layouts/LoadingComponent";
import ErrorComponent from "@/components/Layouts/ErrorComponent";
import { Button } from "@/components/ui/button";
import { SectionWrapper } from "@/components/ui/section-wrapper";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { StatBadge } from "@/components/ui/stat-badge";
import { TooltipProvider } from "@/components/ui/tooltip";
import TextInput from "@/components/Inputs/TextInput";
import UnauthorizedPage from "@/components/Utils/UnauthorizedPage";
import { cn, getCEPInfo } from "@/lib/utils";
import { formatDateAsLocale, formatToCEP, formatToPhone } from "@/lib/formatting";
import SelectInput from "@/components/Inputs/SelectInput";
import { BrazilianCitiesOptionsFromUF, BrazilianStatesOptions } from "@/utils/states-cities";
import { TGetFiscalOperationProfilesOutputDefault } from "@/app/api/fiscal/operation-profiles/route";
import { TGetFiscalSeriesOutputDefault } from "@/app/api/fiscal/series/route";
import type {
	TFiscalDocumentEnvironmentEnum,
	TFiscalDocumentLifecycleStatusEnum,
	TFiscalDocumentStatusEnum,
	TFiscalDocumentTypeEnum,
	TFiscalOperationConsumerPresenceEnum,
	TFiscalOperationFinalityEnum,
} from "@/schemas/enums";
import NewFiscalOperationProfile from "@/components/Modals/FiscalOperationProfile/NewFiscalOperationProfile";
import ControlFiscalOperationProfile from "@/components/Modals/FiscalOperationProfile/ControlFiscalOperationProfile";
import NewFiscalSeries from "@/components/Modals/FiscalSeries/NewFiscalSeries";
import ControlFiscalSeries from "@/components/Modals/FiscalSeries/ControlFiscalSeries";
import NewFiscalTaxGroup from "@/components/Modals/FiscalTaxGroup/NewFiscalTaxGroup";
import ControlFiscalTaxGroup from "@/components/Modals/FiscalTaxGroup/ControlFiscalTaxGroup";
import { TGetFiscalTaxGroupsOutputDefault } from "@/app/api/fiscal/tax-groups/route";
import { Input } from "@/components/ui/input";
import GeneralPaginationComponent from "@/components/Utils/Pagination";
import { TGetFiscalDocumentsOutputById, TGetFiscalDocumentsOutputDefault } from "@/app/api/fiscal/documents/route";
import ResponsiveMenu from "@/components/Utils/ResponsiveMenu";
import { uploadFile } from "@/lib/files-storage";
import NumberInput from "@/components/Inputs/NumberInput";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
type FiscalPageProps = {
	user: TAuthUserSession["user"];
	organization: NonNullable<TAuthUserSession["membership"]>["organizacao"];
	userHasFiscalViewPermission: boolean;
	userHasFiscalConfigurePermission: boolean;
	userHasFiscalEmitPermission: boolean;
	userHasFiscalCancelPermission: boolean;
};
export default function FiscalPage({
	organization,
	userHasFiscalViewPermission,
	userHasFiscalConfigurePermission,
	userHasFiscalEmitPermission,
	userHasFiscalCancelPermission,
}: FiscalPageProps) {
	const [viewMode, setViewMode] = useQueryState("view", parseAsStringEnum(["documents", "configuration"]));
	return (
		<div className="w-full h-full flex flex-col gap-3">
			<Tabs value={viewMode ?? "documents"} onValueChange={(v) => setViewMode(v as typeof viewMode)}>
				<TabsList className="flex items-center gap-1.5 w-fit h-fit self-start rounded-lg px-2 py-1">
					<TabsTrigger value="documents" className="flex items-center gap-1.5 px-2 py-2 rounded-lg">
						<BookText className="w-4 h-4 min-w-4 min-h-4" />
						Documentos
					</TabsTrigger>
					<TabsTrigger value="configuration" className="flex items-center gap-1.5 px-2 py-2 rounded-lg">
						<Settings className="w-4 h-4 min-w-4 min-h-4" />
						Configuração
					</TabsTrigger>
				</TabsList>
				<TabsContent value="configuration" className="flex flex-col gap-3">
					{userHasFiscalConfigurePermission ? (
						<FiscalConfigurationsView organizationId={organization.id} userHasFiscalConfigurePermission={userHasFiscalConfigurePermission} />
					) : (
						<UnauthorizedPage message="Oops,  você não possui permissão para visualizar o módulo fiscal." />
					)}
				</TabsContent>
				<TabsContent value="documents" className="flex flex-col gap-3">
					{userHasFiscalViewPermission ? (
						<FiscalDocumentsView
							userHasFiscalEmitPermission={userHasFiscalEmitPermission}
							userHasFiscalCancelPermission={userHasFiscalCancelPermission}
						/>
					) : (
						<UnauthorizedPage message="Oops,  você não possui permissão para visualizar o módulo fiscal." />
					)}
				</TabsContent>
				{/* <TabsContent value="stats" className="flex flex-col gap-3">
					<FinancesStatsView />
				</TabsContent>
				<TabsContent value="accounting-entries" className="flex flex-col gap-3">
					<FinancesAccountingEntriesView />
				</TabsContent>
				<TabsContent value="financial-transactions" className="flex flex-col gap-3">
					<FinancesTransactionsView />
				</TabsContent>
				<TabsContent value="financial-accounts" className="flex flex-col gap-3">
					<FinancesAccountsView />
				</TabsContent> */}
			</Tabs>
		</div>
	);
}

function FiscalDocumentsView({
	userHasFiscalEmitPermission,
	userHasFiscalCancelPermission,
}: {
	userHasFiscalEmitPermission: boolean;
	userHasFiscalCancelPermission: boolean;
}) {
	const [selectedDocumentId, setSelectedDocumentId] = useState<string | null>(null);
	const { data, isLoading, isError, isSuccess, error, filters, updateFilters } = useFiscalDocuments();

	const documents = data?.documents ?? [];
	const documentsMatched = data?.documentsMatched ?? 0;
	const totalPages = data?.totalPages ?? 0;
	const documentsShowing = documents.length;
	return (
		<div className="w-full flex flex-col gap-3">
			<div className="w-full flex items-center gap-2 flex-col-reverse lg:flex-row">
				<Input
					value={filters.search ?? ""}
					placeholder="Pesquisar documento fiscal..."
					onChange={(e) => updateFilters({ search: e.target.value })}
					className="grow rounded-xl"
				/>
			</div>
			<GeneralPaginationComponent
				activePage={filters.page}
				queryLoading={isLoading}
				selectPage={(page) => updateFilters({ page })}
				totalPages={totalPages || 0}
				itemsMatchedText={
					documentsMatched > 0 ? `${documentsMatched} documentos fiscais encontrados.` : `${documentsMatched} documento fiscal encontrado.`
				}
				itemsShowingText={documentsShowing > 0 ? `Mostrando ${documentsShowing} documentos fiscais.` : `Mostrando ${documentsShowing} documento fiscal.`}
			/>
			{isLoading ? <LoadingComponent /> : null}
			{isError ? <ErrorComponent msg={getErrorMessage(error)} /> : null}
			{isSuccess && documents ? (
				documents.length > 0 ? (
					documents.map((document) => (
						<FiscalDocumentCard
							key={document.id}
							document={document}
							userHasFiscalEmitPermission={userHasFiscalEmitPermission}
							userHasFiscalCancelPermission={userHasFiscalCancelPermission}
							openDetails={() => setSelectedDocumentId(document.id)}
						/>
					))
				) : (
					<p className="w-full tracking-tight text-center">Nenhum documento fiscal encontrado.</p>
				)
			) : null}
			{selectedDocumentId ? (
				<FiscalDocumentDetailsMenu
					documentId={selectedDocumentId}
					closeMenu={() => setSelectedDocumentId(null)}
					userHasFiscalEmitPermission={userHasFiscalEmitPermission}
					userHasFiscalCancelPermission={userHasFiscalCancelPermission}
				/>
			) : null}
		</div>
	);
}

function FiscalDocumentCard({
	document,
	userHasFiscalEmitPermission,
	userHasFiscalCancelPermission,
	openDetails,
}: {
	document: TGetFiscalDocumentsOutputDefault["documents"][number];
	userHasFiscalEmitPermission: boolean;
	userHasFiscalCancelPermission: boolean;
	openDetails: () => void;
}) {
	const isCancelled = document.status === "CANCELADA" || document.statusInterno === "CANCELADO";
	const isErrored = document.statusInterno === "ERRO" || document.statusInterno === "REJEITADO";
	const shortKey = shortenAccessKey(document.chaveAcesso);
	const titleNumber = document.numero ? `${document.tipo} Nº ${document.numero}` : `${document.tipo} — ${document.referencia}`;
	const emissionDate = document.dataAutorizacao ?? document.dataEmissao ?? document.dataInsercao;
	return (
		<TooltipProvider>
			<div
				className={cn(
					"bg-card border-primary/20 flex w-full flex-col gap-1 rounded-xl border px-3 py-4 shadow-2xs",
					isCancelled ? "opacity-70" : null,
					isErrored ? "border-rose-400/60 dark:border-rose-500/60" : null,
				)}
			>
				<div className="w-full flex items-center justify-between flex-col md:flex-row gap-2">
					<div className="flex items-center gap-2 flex-wrap">
						<h1 className="text-xs font-bold tracking-tight lg:text-sm">{titleNumber}</h1>
						{document.serie ? (
							<div className="flex items-center gap-1">
								<BookText className="w-4 h-4 min-w-4 min-h-4" />
								<h1 className="py-0.5 text-center text-[0.65rem] font-medium italic text-primary/80">SÉRIE {document.serie}</h1>
							</div>
						) : null}
						{document.referencia && document.numero ? (
							<div className="flex items-center gap-1">
								<FileText className="w-4 h-4 min-w-4 min-h-4" />
								<h1 className="py-0.5 text-center text-[0.65rem] font-medium italic text-primary/80">REF: {document.referencia}</h1>
							</div>
						) : null}
					</div>
					<div className="flex items-center gap-3 flex-wrap">
						<StatBadge
							icon={<Receipt className="w-4 min-w-4 h-4 min-h-4" />}
							value={document.tipo}
							tooltipContent="Tipo do documento fiscal"
							className={cn(FISCAL_DOCUMENT_TYPE_STYLES[document.tipo])}
						/>
						<StatBadge
							icon={<Globe className="w-4 min-w-4 h-4 min-h-4" />}
							value={FISCAL_ENVIRONMENT_LABELS[document.ambiente]}
							tooltipContent={
								document.ambiente === "PRODUCAO"
									? "Documento emitido no ambiente oficial da SEFAZ"
									: "Documento emitido em ambiente de homologação (sem valor fiscal)"
							}
							className={cn(FISCAL_ENVIRONMENT_STYLES[document.ambiente])}
						/>
						<StatBadge
							icon={<BadgeCheck className="w-4 min-w-4 h-4 min-h-4" />}
							value={FISCAL_DOCUMENT_STATUS_LABELS[document.status]}
							tooltipContent="Status junto à SEFAZ"
							className={cn(FISCAL_DOCUMENT_STATUS_STYLES[document.status])}
						/>
						<StatBadge
							icon={<Clock className="w-4 min-w-4 h-4 min-h-4" />}
							value={FISCAL_LIFECYCLE_STATUS_LABELS[document.statusInterno]}
							tooltipContent="Status interno do ciclo de vida do documento"
							className={cn(FISCAL_LIFECYCLE_STATUS_STYLES[document.statusInterno])}
						/>
						<FiscalDocumentQuickActions
							document={document}
							userHasFiscalEmitPermission={userHasFiscalEmitPermission}
							userHasFiscalCancelPermission={userHasFiscalCancelPermission}
							openDetails={openDetails}
						/>
					</div>
				</div>

				<div className="w-full flex items-center justify-between gap-2 flex-wrap">
					<div className="flex items-center gap-2 flex-wrap">
						{shortKey ? (
							<div className={cn("flex items-center gap-1.5 text-[0.65rem] font-bold text-primary")}>
								<KeyRound className="w-3 min-w-3 h-3 min-h-3" />
								<p className="text-xs font-medium tracking-tight uppercase font-mono" title={document.chaveAcesso ?? undefined}>
									CHAVE: {shortKey}
								</p>
							</div>
						) : null}
						{document.protocolo ? (
							<div className={cn("flex items-center gap-1.5 text-[0.65rem] font-bold text-primary")}>
								<Hash className="w-3 min-w-3 h-3 min-h-3" />
								<p className="text-xs font-medium tracking-tight uppercase">PROTOCOLO: {document.protocolo}</p>
							</div>
						) : null}
						{document.venda?.valorTotal != null ? (
							<div className={cn("flex items-center gap-1.5 text-[0.65rem] font-bold text-primary")}>
								<DollarSign className="w-3 min-w-3 h-3 min-h-3" />
								<p className="text-xs font-medium tracking-tight uppercase">VALOR: {formatBRL(Number(document.venda.valorTotal))}</p>
							</div>
						) : null}
						{document.tentativasEnvio > 0 ? (
							<div className={cn("flex items-center gap-1.5 text-[0.65rem] font-bold text-primary")}>
								<Zap className="w-3 min-w-3 h-3 min-h-3" />
								<p className="text-xs font-medium tracking-tight uppercase">TENTATIVAS: {document.tentativasEnvio}</p>
							</div>
						) : null}
						{emissionDate ? (
							<div className={cn("flex items-center gap-1.5 text-[0.65rem] font-bold text-primary")}>
								<Calendar className="w-3 min-w-3 h-3 min-h-3" />
								<p className="text-xs font-medium tracking-tight uppercase">
									{document.dataAutorizacao ? "AUTORIZADO" : document.dataEmissao ? "EMITIDO" : "CRIADO"} EM: {formatDateAsLocale(emissionDate)}
								</p>
							</div>
						) : null}
						{document.dataCancelamento ? (
							<div className={cn("flex items-center gap-1.5 text-[0.65rem] font-bold text-rose-600 dark:text-rose-400")}>
								<CircleX className="w-3 min-w-3 h-3 min-h-3" />
								<p className="text-xs font-medium tracking-tight uppercase">CANCELADO EM: {formatDateAsLocale(document.dataCancelamento)}</p>
							</div>
						) : null}
					</div>
				</div>

				{isErrored && Array.isArray(document.mensagens) && document.mensagens.length > 0 ? (
					<div className="w-full flex items-start gap-1.5 mt-1 rounded-md bg-rose-50 dark:bg-rose-950/40 px-2 py-1.5">
						<AlertTriangle className="w-3.5 h-3.5 min-w-3.5 min-h-3.5 text-rose-600 dark:text-rose-400 mt-0.5" />
						<p className="text-[0.7rem] font-medium tracking-tight text-rose-700 dark:text-rose-300 line-clamp-2">
							{document.mensagens.map((m) => (typeof m === "string" ? m : JSON.stringify(m))).join(" · ")}
						</p>
					</div>
				) : null}
			</div>
		</TooltipProvider>
	);
}

type FiscalDocumentForList = TGetFiscalDocumentsOutputDefault["documents"][number] | TGetFiscalDocumentsOutputById["document"];

function FiscalDocumentQuickActions({
	document,
	userHasFiscalEmitPermission,
	userHasFiscalCancelPermission,
	openDetails,
}: {
	document: FiscalDocumentForList;
	userHasFiscalEmitPermission: boolean;
	userHasFiscalCancelPermission: boolean;
	openDetails: () => void;
}) {
	const queryClient = useQueryClient();
	const canSync = userHasFiscalEmitPermission;
	const canEmitAgain =
		userHasFiscalEmitPermission &&
		!!document.vendaId &&
		document.tipo !== "NFSE" &&
		document.statusInterno !== "AUTORIZADO" &&
		document.statusInterno !== "EM_PROCESSAMENTO";
	const canCancel = userHasFiscalCancelPermission && document.status === "AUTORIZADA" && document.statusInterno === "AUTORIZADO";
	const hasXml = !!document.xmlStoragePath || document.statusInterno === "AUTORIZADO";
	const hasPdf = !!document.pdfStoragePath || document.statusInterno === "AUTORIZADO";

	const invalidateFiscalDocuments = async () => {
		await queryClient.invalidateQueries({ queryKey: ["fiscal-documents"] });
		await queryClient.invalidateQueries({ queryKey: ["fiscal-document-by-id", document.id] });
	};

	const { mutate: syncDocument, isPending: isSyncing } = useMutation({
		mutationKey: ["sync-fiscal-document", document.id],
		mutationFn: syncFiscalDocumentMutation,
		onSuccess: (data) => {
			toast.success(data.message);
			invalidateFiscalDocuments();
		},
		onError: (error) => toast.error(getErrorMessage(error)),
	});

	const { mutate: emitAgain, isPending: isEmitting } = useMutation({
		mutationKey: ["emit-fiscal-document-again", document.id],
		mutationFn: emitFiscalDocumentMutation,
		onSuccess: (data) => {
			toast.success(data.message);
			invalidateFiscalDocuments();
		},
		onError: (error) => toast.error(getErrorMessage(error)),
	});

	const { mutate: cancelDocument, isPending: isCancelling } = useMutation({
		mutationKey: ["cancel-fiscal-document", document.id],
		mutationFn: cancelFiscalDocumentMutation,
		onSuccess: (data) => {
			toast.success(data.message);
			invalidateFiscalDocuments();
		},
		onError: (error) => toast.error(getErrorMessage(error)),
	});

	const actionIsPending = isSyncing || isEmitting || isCancelling;

	const openAsset = (asset: "xml" | "pdf") => {
		window.open(`/api/fiscal/document-assets?documentId=${document.id}&asset=${asset}`, "_blank", "noopener,noreferrer");
	};

	const handleCancel = () => {
		const reason = window.prompt("Informe o motivo do cancelamento fiscal.");
		if (!reason?.trim()) return;
		cancelDocument({ documentId: document.id, reason: reason.trim() });
	};

	const handleEmitAgain = () => {
		if (!document.vendaId) {
			toast.error("Documento fiscal sem venda vinculada para reemissão.");
			return;
		}
		if (document.tipo === "NFSE") {
			toast.error("Reemissão de NFS-e ainda não está disponível.");
			return;
		}
		emitAgain({ vendaId: document.vendaId, tipo: document.tipo });
	};

	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<Button variant="ghost" size="icon" disabled={actionIsPending} className="h-8 w-8 rounded-full">
					<MoreHorizontal className="h-4 w-4" />
				</Button>
			</DropdownMenuTrigger>
			<DropdownMenuContent align="end" className="w-56">
				<DropdownMenuLabel>Ações rápidas</DropdownMenuLabel>
				<DropdownMenuItem onClick={openDetails}>
					<FileText className="h-4 w-4" />
					Ver detalhes
				</DropdownMenuItem>
				<DropdownMenuSeparator />
				<DropdownMenuItem disabled={!canSync || actionIsPending} onClick={() => syncDocument({ documentId: document.id })}>
					<RefreshCcw className="h-4 w-4" />
					Sincronizar
				</DropdownMenuItem>
				<DropdownMenuItem disabled={!canEmitAgain || actionIsPending} onClick={handleEmitAgain}>
					<Zap className="h-4 w-4" />
					Emitir novamente
				</DropdownMenuItem>
				<DropdownMenuItem disabled={!canCancel || actionIsPending} onClick={handleCancel} variant="destructive">
					<CircleX className="h-4 w-4" />
					Cancelar
				</DropdownMenuItem>
				<DropdownMenuSeparator />
				<DropdownMenuItem disabled={!hasXml} onClick={() => openAsset("xml")}>
					<FileIcon className="h-4 w-4" />
					Baixar XML
				</DropdownMenuItem>
				<DropdownMenuItem disabled={!hasPdf} onClick={() => openAsset("pdf")}>
					<FileText className="h-4 w-4" />
					Baixar PDF
				</DropdownMenuItem>
			</DropdownMenuContent>
		</DropdownMenu>
	);
}

function FiscalDocumentDetailsMenu({
	documentId,
	closeMenu,
	userHasFiscalEmitPermission,
	userHasFiscalCancelPermission,
}: {
	documentId: string;
	closeMenu: () => void;
	userHasFiscalEmitPermission: boolean;
	userHasFiscalCancelPermission: boolean;
}) {
	const { data, isLoading, isError, error } = useFiscalDocumentById(documentId);
	const document = data?.document;
	const events = data?.events ?? [];

	return (
		<ResponsiveMenu
			menuTitle="DOCUMENTO FISCAL"
			menuDescription="Revise o histórico do documento e use as ações operacionais quando necessário."
			menuActionButtonText="FECHAR"
			menuCancelButtonText="CANCELAR"
			actionFunction={closeMenu}
			actionIsLoading={false}
			stateIsLoading={isLoading}
			stateError={isError ? getErrorMessage(error) : null}
			closeMenu={closeMenu}
			dialogVariant="lg"
			drawerVariant="lg"
		>
			{document ? (
				<div className="flex w-full flex-col gap-3">
					<div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border bg-secondary/20 p-3">
						<div className="flex flex-col gap-1">
							<h3 className="text-sm font-bold tracking-tight">
								{document.tipo} {document.numero ? `Nº ${document.numero}` : document.referencia}
							</h3>
							<p className="text-xs text-muted-foreground">Status: {FISCAL_LIFECYCLE_STATUS_LABELS[document.statusInterno]}</p>
						</div>
						<FiscalDocumentQuickActions
							document={document}
							userHasFiscalEmitPermission={userHasFiscalEmitPermission}
							userHasFiscalCancelPermission={userHasFiscalCancelPermission}
							openDetails={() => undefined}
						/>
					</div>
					<div className="grid grid-cols-1 gap-2 md:grid-cols-2">
						<div className="rounded-lg border p-3">
							<p className="text-xs font-semibold text-muted-foreground">CHAVE</p>
							<p className="break-all text-sm font-medium">{document.chaveAcesso ?? "Não informada"}</p>
						</div>
						<div className="rounded-lg border p-3">
							<p className="text-xs font-semibold text-muted-foreground">PROTOCOLO</p>
							<p className="text-sm font-medium">{document.protocolo ?? "Não informado"}</p>
						</div>
					</div>
					<div className="flex flex-col gap-2 rounded-lg border p-3">
						<h3 className="text-sm font-bold tracking-tight">Eventos</h3>
						{events.length > 0 ? (
							events.map((event) => (
								<div key={event.id} className="rounded-md bg-secondary/30 p-2">
									<div className="flex flex-wrap items-center justify-between gap-2">
										<p className="text-xs font-bold">{event.tipo}</p>
										<p className="text-xs text-muted-foreground">{formatDateAsLocale(event.dataInsercao)}</p>
									</div>
									{event.descricao ? <p className="mt-1 text-xs text-muted-foreground">{event.descricao}</p> : null}
								</div>
							))
						) : (
							<p className="text-sm text-muted-foreground">Nenhum evento encontrado.</p>
						)}
					</div>
				</div>
			) : null}
		</ResponsiveMenu>
	);
}

type FiscalConfigurationsViewProps = {
	organizationId: string;
	userHasFiscalConfigurePermission: boolean;
};
function FiscalConfigurationsView({ organizationId, userHasFiscalConfigurePermission }: FiscalConfigurationsViewProps) {
	const canEdit = userHasFiscalConfigurePermission;
	const queryClient = useQueryClient();
	const { data, isLoading, isError, error, queryKey } = useFiscalSettings();
	const { state, redefineState, updateSettings, updateFiscalConfig } = useInternalFiscalSettingsState({
		initialState: {
			fiscalProvedor: data?.fiscalProvedor ?? "MANUAL",
			fiscalEmissaoAutomatica: data?.fiscalEmissaoAutomatica ?? false,
			fiscalConfiguracao: data?.fiscalConfiguracao ?? undefined,
		},
	});

	const handleOnMutate = async () => await queryClient.cancelQueries({ queryKey: queryKey });
	const handleOnSettled = async () => await queryClient.invalidateQueries({ queryKey: queryKey });
	useEffect(() => {
		if (data) {
			redefineState({
				fiscalProvedor: data.fiscalProvedor ?? "MANUAL",
				fiscalEmissaoAutomatica: data.fiscalEmissaoAutomatica ?? false,
				fiscalConfiguracao: data.fiscalConfiguracao ?? state.fiscalConfiguracao,
			});
		}
	}, [data, redefineState]);

	const saveMutation = useMutation({
		mutationFn: () =>
			updateFiscalSettings({
				fiscalProvedor: state.fiscalProvedor,
				fiscalEmissaoAutomatica: state.fiscalEmissaoAutomatica,
				fiscalConfiguracao: state.fiscalConfiguracao,
			}),
		onMutate: () => {
			handleOnMutate();
		},
		onSuccess: (response) => {
			toast.success(response.message);
			handleOnSettled();
		},
		onError: (mutationError) => toast.error(getErrorMessage(mutationError)),
	});

	const syncMutation = useMutation({
		mutationFn: syncFiscalCompany,
		onSuccess: (response) => {
			toast.success(response.message);
		},
		onError: (mutationError) => toast.error(getErrorMessage(mutationError)),
	});

	if (isLoading) return <LoadingComponent />;
	if (isError) return <ErrorComponent msg={getErrorMessage(error)} />;

	return (
		<div className="flex w-full flex-col gap-6">
			<div className="flex flex-col gap-2 border-b pb-4 lg:flex-row lg:items-center lg:justify-between">
				<div className="space-y-1">
					<h2 className="text-xl font-semibold tracking-tight">Configuração Fiscal</h2>
					<p className="text-sm text-muted-foreground">Configure o provedor fiscal, dados da empresa e sincronização com a Nuvem Fiscal.</p>
				</div>
				<div className="flex items-center gap-2">
					<Button variant="outline" onClick={() => syncMutation.mutate()} disabled={syncMutation.isPending || !canEdit}>
						<RefreshCcw className="mr-2 h-4 w-4" />
						SINCRONIZAR EMPRESA
					</Button>
					<Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending || !canEdit}>
						<Save className="mr-2 h-4 w-4" />
						SALVAR
					</Button>
				</div>
			</div>

			<SectionWrapper title="OPERACIONAL" icon={<BadgeCheck className="h-4 w-4" />}>
				<div className="flex items-center justify-between rounded-lg border p-4">
					<div>
						<Label>EMISSÃO AUTOMÁTICA</Label>
						<p className="text-sm text-muted-foreground">Dispara emissão ao confirmar a venda.</p>
					</div>
					<Switch checked={state.fiscalEmissaoAutomatica} onCheckedChange={(checked) => updateSettings({ fiscalEmissaoAutomatica: checked })} />
				</div>
			</SectionWrapper>

			<CompanyBasicInformation
				organizationId={organizationId}
				fiscalConfig={state.fiscalConfiguracao}
				updateFiscalConfig={updateFiscalConfig}
				callbacks={{ onMutate: handleOnMutate, onSettled: handleOnSettled }}
			/>
			<CompanyFiscalSeries />
			<CompanyFiscalOperationProfiles />
			<CompanyFiscalTaxGroups />
		</div>
	);
}

type CompanyBasicInformationProps = {
	organizationId: string;
	fiscalConfig: TUseInternalFiscalSettingsState["state"]["fiscalConfiguracao"];
	updateFiscalConfig: TUseInternalFiscalSettingsState["updateFiscalConfig"];
	callbacks: {
		onMutate: () => void;
		onSettled: () => void;
	};
};
function CompanyBasicInformation({ organizationId, fiscalConfig, updateFiscalConfig, callbacks }: CompanyBasicInformationProps) {
	const [certificateMenuOpen, setCertificateMenuOpen] = useState(false);
	async function setAddressDataByCEP(cep: string) {
		const addressInfo = await getCEPInfo(cep);
		const toastID = toast.loading("Buscando informações sobre o CEP...", {
			duration: 2000,
		});
		setTimeout(() => {
			if (addressInfo) {
				toast.dismiss(toastID);
				toast.success("Dados do CEP buscados com sucesso.", {
					duration: 1000,
				});
				updateFiscalConfig({
					endereco: {
						...fiscalConfig.endereco,
						logradouro: addressInfo.logradouro,
						bairro: addressInfo.bairro,
						uf: addressInfo.uf,
						cidade: addressInfo.localidade.toUpperCase(),
						cep: cep,
						codigoMunicipio: addressInfo.ibge ?? "",
					},
				});
			}
		}, 1000);
	}
	return (
		<SectionWrapper title="EMPRESA FISCAL" icon={<Receipt className="h-4 w-4" />}>
			<TextInput
				label="RAZÃO SOCIAL"
				value={fiscalConfig.nomeRazaoSocial}
				placeholder="Razão social"
				handleChange={(value) => updateFiscalConfig({ nomeRazaoSocial: value })}
			/>
			<div className="w-full flex items-center gap-3 flex-col lg:flex-row">
				<div className="w-full lg:w-1/2">
					<TextInput
						label="NOME FANTASIA"
						value={fiscalConfig.nomeFantasia ?? ""}
						placeholder="Nome fantasia"
						handleChange={(value) => updateFiscalConfig({ nomeFantasia: value })}
					/>
				</div>
				<div className="w-full lg:w-1/2">
					<TextInput
						label="CPF/CNPJ"
						value={fiscalConfig.cpfCnpj}
						placeholder="Somente números"
						handleChange={(value) => updateFiscalConfig({ cpfCnpj: value })}
					/>
				</div>
			</div>

			<div className="w-full flex items-center gap-3 flex-col lg:flex-row">
				<div className="w-full lg:w-1/3">
					<SelectInput
						label="REGIME TRIBUTÁRIO"
						value={fiscalConfig.regimeTributario?.toString()}
						options={[
							{ id: 1, label: "1", value: "1" },
							{ id: 2, label: "2", value: "2" },
							{ id: 3, label: "3", value: "3" },
							{ id: 4, label: "4", value: "4" },
						]}
						resetOptionLabel="Selecione um regime tributário"
						handleChange={(value) => updateFiscalConfig({ regimeTributario: Number(value) })}
						onReset={() => updateFiscalConfig({ regimeTributario: undefined })}
					/>
				</div>
				<div className="w-full lg:w-1/3">
					<TextInput
						label="INSCRIÇÃO ESTADUAL"
						value={fiscalConfig.inscricaoEstadual ?? ""}
						placeholder="Inscrição estadual"
						handleChange={(value) => updateFiscalConfig({ inscricaoEstadual: value })}
					/>
				</div>
				<div className="w-full lg:w-1/3">
					<TextInput
						label="INSCRIÇÃO MUNICIPAL"
						value={fiscalConfig.inscricaoMunicipal ?? ""}
						placeholder="Inscrição municipal"
						handleChange={(value) => updateFiscalConfig({ inscricaoMunicipal: value })}
					/>
				</div>
			</div>
			<div className="w-full flex items-center gap-3 flex-col lg:flex-row">
				<div className="w-full lg:w-1/2">
					<TextInput
						label="EMAIL FISCAL"
						value={fiscalConfig.emailFiscal ?? ""}
						placeholder="financeiro@empresa.com"
						handleChange={(value) => updateFiscalConfig({ emailFiscal: value })}
					/>
				</div>
				<div className="w-full lg:w-1/2">
					<TextInput
						label="TELEFONE FISCAL"
						value={fiscalConfig.telefoneFiscal ?? ""}
						placeholder="Telefone fiscal"
						handleChange={(value) => updateFiscalConfig({ telefoneFiscal: formatToPhone(value) })}
					/>
				</div>
			</div>
			<div className="w-full flex items-center gap-3 flex-col lg:flex-row">
				<div className="w-full lg:w-1/3">
					<TextInput
						label="CEP"
						value={fiscalConfig.endereco.cep}
						placeholder="CEP"
						handleChange={(value) => {
							if (value.length === 9) {
								setAddressDataByCEP(value);
							}
							updateFiscalConfig({ endereco: { ...fiscalConfig.endereco, cep: formatToCEP(value) } });
						}}
					/>
				</div>
				<div className="w-full lg:w-1/3">
					<SelectInput
						label="UF"
						value={fiscalConfig.endereco.uf}
						options={BrazilianStatesOptions}
						resetOptionLabel="Selecione uma UF"
						handleChange={(value) =>
							updateFiscalConfig({ endereco: { ...fiscalConfig.endereco, uf: value, cidade: BrazilianCitiesOptionsFromUF(value ?? null)[0]?.value } })
						}
						onReset={() => updateFiscalConfig({ endereco: { ...fiscalConfig.endereco, uf: "", cidade: "" } })}
					/>
				</div>
				<div className="w-full lg:w-1/3">
					<SelectInput
						label="CIDADE"
						value={fiscalConfig.endereco.cidade}
						options={BrazilianCitiesOptionsFromUF(fiscalConfig.endereco.uf ?? null)}
						resetOptionLabel="Selecione uma cidade"
						handleChange={(value) => updateFiscalConfig({ endereco: { ...fiscalConfig.endereco, cidade: value } })}
						onReset={() => updateFiscalConfig({ endereco: { ...fiscalConfig.endereco, cidade: "" } })}
					/>
				</div>
			</div>
			<div className="w-full flex items-center gap-3 flex-col lg:flex-row">
				<div className="w-full lg:w-1/2">
					<TextInput
						label="CÓDIGO MUNICÍPIO"
						value={fiscalConfig.endereco.codigoMunicipio}
						placeholder="Código IBGE"
						handleChange={(value) => updateFiscalConfig({ endereco: { ...fiscalConfig.endereco, codigoMunicipio: value } })}
					/>
				</div>
				<div className="w-full lg:w-1/2">
					<TextInput
						label="BAIRRO"
						value={fiscalConfig.endereco.bairro}
						placeholder="Bairro"
						handleChange={(value) => updateFiscalConfig({ endereco: { ...fiscalConfig.endereco, bairro: value } })}
					/>
				</div>
			</div>
			<div className="w-full flex items-center gap-3 flex-col lg:flex-row">
				<div className="w-full lg:w-1/2">
					<TextInput
						label="LOGRADOURO"
						value={fiscalConfig.endereco.logradouro}
						placeholder="Rua / avenida"
						handleChange={(value) => updateFiscalConfig({ endereco: { ...fiscalConfig.endereco, logradouro: value } })}
					/>
				</div>
				<div className="w-full lg:w-1/2">
					<TextInput
						label="NÚMERO"
						value={fiscalConfig.endereco.numero}
						placeholder="Número"
						handleChange={(value) => updateFiscalConfig({ endereco: { ...fiscalConfig.endereco, numero: value } })}
					/>
				</div>
			</div>
			<div className="w-full flex items-center gap-3 flex-col lg:flex-row">
				<div className="w-full lg:w-1/3">
					<TextInput label="CNAE" value={fiscalConfig.cnae ?? ""} placeholder="CNAE" handleChange={(value) => updateFiscalConfig({ cnae: value })} />
				</div>
				<div className="w-full lg:w-1/3">
					<NumberInput
						label="ID-CSC"
						value={fiscalConfig.nuvemFiscal.nfce.idCsc ?? null}
						placeholder="ID-CSC"
						handleChange={(value) =>
							updateFiscalConfig({ nuvemFiscal: { ...fiscalConfig.nuvemFiscal, nfce: { ...fiscalConfig.nuvemFiscal.nfce, idCsc: value } } })
						}
					/>
				</div>
				<div className="w-full lg:w-1/3">
					<TextInput
						label="CSC"
						value={fiscalConfig.nuvemFiscal.nfce.csc ?? ""}
						placeholder="CSC"
						handleChange={(value) =>
							updateFiscalConfig({ nuvemFiscal: { ...fiscalConfig.nuvemFiscal, nfce: { ...fiscalConfig.nuvemFiscal.nfce, csc: value } } })
						}
					/>
				</div>
			</div>
			<div className={"flex w-full flex-col gap-1"}>
				<Label htmlFor={"fiscal-certificate"} className={cn("text-sm font-medium tracking-tight text-primary/80")}>
					CERTIFICADO FISCAL
				</Label>

				{fiscalConfig.nuvemFiscal.certificado.storagePath ? (
					<Button variant="success-light" onClick={() => setCertificateMenuOpen(true)} className="w-fit flex items-center gap-1.5">
						<CheckCheck className="w-4 h-4 min-w-4 min-h-4" />
						CERTIFICADO ATIVO
					</Button>
				) : (
					<Button variant="outline" onClick={() => setCertificateMenuOpen(true)} className="w-fit flex items-center gap-1.5">
						<Plus className="w-4 h-4 min-w-4 min-h-4" />
						CARREGAR CERTIFICADO
					</Button>
				)}
			</div>
			{certificateMenuOpen ? (
				<FiscalCertificateMenu
					fiscalConfigCertificate={fiscalConfig.nuvemFiscal.certificado}
					organizationId={organizationId}
					callbacks={callbacks}
					closeMenu={() => setCertificateMenuOpen(false)}
				/>
			) : null}
		</SectionWrapper>
	);
}

type FiscalCertificateMenuProps = {
	organizationId: string;
	fiscalConfigCertificate: TUseInternalFiscalSettingsState["state"]["fiscalConfiguracao"]["nuvemFiscal"]["certificado"];
	callbacks: {
		onMutate: () => void;
		onSettled: () => void;
	};
	closeMenu: () => void;
};
function FiscalCertificateMenu({ organizationId, fiscalConfigCertificate, callbacks, closeMenu }: FiscalCertificateMenuProps) {
	const [certificateInformation, setCertificateInformation] = useState<{
		file: File | null;
		password: string | null;
	}>({
		file: null,
		password: fiscalConfigCertificate.password ?? null,
	});

	async function handleSubmitCertificate(info: { file: File | null; password: string | null }) {
		if (!info.file) throw new Error("Arquivo não selecionado.");
		if (!info.password) throw new Error("Senha não informada.");

		const { storagePath } = await uploadFile({
			file: info.file,
			fileName: `CERTIFICADO_FISCAL_${organizationId}`,
			vinculationId: organizationId,
		});

		return await syncFiscalCompanyCertificate({
			storagePath,
			password: info.password,
		});
	}
	const { mutate, isPending } = useMutation({
		mutationKey: ["sync-fiscal-company-certificate"],
		mutationFn: handleSubmitCertificate,
		onMutate: () => {
			callbacks.onMutate();
		},
		onSettled: () => {
			callbacks.onSettled();
		},
		onSuccess: () => {
			closeMenu();
		},
		onError: (error) => {
			toast.error(getErrorMessage(error));
		},
	});
	return (
		<ResponsiveMenu
			menuTitle="CERTIFICADO FISCAL"
			menuDescription="Preencha os campos abaixo para carregar o certificado fiscal"
			menuActionButtonText="CARREGAR CERTIFICADO"
			menuCancelButtonText="CANCELAR"
			closeMenu={closeMenu}
			actionFunction={() => mutate(certificateInformation)}
			actionIsLoading={isPending}
			stateIsLoading={false}
			stateError={null}
		>
			<div className="flex min-h-[250px] w-full min-w-[250px] items-center justify-center">
				<label
					className="relative flex min-h-[250px] w-full max-w-[250px] cursor-pointer overflow-hidden rounded-lg border border-border bg-muted/40"
					htmlFor="fiscal-cert-dropzone"
				>
					{/* Input abaixo; a camada visual fica por cima com pointer-events-none para não ser coberta pelo controle nativo do arquivo (opacity-0 nem sempre “vê” o que está atrás). */}
					<input
						accept=".p12,.pfx"
						className="absolute inset-0 z-10 h-full min-h-[250px] w-full cursor-pointer opacity-0"
						id="fiscal-cert-dropzone"
						multiple={false}
						onChange={(e) => {
							const file = e.target.files?.[0] ?? null;
							setCertificateInformation((prev) => ({ ...prev, file }));
						}}
						tabIndex={-1}
						type="file"
					/>
					<div className="pointer-events-none absolute inset-0 z-20 flex min-h-[250px] flex-col items-center justify-center gap-1 px-2 text-foreground">
						{certificateInformation.file ? (
							<>
								<Check className="h-6 w-6 shrink-0" />
								<p className="text-center text-xs font-medium">ARQUIVO SELECIONADO</p>
								<p className="line-clamp-4 break-all text-center text-xs font-medium text-muted-foreground">{certificateInformation.file.name}</p>
							</>
						) : fiscalConfigCertificate.storagePath ? (
							<>
								<FileIcon className="h-6 w-6 shrink-0" />
								<p className="text-center text-xs font-medium">CERTIFICADO DEFINIDO</p>
							</>
						) : (
							<>
								<Plus className="h-6 w-6 shrink-0" />
								<p className="text-center text-xs font-medium">CARREGAR ARQUIVO</p>
							</>
						)}
					</div>
				</label>
			</div>
			<TextInput
				label="SENHA"
				value={certificateInformation.password ?? ""}
				placeholder="Senha"
				handleChange={(value) => setCertificateInformation((prev) => ({ ...prev, password: value }))}
			/>
		</ResponsiveMenu>
	);
}

const FISCAL_FINALITY_LABELS: Record<TFiscalOperationFinalityEnum, string> = {
	NORMAL: "NORMAL",
	COMPLEMENTAR: "COMPLEMENTAR",
	AJUSTE: "AJUSTE",
	DEVOLUCAO: "DEVOLUÇÃO",
};

const FISCAL_CONSUMER_PRESENCE_LABELS: Record<TFiscalOperationConsumerPresenceEnum, string> = {
	NAO_SE_APLICA: "NÃO SE APLICA",
	OPERACAO_PRESENCIAL: "PRESENCIAL",
	INTERNET: "INTERNET",
	TELEATENDIMENTO: "TELEATENDIMENTO",
	ENTREGA_DOMICILIO: "ENTREGA À DOMICÍLIO",
};

const FISCAL_DOCUMENT_TYPE_STYLES: Record<TFiscalDocumentTypeEnum, string> = {
	NFCE: "bg-blue-500 dark:bg-blue-600 text-white",
	NFE: "bg-indigo-500 dark:bg-indigo-600 text-white",
	NFSE: "bg-teal-500 dark:bg-teal-600 text-white",
};

const FISCAL_ENVIRONMENT_LABELS: Record<TFiscalDocumentEnvironmentEnum, string> = {
	HOMOLOGACAO: "HOMOLOGAÇÃO",
	PRODUCAO: "PRODUÇÃO",
};
const FISCAL_ENVIRONMENT_STYLES: Record<TFiscalDocumentEnvironmentEnum, string> = {
	HOMOLOGACAO: "bg-amber-500 dark:bg-amber-600 text-white",
	PRODUCAO: "bg-emerald-500 dark:bg-emerald-600 text-white",
};

const FISCAL_DOCUMENT_STATUS_LABELS: Record<TFiscalDocumentStatusEnum, string> = {
	PENDENTE: "PENDENTE",
	AUTORIZADA: "AUTORIZADA",
	CANCELADA: "CANCELADA",
	INUTILIZADA: "INUTILIZADA",
};
const FISCAL_DOCUMENT_STATUS_STYLES: Record<TFiscalDocumentStatusEnum, string> = {
	PENDENTE: "bg-amber-500 dark:bg-amber-600 text-white",
	AUTORIZADA: "bg-green-500 dark:bg-green-600 text-white",
	CANCELADA: "bg-red-500 dark:bg-red-600 text-white",
	INUTILIZADA: "bg-zinc-500 dark:bg-zinc-600 text-white",
};

const FISCAL_LIFECYCLE_STATUS_LABELS: Record<TFiscalDocumentLifecycleStatusEnum, string> = {
	RASCUNHO: "RASCUNHO",
	PRONTO_PARA_ENVIO: "PRONTO PARA ENVIO",
	EM_PROCESSAMENTO: "EM PROCESSAMENTO",
	AUTORIZADO: "AUTORIZADO",
	REJEITADO: "REJEITADO",
	CANCELAMENTO_PENDENTE: "CANCELAMENTO PENDENTE",
	CANCELADO: "CANCELADO",
	ERRO: "ERRO",
};
const FISCAL_LIFECYCLE_STATUS_STYLES: Record<TFiscalDocumentLifecycleStatusEnum, string> = {
	RASCUNHO: "bg-zinc-400 dark:bg-zinc-500 text-white",
	PRONTO_PARA_ENVIO: "bg-sky-500 dark:bg-sky-600 text-white",
	EM_PROCESSAMENTO: "bg-amber-500 dark:bg-amber-600 text-white",
	AUTORIZADO: "bg-green-500 dark:bg-green-600 text-white",
	REJEITADO: "bg-rose-500 dark:bg-rose-600 text-white",
	CANCELAMENTO_PENDENTE: "bg-orange-500 dark:bg-orange-600 text-white",
	CANCELADO: "bg-red-600 dark:bg-red-700 text-white",
	ERRO: "bg-red-500 dark:bg-red-600 text-white",
};

function formatBRL(value: number | null | undefined) {
	if (value === null || value === undefined) return "R$ 0,00";
	return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function shortenAccessKey(key: string | null | undefined) {
	if (!key) return null;
	const cleaned = key.replace(/\s/g, "");
	if (cleaned.length <= 12) return cleaned;
	return `${cleaned.slice(0, 4)}…${cleaned.slice(-6)}`;
}

function CompanyFiscalOperationProfiles() {
	const queryClient = useQueryClient();
	const [newProfileMenuIsOpen, setNewProfileMenuIsOpen] = useState(false);
	const [editingProfileId, setEditingProfileId] = useState<string | null>(null);
	const { data, queryKey, isLoading, isError, isSuccess, error } = useFiscalOperationProfiles();

	const handleOnMutate = async () => await queryClient.cancelQueries({ queryKey: queryKey });
	const handleOnSettled = async () => await queryClient.invalidateQueries({ queryKey: queryKey });
	return (
		<SectionWrapper title="PERFIS DE OPERAÇÃO FISCAL" icon={<BadgeCheck className="h-4 w-4" />}>
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
		</SectionWrapper>
	);
}

function CompanyFiscalTaxGroups() {
	const queryClient = useQueryClient();
	const [newTaxGroupMenuIsOpen, setNewTaxGroupMenuIsOpen] = useState(false);
	const [editingTaxGroupId, setEditingTaxGroupId] = useState<string | null>(null);
	const { data, queryKey, isLoading, isError, isSuccess, error } = useFiscalTaxGroups();

	const handleOnMutate = async () => await queryClient.cancelQueries({ queryKey: queryKey });
	const handleOnSettled = async () => await queryClient.invalidateQueries({ queryKey: queryKey });
	return (
		<SectionWrapper title="GRUPOS TRIBUTÁRIOS" icon={<Percent className="h-4 w-4" />}>
			{isLoading ? <LoadingComponent /> : null}
			{isError ? <ErrorComponent msg={getErrorMessage(error)} /> : null}
			{isSuccess ? (
				data.length > 0 ? (
					<div className="flex flex-col gap-2 w-full">
						{data.map((taxGroup) => (
							<CompanyFiscalTaxGroup key={taxGroup.id} taxGroup={taxGroup} handleEditClick={() => setEditingTaxGroupId(taxGroup.id)} />
						))}
					</div>
				) : (
					<div className="flex items-center justify-center py-6">
						<p className="text-sm text-muted-foreground">Nenhum grupo tributário encontrado.</p>
					</div>
				)
			) : null}
			<div className="w-full flex items-center justify-center">
				<Button variant={"ghost"} size={"fit"} className="flex items-center gap-1 px-2 py-1 text-xs" onClick={() => setNewTaxGroupMenuIsOpen(true)}>
					<Plus className="w-4 h-4 min-w-4 min-h-4" />
					ADICIONAR
				</Button>
			</div>
			{newTaxGroupMenuIsOpen ? (
				<NewFiscalTaxGroup closeModal={() => setNewTaxGroupMenuIsOpen(false)} callbacks={{ onMutate: handleOnMutate, onSettled: handleOnSettled }} />
			) : null}
			{editingTaxGroupId ? (
				<ControlFiscalTaxGroup
					taxGroupId={editingTaxGroupId}
					closeModal={() => setEditingTaxGroupId(null)}
					callbacks={{ onMutate: handleOnMutate, onSettled: handleOnSettled }}
				/>
			) : null}
		</SectionWrapper>
	);
}

type CompanyFiscalTaxGroupProps = {
	taxGroup: TGetFiscalTaxGroupsOutputDefault[number];
	handleEditClick: () => void;
};
function CompanyFiscalTaxGroup({ taxGroup, handleEditClick }: CompanyFiscalTaxGroupProps) {
	const regrasAtivas = taxGroup.regras?.length ?? 0;
	return (
		<button type="button" onClick={handleEditClick} className="w-full flex flex-col gap-1 rounded-lg border p-3 text-left transition hover:border-primary/40">
			<div className="w-full flex items-center justify-between gap-2">
				<h3 className="text-sm font-bold tracking-tight uppercase">{taxGroup.nome}</h3>
				<span className={`text-[10px] font-bold uppercase tracking-tight ${taxGroup.ativo ? "text-green-600" : "text-muted-foreground"}`}>
					{taxGroup.ativo ? "ATIVO" : "INATIVO"}
				</span>
			</div>
			<div className="w-full flex items-center gap-2 flex-wrap">
				<span className="text-xs font-medium tracking-tight text-primary/70">CSOSN {taxGroup.csosn}</span>
				<span className="text-xs font-medium tracking-tight text-primary/70">PIS {taxGroup.cstPis}</span>
				<span className="text-xs font-medium tracking-tight text-primary/70">COFINS {taxGroup.cstCofins}</span>
				{taxGroup.temSubstituicaoTributaria ? <span className="text-xs font-medium tracking-tight text-amber-600">ICMS-ST</span> : null}
				{regrasAtivas > 0 ? <span className="text-xs font-medium tracking-tight text-primary/70">{regrasAtivas} regra(s)</span> : null}
			</div>
			{taxGroup.descricao ? <p className="text-xs text-muted-foreground">{taxGroup.descricao}</p> : null}
		</button>
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
							<h1 className="py-0.5 text-center text-[0.65rem] font-medium italic text-primary/80">{FISCAL_FINALITY_LABELS[profile.finalidade]}</h1>
						</div>
						<div className="flex items-center gap-1">
							<User className="w-4 h-4 min-w-4 min-h-4" />
							<h1 className="py-0.5 text-center text-[0.65rem] font-medium italic text-primary/80">
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

function CompanyFiscalSeries() {
	const queryClient = useQueryClient();
	const [newSeriesMenuIsOpen, setNewSeriesMenuIsOpen] = useState(false);
	const [editingSeriesId, setEditingSeriesId] = useState<string | null>(null);
	const { data, queryKey, isLoading, isError, isSuccess, error } = useFiscalSeries();

	const handleOnMutate = async () => await queryClient.cancelQueries({ queryKey });
	const handleOnSettled = async () => await queryClient.invalidateQueries({ queryKey });

	return (
		<SectionWrapper title="SÉRIES FISCAIS" icon={<BookText className="h-4 w-4" />}>
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
							<h1 className="py-0.5 text-center text-[0.65rem] font-medium italic text-primary/80">PRÓXIMO Nº {series.proximoNumero}</h1>
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
