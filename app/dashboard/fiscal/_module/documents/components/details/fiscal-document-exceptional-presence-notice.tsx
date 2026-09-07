"use client";

import type { TGetFiscalDocumentsOutputById } from "@/app/api/fiscal/documents/route";
import { Callout } from "@/components/ui/callout";
import { formatDateAsLocale } from "@/lib/formatting";
import { AlertTriangle } from "lucide-react";

type FiscalDocumentExceptionalPresenceNoticeProps = {
	document: TGetFiscalDocumentsOutputById["document"];
};

/**
 * Declaracao manual de presenca: informacao fiscal material, por isso fica em destaque com quem
 * declarou, quando e por que. Nao e um erro, e um aviso que precisa sobreviver a leitura rapida.
 */
export function FiscalDocumentExceptionalPresenceNotice({ document }: FiscalDocumentExceptionalPresenceNoticeProps) {
	return (
		<Callout.Root tone="warning" className="gap-3 p-4">
			<Callout.Title>
				<AlertTriangle className="size-4" />
				Classificação presencial excepcional
			</Callout.Title>
			<Callout.Description className="text-xs">
				A venda permanece registrada como entrega, mas esta tentativa fiscal foi declarada manualmente como operação presencial.
			</Callout.Description>
			<Callout.Body>
				<dl className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
					<Fact label="Modalidade da venda" value={document.venda?.entregaModalidade ?? null} />
					<Fact label="Presença declarada" value="Operação presencial" />
					<Fact
						label="Declarada em"
						value={document.dataDeclaracaoPresencaConsumidor ? formatDateAsLocale(document.dataDeclaracaoPresencaConsumidor, true) : null}
					/>
					<Fact label="Responsável" value={document.autorPresencaConsumidor?.nome ?? null} />
				</dl>
				<div>
					<p className="text-label text-muted-foreground">Justificativa</p>
					<p className="mt-1 text-sm leading-relaxed whitespace-pre-wrap">{document.justificativaPresencaConsumidor}</p>
				</div>
			</Callout.Body>
		</Callout.Root>
	);
}

/**
 * Rótulo em cima, valor embaixo. Não usa `DataList` porque os dois layouts do primitive põem o
 * rótulo e o valor na mesma linha — aqui a grade precisa deles empilhados.
 */
function Fact({ label, value }: { label: string; value: string | null | undefined }) {
	return (
		<div className="min-w-0">
			<dt className="text-label text-muted-foreground">{label}</dt>
			<dd className="mt-0.5 text-sm font-semibold break-words">{value?.trim() ? value : "—"}</dd>
		</div>
	);
}
