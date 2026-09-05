"use client";

import type { TGetFiscalDocumentsOutputById } from "@/app/api/fiscal/documents/route";
import { formatDateAsLocale } from "@/lib/formatting";
import { AlertTriangle } from "lucide-react";

function Fact({ label, value }: { label: string; value: string | null | undefined }) {
	return (
		<div className="min-w-0">
			<dt className="text-[10px] font-extrabold uppercase tracking-[0.08em] text-amber-800/80 dark:text-amber-300/80">{label}</dt>
			<dd className="mt-0.5 break-words text-sm font-semibold text-amber-950 dark:text-amber-100">{value?.trim() ? value : "—"}</dd>
		</div>
	);
}

type FiscalDocumentExceptionalPresenceNoticeProps = {
	document: TGetFiscalDocumentsOutputById["document"];
};

/**
 * Declaracao manual de presenca: informacao fiscal material, por isso fica em destaque com quem
 * declarou, quando e por que. Nao e um erro, e um aviso que precisa sobreviver a leitura rapida.
 */
export function FiscalDocumentExceptionalPresenceNotice({ document }: FiscalDocumentExceptionalPresenceNoticeProps) {
	return (
		<section className="rounded-2xl border border-amber-500/60 bg-amber-50/70 p-4 dark:border-amber-800/70 dark:bg-amber-950/30 sm:p-5">
			<div className="flex items-start gap-3">
				<AlertTriangle className="mt-0.5 size-5 shrink-0 text-amber-700 dark:text-amber-400" />
				<div className="min-w-0 flex-1 space-y-3">
					<div>
						<p className="text-sm font-extrabold text-amber-900 dark:text-amber-200">Classificação presencial excepcional</p>
						<p className="mt-1 text-xs text-amber-800/90 dark:text-amber-300/90">
							A venda permanece registrada como entrega, mas esta tentativa fiscal foi declarada manualmente como operação presencial.
						</p>
					</div>
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
						<p className="text-[10px] font-extrabold uppercase tracking-[0.08em] text-amber-800/80 dark:text-amber-300/80">Justificativa</p>
						<p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-amber-950 dark:text-amber-100">
							{document.justificativaPresencaConsumidor}
						</p>
					</div>
				</div>
			</div>
		</section>
	);
}
