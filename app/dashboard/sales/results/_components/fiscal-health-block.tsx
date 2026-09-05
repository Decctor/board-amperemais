"use client";

import type { TSalesResults } from "@/lib/sales/results";
import { formatToMoney } from "@/lib/formatting";
import { appRoutes } from "@/lib/navigation/routes";
import { cn } from "@/lib/utils";
import dayjs from "dayjs";
import { FileCheck2, Wrench } from "lucide-react";
import Link from "next/link";

const DOCUMENT_TYPE_LABELS: Record<string, string> = { NFCE: "NFC-e", NFE: "NF-e", NFSE: "NFS-e" };
const LIFECYCLE_LABELS: Record<string, string> = {
	RASCUNHO: "Rascunho",
	PRONTO_PARA_ENVIO: "Pronto para envio",
	EM_PROCESSAMENTO: "Em processamento",
	AUTORIZADO: "Autorizado",
	REJEITADO: "Rejeitado",
	CANCELAMENTO_PENDENTE: "Cancelamento pendente",
	CANCELADO: "Cancelado",
	INUTILIZADO: "Inutilizado",
	ERRO: "Erro",
};

type FiscalHealthBlockProps = {
	fiscal: TSalesResults["fiscal"];
	qtdeVendas: number;
};

function Count({ label, value, tone }: { label: string; value: number; tone: "ok" | "warn" | "bad" | "muted" }) {
	return (
		<div className="flex flex-col items-center rounded-lg bg-muted/50 px-2 py-1.5">
			<span
				className={cn("text-sm font-bold tabular-nums", {
					"text-green-700 dark:text-green-400": tone === "ok" && value > 0,
					"text-amber-700 dark:text-amber-400": tone === "warn" && value > 0,
					"text-red-700 dark:text-red-400": tone === "bad" && value > 0,
					"text-muted-foreground": value === 0 || tone === "muted",
				})}
			>
				{value}
			</span>
			<span className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</span>
		</div>
	);
}

export function FiscalHealthBlock({ fiscal, qtdeVendas }: FiscalHealthBlockProps) {
	const hasAnyDocument = fiscal.porTipo.length > 0;

	return (
		<section className="bg-card border-border flex w-full flex-col gap-3 rounded-xl border px-3 py-4 shadow-2xs">
			<div className="flex items-center justify-between gap-2">
				<div className="flex items-center gap-2">
					<div className="flex h-7 w-7 items-center justify-center rounded-full bg-amber-200 p-1 text-amber-600">
						<FileCheck2 className="h-4 w-4 min-h-4 min-w-4" />
					</div>
					<h1 className="text-xs font-medium leading-none tracking-tight">EMISSÃO FISCAL</h1>
				</div>
				{fiscal.vendasComPendencia.qtde > 0 ? (
					<Link
						href={appRoutes.fiscal.pending()}
						className="flex items-center gap-1 rounded-md bg-red-500/10 px-1.5 py-0.5 text-[0.6rem] font-medium text-red-700 transition-colors hover:bg-red-500/20 dark:text-red-400"
					>
						<Wrench className="h-3 w-3" />
						{fiscal.vendasComPendencia.qtde} com pendência · {formatToMoney(fiscal.vendasComPendencia.valor)} · resolver
					</Link>
				) : null}
			</div>

			{!hasAnyDocument ? (
				<span className="text-xs text-muted-foreground">Nenhum documento fiscal emitido para as vendas do período.</span>
			) : (
				<div className="flex flex-col gap-2">
					{fiscal.porTipo.map((tipo) => (
						<div key={tipo.tipo} className="flex flex-col gap-1.5">
							<div className="flex items-center justify-between text-xs">
								<span className="font-semibold">{DOCUMENT_TYPE_LABELS[tipo.tipo] ?? tipo.tipo}</span>
								<span className="tabular-nums text-muted-foreground">autorizado {formatToMoney(tipo.valorAutorizado)}</span>
							</div>
							<div className="grid grid-cols-4 gap-1.5">
								<Count label="Autorizadas" value={tipo.autorizadas} tone="ok" />
								<Count label="Pendentes" value={tipo.pendentes} tone="warn" />
								<Count label="Rejeitadas" value={tipo.rejeitadas} tone="bad" />
								<Count label="Canceladas" value={tipo.canceladas} tone="muted" />
							</div>
						</div>
					))}
				</div>
			)}

			<div className="flex items-center justify-between border-t border-border pt-2 text-[11px] text-muted-foreground">
				<span>Vendas sem documento fiscal</span>
				<span className="tabular-nums">
					{fiscal.vendasSemDocumento.qtde} de {qtdeVendas}
				</span>
			</div>

			{fiscal.rejeicoes.length > 0 ? (
				<div className="flex flex-col gap-1">
					<span className="text-[10px] font-bold uppercase tracking-[0.08em] text-muted-foreground">Motivos de rejeição</span>
					{fiscal.rejeicoes.map((rejeicao) => (
						<Link
							key={rejeicao.codigoProblema}
							href={appRoutes.fiscal.pending()}
							className="flex items-start justify-between gap-2 rounded px-1 text-xs transition-colors hover:bg-muted/50"
						>
							<span className="min-w-0 truncate">
								<span className="mr-1 font-mono text-[10px] text-muted-foreground">{rejeicao.codigoRejeicao ?? rejeicao.categoria}</span>
								{rejeicao.mensagem ?? "Sem mensagem do provedor"}
							</span>
							<span className="shrink-0 tabular-nums text-muted-foreground">{rejeicao.qtde}×</span>
						</Link>
					))}
				</div>
			) : null}

			{fiscal.ultimasPendencias.length > 0 ? (
				<div className="flex flex-col gap-1">
					<span className="text-[10px] font-bold uppercase tracking-[0.08em] text-muted-foreground">Pendências</span>
					<div className="flex max-h-56 flex-col divide-y divide-border overflow-y-auto rounded-lg border border-border">
						{fiscal.ultimasPendencias.map((pendencia) => (
							<Link
								key={pendencia.documentoId}
								href={appRoutes.fiscal.document(pendencia.documentoId)}
								className="flex items-center justify-between gap-2 px-2.5 py-1.5 text-xs transition-colors hover:bg-muted/50"
							>
								<div className="flex min-w-0 flex-col">
									<span className="truncate font-medium">
										{DOCUMENT_TYPE_LABELS[pendencia.tipo] ?? pendencia.tipo} · {LIFECYCLE_LABELS[pendencia.statusInterno] ?? pendencia.statusInterno}
									</span>
									<span className="truncate text-[10px] text-muted-foreground">
										{dayjs(pendencia.dataInsercao).format("DD/MM HH:mm")}
										{pendencia.problema ? ` · ${pendencia.problema.mensagem}` : ""}
									</span>
								</div>
								<span className="shrink-0 tabular-nums">{formatToMoney(pendencia.valorVenda)}</span>
							</Link>
						))}
					</div>
				</div>
			) : null}
		</section>
	);
}
