import type { TOnboardingCampaignDependency } from "@/lib/onboarding/campaign-dependencies";
import type { TOnboardingDependencyTypeEnum } from "@/schemas/enums";
import Link from "next/link";
import { ReadinessPill, toneFromDependencyStatus } from "./ReadinessPill";

const DEPENDENCY_LABELS: Record<TOnboardingDependencyTypeEnum, string> = {
	CANAL: "Número",
	TEMPLATE: "Template",
	PAGAMENTO: "Pagamento",
	DADOS: "Dados",
	CASHBACK: "Cashback",
	LIBERACAO: "Liberação",
};

const STATUS_LABELS = {
	OK: "Ok",
	PENDENTE: "Pendente",
	EM_ANALISE: "Em análise",
	FALHOU: "Atenção",
	NAO_APLICAVEL: "Não se aplica",
} as const;

export function DependencyList({
	dependencias,
	hideNotApplicable = true,
}: {
	dependencias: TOnboardingCampaignDependency[];
	hideNotApplicable?: boolean;
}) {
	const visible = hideNotApplicable ? dependencias.filter((dependency) => dependency.status !== "NAO_APLICAVEL") : dependencias;
	if (visible.length === 0) return null;
	return (
		<ul className="flex flex-col divide-y divide-border">
			{visible.map((dependency) => (
				<li key={dependency.tipo} className="flex min-w-0 flex-col gap-2 py-3">
					<div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
						<span className="text-sm font-semibold">{DEPENDENCY_LABELS[dependency.tipo]}</span>
						<ReadinessPill tone={toneFromDependencyStatus(dependency.status)}>{STATUS_LABELS[dependency.status]}</ReadinessPill>
					</div>
					{dependency.detalhe ? <p className="text-xs leading-relaxed break-words text-muted-foreground">{dependency.detalhe}</p> : null}
					{dependency.acao && dependency.status !== "OK" ? (
						<Link
							href={dependency.acao.href}
							className="flex min-h-9 w-fit max-w-full items-center rounded-sm text-xs font-semibold break-words underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-ring"
						>
							{dependency.acao.rotulo}
						</Link>
					) : null}
				</li>
			))}
		</ul>
	);
}
