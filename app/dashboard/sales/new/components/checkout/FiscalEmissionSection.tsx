import { ProductFiscalProfileQuickMenu } from "@/components/Fiscal/ProductFiscalProfileQuickMenu";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { resolveAutoEmissionException, type TAutoEmissionExceptions } from "@/lib/fiscal/auto-emission-policy";
import { useProductsMissingFiscalProfile } from "@/lib/queries/products";
import type { TUseSaleState } from "@/state-hooks/use-sale-state";
import { AlertTriangle, LockIcon, ReceiptTextIcon, Wrench } from "lucide-react";
import { useState } from "react";

type FiscalEmissionSectionProps = {
	saleState: TUseSaleState;
	organizationAutoFiscalEmission: boolean;
	organizationAutoFiscalCapable: boolean;
	autoEmissionExceptions: TAutoEmissionExceptions;
	canEmitFiscal: boolean;
	// Habilita "Cadastrar agora" para itens sem perfil fiscal (exige fiscal.configurar).
	canConfigureFiscal?: boolean;
};

export default function FiscalEmissionSection({
	saleState,
	organizationAutoFiscalEmission,
	organizationAutoFiscalCapable,
	autoEmissionExceptions,
	canEmitFiscal,
	canConfigureFiscal = false,
}: FiscalEmissionSectionProps) {
	// Sem capacidade fiscal configurada, não há emissão automática possível: oculta o controle.
	if (!organizationAutoFiscalCapable) return null;
	return (
		<FiscalEmissionSectionContent
			saleState={saleState}
			organizationAutoFiscalEmission={organizationAutoFiscalEmission}
			autoEmissionExceptions={autoEmissionExceptions}
			canEmitFiscal={canEmitFiscal}
			canConfigureFiscal={canConfigureFiscal}
		/>
	);
}

function FiscalEmissionSectionContent({
	saleState,
	organizationAutoFiscalEmission,
	autoEmissionExceptions,
	canEmitFiscal,
	canConfigureFiscal,
}: Omit<FiscalEmissionSectionProps, "organizationAutoFiscalCapable"> & { canConfigureFiscal: boolean }) {
	const [profileMenuProductId, setProfileMenuProductId] = useState<string | null>(null);

	// Mesma regra do servidor: exceções só valem quando a venda herda a preferência da organização.
	const exception = resolveAutoEmissionException({
		metodos: saleState.state.pagamentos.filter((payment) => payment.valor > 0).map((payment) => payment.metodo),
		excecoes: autoEmissionExceptions,
	});

	// null = herda a preferência da organização; boolean = decisão explícita desta venda.
	const efetivo = saleState.state.emissaoFiscalAutomatica ?? (organizationAutoFiscalEmission && !exception);
	const suprimidoPorExcecao = saleState.state.emissaoFiscalAutomatica == null && organizationAutoFiscalEmission && !!exception;

	// Prevencao: com a emissao ligada, um item sem perfil fiscal e uma nota que vai falhar. Avisa
	// antes de confirmar e abre o cadastro daqui mesmo.
	const { missingProductIds } = useProductsMissingFiscalProfile({
		productIds: saleState.state.itens.map((item) => item.produtoId),
		enabled: efetivo,
	});
	const missingItems = saleState.state.itens.filter(
		(item, index, all) => missingProductIds.includes(item.produtoId) && all.findIndex((other) => other.produtoId === item.produtoId) === index,
	);

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
			{efetivo && missingItems.length > 0 ? (
				<div className="flex flex-col gap-1.5 rounded-lg border border-amber-300/70 bg-amber-50/70 px-2.5 py-2 dark:border-amber-900/50 dark:bg-amber-950/30">
					<p className="flex items-start gap-1.5 text-[11px] font-semibold text-amber-900 dark:text-amber-200">
						<AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
						{missingItems.length === 1 ? "1 item sem perfil fiscal" : `${missingItems.length} itens sem perfil fiscal`} — a nota vai falhar na emissão.
					</p>
					<p className="truncate text-[11px] text-amber-900/80 dark:text-amber-200/80">{missingItems.map((item) => item.nome).join(", ")}</p>
					{canConfigureFiscal ? (
						<Button
							type="button"
							size="sm"
							variant="outline"
							className="h-7 w-fit gap-1.5 px-2.5 text-[0.65rem] font-bold uppercase tracking-tight"
							onClick={() => setProfileMenuProductId(missingItems[0]?.produtoId ?? null)}
						>
							<Wrench className="h-3.5 w-3.5" />
							Cadastrar agora
						</Button>
					) : (
						<span className="text-[11px] text-amber-900/80 dark:text-amber-200/80">
							Peça a quem configura o fiscal para cadastrar os perfis, ou desligue a emissão desta venda.
						</span>
					)}
				</div>
			) : null}
			{profileMenuProductId ? (
				<ProductFiscalProfileQuickMenu
					productId={profileMenuProductId}
					closeMenu={() => setProfileMenuProductId(null)}
					onSaved={() => {
						// Passa para o proximo item sem perfil, se houver.
						const next = missingItems.find((item) => item.produtoId !== profileMenuProductId);
						setProfileMenuProductId(next?.produtoId ?? null);
					}}
				/>
			) : null}
		</div>
	);
}
