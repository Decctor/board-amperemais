"use client";

import type { TGetFiscalDocumentsOutputById } from "@/app/api/fiscal/documents/route";
import { formatDateAsLocale } from "@/lib/formatting";
import { FISCAL_DOCUMENT_STATUS_LABELS } from "../../../shared/fiscal-labels";
import { formatFiscalDocumentTypeLabel } from "../../helpers/fiscal-document-action-state";
import { CopyValueButton, DetailRow, DetailsSection } from "./details-section";

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
		<DetailsSection title="Identificação" className={className}>
			<div className="border-b border-border px-4 py-3 sm:px-5">
				<p className="text-[10px] font-extrabold uppercase tracking-[0.08em] text-muted-foreground">Chave de acesso</p>
				{document.chaveAcesso ? (
					<div className="mt-1 flex items-start justify-between gap-2">
						<p className="break-all text-xs font-bold leading-relaxed tabular-nums">{formatAccessKey(document.chaveAcesso)}</p>
						<CopyValueButton value={document.chaveAcesso} label="Copiar chave de acesso" />
					</div>
				) : (
					<p className="mt-1 text-xs text-muted-foreground">Gerada quando a SEFAZ autoriza o documento.</p>
				)}
			</div>
			<dl className="divide-y divide-border/70 px-4 sm:px-5">
				<DetailRow label="Protocolo" value={document.protocolo} copyable />
				<DetailRow label="Status SEFAZ" value={FISCAL_DOCUMENT_STATUS_LABELS[document.status] ?? document.status} />
				<DetailRow label="Provedor" value={document.provedor} />
				<DetailRow label="ID no provedor" value={document.provedorDocumentoId} copyable />
				<DetailRow label="Referência" value={document.referencia} copyable />
				<DetailRow label="Tentativas de envio" value={String(document.tentativasEnvio ?? 0)} />
				<DetailRow label="Criação" value={formatTimestamp(document.dataInsercao)} />
				<DetailRow label="Emissão" value={formatTimestamp(document.dataEmissao)} />
				<DetailRow label="Autorização" value={formatTimestamp(document.dataAutorizacao)} />
				{document.dataCancelamento ? <DetailRow label="Cancelamento" value={formatTimestamp(document.dataCancelamento)} /> : null}
				<DetailRow label="Última sincronização" value={formatTimestamp(document.dataUltimaSincronizacao)} />
			</dl>
			{document.documentoOrigem ? (
				<p className="border-t border-border px-4 py-3 text-xs text-muted-foreground sm:px-5">
					Derivado de {formatFiscalDocumentTypeLabel(document.documentoOrigem.tipo)} nº {document.documentoOrigem.numero ?? "—"}
					{document.chaveAcessoReferencia ? (
						<>
							{" "}
							· ref. <span className="break-all tabular-nums">{document.chaveAcessoReferencia}</span>
						</>
					) : null}
				</p>
			) : null}
		</DetailsSection>
	);
}
