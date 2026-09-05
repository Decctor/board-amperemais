"use client";

import { FISCAL_PROBLEM_CATEGORY_LABELS } from "@/components/Fiscal/fiscal-problem-presentation";
import { Chip } from "@/components/ui/chip";
import type { TFiscalProblem } from "@/lib/fiscal/problems";
import { AlertTriangle, RotateCcw } from "lucide-react";

type FiscalProblemChipsProps = {
	problems: TFiscalProblem[];
	// Limite de chips visiveis; o restante vira "+N".
	max?: number;
	className?: string;
};

/**
 * Chips de problema de um documento: categoria + mensagem curta. Problemas que o worker resolve
 * sozinho aparecem apagados ("Retentativa automatica") — nao pedem acao do operador.
 */
export function FiscalProblemChips({ problems, max = 3, className }: FiscalProblemChipsProps) {
	if (problems.length === 0) return null;
	const visible = problems.slice(0, max);
	const hidden = problems.length - visible.length;
	return (
		<div className={className ?? "flex flex-wrap items-center gap-1"}>
			{visible.map((problem, index) =>
				problem.resolvidoAutomaticamente ? (
					<Chip.Root key={`${problem.codigo}-${index}`} variant="muted" size="xs" title={problem.mensagem}>
						<Chip.Icon>
							<RotateCcw />
						</Chip.Icon>
						<Chip.Label>Retentativa automática · {problem.mensagem}</Chip.Label>
					</Chip.Root>
				) : (
					<Chip.Root key={`${problem.codigo}-${index}`} variant="destructive" size="xs" title={`${problem.mensagem} — ${problem.acaoSugerida}`}>
						<Chip.Icon>
							<AlertTriangle />
						</Chip.Icon>
						<Chip.Label>
							<span className="font-bold uppercase">{FISCAL_PROBLEM_CATEGORY_LABELS[problem.categoria]}</span>
							{" · "}
							{problem.mensagem}
						</Chip.Label>
					</Chip.Root>
				),
			)}
			{hidden > 0 ? (
				<Chip.Root variant="muted" size="xs">
					<Chip.Label>+{hidden}</Chip.Label>
				</Chip.Root>
			) : null}
		</div>
	);
}
