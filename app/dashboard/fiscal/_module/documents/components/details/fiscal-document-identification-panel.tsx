"use client";

import type { TGetFiscalDocumentsOutputById } from "@/app/api/fiscal/documents/route";
import { CopyButton } from "@/components/ui/copy-button";
import { DataList } from "@/components/ui/data-list";
import { Section } from "@/components/ui/section";
import { formatDateAsLocale } from "@/lib/formatting";
import { Fingerprint } from "lucide-react";
import { FISCAL_DOCUMENT_STATUS_LABELS } from "../../../shared/fiscal-labels";
import { formatFiscalDocumentTypeLabel } from "../../helpers/fiscal-document-action-state";

type FiscalDocumentIdentificationPanelProps = {
	document: TGetFiscalDocumentsOutputById["document"];
	className?: string;
};

// 44 digitos em blocos de 4: e assim que a chave aparece no DANFE e como o contador confere.
function formatAccessKey(chave: string) {
	return chave.replace(/(\d{4})(?=\d)/g, "$1 ");
}

function formatTimestamp(value: Date | string | null | undefined) {
	return value ? formatDateAsLocale(value, true) : null;
}

/**
 * Identificadores que o contador pede: chave de acesso em destaque e com copia, o resto como
 * lista rotulo/valor. Status interno nao entra aqui porque ja e o selo do cabecalho.
 */
export function FiscalDocumentIdentificationPanel({ document, className }: FiscalDocumentIdentificationPanelProps) {
	return (
		<Section.Root className={className}>
			<Section.Header>
				<Section.Icon>
					<Fingerprint />
				</Section.Icon>
				<Section.Title>Identificação</Section.Title>
			</Section.Header>
			<Section.Bleed>
				<div className="border-b border-border px-3 py-3">
					<p className="text-label text-muted-foreground">Chave de acesso</p>
					{document.chaveAcesso ? (
						<div className="mt-1 flex items-start justify-between gap-2">
							<p className="text-xs leading-relaxed font-bold break-all tabular-nums">{formatAccessKey(document.chaveAcesso)}</p>
							<CopyButton value={document.chaveAcesso} label="Copiar chave de acesso" />
						</div>
					) : (
						<p className="mt-1 text-xs text-muted-foreground">Gerada quando a SEFAZ autoriza o documento.</p>
					)}
				</div>
				<DataList.Root className="divide-y divide-border/70 px-3">
					<DataList.Item>
						<DataList.Label>Protocolo</DataList.Label>
						<DataList.Value>
							{document.protocolo}
							{document.protocolo ? <CopyButton value={document.protocolo} label="Copiar protocolo" className="-my-1" /> : null}
						</DataList.Value>
					</DataList.Item>
					<DataList.Item>
						<DataList.Label>Status SEFAZ</DataList.Label>
						<DataList.Value>{FISCAL_DOCUMENT_STATUS_LABELS[document.status] ?? document.status}</DataList.Value>
					</DataList.Item>
					<DataList.Item>
						<DataList.Label>Provedor</DataList.Label>
						<DataList.Value>{document.provedor}</DataList.Value>
					</DataList.Item>
					<DataList.Item>
						<DataList.Label>ID no provedor</DataList.Label>
						<DataList.Value>
							{document.provedorDocumentoId}
							{document.provedorDocumentoId ? <CopyButton value={document.provedorDocumentoId} label="Copiar ID no provedor" className="-my-1" /> : null}
						</DataList.Value>
					</DataList.Item>
					<DataList.Item>
						<DataList.Label>Referência</DataList.Label>
						<DataList.Value>
							{document.referencia}
							{document.referencia ? <CopyButton value={document.referencia} label="Copiar referência" className="-my-1" /> : null}
						</DataList.Value>
					</DataList.Item>
					<DataList.Item>
						<DataList.Label>Tentativas de envio</DataList.Label>
						<DataList.Value>{String(document.tentativasEnvio ?? 0)}</DataList.Value>
					</DataList.Item>
					<DataList.Item>
						<DataList.Label>Criação</DataList.Label>
						<DataList.Value>{formatTimestamp(document.dataInsercao)}</DataList.Value>
					</DataList.Item>
					<DataList.Item>
						<DataList.Label>Emissão</DataList.Label>
						<DataList.Value>{formatTimestamp(document.dataEmissao)}</DataList.Value>
					</DataList.Item>
					<DataList.Item>
						<DataList.Label>Autorização</DataList.Label>
						<DataList.Value>{formatTimestamp(document.dataAutorizacao)}</DataList.Value>
					</DataList.Item>
					{document.dataCancelamento ? (
						<DataList.Item>
							<DataList.Label>Cancelamento</DataList.Label>
							<DataList.Value>{formatTimestamp(document.dataCancelamento)}</DataList.Value>
						</DataList.Item>
					) : null}
					<DataList.Item>
						<DataList.Label>Última sincronização</DataList.Label>
						<DataList.Value>{formatTimestamp(document.dataUltimaSincronizacao)}</DataList.Value>
					</DataList.Item>
				</DataList.Root>
				{document.documentoOrigem ? (
					<p className="border-t border-border px-3 py-3 text-xs text-muted-foreground">
						Derivado de {formatFiscalDocumentTypeLabel(document.documentoOrigem.tipo)} nº {document.documentoOrigem.numero ?? "—"}
						{document.chaveAcessoReferencia ? (
							<>
								{" "}
								· ref. <span className="break-all tabular-nums">{document.chaveAcessoReferencia}</span>
							</>
						) : null}
					</p>
				) : null}
			</Section.Bleed>
		</Section.Root>
	);
}
