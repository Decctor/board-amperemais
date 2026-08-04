import { Button } from "@/components/ui/button";
import type { TUseOrganizationOnboardingState } from "@/state-hooks/use-organization-onboarding-state";
import { ArrowRight, BadgePercent, Database, Loader2, Megaphone, MessageCircle, PartyPopper } from "lucide-react";

type ConclusionStageProps = {
	state: TUseOrganizationOnboardingState["state"];
	onComplete: () => void;
	isCompleting: boolean;
};

export function ConclusionStage({ state, onComplete, isCompleting }: ConclusionStageProps) {
	const cashbackLabel = state.cashback.ativo
		? `Ativo · ${state.cashback.acumuloTipo === "PERCENTUAL" ? `${state.cashback.acumuloValor}%` : `R$ ${state.cashback.acumuloValor}`} de volta`
		: "Não ativado por enquanto";
	const dataSourceLabel =
		state.dataSource.mode === "POI"
			? "Ponto de Interação"
			: state.dataSource.integracoesConectadas.length > 0
				? state.dataSource.integracoesConectadas.join(", ")
				: "Integração";

	return (
		<div className="flex h-full flex-col gap-6">
			<div className="flex flex-col items-center gap-3 text-center">
				<span className="flex h-16 w-16 items-center justify-center rounded-full bg-[#FFB900]/15 text-yellow-700">
					<PartyPopper className="h-8 w-8" />
				</span>
				<div className="flex flex-col gap-1">
					<h2 className="text-2xl font-extrabold tracking-tight text-gray-900">Tudo pronto, {state.organization.nome || "vamos lá"}!</h2>
					<p className="text-sm text-muted-foreground">Sua conta já está configurada e o período de teste começou. Veja o resumo:</p>
				</div>
			</div>

			<div className="flex flex-col gap-2.5">
				<SummaryRow icon={<BadgePercent className="h-4 w-4" />} title="Cashback" value={cashbackLabel} />
				<SummaryRow icon={<MessageCircle className="h-4 w-4" />} title="WhatsApp" value="Número conectado" />
				<SummaryRow icon={<Megaphone className="h-4 w-4" />} title="Campanhas" value={`${state.selectedCampaignKeys.length} automações ativas`} />
				<SummaryRow icon={<Database className="h-4 w-4" />} title="Fonte de dados" value={dataSourceLabel} />
			</div>

			<div className="mt-auto flex flex-col gap-3">
				<Button
					onClick={onComplete}
					disabled={isCompleting}
					size="lg"
					className="w-full gap-2 rounded-xl bg-[#24549C] text-white hover:bg-[#1a3d7a]"
				>
					{isCompleting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
					IR PARA O DASHBOARD
					{!isCompleting && <ArrowRight className="h-4 w-4" />}
				</Button>
				<p className="text-center text-xs text-muted-foreground">
					Quer mais recursos e limites maiores? Veja os planos a qualquer momento nas configurações da sua conta.
				</p>
			</div>
		</div>
	);
}

function SummaryRow({ icon, title, value }: { icon: React.ReactNode; title: string; value: string }) {
	return (
		<div className="flex items-center gap-3 rounded-xl border border-border bg-white p-3.5">
			<span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#24549C]/10 text-[#24549C]">{icon}</span>
			<div className="flex flex-1 items-center justify-between gap-2">
				<span className="text-sm font-semibold text-gray-700">{title}</span>
				<span className="text-sm text-gray-500">{value}</span>
			</div>
		</div>
	);
}
