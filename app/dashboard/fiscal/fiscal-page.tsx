"use client";
import { parseAsStringEnum, useQueryState } from "nuqs";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  AlertTriangle,
  BadgeCheck,
  Banknote,
  Barcode,
  BookText,
  Calendar,
  Check,
  CheckCheck,
  CircleCheck,
  CircleEllipsis,
  CircleX,
  Clock,
  CreditCard,
  FileIcon,
  FileText,
  Flag,
  FlaskConical,
  Gift,
  Globe,
  Hash,
  HelpCircle,
  Landmark,
  MapPin,
  MoreHorizontal,
  NotebookPen,
  PencilIcon,
  Percent,
  Plus,
  QrCode,
  Receipt,
  RefreshCcw,
  Save,
  type LucideIcon,
  Settings,
  ShieldCheck,
  Ticket,
  User,
  Zap,
} from "lucide-react";
import {
  useFiscalDocumentById,
  useFiscalDocuments,
  useFiscalOperationProfiles,
  useFiscalSeries,
  useFiscalSettings,
  useFiscalTaxGroups,
} from "@/lib/queries/fiscal";
import {
  cancelFiscalDocumentMutation,
  correctFiscalDocumentMutation,
  inutilizeFiscalDocumentMutation,
  returnFiscalDocumentMutation,
  syncFiscalCompany,
  syncFiscalCompanyCertificate,
  syncFiscalDocumentMutation,
  updateFiscalSettings,
} from "@/lib/mutations/fiscal";
import { getFiscalRejectionInfo } from "@/lib/fiscal/rejections";
import {
  TUseInternalFiscalSettingsState,
  useInternalFiscalSettingsState,
} from "@/state-hooks/use-internal-fiscal-settings-state";
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
import { Checkbox } from "@/components/ui/checkbox";
import { StatBadge } from "@/components/ui/stat-badge";
import { TooltipProvider } from "@/components/ui/tooltip";
import DateInput from "@/components/Inputs/DateInput";
import TextInput from "@/components/Inputs/TextInput";
import UnauthorizedPage from "@/components/Utils/UnauthorizedPage";
import { cn, getCEPInfo } from "@/lib/utils";
import {
  formatDateAsLocale,
  formatToCEP,
  formatToPhone,
} from "@/lib/formatting";
import SelectInput from "@/components/Inputs/SelectInput";
import {
  BrazilianCitiesOptionsFromUF,
  BrazilianStatesOptions,
} from "@/utils/states-cities";
import { TGetFiscalOperationProfilesOutputDefault } from "@/app/api/fiscal/operation-profiles/route";
import { TGetFiscalSeriesOutputDefault } from "@/app/api/fiscal/series/route";
import type {
  TFiscalDocumentEnvironmentEnum,
  TFiscalDocumentLifecycleStatusEnum,
  TFiscalDocumentStatusEnum,
  TFiscalDocumentTypeEnum,
  TFiscalOperationConsumerPresenceEnum,
  TFiscalOperationFinalityEnum,
  TPaymentMethodEnum,
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
import {
  TGetFiscalDocumentsOutputById,
  TGetFiscalDocumentsOutputDefault,
} from "@/app/api/fiscal/documents/route";
import ResponsiveMenu from "@/components/Utils/ResponsiveMenu";
import ManualFiscalEmission from "@/components/Modals/FiscalDocument/ManualFiscalEmission";
import { FiscalDocumentDetailsContent } from "./_components/fiscal-document-details-content";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
type FiscalPageProps = {
  userHasFiscalViewPermission: boolean;
  userHasFiscalConfigurePermission: boolean;
  userHasFiscalEmitPermission: boolean;
  userHasFiscalCancelPermission: boolean;
};
export default function FiscalPage({
  userHasFiscalViewPermission,
  userHasFiscalConfigurePermission,
  userHasFiscalEmitPermission,
  userHasFiscalCancelPermission,
}: FiscalPageProps) {
  const [viewMode, setViewMode] = useQueryState(
    "view",
    parseAsStringEnum(["documents", "configuration"]),
  );
  return (
    <div className="w-full h-full flex flex-col gap-3">
      <Tabs
        value={viewMode ?? "documents"}
        onValueChange={(v) => setViewMode(v as typeof viewMode)}
      >
        <TabsList variant="page">
          <TabsTrigger value="documents">
            <BookText className="w-4 h-4 min-w-4 min-h-4" />
            Documentos
          </TabsTrigger>
          <TabsTrigger value="configuration">
            <Settings className="w-4 h-4 min-w-4 min-h-4" />
            Configuração
          </TabsTrigger>
        </TabsList>
        <TabsContent value="configuration" className="flex flex-col gap-3">
          {userHasFiscalConfigurePermission ? (
            <FiscalConfigurationsView
              userHasFiscalConfigurePermission={
                userHasFiscalConfigurePermission
              }
            />
          ) : (
            <UnauthorizedPage message="Oops,  você não possui permissão para visualizar o módulo fiscal." />
          )}
        </TabsContent>
        <TabsContent value="documents" className="flex flex-col gap-3">
          {userHasFiscalViewPermission ? (
            <FiscalDocumentsView
              userHasFiscalEmitPermission={userHasFiscalEmitPermission}
              userHasFiscalCancelPermission={userHasFiscalCancelPermission}
              userHasFiscalConfigurePermission={
                userHasFiscalConfigurePermission
              }
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
  userHasFiscalConfigurePermission,
}: {
  userHasFiscalEmitPermission: boolean;
  userHasFiscalCancelPermission: boolean;
  userHasFiscalConfigurePermission: boolean;
}) {
  const [selectedDocumentId, setSelectedDocumentId] = useState<string | null>(
    null,
  );
  const { data, isLoading, isError, isSuccess, error, filters, updateFilters } =
    useFiscalDocuments();
  const { data: fiscalSettings } = useFiscalSettings({
    enabled: userHasFiscalConfigurePermission,
  });
  const exceptionalPresenceEnabled =
    fiscalSettings?.fiscalConfiguracao?.emissaoManual
      ?.classificacaoPresencialExcepcional?.habilitada ?? false;

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
      <div className="w-full flex items-center gap-1.5 flex-wrap">
        {FISCAL_DOCUMENT_STATUS_FILTERS.map((filter) => {
          const isActive =
            JSON.stringify(filters.statusInterno ?? []) ===
            JSON.stringify(filter.statuses);
          return (
            <Button
              key={filter.label}
              variant={isActive ? "default" : "ghost"}
              size="fit"
              className="px-2 py-1 text-xs rounded-lg"
              onClick={() =>
                updateFilters({ statusInterno: filter.statuses, page: 1 })
              }
            >
              {filter.label}
            </Button>
          );
        })}
      </div>
      <GeneralPaginationComponent
        activePage={filters.page}
        queryLoading={isLoading}
        selectPage={(page) => updateFilters({ page })}
        totalPages={totalPages || 0}
        itemsMatchedText={
          documentsMatched > 0
            ? `${documentsMatched} documentos fiscais encontrados.`
            : `${documentsMatched} documento fiscal encontrado.`
        }
        itemsShowingText={
          documentsShowing > 0
            ? `Mostrando ${documentsShowing} documentos fiscais.`
            : `Mostrando ${documentsShowing} documento fiscal.`
        }
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
              userHasFiscalConfigurePermission={
                userHasFiscalConfigurePermission
              }
              exceptionalPresenceEnabled={exceptionalPresenceEnabled}
              openDetails={() => setSelectedDocumentId(document.id)}
            />
          ))
        ) : (
          <p className="w-full tracking-tight text-center">
            Nenhum documento fiscal encontrado.
          </p>
        )
      ) : null}
      {selectedDocumentId ? (
        <FiscalDocumentDetailsMenu
          documentId={selectedDocumentId}
          closeMenu={() => setSelectedDocumentId(null)}
          userHasFiscalEmitPermission={userHasFiscalEmitPermission}
          userHasFiscalCancelPermission={userHasFiscalCancelPermission}
          userHasFiscalConfigurePermission={userHasFiscalConfigurePermission}
          exceptionalPresenceEnabled={exceptionalPresenceEnabled}
        />
      ) : null}
    </div>
  );
}

function buildFiscalDocumentCardTitle(
  document: TGetFiscalDocumentsOutputDefault["documents"][number],
) {
  const parts: string[] = [document.tipo];
  if (document.serie) parts.push(`Série ${document.serie}`);
  if (document.numero) parts.push(`Nº ${document.numero}`);
  else parts.push("Sem número");
  return parts.join(" · ");
}

