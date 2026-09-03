"use client";

import ResponsiveMenuSection from "@/components/Utils/ResponsiveMenuSection";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import type { TGetFiscalDocumentsOutputById } from "@/app/api/fiscal/documents/route";
import {
  buildFiscalDocumentSaleSummary,
  extractPayloadItems,
  extractTaxTotalsFromPayload,
  formatJsonForDisplay,
  parseFiscalDocumentProviderPayload,
  parseFiscalDocumentProviderResponse,
  type TFiscalDocumentTaxTotalsView,
} from "@/lib/fiscal/document-details-view";
import { formatDateAsLocale } from "@/lib/formatting";
import { appRoutes } from "@/lib/navigation/routes";
import { cn } from "@/lib/utils";
import type { TFiscalDocumentEventTypeEnum } from "@/schemas/enums";
import {
  AlertTriangle,
  ChevronDown,
  ClipboardCopy,
  ExternalLink,
  FileJson,
  Hash,
  History,
  Package,
  Percent,
  Receipt,
  ShoppingCart,
  User,
} from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { toast } from "sonner";

type FiscalDocumentDetailsContentProps = {
  document: TGetFiscalDocumentsOutputById["document"];
  events: TGetFiscalDocumentsOutputById["events"];
  statusLabels: Record<string, string>;
  environmentLabels: Record<string, string>;
  lifecycleStatusLabels: Record<string, string>;
  formatBRL: (value: number | null | undefined) => string;
};

const FISCAL_EVENT_TYPE_LABELS: Record<TFiscalDocumentEventTypeEnum, string> = {
  CRIADO: "Documento criado",
  ENVIO_SOLICITADO: "Envio solicitado",
  PROCESSAMENTO_INICIADO: "Processamento iniciado",
  AUTORIZADO: "Autorizado",
  REJEITADO: "Rejeitado",
  SINCRONIZADO: "Sincronizado",
  CANCELAMENTO_SOLICITADO: "Cancelamento solicitado",
  CANCELADO: "Cancelado",
  CARTA_CORRECAO: "Carta de correção",
  INUTILIZACAO: "Inutilização",
  CLASSIFICACAO_PRESENCA_EXCEPCIONAL: "Classificação presencial excepcional",
  ERRO: "Erro",
};

function DetailField({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: string | null | undefined;
  mono?: boolean;
}) {
  return (
    <div className="flex flex-col gap-0.5">
      <p className="text-[10px] font-extrabold uppercase tracking-[0.08em] text-muted-foreground">
        {label}
      </p>
      <p
        className={cn(
          "text-sm font-medium break-all",
          mono && "font-mono text-xs",
        )}
      >
        {value?.trim() ? value : "—"}
      </p>
    </div>
  );
}

function TaxMetric({
  label,
  value,
  formatBRL,
}: {
  label: string;
  value: number | null;
  formatBRL: (value: number | null | undefined) => string;
}) {
  return (
    <div className="rounded-lg border bg-muted/20 px-3 py-2">
      <p className="text-[10px] font-extrabold uppercase tracking-[0.08em] text-muted-foreground">
        {label}
      </p>
      <p className="mt-0.5 text-sm font-bold tabular-nums">
        {value != null ? formatBRL(value) : "—"}
      </p>
    </div>
  );
}

function JsonPanel({ title, value }: { title: string; value: unknown }) {
  const [open, setOpen] = useState(false);
  const formatted = useMemo(() => formatJsonForDisplay(value), [value]);

  async function copyJson() {
    try {
      await navigator.clipboard.writeText(formatted);
      toast.success("JSON copiado.");
    } catch {
      toast.error("Não foi possível copiar o JSON.");
    }
  }

  if (value == null) return null;

  return (
    <Collapsible
      open={open}
      onOpenChange={setOpen}
      className="rounded-lg border"
    >
      <div className="flex items-center justify-between gap-2 px-3 py-2">
        <CollapsibleTrigger className="flex flex-1 items-center gap-2 text-left">
          <FileJson className="h-4 w-4 shrink-0 text-primary/70" />
          <span className="text-xs font-bold tracking-tight">{title}</span>
          <ChevronDown
            className={cn(
              "ml-auto h-4 w-4 text-muted-foreground transition-transform",
              open && "rotate-180",
            )}
          />
        </CollapsibleTrigger>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8 shrink-0"
          onClick={copyJson}
        >
          <ClipboardCopy className="h-4 w-4" />
        </Button>
      </div>
      <CollapsibleContent>
        <pre className="max-h-72 overflow-auto border-t bg-muted/30 p-3 text-[11px] leading-relaxed font-mono whitespace-pre-wrap break-all">
          {formatted}
        </pre>
      </CollapsibleContent>
    </Collapsible>
  );
}

