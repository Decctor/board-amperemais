import { Switch } from "@/components/ui/switch";
import { resolveAutoEmissionException, type TAutoEmissionExceptions } from "@/lib/fiscal/auto-emission-policy";
import type { TUseSaleState } from "@/state-hooks/use-sale-state";
import { LockIcon, ReceiptTextIcon } from "lucide-react";

type FiscalEmissionSectionProps = {
	saleState: TUseSaleState;
	organizationAutoFiscalEmission: boolean;
	organizationAutoFiscalCapable: boolean;
	autoEmissionExceptions: TAutoEmissionExceptions;
	canEmitFiscal: boolean;
};

export default function FiscalEmissionSection({
	saleState,
	organizationAutoFiscalEmission,
	organizationAutoFiscalCapable,
	autoEmissionExceptions,
	canEmitFiscal,
}: FiscalEmissionSectionProps) {
	// Sem capacidade fiscal configurada, não há emissão automática possível: oculta o controle.
	if (!organizationAutoFiscalCapable) return null;

	// Mesma regra do servidor: exceções só valem quando a venda herda a preferência da organização.
	const exception = resolveAutoEmissionException({
		metodos: saleState.state.pagamentos.filter((payment) => payment.valor > 0).map((payment) => payment.metodo),
		excecoes: autoEmissionExceptions,
	});

	// null = herda a preferência da organização; boolean = decisão explícita desta venda.
	const efetivo = saleState.state.emissaoFiscalAutomatica ?? (organizationAutoFiscalEmission && !exception);
	const suprimidoPorExcecao = saleState.state.emissaoFiscalAutomatica == null && organizationAutoFiscalEmission && !!exception;

	return (
		<div className="bg-card border-border flex w-full flex-col gap-2 rounded-xl border px-3 py-3 shadow-2xs">
			<div className="flex items-center justify-between gap-2">
				<div className="flex items-center gap-1.5">
					<ReceiptTextIcon className="w-4 h-4 text-foreground" />
					<h3 className="font-bold text-xs tracking-wide">EMISSÃO DE NOTA FISCAL</h3>
				</div>
				<Switch checked={efetivo} disabled={!canEmitFiscal} onCheckedChange={(checked) => saleState.setEmissaoFiscalAutomatica(checked)} />
			</div>
			<p className="text-[11px] leading-snug text-muted-foreground">
				{canEmitFiscal ? (
					efetivo ? (
						"A nota fiscal será emitida automaticamente ao finalizar/entregar esta venda."
					) : suprimidoPorExcecao ? (
						"Emissão automática pausada pelos métodos de pagamento desta venda (configuração da organização). Ative para emitir mesmo assim."
					) : (
						"Esta venda não terá nota fiscal emitida automaticamente."
					)
				) : (
					<span className="flex items-center gap-1">
						<LockIcon className="w-3 h-3" />
						Segue a configuração da organização. Você não tem permissão para alterar.
					</span>
				)}
			</p>
		</div>
	);
}