function buildFiscalDocumentCardSubtitle(
  document: TGetFiscalDocumentsOutputDefault["documents"][number],
) {
  const isCancelled =
    document.statusInterno === "CANCELADO" || document.status === "CANCELADA";
  const emissionDate =
    document.dataAutorizacao ??
    document.dataEmissao ??
    document.dataInsercao ??
    document.venda?.dataVenda;
  const parts: string[] = [];

  if (document.venda?.valorTotal != null)
    parts.push(formatBRL(Number(document.venda.valorTotal)));
  if (emissionDate) {
    const formattedEmissionDate = formatDateAsLocale(emissionDate.toString());
    if (formattedEmissionDate) parts.push(formattedEmissionDate);
  }
  if (document.venda?.cliente?.nome) parts.push(document.venda.cliente.nome);
  if (isCancelled && document.dataCancelamento) {
    const formattedCancelDate = formatDateAsLocale(
      document.dataCancelamento.toString(),
    );
    if (formattedCancelDate) parts.push(`Cancelado em ${formattedCancelDate}`);
  }

  return parts.join(" · ");
}

function buildFiscalDocumentStatusTooltip(
  document: TGetFiscalDocumentsOutputDefault["documents"][number],
) {
  const internal = FISCAL_LIFECYCLE_STATUS_LABELS[document.statusInterno];
  const sefaz = FISCAL_DOCUMENT_STATUS_LABELS[document.status];
  if (
    internal === sefaz ||
    (document.statusInterno === "AUTORIZADO" &&
      document.status === "AUTORIZADA")
  ) {
    return "Documento autorizado pela SEFAZ.";
  }
  return `Status interno: ${internal} · SEFAZ: ${sefaz}`;
}

function FiscalDocumentStatusIcon({
  statusInterno,
}: {
  statusInterno: TFiscalDocumentLifecycleStatusEnum;
}) {
  switch (statusInterno) {
    case "AUTORIZADO":
      return <CircleCheck className="h-4 w-4 min-h-4 min-w-4" />;
    case "REJEITADO":
    case "ERRO":
      return <AlertTriangle className="h-4 w-4 min-h-4 min-w-4" />;
    case "CANCELADO":
    case "INUTILIZADO":
      return <CircleX className="h-4 w-4 min-h-4 min-w-4" />;
    default:
      return <Clock className="h-4 w-4 min-h-4 min-w-4" />;
  }
}

function FiscalDocumentCard({
  document,
  userHasFiscalEmitPermission,
  userHasFiscalCancelPermission,
  userHasFiscalConfigurePermission,
  exceptionalPresenceEnabled,
  openDetails,
}: {
  document: TGetFiscalDocumentsOutputDefault["documents"][number];
  userHasFiscalEmitPermission: boolean;
  userHasFiscalCancelPermission: boolean;
  userHasFiscalConfigurePermission: boolean;
  exceptionalPresenceEnabled: boolean;
  openDetails: () => void;
}) {
  const isCancelled =
    document.status === "CANCELADA" || document.statusInterno === "CANCELADO";
  const isErrored =
    document.statusInterno === "ERRO" || document.statusInterno === "REJEITADO";
  const subtitle = buildFiscalDocumentCardSubtitle(document);

  return (
    <TooltipProvider>
      <div
        className={cn(
          "bg-card flex w-full flex-col gap-2 rounded-xl border px-3 py-3 shadow-2xs transition-colors",
          isCancelled ? "opacity-70" : null,
          isErrored
            ? "border-rose-400/60 dark:border-rose-500/60"
            : "border-border hover:border-primary/30 hover:bg-muted/20",
        )}
      >
        <div className="flex w-full items-start justify-between gap-3">
          <button
            type="button"
            onClick={openDetails}
            className="flex min-w-0 flex-1 flex-col gap-0.5 text-left"
          >
            <p className="text-sm font-bold tracking-tight">
              {buildFiscalDocumentCardTitle(document)}
            </p>
            {subtitle ? (
              <p className="truncate text-xs text-muted-foreground tabular-nums">
                {subtitle}
              </p>
            ) : null}
          </button>
          <div
            className="flex shrink-0 items-center gap-1.5"
            onClick={(event) => event.stopPropagation()}
          >
            {document.ambiente === "HOMOLOGACAO" ? (
              <StatBadge
                icon={<Globe className="h-4 min-h-4 w-4 min-w-4" />}
                value="HOMOLOGAÇÃO"
                tooltipContent="Documento emitido em ambiente de testes, sem valor fiscal."
                className="bg-amber-500 text-white dark:bg-amber-600"
                valueClassName="normal-case tracking-normal"
              />
            ) : null}
            {document.presencaConsumidorDeclarada ? (
              <StatBadge
                icon={<AlertTriangle className="h-4 min-h-4 w-4 min-w-4" />}
                value="PRESENCIAL EXCEPCIONAL"
                tooltipContent="Venda com entrega declarada manualmente como operação presencial nesta tentativa."
                className="bg-amber-600 text-white dark:bg-amber-700"
                valueClassName="normal-case tracking-normal"
              />
            ) : null}
            <StatBadge
              icon={
                <FiscalDocumentStatusIcon
                  statusInterno={document.statusInterno}
                />
              }
              value={
                FISCAL_LIFECYCLE_STATUS_LIST_LABELS[document.statusInterno]
              }
              tooltipContent={buildFiscalDocumentStatusTooltip(document)}
              className={cn(
                FISCAL_LIFECYCLE_STATUS_STYLES[document.statusInterno],
              )}
              valueClassName="normal-case tracking-normal"
            />
            <FiscalDocumentQuickActions
              document={document}
              userHasFiscalEmitPermission={userHasFiscalEmitPermission}
              userHasFiscalCancelPermission={userHasFiscalCancelPermission}
              userHasFiscalConfigurePermission={
                userHasFiscalConfigurePermission
              }
              exceptionalPresenceEnabled={exceptionalPresenceEnabled}
              openDetails={openDetails}
            />
          </div>
        </div>

        {isErrored &&
        Array.isArray(document.mensagens) &&
        document.mensagens.length > 0 ? (
          <button
            type="button"
            onClick={openDetails}
            className="flex w-full items-start gap-1.5 rounded-md bg-rose-50 px-2 py-1.5 text-left dark:bg-rose-950/40"
          >
            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 min-h-3.5 min-w-3.5 shrink-0 text-rose-600 dark:text-rose-400" />
            <p className="line-clamp-2 text-[0.7rem] font-medium tracking-tight text-rose-700 dark:text-rose-300">
              {document.mensagens
                .map((m) => (typeof m === "string" ? m : JSON.stringify(m)))
                .join(" · ")}
            </p>
          </button>
        ) : null}
      </div>
    </TooltipProvider>
  );
}

type FiscalDocumentForList =
  | TGetFiscalDocumentsOutputDefault["documents"][number]
  | TGetFiscalDocumentsOutputById["document"];

