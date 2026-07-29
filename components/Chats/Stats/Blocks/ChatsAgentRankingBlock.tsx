"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { formatDecimalPlaces, formatDurationFromSeconds } from "@/lib/formatting";
import type { TChatsStatsAgentRow, TChatsStatsAgents } from "@/lib/queries/chats-stats";
import { cn } from "@/lib/utils";
import { ArrowDown, ArrowUp } from "lucide-react";
import { useMemo, useState } from "react";

type SortKey = "carteiraAtual" | "atendidos" | "encerrados" | "resolvidos" | "mensagensEnviadas" | "tempoPrimeiraResposta" | "tempoResolucao";

const COLUMNS: { key: SortKey; label: string; hint?: string; lowerIsBetter?: boolean }[] = [
	{ key: "carteiraAtual", label: "Carteira", hint: "Atendimentos vivos na mão agora" },
	{ key: "atendidos", label: "Atendidos", hint: "Abertos no período sob responsabilidade atual" },
	{ key: "encerrados", label: "Encerrados", hint: "Quem clicou em encerrar — medida exata" },
	{ key: "resolvidos", label: "Resolvidos" },
	{ key: "mensagensEnviadas", label: "Mensagens", hint: "Enviadas pelo próprio usuário — medida exata" },
	{ key: "tempoPrimeiraResposta", label: "1ª resposta", lowerIsBetter: true },
	{ key: "tempoResolucao", label: "Resolução", lowerIsBetter: true },
];

function sortValue(row: TChatsStatsAgentRow, key: SortKey) {
	if (key === "tempoPrimeiraResposta") return row.tempoPrimeiraResposta.mediana;
	if (key === "tempoResolucao") return row.tempoResolucao.mediana;
	return row[key];
}

type ChatsAgentRankingBlockProps = {
	agents: TChatsStatsAgents | undefined;
	isLoading: boolean;
};

/**
 * Ranking de atendentes.
 *
 * A nota de rodapé não é ornamento: `responsavelUsuarioId` é o dono *atual* do atendimento
 * e uma transferência sobrescreve o campo, então as colunas derivadas dele creditam o
 * último dono. Uma tabela de desempenho que não avisa isso convida a decisões de gestão
 * apoiadas em número errado.
 */
export function ChatsAgentRankingBlock({ agents, isLoading }: ChatsAgentRankingBlockProps) {
	const [sort, setSort] = useState<{ key: SortKey; desc: boolean }>({ key: "encerrados", desc: true });

	const linhas = useMemo(() => {
		const ranking = [...(agents?.ranking ?? [])];
		return ranking.sort((a, b) => {
			const valorA = sortValue(a, sort.key);
			const valorB = sortValue(b, sort.key);
			// Sem amostra não há mediana: essas linhas vão para o fim em qualquer direção,
			// em vez de encabeçarem o ranking como se fossem o tempo zero.
			if (valorA === null && valorB === null) return 0;
			if (valorA === null) return 1;
			if (valorB === null) return -1;
			return sort.desc ? valorB - valorA : valorA - valorB;
		});
	}, [agents, sort]);

	if (isLoading) return <div className="h-[280px] w-full animate-pulse rounded-2xl border border-border bg-muted/40" />;

	function toggleSort(key: SortKey) {
		setSort((current) => (current.key === key ? { key, desc: !current.desc } : { key, desc: true }));
	}

	return (
		<div className="flex w-full flex-col gap-3 rounded-2xl border border-border bg-card p-4 shadow-sm">
			<div className="flex flex-col">
				<h2 className="text-sm font-bold tracking-tight">RANKING DE ATENDENTES</h2>
				<p className="text-xs text-muted-foreground">Clique em uma coluna para reordenar.</p>
			</div>

			{linhas.length === 0 ? (
				<div className="flex h-[160px] items-center justify-center text-xs text-muted-foreground">Nenhuma atividade de atendimento no período.</div>
			) : (
				<div className="scrollbar-subtle w-full overflow-x-auto">
					<table className="w-full min-w-[720px] border-collapse text-xs">
						<thead>
							<tr className="border-b border-border">
								<th className="py-2 pr-3 text-left text-[11px] font-extrabold uppercase tracking-[0.08em] text-muted-foreground">Atendente</th>
								{COLUMNS.map((column) => (
									<th key={column.key} className="py-2 px-2 text-right">
										<button
											type="button"
											onClick={() => toggleSort(column.key)}
											title={column.hint}
											className={cn(
												"inline-flex items-center gap-1 text-[11px] font-extrabold uppercase tracking-[0.08em] transition-colors",
												sort.key === column.key ? "text-foreground" : "text-muted-foreground hover:text-foreground",
											)}
										>
											{column.label}
											{sort.key === column.key &&
												(sort.desc ? <ArrowDown className="h-3 w-3" /> : <ArrowUp className="h-3 w-3" />)}
										</button>
									</th>
								))}
							</tr>
						</thead>
						<tbody>
							{linhas.map((linha) => (
								<tr key={linha.usuarioId} className="border-b border-border/60 last:border-0">
									<td className="py-2 pr-3">
										<span className="flex min-w-0 items-center gap-2">
											<Avatar className="h-6 w-6">
												{linha.avatarUrl && <AvatarImage src={linha.avatarUrl} />}
												<AvatarFallback className="text-[10px]">{(linha.nome ?? "?").slice(0, 2).toUpperCase()}</AvatarFallback>
											</Avatar>
											<span className="truncate font-medium">{linha.nome}</span>
										</span>
									</td>
									<td className="px-2 py-2 text-right tabular-nums">{formatDecimalPlaces(linha.carteiraAtual, 0, 0)}</td>
									<td className="px-2 py-2 text-right tabular-nums">{formatDecimalPlaces(linha.atendidos, 0, 0)}</td>
									<td className="px-2 py-2 text-right font-bold tabular-nums">{formatDecimalPlaces(linha.encerrados, 0, 0)}</td>
									<td className="px-2 py-2 text-right tabular-nums">{formatDecimalPlaces(linha.resolvidos, 0, 0)}</td>
									<td className="px-2 py-2 text-right tabular-nums">{formatDecimalPlaces(linha.mensagensEnviadas, 0, 0)}</td>
									<td className="px-2 py-2 text-right tabular-nums">{formatDurationFromSeconds(linha.tempoPrimeiraResposta.mediana)}</td>
									<td className="px-2 py-2 text-right tabular-nums">{formatDurationFromSeconds(linha.tempoResolucao.mediana)}</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>
			)}

			<p className="text-[11px] leading-snug text-muted-foreground">
				<strong>Encerrados</strong> e <strong>mensagens</strong> são exatos — vêm de quem encerrou e de quem escreveu. As demais colunas seguem o{" "}
				<strong>responsável atual</strong> do atendimento: uma transferência credita o último responsável, porque o histórico de posse não é guardado.
			</p>
		</div>
	);
}