function TaxTotalsSection({
  totals,
  formatBRL,
}: {
  totals: TFiscalDocumentTaxTotalsView;
  formatBRL: (value: number | null | undefined) => string;
}) {
  return (
    <ResponsiveMenuSection
      title="TOTAIS DE IMPOSTOS"
      icon={<Percent className="h-4 w-4" />}
    >
      <div className="grid grid-cols-2 gap-2 md:grid-cols-3">
        <TaxMetric label="Valor NF" value={totals.vNF} formatBRL={formatBRL} />
        <TaxMetric
          label="Produtos"
          value={totals.vProd}
          formatBRL={formatBRL}
        />
        <TaxMetric
          label="Desconto"
          value={totals.vDesc}
          formatBRL={formatBRL}
        />
        <TaxMetric label="BC ICMS" value={totals.vBC} formatBRL={formatBRL} />
        <TaxMetric label="ICMS" value={totals.vICMS} formatBRL={formatBRL} />
        <TaxMetric label="ICMS-ST" value={totals.vST} formatBRL={formatBRL} />
        <TaxMetric label="FCP" value={totals.vFCP} formatBRL={formatBRL} />
        <TaxMetric label="PIS" value={totals.vPIS} formatBRL={formatBRL} />
        <TaxMetric
          label="COFINS"
          value={totals.vCOFINS}
          formatBRL={formatBRL}
        />
        <TaxMetric
          label="Tributos (Lei 12.741)"
          value={totals.vTotTrib}
          formatBRL={formatBRL}
        />
      </div>
    </ResponsiveMenuSection>
  );
}