function FiscalDocumentQuickActions({
  document,
  userHasFiscalEmitPermission,
  userHasFiscalCancelPermission,
  userHasFiscalConfigurePermission,
  exceptionalPresenceEnabled,
  openDetails,
}: {
  document: FiscalDocumentForList;
  userHasFiscalEmitPermission: boolean;
  userHasFiscalCancelPermission: boolean;
  userHasFiscalConfigurePermission: boolean;
  exceptionalPresenceEnabled: boolean;
  openDetails: () => void;
}) {
  const queryClient = useQueryClient();
  const [manualEmissionOpen, setManualEmissionOpen] = useState(false);
  const canSync = userHasFiscalEmitPermission;
  const canEmitAgain =
    userHasFiscalEmitPermission &&
    !!document.vendaId &&
    document.tipo !== "NFSE" &&
    document.statusInterno !== "AUTORIZADO" &&
    document.statusInterno !== "EM_PROCESSAMENTO";
  const canCancel =
    userHasFiscalCancelPermission &&
    document.status === "AUTORIZADA" &&
    document.statusInterno === "AUTORIZADO";
  const canCorrect =
    userHasFiscalEmitPermission &&
    document.tipo === "NFE" &&
    document.statusInterno === "AUTORIZADO";
  const canInutilize =
    userHasFiscalCancelPermission &&
    document.statusInterno === "ERRO" &&
    !!document.numero;
  const canReturn =
    userHasFiscalEmitPermission &&
    document.statusInterno === "AUTORIZADO" &&
    !!document.vendaId;
  const hasXml =
    !!document.xmlStoragePath || document.statusInterno === "AUTORIZADO";
  const hasPdf =
    !!document.pdfStoragePath || document.statusInterno === "AUTORIZADO";

  const invalidateFiscalDocuments = async () => {
    await queryClient.invalidateQueries({ queryKey: ["fiscal-documents"] });
    await queryClient.invalidateQueries({
      queryKey: ["fiscal-document-by-id", document.id],
    });
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

  const { mutate: cancelDocument, isPending: isCancelling } = useMutation({
    mutationKey: ["cancel-fiscal-document", document.id],
    mutationFn: cancelFiscalDocumentMutation,
    onSuccess: (data) => {
      toast.success(data.message);
      invalidateFiscalDocuments();
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });

  const { mutate: correctDocument, isPending: isCorrecting } = useMutation({
    mutationKey: ["correct-fiscal-document", document.id],
    mutationFn: correctFiscalDocumentMutation,
    onSuccess: (data) => {
      toast.success(data.message);
      invalidateFiscalDocuments();
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });

  const { mutate: inutilizeDocument, isPending: isInutilizing } = useMutation({
    mutationKey: ["inutilize-fiscal-document", document.id],
    mutationFn: inutilizeFiscalDocumentMutation,
    onSuccess: (data) => {
      toast.success(data.message);
      invalidateFiscalDocuments();
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });

  const { mutate: returnDocument, isPending: isReturning } = useMutation({
    mutationKey: ["return-fiscal-document", document.id],
    mutationFn: returnFiscalDocumentMutation,
    onSuccess: (data) => {
      toast.success(data.message);
      invalidateFiscalDocuments();
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });

  const actionIsPending =
    isSyncing || isCancelling || isCorrecting || isInutilizing || isReturning;

  const openAsset = (asset: "xml" | "pdf") => {
    window.open(
      `/api/fiscal/document-assets?documentId=${document.id}&asset=${asset}`,
      "_blank",
      "noopener,noreferrer",
    );
  };

  const handleCancel = () => {
    const reason = window.prompt("Informe o motivo do cancelamento fiscal.");
    if (!reason?.trim()) return;
    cancelDocument({ documentId: document.id, reason: reason.trim() });
  };

  const handleCorrect = () => {
    const correcao = window.prompt(
      "Informe o texto da correção (mínimo 15 caracteres).",
    );
    if (!correcao?.trim()) return;
    if (correcao.trim().length < 15) {
      toast.error("A correção deve ter ao menos 15 caracteres.");
      return;
    }
    correctDocument({ documentId: document.id, correcao: correcao.trim() });
  };

  const handleInutilize = () => {
    const justificativa = window.prompt(
      "Informe a justificativa da inutilização (mínimo 15 caracteres).",
    );
    if (!justificativa?.trim()) return;
    if (justificativa.trim().length < 15) {
      toast.error("A justificativa deve ter ao menos 15 caracteres.");
      return;
    }
    inutilizeDocument({
      documentId: document.id,
      justificativa: justificativa.trim(),
    });
  };

  const handleReturn = () => {
    if (
      !window.confirm(
        "Gerar NF-e de devolução referenciando este documento? Requer um perfil de operação de devolução configurado.",
      )
    )
      return;
    returnDocument({ documentId: document.id });
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
    setManualEmissionOpen(true);
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            disabled={actionIsPending}
            className="h-8 w-8 rounded-full"
            onClick={(event) => event.stopPropagation()}
          >
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
          <DropdownMenuItem
            disabled={!canSync || actionIsPending}
            onClick={() => syncDocument({ documentId: document.id })}
          >
            <RefreshCcw className="h-4 w-4" />
            Sincronizar
          </DropdownMenuItem>
          <DropdownMenuItem
            disabled={!canEmitAgain || actionIsPending}
            onClick={handleEmitAgain}
          >
            <Zap className="h-4 w-4" />
            Emitir novamente
          </DropdownMenuItem>
          <DropdownMenuItem
            disabled={!canCorrect || actionIsPending}
            onClick={handleCorrect}
          >
            <PencilIcon className="h-4 w-4" />
            Carta de correção
          </DropdownMenuItem>
          <DropdownMenuItem
            disabled={!canReturn || actionIsPending}
            onClick={handleReturn}
          >
            <RefreshCcw className="h-4 w-4" />
            Gerar devolução
          </DropdownMenuItem>
          <DropdownMenuItem
            disabled={!canInutilize || actionIsPending}
            onClick={handleInutilize}
            variant="destructive"
          >
            <CircleX className="h-4 w-4" />
            Inutilizar numeração
          </DropdownMenuItem>
          <DropdownMenuItem
            disabled={!canCancel || actionIsPending}
            onClick={handleCancel}
            variant="destructive"
          >
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
      {manualEmissionOpen &&
      document.vendaId &&
      (document.tipo === "NFCE" || document.tipo === "NFE") ? (
        <ManualFiscalEmission
          saleId={document.vendaId}
          tipo={document.tipo}
          entregaModalidade={document.venda?.entregaModalidade}
          exceptionalPresenceEnabled={exceptionalPresenceEnabled}
          canConfigureFiscal={userHasFiscalConfigurePermission}
          closeMenu={() => setManualEmissionOpen(false)}
        />
      ) : null}
    </>
  );
}

function FiscalDocumentDetailsMenu({
  documentId,
  closeMenu,
  userHasFiscalEmitPermission,
  userHasFiscalCancelPermission,
  userHasFiscalConfigurePermission,
  exceptionalPresenceEnabled,
}: {
  documentId: string;
  closeMenu: () => void;
  userHasFiscalEmitPermission: boolean;
  userHasFiscalCancelPermission: boolean;
  userHasFiscalConfigurePermission: boolean;
  exceptionalPresenceEnabled: boolean;
}) {
  const { data, isLoading, isError, error } = useFiscalDocumentById(documentId);
  const document = data?.document;
  const events = data?.events ?? [];

  return (
    <ResponsiveMenu
      menuTitle="DOCUMENTO FISCAL"
      menuDescription="Identificação, venda vinculada, tributos, payload e histórico do documento."
      menuActionButtonText="FECHAR"
      menuCancelButtonText="CANCELAR"
      actionFunction={closeMenu}
      actionIsLoading={false}
      stateIsLoading={isLoading}
      stateError={isError ? getErrorMessage(error) : null}
      closeMenu={closeMenu}
      dialogVariant="xl"
      drawerVariant="xl"
    >
      {document ? (
        <div className="flex w-full flex-col gap-3">
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border bg-secondary/20 p-3">
            <div className="flex flex-col gap-1">
              <h3 className="text-sm font-bold tracking-tight">
                {document.tipo}{" "}
                {document.numero
                  ? `Nº ${document.numero}`
                  : document.referencia}
              </h3>
              <p className="text-xs text-muted-foreground">
                Status: {FISCAL_LIFECYCLE_STATUS_LABELS[document.statusInterno]}
              </p>
            </div>
            <FiscalDocumentQuickActions
              document={document}
              userHasFiscalEmitPermission={userHasFiscalEmitPermission}
              userHasFiscalCancelPermission={userHasFiscalCancelPermission}
              userHasFiscalConfigurePermission={
                userHasFiscalConfigurePermission
              }
              exceptionalPresenceEnabled={exceptionalPresenceEnabled}
              openDetails={() => undefined}
            />
          </div>
          {document.codigoRejeicao
            ? (() => {
                const info = getFiscalRejectionInfo(document.codigoRejeicao);
                return (
                  <div className="flex flex-col gap-1.5 rounded-lg border border-red-200 bg-red-50 p-3 dark:border-red-900/40 dark:bg-red-950/30">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold uppercase tracking-tight text-red-700 dark:text-red-400">
                        Rejeição {document.codigoRejeicao}
                      </span>
                      {info ? (
                        <span className="rounded bg-red-100 px-1.5 py-0.5 text-[10px] font-bold uppercase text-red-700 dark:bg-red-900/40 dark:text-red-300">
                          {info.categoria}
                        </span>
                      ) : null}
                      {info?.reenviavel ? (
                        <span className="text-[10px] font-medium uppercase text-red-600/80">
                          Reenviável após correção
                        </span>
                      ) : null}
                    </div>
                    {info ? (
                      <>
                        <p className="text-sm font-semibold text-red-800 dark:text-red-300">
                          {info.descricao}
                        </p>
                        <p className="text-xs text-red-700 dark:text-red-300/90">
                          <span className="font-semibold">Causa provável:</span>{" "}
                          {info.causaProvavel}
                        </p>
                        <p className="text-xs text-red-700 dark:text-red-300/90">
                          <span className="font-semibold">Ação sugerida:</span>{" "}
                          {info.acaoSugerida}
                        </p>
                      </>
                    ) : null}
                  </div>
                );
              })()
            : null}
          <FiscalDocumentDetailsContent
            document={document}
            events={events}
            statusLabels={FISCAL_DOCUMENT_STATUS_LABELS}
            environmentLabels={FISCAL_ENVIRONMENT_LABELS}
            lifecycleStatusLabels={FISCAL_LIFECYCLE_STATUS_LABELS}
            formatBRL={formatBRL}
          />
        </div>
      ) : null}
    </ResponsiveMenu>
  );
}

type FiscalConfigurationsViewProps = {
  userHasFiscalConfigurePermission: boolean;
};
function FiscalConfigurationsView({
  userHasFiscalConfigurePermission,
}: FiscalConfigurationsViewProps) {
  const canEdit = userHasFiscalConfigurePermission;
  const queryClient = useQueryClient();
  const { data, isLoading, isError, error, queryKey } = useFiscalSettings();
  const { state, redefineState, updateSettings, updateFiscalConfig } =
    useInternalFiscalSettingsState({
      initialState: {
        fiscalProvedor: data?.fiscalProvedor ?? "SPEDY",
        fiscalEmissaoAutomatica: data?.fiscalEmissaoAutomatica ?? false,
        fiscalConfiguracao: data?.fiscalConfiguracao ?? undefined,
      },
    });

  const handleOnMutate = async () =>
    await queryClient.cancelQueries({ queryKey: queryKey });
  const handleOnSettled = async () =>
    await queryClient.invalidateQueries({ queryKey: queryKey });
  useEffect(() => {
    if (data) {
      redefineState({
        fiscalProvedor: data.fiscalProvedor ?? "SPEDY",
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
          <h2 className="text-xl font-semibold tracking-tight">
            Configuração Fiscal
          </h2>
          <p className="text-sm text-muted-foreground">
            Configure os dados da empresa e a sincronização fiscal com a Spedy.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => syncMutation.mutate()}
            disabled={syncMutation.isPending || !canEdit}
          >
            <RefreshCcw className="mr-2 h-4 w-4" />
            SINCRONIZAR EMPRESA
          </Button>
          <Button
            onClick={() => saveMutation.mutate()}
            disabled={saveMutation.isPending || !canEdit}
          >
            <Save className="mr-2 h-4 w-4" />
            SALVAR
          </Button>
        </div>
      </div>

      <SectionWrapper
        title="OPERACIONAL"
        icon={<BadgeCheck className="h-4 w-4" />}
      >
        <FiscalEnvironmentSwitcher
          fiscalConfig={state.fiscalConfiguracao}
          updateFiscalConfig={updateFiscalConfig}
          disabled={!canEdit}
        />
        <div className="flex items-center justify-between rounded-lg border p-4">
          <div>
            <Label>EMISSÃO AUTOMÁTICA</Label>
            <p className="text-sm text-muted-foreground">
              Dispara emissão ao confirmar a venda.
            </p>
          </div>
          <Switch
            checked={state.fiscalEmissaoAutomatica}
            disabled={!canEdit}
            onCheckedChange={(checked) =>
              updateSettings({ fiscalEmissaoAutomatica: checked })
            }
          />
        </div>
        {state.fiscalEmissaoAutomatica ? (
          <AutoEmissionPaymentMethodExceptions
            fiscalConfig={state.fiscalConfiguracao}
            updateFiscalConfig={updateFiscalConfig}
          />
        ) : null}
        <InboundDfeSettings
          fiscalConfig={state.fiscalConfiguracao}
          updateFiscalConfig={updateFiscalConfig}
        />
        <ExceptionalPresenceClassificationSettings
          fiscalConfig={state.fiscalConfiguracao}
          updateFiscalConfig={updateFiscalConfig}
          disabled={!canEdit}
        />
      </SectionWrapper>

      <CompanyBasicInformation
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

type ExceptionalPresenceClassificationSettingsProps = {
  fiscalConfig: TUseInternalFiscalSettingsState["state"]["fiscalConfiguracao"];
  updateFiscalConfig: TUseInternalFiscalSettingsState["updateFiscalConfig"];
  disabled: boolean;
};
function ExceptionalPresenceClassificationSettings({
  fiscalConfig,
  updateFiscalConfig,
  disabled,
}: ExceptionalPresenceClassificationSettingsProps) {
  const [confirmationOpen, setConfirmationOpen] = useState(false);
  const [acknowledged, setAcknowledged] = useState(false);
  const enabled =
    fiscalConfig.emissaoManual.classificacaoPresencialExcepcional.habilitada;

  const setEnabled = (habilitada: boolean) => {
    updateFiscalConfig({
      emissaoManual: {
        classificacaoPresencialExcepcional: { habilitada },
      },
    });
  };

  const closeConfirmation = () => {
    setConfirmationOpen(false);
    setAcknowledged(false);
  };

  return (
    <>
      <div className="flex items-start justify-between gap-4 rounded-lg border border-amber-300/70 bg-amber-50/50 p-4 dark:border-amber-900/60 dark:bg-amber-950/20">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-700 dark:text-amber-400" />
            <Label>CLASSIFICAÇÃO PRESENCIAL EXCEPCIONAL</Label>
          </div>
          <p className="max-w-3xl text-sm text-muted-foreground">
            Permite que um usuário autorizado declare manualmente uma venda com
            entrega como operação presencial. Use somente em situações
            excepcionais, com orientação contábil e justificativa registrada.
          </p>
          <p className="text-xs font-medium text-amber-800 dark:text-amber-300">
            A autorização da SEFAZ não confirma que essa classificação
            representa corretamente a operação.
          </p>
        </div>
        <Switch
          checked={enabled}
          disabled={disabled}
          onCheckedChange={(checked) => {
            if (!checked) {
              setEnabled(false);
              return;
            }
            setConfirmationOpen(true);
          }}
        />
      </div>

      {confirmationOpen ? (
        <ResponsiveMenu
          menuTitle="HABILITAR CLASSIFICAÇÃO EXCEPCIONAL"
          menuDescription="Esta opção altera uma informação fiscal material e deve permanecer restrita a casos orientados pela contabilidade."
          menuActionButtonText="HABILITAR RECURSO"
          menuActionButtonVariant="destructive"
          menuActionButtonDisabled={!acknowledged}
          menuCancelButtonText="VOLTAR"
          actionFunction={() => {
            setEnabled(true);
            closeConfirmation();
          }}
          actionIsLoading={false}
          stateIsLoading={false}
          closeMenu={closeConfirmation}
        >
          <div className="space-y-4">
            <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-4 text-sm">
              <p className="font-semibold text-destructive">
                Evite este recurso sempre que for possível identificar o
                destinatário.
              </p>
              <p className="mt-1 text-muted-foreground">
                Cada uso exigirá confirmação e justificativa. A venda continuará
                registrada como entrega, e a declaração, o usuário e a data
                ficarão no histórico do documento fiscal.
              </p>
            </div>
            <div className="flex items-start gap-3 rounded-lg border p-3">
              <Checkbox
                id="acknowledge-exceptional-presence"
                checked={acknowledged}
                onCheckedChange={(checked) => setAcknowledged(checked === true)}
              />
              <Label
                htmlFor="acknowledge-exceptional-presence"
                className="cursor-pointer text-sm font-normal leading-5"
              >
                Entendo que essa opção não corrige a natureza da operação e que
                seu uso deve seguir orientação contábil específica.
              </Label>
            </div>
          </div>
        </ResponsiveMenu>
      ) : null}
    </>
  );
}

// Ambiente de emissao da organizacao. Nao e um Switch booleano de proposito: as duas opcoes tem
// consequencias distintas e irreversiveis (numeracao de serie consumida, documento com ou sem
// valor fiscal), entao ambas ficam visiveis e rotuladas em vez de escondidas atras de um estado.
const FISCAL_ENVIRONMENT_OPTIONS = [
  {
    value: "HOMOLOGACAO",
    label: "HOMOLOGAÇÃO",
    description: "Testes sem valor fiscal.",
    icon: FlaskConical,
    selectedClassName:
      "border-amber-500 bg-amber-50 dark:border-amber-600 dark:bg-amber-950/40",
    iconClassName: "text-amber-600 dark:text-amber-500",
    labelClassName: "text-amber-900 dark:text-amber-200",
  },
  {
    value: "PRODUCAO",
    label: "PRODUÇÃO",
    description: "Documentos valem contra a SEFAZ.",
    icon: ShieldCheck,
    selectedClassName:
      "border-emerald-500 bg-emerald-50 dark:border-emerald-600 dark:bg-emerald-950/40",
    iconClassName: "text-emerald-600 dark:text-emerald-500",
    labelClassName: "text-emerald-900 dark:text-emerald-200",
  },
] as const satisfies ReadonlyArray<{
  value: TFiscalDocumentEnvironmentEnum;
  label: string;
  description: string;
  icon: LucideIcon;
  selectedClassName: string;
  iconClassName: string;
  labelClassName: string;
}>;

type FiscalEnvironmentSwitcherProps = {
  fiscalConfig: TUseInternalFiscalSettingsState["state"]["fiscalConfiguracao"];
  updateFiscalConfig: TUseInternalFiscalSettingsState["updateFiscalConfig"];
  disabled: boolean;
};
function FiscalEnvironmentSwitcher({
  fiscalConfig,
  updateFiscalConfig,
  disabled,
}: FiscalEnvironmentSwitcherProps) {
  const ambiente = fiscalConfig.ambiente;

  return (
    <div className="space-y-3 rounded-lg border p-4">
      <div>
        <Label>AMBIENTE DE EMISSÃO</Label>
        <p className="text-sm text-muted-foreground">
          Define contra qual ambiente da SEFAZ os documentos são enviados.
        </p>
      </div>
      <div
        role="radiogroup"
        aria-label="Ambiente de emissão"
        className="grid gap-2 sm:grid-cols-2"
      >
        {FISCAL_ENVIRONMENT_OPTIONS.map((option) => {
          const isSelected = ambiente === option.value;
          const Icon = option.icon;
          return (
            <button
              key={option.value}
              type="button"
              role="radio"
              aria-checked={isSelected}
              disabled={disabled}
              onClick={() => updateFiscalConfig({ ambiente: option.value })}
              className={cn(
                "flex items-center gap-3 rounded-lg border-2 p-3 text-left transition-colors",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                "disabled:cursor-not-allowed disabled:opacity-60",
                isSelected
                  ? option.selectedClassName
                  : "border-transparent bg-muted/40 hover:bg-muted",
              )}
            >
              <Icon
                className={cn(
                  "h-5 min-h-5 w-5 min-w-5",
                  isSelected ? option.iconClassName : "text-muted-foreground",
                )}
              />
              <div className="min-w-0">
                <p
                  className={cn(
                    "text-sm font-bold tracking-tight",
                    isSelected
                      ? option.labelClassName
                      : "text-muted-foreground",
                  )}
                >
                  {option.label}
                </p>
                <p className="text-xs text-muted-foreground">
                  {option.description}
                </p>
              </div>
            </button>
          );
        })}
      </div>
      {ambiente === "PRODUCAO" ? (
        <p className="text-xs font-medium text-emerald-700 dark:text-emerald-400">
          Documentos emitidos terão valor fiscal e consumirão a numeração da
          série de produção.
        </p>
      ) : (
        <p className="text-xs font-medium text-amber-700 dark:text-amber-500">
          Documentos emitidos não têm valor fiscal e usam a série de
          homologação. Ideal para validar a configuração antes de virar a chave.
        </p>
      )}
    </div>
  );
}

type InboundDfeSettingsProps = {
  fiscalConfig: TUseInternalFiscalSettingsState["state"]["fiscalConfiguracao"];
  updateFiscalConfig: TUseInternalFiscalSettingsState["updateFiscalConfig"];
};
function InboundDfeSettings({
  fiscalConfig,
  updateFiscalConfig,
}: InboundDfeSettingsProps) {
  const dfe = fiscalConfig.dfe;

  const handleToggleHabilitado = (habilitado: boolean) => {
    updateFiscalConfig({
      dfe: {
        ...dfe,
        habilitado,
        // Corte padrao ao habilitar: hoje (a SEFAZ retem ~90 dias de distribuicao).
        dataInicio: habilitado
          ? (dfe.dataInicio ?? new Date().toISOString())
          : dfe.dataInicio,
      },
    });
  };

  return (
    <div className="space-y-3 rounded-lg border p-4">
      <div className="flex items-center justify-between">
        <div>
          <Label>NOTAS RECEBIDAS (DF-e)</Label>
          <p className="text-sm text-muted-foreground">
            Importa automaticamente as NF-e emitidas contra o CNPJ da empresa.
          </p>
        </div>
        <Switch
          checked={dfe.habilitado}
          onCheckedChange={handleToggleHabilitado}
        />
      </div>
      {dfe.habilitado ? (
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div className="w-full lg:w-64">
            <DateInput
              label="IMPORTAR NOTAS A PARTIR DE"
              value={dfe.dataInicio ? dfe.dataInicio.slice(0, 10) : undefined}
              handleChange={(value) =>
                updateFiscalConfig({
                  dfe: {
                    ...dfe,
                    dataInicio: value ? new Date(value).toISOString() : null,
                  },
                })
              }
            />
            <p className="mt-1 text-xs text-muted-foreground">
              A SEFAZ disponibiliza cerca de 90 dias de histórico.
            </p>
          </div>
          <div className="flex items-center justify-between gap-3 rounded-lg border px-3 py-2.5 lg:w-96">
            <div>
              <p className="text-sm font-semibold">Ciência automática</p>
              <p className="text-xs text-muted-foreground">
                Registra ciência ao receber novas notas, destravando o XML
                completo.
              </p>
            </div>
            <Switch
              checked={dfe.autoCiencia}
              onCheckedChange={(checked) =>
                updateFiscalConfig({ dfe: { ...dfe, autoCiencia: checked } })
              }
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}

const AUTO_EMISSION_PAYMENT_METHOD_OPTIONS: Array<{
  value: TPaymentMethodEnum;
  label: string;
  icon: typeof Banknote;
}> = [
  { value: "DINHEIRO", label: "Dinheiro", icon: Banknote },
  { value: "PIX", label: "PIX", icon: QrCode },
  { value: "CARTAO_CREDITO", label: "Cartão de crédito", icon: CreditCard },
  { value: "CARTAO_DEBITO", label: "Cartão de débito", icon: CreditCard },
  { value: "BOLETO", label: "Boleto", icon: Barcode },
  { value: "TRANSFERENCIA", label: "Transferência", icon: Landmark },
  { value: "CASHBACK", label: "Cashback", icon: Gift },
  { value: "VALE", label: "Vale", icon: Ticket },
  { value: "A_DEFINIR", label: "A definir", icon: HelpCircle },
  { value: "FIADO_NOTA", label: "Fiado (nota)", icon: NotebookPen },
  { value: "OUTRO", label: "Outro", icon: CircleEllipsis },
];

type AutoEmissionPaymentMethodExceptionsProps = {
  fiscalConfig: TUseInternalFiscalSettingsState["state"]["fiscalConfiguracao"];
  updateFiscalConfig: TUseInternalFiscalSettingsState["updateFiscalConfig"];
};
function AutoEmissionPaymentMethodExceptions({
  fiscalConfig,
  updateFiscalConfig,
}: AutoEmissionPaymentMethodExceptionsProps) {
  const pagamentoExclusivo =
    fiscalConfig.emissaoAutomatica.excecoes.pagamentoExclusivo;

  const toggleMethod = (metodo: TPaymentMethodEnum, emitir: boolean) => {
    const next = emitir
      ? pagamentoExclusivo.filter((item) => item !== metodo)
      : [...new Set([...pagamentoExclusivo, metodo])];
    updateFiscalConfig({
      emissaoAutomatica: { excecoes: { pagamentoExclusivo: next } },
    });
  };

  return (
    <div className="space-y-3 rounded-lg border p-4">
      <div>
        <Label>EMISSÃO POR MÉTODO DE PAGAMENTO</Label>
        <p className="text-sm text-muted-foreground">
          A emissão automática é pausada quando a venda for paga{" "}
          <span className="font-semibold">somente</span> com métodos desativados
          abaixo — um mix com qualquer método ativo emite normalmente.
        </p>
      </div>
      <div className="divide-y rounded-lg border">
        {AUTO_EMISSION_PAYMENT_METHOD_OPTIONS.map((method) => {
          const Icon = method.icon;
          const emitir = !pagamentoExclusivo.includes(method.value);
          return (
            <div
              key={method.value}
              className="flex items-center justify-between gap-3 px-3 py-2.5"
            >
              <div className="flex items-center gap-3">
                <span className="flex size-8 items-center justify-center rounded-lg bg-muted">
                  <Icon className="size-4" />
                </span>
                <div>
                  <p className="text-sm font-semibold">{method.label}</p>
                  {!emitir ? (
                    <p className="text-xs text-muted-foreground">
                      Não emite quando for a única forma de pagamento.
                    </p>
                  ) : null}
                </div>
              </div>
              <Switch
                checked={emitir}
                onCheckedChange={(checked) =>
                  toggleMethod(method.value, checked)
                }
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}

type CompanyBasicInformationProps = {
  fiscalConfig: TUseInternalFiscalSettingsState["state"]["fiscalConfiguracao"];
  updateFiscalConfig: TUseInternalFiscalSettingsState["updateFiscalConfig"];
  callbacks: {
    onMutate: () => void;
    onSettled: () => void;
  };
};
function CompanyBasicInformation({
  fiscalConfig,
  updateFiscalConfig,
  callbacks,
}: CompanyBasicInformationProps) {
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
    <SectionWrapper
      title="EMPRESA FISCAL"
      icon={<Receipt className="h-4 w-4" />}
    >
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
            handleChange={(value) =>
              updateFiscalConfig({ nomeFantasia: value })
            }
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
            handleChange={(value) =>
              updateFiscalConfig({ regimeTributario: Number(value) })
            }
            onReset={() => updateFiscalConfig({ regimeTributario: undefined })}
          />
        </div>
        <div className="w-full lg:w-1/3">
          <TextInput
            label="INSCRIÇÃO ESTADUAL"
            value={fiscalConfig.inscricaoEstadual ?? ""}
            placeholder="Inscrição estadual"
            handleChange={(value) =>
              updateFiscalConfig({ inscricaoEstadual: value })
            }
          />
        </div>
        <div className="w-full lg:w-1/3">
          <TextInput
            label="INSCRIÇÃO MUNICIPAL"
            value={fiscalConfig.inscricaoMunicipal ?? ""}
            placeholder="Inscrição municipal"
            handleChange={(value) =>
              updateFiscalConfig({ inscricaoMunicipal: value })
            }
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
            handleChange={(value) =>
              updateFiscalConfig({ telefoneFiscal: formatToPhone(value) })
            }
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
              updateFiscalConfig({
                endereco: { ...fiscalConfig.endereco, cep: formatToCEP(value) },
              });
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
              updateFiscalConfig({
                endereco: {
                  ...fiscalConfig.endereco,
                  uf: value,
                  cidade: BrazilianCitiesOptionsFromUF(value ?? null)[0]?.value,
                },
              })
            }
            onReset={() =>
              updateFiscalConfig({
                endereco: { ...fiscalConfig.endereco, uf: "", cidade: "" },
              })
            }
          />
        </div>
        <div className="w-full lg:w-1/3">
          <SelectInput
            label="CIDADE"
            value={fiscalConfig.endereco.cidade}
            options={BrazilianCitiesOptionsFromUF(
              fiscalConfig.endereco.uf ?? null,
            )}
            resetOptionLabel="Selecione uma cidade"
            handleChange={(value) =>
              updateFiscalConfig({
                endereco: { ...fiscalConfig.endereco, cidade: value },
              })
            }
            onReset={() =>
              updateFiscalConfig({
                endereco: { ...fiscalConfig.endereco, cidade: "" },
              })
            }
          />
        </div>
      </div>
      <div className="w-full flex items-center gap-3 flex-col lg:flex-row">
        <div className="w-full lg:w-1/2">
          <TextInput
            label="CÓDIGO MUNICÍPIO"
            value={fiscalConfig.endereco.codigoMunicipio}
            placeholder="Código IBGE"
            handleChange={(value) =>
              updateFiscalConfig({
                endereco: { ...fiscalConfig.endereco, codigoMunicipio: value },
              })
            }
          />
        </div>
        <div className="w-full lg:w-1/2">
          <TextInput
            label="BAIRRO"
            value={fiscalConfig.endereco.bairro}
            placeholder="Bairro"
            handleChange={(value) =>
              updateFiscalConfig({
                endereco: { ...fiscalConfig.endereco, bairro: value },
              })
            }
          />
        </div>
      </div>
      <div className="w-full flex items-center gap-3 flex-col lg:flex-row">
        <div className="w-full lg:w-1/2">
          <TextInput
            label="LOGRADOURO"
            value={fiscalConfig.endereco.logradouro}
            placeholder="Rua / avenida"
            handleChange={(value) =>
              updateFiscalConfig({
                endereco: { ...fiscalConfig.endereco, logradouro: value },
              })
            }
          />
        </div>
        <div className="w-full lg:w-1/2">
          <TextInput
            label="NÚMERO"
            value={fiscalConfig.endereco.numero}
            placeholder="Número"
            handleChange={(value) =>
              updateFiscalConfig({
                endereco: { ...fiscalConfig.endereco, numero: value },
              })
            }
          />
        </div>
      </div>
      <div className="w-full flex items-center gap-3 flex-col lg:flex-row">
        <div className="w-full lg:w-1/3">
          <TextInput
            label="CNAE"
            value={fiscalConfig.cnae ?? ""}
            placeholder="CNAE"
            handleChange={(value) => updateFiscalConfig({ cnae: value })}
          />
        </div>
        <div className="w-full lg:w-1/3">
          <TextInput
            label="ID DO TOKEN CSC"
            value={fiscalConfig.spedy?.nfce.tokenId ?? ""}
            placeholder="Identificador fornecido pela SEFAZ"
            handleChange={(value) =>
              updateFiscalConfig({
                spedy: {
                  ...fiscalConfig.spedy,
                  nfce: { ...fiscalConfig.spedy.nfce, tokenId: value },
                },
              })
            }
          />
        </div>
        <div className="w-full lg:w-1/3">
          <TextInput
            label="CSC (CÓDIGO DE SEGURANÇA)"
            value={fiscalConfig.spedy?.nfce?.csc ?? ""}
            placeholder="Código fornecido pela SEFAZ"
            inputType="password"
            autoComplete="off"
            handleChange={(value) =>
              updateFiscalConfig({
                spedy: {
                  ...fiscalConfig.spedy,
                  nfce: { ...fiscalConfig.spedy.nfce, csc: value },
                },
              })
            }
          />
        </div>
      </div>
      <div className="w-full flex items-center gap-3 flex-col lg:flex-row">
        <div className="w-full lg:w-1/2">
          <TextInput
            label="ID EMPRESA SPEDY"
            value={fiscalConfig.spedy?.companyId ?? ""}
            placeholder="Sincronize a empresa"
            editable={false}
            handleChange={() => undefined}
          />
        </div>
        <div className="w-full lg:w-1/2">
          <TextInput
            label="CREDENCIAL DE EMISSÃO"
            value={fiscalConfig.spedy?.companyApiKey ? "ATIVA" : "PENDENTE"}
            placeholder="Sincronize a empresa"
            editable={false}
            handleChange={() => undefined}
          />
        </div>
      </div>
      <div className={"flex w-full flex-col gap-1"}>
        <Label
          htmlFor={"fiscal-certificate"}
          className={cn("text-sm font-medium tracking-tight")}
        >
          CERTIFICADO FISCAL
        </Label>

        {fiscalConfig.spedy?.certificado?.providerManaged ||
        fiscalConfig.spedy?.certificado?.storagePath ? (
          <Button
            variant="success-light"
            onClick={() => setCertificateMenuOpen(true)}
            className="w-fit flex items-center gap-1.5"
          >
            <CheckCheck className="w-4 h-4 min-w-4 min-h-4" />
            CERTIFICADO ATIVO
          </Button>
        ) : (
          <Button
            variant="outline"
            onClick={() => setCertificateMenuOpen(true)}
            className="w-fit flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4 min-w-4 min-h-4" />
            CARREGAR CERTIFICADO
          </Button>
        )}
      </div>
      {certificateMenuOpen ? (
        <FiscalCertificateMenu
          fiscalConfigCertificate={fiscalConfig.spedy?.certificado}
          callbacks={callbacks}
          closeMenu={() => setCertificateMenuOpen(false)}
        />
      ) : null}
    </SectionWrapper>
  );
}

type FiscalCertificateMenuProps = {
  fiscalConfigCertificate: TUseInternalFiscalSettingsState["state"]["fiscalConfiguracao"]["spedy"]["certificado"];
  callbacks: {
    onMutate: () => void;
    onSettled: () => void;
  };
  closeMenu: () => void;
};
function FiscalCertificateMenu({
  fiscalConfigCertificate,
  callbacks,
  closeMenu,
}: FiscalCertificateMenuProps) {
  const [certificateInformation, setCertificateInformation] = useState<{
    file: File | null;
    password: string | null;
  }>({
    file: null,
    password: null,
  });

  async function handleSubmitCertificate(info: {
    file: File | null;
    password: string | null;
  }) {
    if (!info.file) throw new Error("Arquivo não selecionado.");
    if (!info.password) throw new Error("Senha não informada.");

    return await syncFiscalCompanyCertificate({
      file: info.file,
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
                <p className="text-center text-xs font-medium">
                  ARQUIVO SELECIONADO
                </p>
                <p className="line-clamp-4 break-all text-center text-xs font-medium text-muted-foreground">
                  {certificateInformation.file.name}
                </p>
              </>
            ) : fiscalConfigCertificate.providerManaged ||
              fiscalConfigCertificate.storagePath ? (
              <>
                <FileIcon className="h-6 w-6 shrink-0" />
                <p className="text-center text-xs font-medium">
                  CERTIFICADO DEFINIDO
                </p>
              </>
            ) : (
              <>
                <Plus className="h-6 w-6 shrink-0" />
                <p className="text-center text-xs font-medium">
                  CARREGAR ARQUIVO
                </p>
              </>
            )}
          </div>
        </label>
      </div>
      <TextInput
        label="SENHA"
        value={certificateInformation.password ?? ""}
        placeholder="Senha"
        handleChange={(value) =>
          setCertificateInformation((prev) => ({ ...prev, password: value }))
        }
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

const FISCAL_CONSUMER_PRESENCE_LABELS: Record<
  TFiscalOperationConsumerPresenceEnum,
  string
> = {
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

const FISCAL_ENVIRONMENT_LABELS: Record<
  TFiscalDocumentEnvironmentEnum,
  string
> = {
  HOMOLOGACAO: "HOMOLOGAÇÃO",
  PRODUCAO: "PRODUÇÃO",
};
const FISCAL_ENVIRONMENT_STYLES: Record<
  TFiscalDocumentEnvironmentEnum,
  string
> = {
  HOMOLOGACAO: "bg-amber-500 dark:bg-amber-600 text-white",
  PRODUCAO: "bg-emerald-500 dark:bg-emerald-600 text-white",
};

const FISCAL_DOCUMENT_STATUS_LABELS: Record<TFiscalDocumentStatusEnum, string> =
  {
    PENDENTE: "PENDENTE",
    AUTORIZADA: "AUTORIZADA",
    CANCELADA: "CANCELADA",
    INUTILIZADA: "INUTILIZADA",
  };

const FISCAL_DOCUMENT_STATUS_FILTERS: {
  label: string;
  statuses: TFiscalDocumentLifecycleStatusEnum[];
}[] = [
  { label: "TODOS", statuses: [] },
  {
    label: "PENDENTES",
    statuses: ["RASCUNHO", "PRONTO_PARA_ENVIO", "EM_PROCESSAMENTO"],
  },
  { label: "ERROS E REJEIÇÕES", statuses: ["ERRO", "REJEITADO"] },
  { label: "AUTORIZADOS", statuses: ["AUTORIZADO"] },
  { label: "INUTILIZADOS", statuses: ["INUTILIZADO"] },
];
const FISCAL_LIFECYCLE_STATUS_LIST_LABELS: Record<
  TFiscalDocumentLifecycleStatusEnum,
  string
> = {
  RASCUNHO: "RASCUNHO",
  PRONTO_PARA_ENVIO: "PRONTO PARA ENVIO",
  EM_PROCESSAMENTO: "EM PROCESSAMENTO",
  AUTORIZADO: "AUTORIZADO",
  REJEITADO: "REJEITADO",
  CANCELAMENTO_PENDENTE: "CANCELAMENTO PENDENTE",
  CANCELADO: "CANCELADO",
  INUTILIZADO: "INUTILIZADO",
  ERRO: "ERRO",
};
const FISCAL_LIFECYCLE_STATUS_LABELS: Record<
  TFiscalDocumentLifecycleStatusEnum,
  string
> = {
  RASCUNHO: "RASCUNHO",
  PRONTO_PARA_ENVIO: "PRONTO PARA ENVIO",
  EM_PROCESSAMENTO: "EM PROCESSAMENTO",
  AUTORIZADO: "AUTORIZADO",
  REJEITADO: "REJEITADO",
  CANCELAMENTO_PENDENTE: "CANCELAMENTO PENDENTE",
  CANCELADO: "CANCELADO",
  INUTILIZADO: "INUTILIZADO",
  ERRO: "ERRO",
};
const FISCAL_LIFECYCLE_STATUS_STYLES: Record<
  TFiscalDocumentLifecycleStatusEnum,
  string
> = {
  RASCUNHO: "bg-zinc-400 dark:bg-zinc-500 text-white",
  PRONTO_PARA_ENVIO: "bg-sky-500 dark:bg-sky-600 text-white",
  EM_PROCESSAMENTO: "bg-amber-500 dark:bg-amber-600 text-white",
  AUTORIZADO: "bg-green-500 dark:bg-green-600 text-white",
  REJEITADO: "bg-rose-500 dark:bg-rose-600 text-white",
  CANCELAMENTO_PENDENTE: "bg-orange-500 dark:bg-orange-600 text-white",
  CANCELADO: "bg-red-600 dark:bg-red-700 text-white",
  INUTILIZADO: "bg-zinc-500 dark:bg-zinc-600 text-white",
  ERRO: "bg-red-500 dark:bg-red-600 text-white",
};

function formatBRL(value: number | null | undefined) {
  if (value === null || value === undefined) return "R$ 0,00";
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function CompanyFiscalOperationProfiles() {
  const queryClient = useQueryClient();
  const [newProfileMenuIsOpen, setNewProfileMenuIsOpen] = useState(false);
  const [editingProfileId, setEditingProfileId] = useState<string | null>(null);
  const { data, queryKey, isLoading, isError, isSuccess, error } =
    useFiscalOperationProfiles();

  const handleOnMutate = async () =>
    await queryClient.cancelQueries({ queryKey: queryKey });
  const handleOnSettled = async () =>
    await queryClient.invalidateQueries({ queryKey: queryKey });
  return (
    <SectionWrapper
      title="PERFIS DE OPERAÇÃO FISCAL"
      icon={<BadgeCheck className="h-4 w-4" />}
    >
      {isLoading ? <LoadingComponent /> : null}
      {isError ? <ErrorComponent msg={getErrorMessage(error)} /> : null}
      {isSuccess ? (
        data.length > 0 ? (
          <div className="flex flex-col gap-2 w-full">
            {data.map((profile) => (
              <CompanyFiscalOperationProfile
                key={profile.id}
                profile={profile}
                handleEditClick={() => setEditingProfileId(profile.id)}
              />
            ))}
          </div>
        ) : (
          <div className="flex items-center justify-center py-6">
            <p className="text-sm text-muted-foreground">
              Nenhum perfil de operação fiscal encontrado.
            </p>
          </div>
        )
      ) : null}
      <div className="w-full flex items-center justify-center">
        <Button
          variant={"ghost"}
          size={"fit"}
          className="flex items-center gap-1 px-2 py-1 text-xs"
          onClick={() => setNewProfileMenuIsOpen(true)}
        >
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
  const [editingTaxGroupId, setEditingTaxGroupId] = useState<string | null>(
    null,
  );
  const { data, queryKey, isLoading, isError, isSuccess, error } =
    useFiscalTaxGroups();

  const handleOnMutate = async () =>
    await queryClient.cancelQueries({ queryKey: queryKey });
  const handleOnSettled = async () =>
    await queryClient.invalidateQueries({ queryKey: queryKey });
  return (
    <SectionWrapper
      title="GRUPOS TRIBUTÁRIOS"
      icon={<Percent className="h-4 w-4" />}
    >
      {isLoading ? <LoadingComponent /> : null}
      {isError ? <ErrorComponent msg={getErrorMessage(error)} /> : null}
      {isSuccess ? (
        data.length > 0 ? (
          <div className="flex flex-col gap-2 w-full">
            {data.map((taxGroup) => (
              <CompanyFiscalTaxGroup
                key={taxGroup.id}
                taxGroup={taxGroup}
                handleEditClick={() => setEditingTaxGroupId(taxGroup.id)}
              />
            ))}
          </div>
        ) : (
          <div className="flex items-center justify-center py-6">
            <p className="text-sm text-muted-foreground">
              Nenhum grupo tributário encontrado.
            </p>
          </div>
        )
      ) : null}
      <div className="w-full flex items-center justify-center">
        <Button
          variant={"ghost"}
          size={"fit"}
          className="flex items-center gap-1 px-2 py-1 text-xs"
          onClick={() => setNewTaxGroupMenuIsOpen(true)}
        >
          <Plus className="w-4 h-4 min-w-4 min-h-4" />
          ADICIONAR
        </Button>
      </div>
      {newTaxGroupMenuIsOpen ? (
        <NewFiscalTaxGroup
          closeModal={() => setNewTaxGroupMenuIsOpen(false)}
          callbacks={{ onMutate: handleOnMutate, onSettled: handleOnSettled }}
        />
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
function CompanyFiscalTaxGroup({
  taxGroup,
  handleEditClick,
}: CompanyFiscalTaxGroupProps) {
  const regrasAtivas = taxGroup.regras?.length ?? 0;
  return (
    <button
      type="button"
      onClick={handleEditClick}
      className="w-full flex flex-col gap-1 rounded-lg border p-3 text-left transition hover:border-primary/40"
    >
      <div className="w-full flex items-center justify-between gap-2">
        <h3 className="text-sm font-bold tracking-tight uppercase">
          {taxGroup.nome}
        </h3>
        <span
          className={`text-[10px] font-bold uppercase tracking-tight ${taxGroup.ativo ? "text-green-600" : "text-muted-foreground"}`}
        >
          {taxGroup.ativo ? "ATIVO" : "INATIVO"}
        </span>
      </div>
      <div className="w-full flex items-center gap-2 flex-wrap">
        <span className="text-xs font-medium tracking-tight text-primary/70">
          CSOSN {taxGroup.csosn}
        </span>
        <span className="text-xs font-medium tracking-tight text-primary/70">
          PIS {taxGroup.cstPis}
        </span>
        <span className="text-xs font-medium tracking-tight text-primary/70">
          COFINS {taxGroup.cstCofins}
        </span>
        {taxGroup.temSubstituicaoTributaria ? (
          <span className="text-xs font-medium tracking-tight text-amber-600">
            ICMS-ST
          </span>
        ) : null}
        {regrasAtivas > 0 ? (
          <span className="text-xs font-medium tracking-tight text-primary/70">
            {regrasAtivas} regra(s)
          </span>
        ) : null}
      </div>
      {taxGroup.descricao ? (
        <p className="text-xs text-muted-foreground">{taxGroup.descricao}</p>
      ) : null}
    </button>
  );
}

type CompanyFiscalOperationProfileProps = {
  profile: TGetFiscalOperationProfilesOutputDefault[number];
  handleEditClick: () => void;
};
function CompanyFiscalOperationProfile({
  profile,
  handleEditClick,
}: CompanyFiscalOperationProfileProps) {
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
            <h1 className="text-xs font-bold tracking-tight lg:text-sm">
              {profile.nome}
            </h1>
            <div className="flex items-center gap-1">
              <Flag className="w-4 h-4 min-w-4 min-h-4" />
              <h1 className="py-0.5 text-center text-[0.65rem] font-medium italic">
                {FISCAL_FINALITY_LABELS[profile.finalidade]}
              </h1>
            </div>
            <div className="flex items-center gap-1">
              <User className="w-4 h-4 min-w-4 min-h-4" />
              <h1 className="py-0.5 text-center text-[0.65rem] font-medium italic">
                {profile.consumidorFinal
                  ? "CONSUMIDOR FINAL"
                  : "NÃO CONSUMIDOR FINAL"}
              </h1>
            </div>
          </div>
          <div className="flex items-center gap-3 flex-col md:flex-row gap-y-1">
            <div className="flex items-center gap-3 flex-wrap">
              <StatBadge
                icon={<Receipt className="w-4 min-w-4 h-4 min-h-4" />}
                value={profile.tipoDocumento}
                tooltipContent="Tipo do documento fiscal emitido por este perfil"
                className={cn(
                  FISCAL_DOCUMENT_TYPE_STYLES[profile.tipoDocumento],
                )}
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
                icon={
                  profile.ativo ? (
                    <CircleCheck className="w-4 min-w-4 h-4 min-h-4" />
                  ) : (
                    <CircleX className="w-4 min-w-4 h-4 min-h-4" />
                  )
                }
                value={profile.ativo ? "ATIVO" : "INATIVO"}
                tooltipContent={
                  profile.ativo
                    ? "Perfil disponível para emissão"
                    : "Perfil desativado"
                }
                className={cn(
                  profile.ativo
                    ? "bg-green-500 dark:bg-green-600 text-white"
                    : "bg-red-500 dark:bg-red-600 text-white",
                )}
              />
            </div>
          </div>
        </div>
        {profile.descricao ? (
          <p className="text-xs text-muted-foreground tracking-tight">
            {profile.descricao}
          </p>
        ) : null}
        <div className="w-full flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2 flex-wrap">
            <div
              className={cn(
                "flex items-center gap-1.5 text-[0.65rem] font-bold text-primary",
              )}
            >
              <FileText className="w-3 min-w-3 h-3 min-h-3" />
              <p className="text-xs font-medium tracking-tight uppercase">
                NATUREZA: {profile.naturezaOperacao}
              </p>
            </div>
            <div
              className={cn(
                "flex items-center gap-1.5 text-[0.65rem] font-bold text-primary",
              )}
            >
              <MapPin className="w-3 min-w-3 h-3 min-h-3" />
              <p className="text-xs font-medium tracking-tight uppercase">
                PRESENÇA:{" "}
                {FISCAL_CONSUMER_PRESENCE_LABELS[profile.presencaConsumidor]}
              </p>
            </div>
            {profile.dataInsercao ? (
              <div
                className={cn(
                  "flex items-center gap-1.5 text-[0.65rem] font-bold text-primary",
                )}
              >
                <Calendar className="w-3 min-w-3 h-3 min-h-3" />
                <p className="text-xs font-medium tracking-tight uppercase">
                  CADASTRADO EM: {formatDateAsLocale(profile.dataInsercao)}
                </p>
              </div>
            ) : null}
          </div>
          <Button
            variant="ghost"
            className="flex items-center gap-1.5"
            size="sm"
            onClick={handleEditClick}
          >
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
  const { data, queryKey, isLoading, isError, isSuccess, error } =
    useFiscalSeries();

  const handleOnMutate = async () =>
    await queryClient.cancelQueries({ queryKey });
  const handleOnSettled = async () =>
    await queryClient.invalidateQueries({ queryKey });

  return (
    <SectionWrapper
      title="SÉRIES FISCAIS"
      icon={<BookText className="h-4 w-4" />}
    >
      <p className="text-xs text-muted-foreground tracking-tight">
        As séries definem o contador de numeração dos documentos fiscais
        emitidos. Devem estar sincronizadas com a SEFAZ — alterações manuais do
        próximo número podem causar rejeições.
      </p>
      {isLoading ? <LoadingComponent /> : null}
      {isError ? <ErrorComponent msg={getErrorMessage(error)} /> : null}
      {isSuccess ? (
        data.length > 0 ? (
          <div className="flex flex-col gap-2 w-full">
            {data.map((series) => (
              <CompanyFiscalSeriesCard
                key={series.id}
                series={series}
                handleEditClick={() => setEditingSeriesId(series.id)}
              />
            ))}
          </div>
        ) : (
          <div className="flex items-center justify-center py-6">
            <p className="text-sm text-muted-foreground">
              Nenhuma série fiscal cadastrada.
            </p>
          </div>
        )
      ) : null}
      <div className="w-full flex items-center justify-center">
        <Button
          variant={"ghost"}
          size={"fit"}
          className="flex items-center gap-1 px-2 py-1 text-xs"
          onClick={() => setNewSeriesMenuIsOpen(true)}
        >
          <Plus className="w-4 h-4 min-w-4 min-h-4" />
          ADICIONAR
        </Button>
      </div>
      {newSeriesMenuIsOpen ? (
        <NewFiscalSeries
          closeModal={() => setNewSeriesMenuIsOpen(false)}
          callbacks={{ onMutate: handleOnMutate, onSettled: handleOnSettled }}
        />
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
function CompanyFiscalSeriesCard({
  series,
  handleEditClick,
}: CompanyFiscalSeriesCardProps) {
  return (
    <TooltipProvider>
      <div
        className={cn(
          "bg-card border-primary/20 flex w-full flex-col gap-1 rounded-xl border px-3 py-4 shadow-2xs",
          !series.ativo ? "opacity-70" : null,
        )}
      >
        <div className="w-full flex items-center justify-between flex-col md:flex-row gap-2">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-xs font-bold tracking-tight lg:text-sm">
              SÉRIE {series.serie}
            </h1>
            <div className="flex items-center gap-1">
              <Hash className="w-4 h-4 min-w-4 min-h-4" />
              <h1 className="py-0.5 text-center text-[0.65rem] font-medium italic">
                PRÓXIMO Nº {series.proximoNumero}
              </h1>
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
                series.ambiente === "PRODUCAO"
                  ? "Série em produção (documentos com valor fiscal)"
                  : "Série em homologação (testes sem valor fiscal)"
              }
              className={cn(FISCAL_ENVIRONMENT_STYLES[series.ambiente])}
            />
            <StatBadge
              icon={
                series.ativo ? (
                  <CircleCheck className="w-4 min-w-4 h-4 min-h-4" />
                ) : (
                  <CircleX className="w-4 min-w-4 h-4 min-h-4" />
                )
              }
              value={series.ativo ? "ATIVA" : "INATIVA"}
              tooltipContent={
                series.ativo
                  ? "Série disponível para emissão"
                  : "Série desativada"
              }
              className={cn(
                series.ativo
                  ? "bg-green-500 dark:bg-green-600 text-white"
                  : "bg-red-500 dark:bg-red-600 text-white",
              )}
            />
          </div>
        </div>
        <div className="w-full flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2 flex-wrap">
            {series.dataInsercao ? (
              <div
                className={cn(
                  "flex items-center gap-1.5 text-[0.65rem] font-bold text-primary",
                )}
              >
                <Calendar className="w-3 min-w-3 h-3 min-h-3" />
                <p className="text-xs font-medium tracking-tight uppercase">
                  CADASTRADA EM: {formatDateAsLocale(series.dataInsercao)}
                </p>
              </div>
            ) : null}
          </div>
          <Button
            variant="ghost"
            className="flex items-center gap-1.5"
            size="sm"
            onClick={handleEditClick}
          >
            <PencilIcon className="w-3 min-w-3 h-3 min-h-3" />
            EDITAR
          </Button>
        </div>
      </div>
    </TooltipProvider>
  );
}
