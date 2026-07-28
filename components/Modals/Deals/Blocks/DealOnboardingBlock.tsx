import type { TGetDealsOutputById } from "@/app/api/admin/deals/route";
import DateTimeInput from "@/components/Inputs/DateTimeInput";
import ResponsiveMenuSection from "@/components/Utils/ResponsiveMenuSection";
import { LoadingButton } from "@/components/loading-button";
import { Button } from "@/components/ui/button";
import { formatDateAsLocale } from "@/lib/formatting";
import { cn, copyToClipboard } from "@/lib/utils";
import type { TDealOnboardingFormSituationEnum } from "@/schemas/enums";
import { Ban, ClipboardList, Copy, Link2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

const FORM_SITUATION_PILLS: Record<TDealOnboardingFormSituationEnum, { label: string; className: string }> = {
	EMITIDO: { label: "AGUARDANDO PREENCHIMENTO", className: "bg-amber-500/15 text-amber-600 dark:text-amber-400" },
	EXPIRADO: { label: "EXPIRADO", className: "bg-muted text-foreground/60" },
	PREENCHIDO: { label: "PREENCHIDO — AGUARDANDO PAGAMENTO", className: "bg-blue-500/15 text-blue-600 dark:text-blue-400" },
	CONCLUIDO: { label: "CONCLUÍDO", className: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400" },
	CANCELADO: { label: "REVOGADO", className: "bg-muted text-foreground/60" },
};

type DealOnboardingBlockProps = {
	deal: TGetDealsOutputById;
	isPending: boolean;
	emittedFormUrl: string | null;
	onEmit: (dataExpiracao: Date | null) => void;
	onRevoke: () => void;
};

export default function DealOnboardingBlock({ deal, isPending, emittedFormUrl, onEmit, onRevoke }: DealOnboardingBlockProps) {
	const [expirationValue, setExpirationValue] = useState<string | undefined>(undefined);
	const [revokeConfirmation, setRevokeConfirmation] = useState(false);

	const form = deal.formularioOnboarding;
	const dealAcceptsForm = deal.status !== "ATIVO" && deal.status !== "CANCELADO";

	function handleEmit() {
		// datetime-local → Date; o axios serializa como ISO e o schema da API (.datetime()) reidrata.
		onEmit(expirationValue ? new Date(expirationValue) : null);
	}

	const camposGerais = form?.estrutura.campos.filter((campo) => campo.escopo === "GERAL") ?? [];
	const camposOrganizacao = form?.estrutura.campos.filter((campo) => campo.escopo === "ORGANIZACAO") ?? [];

	return (
		<ResponsiveMenuSection title="FORMULÁRIO DE ONBOARDING" icon={<ClipboardList className="h-3 w-3 min-w-3 min-h-3" />}>
			{emittedFormUrl ? (
				<div className="flex w-full flex-col gap-1.5">
					<div className="flex w-full items-center gap-2 rounded-md border border-border bg-input/30 px-3 py-2">
						<span className="min-w-0 flex-1 truncate font-mono text-xs text-foreground/70">{emittedFormUrl}</span>
						<Button
							variant="outline"
							size="sm"
							onClick={() => {
								copyToClipboard(emittedFormUrl);
								toast.success("Link copiado para a área de transferência.");
							}}
						>
							<Copy className="h-3.5 w-3.5 min-w-3.5 min-h-3.5" />
							COPIAR
						</Button>
					</div>
					<p className="text-[0.65rem] font-medium text-amber-600 dark:text-amber-400">
						Guarde este link — ele não será exibido novamente.
					</p>
				</div>
			) : null}

			{form ? (
				<div className="flex w-full flex-col gap-2">
					<div className="flex w-full flex-wrap items-center gap-1.5">
						<span
							className={cn(
								"inline-flex items-center whitespace-nowrap rounded-full px-2 py-0.5 text-[0.65rem] font-semibold tracking-tight",
								FORM_SITUATION_PILLS[form.situacao].className,
							)}
						>
							{FORM_SITUATION_PILLS[form.situacao].label}
						</span>
						{form.dataExpiracao ? (
							<span className="text-xs text-foreground/60">Expira em {formatDateAsLocale(form.dataExpiracao, true)}</span>
						) : null}
					</div>
					<div className="flex w-full flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-foreground/60">
						<span>Emitido em {formatDateAsLocale(form.dataInsercao)}</span>
						{form.dataUltimoRascunho ? <span>Último rascunho em {formatDateAsLocale(form.dataUltimoRascunho, true)}</span> : null}
						{form.dataPreenchimento ? <span>Enviado em {formatDateAsLocale(form.dataPreenchimento, true)}</span> : null}
					</div>

					{form.respostas ? (
						<div className="flex w-full flex-col gap-2 rounded-md border border-border bg-input/30 px-3 py-2">
							{camposGerais.length > 0 ? (
								<div className="flex flex-col gap-0.5">
									<span className="text-[0.65rem] font-bold uppercase tracking-wide text-foreground/50">Dados gerais</span>
									{camposGerais.map((campo) => (
										<div key={campo.chave} className="flex items-baseline justify-between gap-2 text-xs">
											<span className="text-foreground/60">{campo.rotulo}</span>
											<span className="text-right font-medium">{form.respostas?.gerais[campo.chave] || "—"}</span>
										</div>
									))}
								</div>
							) : null}
							{form.respostas.organizacoes.map((section, index) => (
								<div key={`empresa-${index.toString()}`} className="flex flex-col gap-0.5 border-t border-border/50 pt-2 first:border-t-0 first:pt-0">
									<span className="text-[0.65rem] font-bold uppercase tracking-wide text-foreground/50">Empresa {index + 1}</span>
									{camposOrganizacao.map((campo) => (
										<div key={campo.chave} className="flex items-baseline justify-between gap-2 text-xs">
											<span className="text-foreground/60">{campo.rotulo}</span>
											<span className="text-right font-medium">{section[campo.chave] || "—"}</span>
										</div>
									))}
								</div>
							))}
						</div>
					) : (
						<p className="text-xs text-foreground/60">Nenhuma resposta registrada ainda.</p>
					)}

					<div className="flex w-full flex-col gap-2 sm:flex-row">
						{(form.situacao === "EMITIDO" || form.situacao === "EXPIRADO") && dealAcceptsForm ? (
							<LoadingButton variant="outline" loading={isPending} onClick={handleEmit} title="Cancela o link anterior e gera um novo, preservando o rascunho.">
								<Link2 className="h-4 w-4 min-w-4 min-h-4" />
								REEMITIR LINK (INVALIDA O ANTERIOR)
							</LoadingButton>
						) : null}
						{form.situacao !== "CONCLUIDO" ? (
							<LoadingButton
								variant={revokeConfirmation ? "destructive" : "outline"}
								loading={isPending}
								onClick={() => {
									if (!revokeConfirmation) return setRevokeConfirmation(true);
									setRevokeConfirmation(false);
									onRevoke();
								}}
							>
								<Ban className="h-4 w-4 min-w-4 min-h-4" />
								{revokeConfirmation ? "CLIQUE NOVAMENTE PARA CONFIRMAR A REVOGAÇÃO" : "REVOGAR"}
							</LoadingButton>
						) : null}
					</div>
				</div>
			) : dealAcceptsForm ? (
				<div className="flex w-full flex-col gap-2">
					<p className="text-xs text-foreground/60">
						Gere um link público para o comprador informar os dados gerais e os dados de cada empresa (uma por licença). Ao final do preenchimento,
						ele é direcionado ao checkout do deal.
					</p>
					<div className="flex w-full flex-col gap-2 sm:flex-row sm:items-end">
						<div className="min-w-0 flex-1">
							<DateTimeInput label="EXPIRA EM (OPCIONAL)" value={expirationValue} handleChange={setExpirationValue} />
						</div>
						<LoadingButton variant="outline" loading={isPending} onClick={handleEmit}>
							<Link2 className="h-4 w-4 min-w-4 min-h-4" />
							GERAR LINK DO FORMULÁRIO
						</LoadingButton>
					</div>
				</div>
			) : (
				<p className="text-xs text-foreground/60">O deal não aceita mais formulário de onboarding neste status.</p>
			)}
		</ResponsiveMenuSection>
	);
}