export function FiscalDocumentDetailsContent({
  document,
  events,
  statusLabels,
  environmentLabels,
  lifecycleStatusLabels,
  formatBRL,
}: FiscalDocumentDetailsContentProps) {
  const providerPayload = useMemo(
    () => parseFiscalDocumentProviderPayload(document.provedorPayload),
    [document.provedorPayload],
  );
  const providerResponse = useMemo(
    () => parseFiscalDocumentProviderResponse(document.provedorRetorno),
    [document.provedorRetorno],
  );
  const taxTotals = useMemo(
    () => extractTaxTotalsFromPayload(providerPayload),
    [providerPayload],
  );
  const payloadItems = useMemo(
    () => extractPayloadItems(providerPayload),
    [providerPayload],
  );
  const saleSummary = useMemo(
    () =>
      buildFiscalDocumentSaleSummary({
        vendaId: document.vendaId,
        snapshotOrigemVenda: document.snapshotOrigemVenda,
        venda: document.venda ?? null,
      }),
    [document.snapshotOrigemVenda, document.venda, document.vendaId],
  );

  const mensagens = Array.isArray(document.mensagens)
    ? document.mensagens.map((message) =>
        typeof message === "string" ? message : JSON.stringify(message),
      )
    : [];

  return (
    <div className="flex w-full flex-col gap-4">
      <ResponsiveMenuSection
        title="IDENTIFICAÇÃO"
        icon={<Receipt className="h-4 w-4" />}
      >
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <DetailField label="Tipo" value={document.tipo} />
          <DetailField label="Série" value={document.serie} />
          <DetailField label="Número" value={document.numero} />
          <DetailField label="Referência" value={document.referencia} mono />
          <DetailField
            label="Ambiente"
            value={environmentLabels[document.ambiente] ?? document.ambiente}
          />
          <DetailField label="Provedor" value={document.provedor} />
          <DetailField
            label="Status SEFAZ"
            value={statusLabels[document.status] ?? document.status}
          />
          <DetailField
            label="Status interno"
            value={
              lifecycleStatusLabels[document.statusInterno] ??
              document.statusInterno
            }
          />
          <DetailField
            label="ID no provedor"
            value={document.provedorDocumentoId}
            mono
          />
          <DetailField
            label="Chave de acesso"
            value={document.chaveAcesso}
            mono
          />
          <DetailField label="Protocolo" value={document.protocolo} mono />
          <DetailField
            label="Tentativas de envio"
            value={String(document.tentativasEnvio ?? 0)}
          />
          <DetailField
            label="Emissão"
            value={
              document.dataEmissao
                ? formatDateAsLocale(document.dataEmissao)
                : null
            }
          />
          <DetailField
            label="Autorização"
            value={
              document.dataAutorizacao
                ? formatDateAsLocale(document.dataAutorizacao)
                : null
            }
          />
          <DetailField
            label="Cancelamento"
            value={
              document.dataCancelamento
                ? formatDateAsLocale(document.dataCancelamento)
                : null
            }
          />
          <DetailField
            label="Última sincronização"
            value={
              document.dataUltimaSincronizacao
                ? formatDateAsLocale(document.dataUltimaSincronizacao)
                : null
            }
          />
        </div>
        {document.documentoOrigem ? (
          <div className="rounded-lg border border-dashed bg-muted/20 px-3 py-2 text-xs text-muted-foreground">
            Documento derivado de {document.documentoOrigem.tipo} Nº{" "}
            {document.documentoOrigem.numero ?? "—"}
            {document.chaveAcessoReferencia
              ? ` · ref. ${document.chaveAcessoReferencia}`
              : null}
          </div>
        ) : null}
      </ResponsiveMenuSection>

      {document.presencaConsumidorDeclarada ? (
        <div className="rounded-lg border border-amber-500/60 bg-amber-50/70 p-4 dark:border-amber-800/70 dark:bg-amber-950/30">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-700 dark:text-amber-400" />
            <div className="min-w-0 flex-1 space-y-3">
              <div>
                <p className="text-sm font-bold text-amber-900 dark:text-amber-200">
                  CLASSIFICAÇÃO PRESENCIAL EXCEPCIONAL
                </p>
                <p className="mt-1 text-xs text-amber-800/90 dark:text-amber-300/90">
                  A venda permanece registrada como entrega, mas esta tentativa
                  fiscal foi declarada manualmente como operação presencial.
                </p>
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                <DetailField
                  label="Modalidade da venda"
                  value={document.venda?.entregaModalidade ?? null}
                />
                <DetailField
                  label="Presença declarada"
                  value="OPERAÇÃO PRESENCIAL"
                />
                <DetailField
                  label="Data da declaração"
                  value={
                    document.dataDeclaracaoPresencaConsumidor
                      ? formatDateAsLocale(
                          document.dataDeclaracaoPresencaConsumidor,
                        )
                      : null
                  }
                />
                <DetailField
                  label="Responsável"
                  value={document.autorPresencaConsumidor?.nome ?? null}
                />
              </div>
              <div>
                <p className="text-[10px] font-extrabold uppercase tracking-[0.08em] text-amber-800/80 dark:text-amber-300/80">
                  Justificativa
                </p>
                <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-amber-950 dark:text-amber-100">
                  {document.justificativaPresencaConsumidor}
                </p>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {saleSummary ? (
        <ResponsiveMenuSection
          title="VENDA VINCULADA"
          icon={<ShoppingCart className="h-4 w-4" />}
        >
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="grid flex-1 grid-cols-1 gap-3 sm:grid-cols-2">
              <DetailField label="Cliente" value={saleSummary.clienteNome} />
              <DetailField
                label="CPF/CNPJ"
                value={saleSummary.clienteCpfCnpj}
                mono
              />
              <DetailField
                label="Data da venda"
                value={
                  saleSummary.dataVenda
                    ? formatDateAsLocale(saleSummary.dataVenda)
                    : null
                }
              />
              <DetailField
                label="Valor total"
                value={
                  saleSummary.valorTotal != null
                    ? formatBRL(saleSummary.valorTotal)
                    : null
                }
              />
              <DetailField
                label="Status da venda"
                value={saleSummary.statusVenda}
              />
              <DetailField label="Canal" value={saleSummary.canal} />
            </div>
            {saleSummary.vendaId ? (
              <Button variant="outline" size="sm" asChild className="shrink-0">
                <Link href={appRoutes.sales.details(saleSummary.vendaId)}>
                  <ExternalLink className="mr-1.5 h-3.5 w-3.5" />
                  ABRIR VENDA
                </Link>
              </Button>
            ) : null}
          </div>
          {saleSummary.itens.length > 0 ? (
            <div className="rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Produto</TableHead>
                    <TableHead className="text-right">QTDE</TableHead>
                    <TableHead className="text-right">UNIT.</TableHead>
                    <TableHead className="text-right">TOTAL</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {saleSummary.itens.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="max-w-[220px] truncate font-medium">
                        {item.descricao}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {item.quantidade}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatBRL(item.valorUnitario)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatBRL(item.valorTotal)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              Nenhum item encontrado no snapshot da venda.
            </p>
          )}
        </ResponsiveMenuSection>
      ) : null}

      {taxTotals ? (
        <TaxTotalsSection totals={taxTotals} formatBRL={formatBRL} />
      ) : null}

      {payloadItems.length > 0 ? (
        <ResponsiveMenuSection
          title="ITENS DO PAYLOAD FISCAL"
          icon={<Package className="h-4 w-4" />}
        >
          <div className="rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>#</TableHead>
                  <TableHead>PRODUTO</TableHead>
                  <TableHead>NCM</TableHead>
                  <TableHead>CFOP</TableHead>
                  <TableHead>CSOSN</TableHead>
                  <TableHead className="text-right">QTDE</TableHead>
                  <TableHead className="text-right">TOTAL</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payloadItems.map((item) => (
                  <TableRow key={item.numero}>
                    <TableCell className="tabular-nums">
                      {item.numero}
                    </TableCell>
                    <TableCell className="max-w-[180px] truncate font-medium">
                      {item.descricao}
                    </TableCell>
                    <TableCell className="font-mono text-xs">
                      {item.ncm ?? "—"}
                    </TableCell>
                    <TableCell className="font-mono text-xs">
                      {item.cfop ?? "—"}
                    </TableCell>
                    <TableCell className="font-mono text-xs">
                      {item.csosn ?? "—"}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {item.quantidade ?? "—"}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {item.valorTotal != null
                        ? formatBRL(item.valorTotal)
                        : "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </ResponsiveMenuSection>
      ) : null}

      {(providerPayload || providerResponse) && (
        <ResponsiveMenuSection
          title="PAYLOAD E RETORNO"
          icon={<FileJson className="h-4 w-4" />}
        >
          <div className="flex flex-col gap-2">
            <JsonPanel
              title="Payload enviado ao provedor"
              value={providerPayload}
            />
            <JsonPanel title="Retorno do provedor" value={providerResponse} />
          </div>
          {!providerPayload ? (
            <p className="text-xs text-muted-foreground">
              O payload ainda não foi gerado. Ele aparece após a primeira
              tentativa de envio ao provedor fiscal.
            </p>
          ) : null}
        </ResponsiveMenuSection>
      )}

      {mensagens.length > 0 ? (
        <ResponsiveMenuSection
          title="MENSAGENS"
          icon={<Hash className="h-4 w-4" />}
        >
          <div className="flex flex-col gap-1.5">
            {mensagens.map((message, index) => (
              <p
                key={`${index}-${message.slice(0, 24)}`}
                className="rounded-md bg-muted/30 px-3 py-2 text-xs leading-relaxed text-foreground/90"
              >
                {message}
              </p>
            ))}
          </div>
        </ResponsiveMenuSection>
      ) : null}

      <ResponsiveMenuSection
        title="HISTÓRICO DE EVENTOS"
        icon={<History className="h-4 w-4" />}
      >
        {events.length > 0 ? (
          <div className="flex flex-col gap-2">
            {events.map((event) => (
              <div
                key={event.id}
                className="rounded-lg border bg-muted/20 px-3 py-2"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-xs font-bold tracking-tight">
                    {FISCAL_EVENT_TYPE_LABELS[
                      event.tipo as TFiscalDocumentEventTypeEnum
                    ] ?? event.tipo}
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    {formatDateAsLocale(event.dataInsercao)}
                  </p>
                </div>
                {event.descricao ? (
                  <p className="mt-1 text-xs text-muted-foreground">
                    {event.descricao}
                  </p>
                ) : null}
                {event.autor?.nome ? (
                  <p className="mt-1 flex items-center gap-1 text-[11px] text-muted-foreground">
                    <User className="h-3 w-3" />
                    {event.autor.nome}
                  </p>
                ) : null}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            Nenhum evento registrado.
          </p>
        )}
      </ResponsiveMenuSection>
    </div>
  );
}
