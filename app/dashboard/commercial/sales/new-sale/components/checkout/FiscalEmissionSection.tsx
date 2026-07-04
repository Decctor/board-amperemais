import { Switch } from "@/components/ui/switch";
import type { TUseSaleState } from "@/state-hooks/use-sale-state";
import { LockIcon, ReceiptTextIcon } from "lucide-react";

type FiscalEmissionSectionProps = {
	saleState: TUseSaleState;
	organizationFiscalEmissaoAutomatica: boolean;
	organizationAutoFiscalCapable: boolean;
	canEmitirFiscal: boolean;
};

export default function FiscalEmissionSection({
	saleState,
	organizationFiscalEmissaoAutomatica,
	organizationAutoFiscalCapable,
	canEmitirFiscal,
}: FiscalEmissionSectionProps) {
	// Sem capacidade fiscal configurada, não há emissão automática possível: oculta o controle.
	if (!organizationAutoFiscalCapable) return null;

	// null = herda a preferência da organização; boolean = decisão explícita desta venda.
	const efetivo = saleState.state.emissaoFiscalAutomatica ?? organizationFiscalEmissaoAutomatica;

	return (
		<div className="bg-card border-border flex w-full flex-col gap-2 rounded-xl border px-3 py-3 shadow-2xs">
			<div className="flex items-center justify-between gap-2">
				<div className="flex items-center gap-1.5">
					<ReceiptTextIcon className="w-4 h-4 text-foreground" />
					<h3 className="font-bold text-xs tracking-wide">EMISSÃO DE NOTA FISCAL</h3>
				</div>
				<Switch checked={efetivo} disabled={!canEmitirFiscal} onCheckedChange={(checked) => saleState.setEmissaoFiscalAutomatica(checked)} />
			</div>
			<p className="text-[11px] leading-snug text-muted-foreground">
				{canEmitirFiscal ? (
					efetivo ? (
						"A nota fiscal será emitida automaticamente ao finalizar/entregar esta venda."
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
