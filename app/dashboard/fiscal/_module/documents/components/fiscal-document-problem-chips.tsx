"use client";

import { FISCAL_PROBLEM_CATEGORY_LABELS } from "@/components/Fiscal/fiscal-problem-presentation";
import { Chip } from "@/components/ui/chip";
import type { TFiscalProblem } from "@/lib/fiscal/problems";
import { AlertTriangle, RotateCcw } from "lucide-react";

type FiscalProblemChipsProps = {
	problems: TFiscalProblem[];
	// Limite de chips visiveis; o restante vira "+N".
	max?: number;
	// Deixa a mensagem quebrar linha (cards estreitos, celular). Sem isso o chip trunca.
	wrap?: boolean;
	className?: string;
};

// `!` porque o Chip fixa `whitespace-nowrap`/`truncate` e a ordem das utilities nao e garantida.
const WRAP_ROOT_CLASS = "max-w-full items-start py-0.5 whitespace-normal!";
const WRAP_LABEL_CLASS = "max-w-full whitespace-normal! [overflow-wrap:anywhere] leading-snug";

/**
 * Chips de problema de um documento: categoria + mensagem curta. Problemas que o worker resolve
 * sozinho aparecem apagados ("Retentativa automatica") — nao pedem acao do operador.
 */
export function FiscalProblemChips({ problems, max = 3, wrap = false, className }: FiscalProblemChipsProps) {
	if (problems.length === 0) return null;
	const visible = problems.slice(0, max);
	const hidden = problems.length - visible.length;
	return (
		<div className={className ?? "flex flex-wrap items-center gap-1"}>
			{visible.map((problem, index) =>
				problem.resolvidoAutomaticamente ? (
					<Chip.Root key={`${problem.codigo}-${index}`} variant="muted" size="xs" title={problem.mensagem} className={wrap ? WRAP_ROOT_CLASS : undefined}>
						<Chip.Icon>
							<RotateCcw />
						</Chip.Icon>
						<Chip.Label className={wrap ? WRAP_LABEL_CLASS : undefined}>Retentativa automática · {problem.mensagem}</Chip.Label>
					</Chip.Root>
				) : (
					<Chip.Root
						key={`${problem.codigo}-${index}`}
						variant="destructive"
						size="xs"
						title={`${problem.mensagem} — ${problem.acaoSugerida}`}
						className={wrap ? WRAP_ROOT_CLASS : undefined}
					>
						<Chip.Icon>
							<AlertTriangle />
						</Chip.Icon>
						<Chip.Label className={wrap ? WRAP_LABEL_CLASS : undefined}>
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
