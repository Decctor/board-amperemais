"use client";

import type { TGetIntegrationSettingsOutput } from "@/app/api/integrations/settings/route";
import ResponsiveMenu from "@/components/Utils/ResponsiveMenu";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { getErrorMessage } from "@/lib/errors";
import { INTEGRATION_SETTINGS_QUERY_KEY, useIntegrationSettings } from "@/lib/queries/integrations";
import { updateIntegrationSettings } from "@/lib/mutations/integrations";
import { cn } from "@/lib/utils";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { type LucideIcon, AlertTriangle, FileText, LayoutGrid, Package, Wallet } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

type TIntegrationErpPolicy = TGetIntegrationSettingsOutput["data"]["integracaoERP"];
type TPolicyFlag = keyof TIntegrationErpPolicy;

type IntegrationErpSettingsProps = {
	canManage: boolean;
	closeMenu: () => void;
};

type FlagMeta = {
	key: TPolicyFlag;
	label: string;
	description: string;
	icon: LucideIcon;
	/** Efeito ainda não implementado (fases 4/5): desabilitado com aviso. */
	comingSoon?: boolean;
};

const FLAG_METADATA: FlagMeta[] = [
	{
		key: "fulfillment",
		label: "Atendimento",
		description: "Exibe os pedidos das integrações na esteira de atendimento e habilita a fila de pedidos a confirmar.",
		icon: LayoutGrid,
	},
	{
		key: "estoque",
		label: "Baixa de estoque",
		description: "Dá baixa no estoque quando o pedido da integração é entregue. Requer que os produtos estejam vinculados por código.",
		icon: Package,
	},
	{
		key: "financeiro",
		label: "Financeiro",
		description:
			"Gera os recebíveis das vendas das integrações: pagos online entram na conta de repasse do canal (ex.: iFood) e pagos na entrega caem no caixa. Taxas e repasse são conciliados manualmente no módulo financeiro.",
		icon: Wallet,
	},
	{
		key: "fiscal",
		label: "Emissão fiscal",
		description:
			"Emite a nota automaticamente quando o pedido da integração é entregue. Requer emissão automática habilitada, perfis fiscais nos produtos e operação fiscal configurada.",
		icon: FileText,
	},
];

const DEFAULT_POLICY: TIntegrationErpPolicy = { fulfillment: false, estoque: false, financeiro: false, fiscal: false };

/**
 * Configuração da política de canal de ERP para integrações (efeitos das vendas de canais
 * gerenciados como o iFood). Espelha o padrão visual do ViewConnectionPhone.
 *
 * Cashback não aparece aqui: é governado pela configuração do programa de cashback
 * (acúmulo via integração), que já é o padrão vigente.
 */
export default function IntegrationErpSettings({ canManage, closeMenu }: IntegrationErpSettingsProps) {
	const queryClient = useQueryClient();
	const settingsQuery = useIntegrationSettings();
	const [policy, setPolicy] = useState<TIntegrationErpPolicy>(DEFAULT_POLICY);

	useEffect(() => {
		if (settingsQuery.data?.integracaoERP) setPolicy(settingsQuery.data.integracaoERP);
	}, [settingsQuery.data?.integracaoERP]);

	const { mutate, isPending } = useMutation({
		mutationKey: ["update-integration-settings"],
		mutationFn: updateIntegrationSettings,
		onSuccess: (data) => {
			toast.success(data.message);
			queryClient.invalidateQueries({ queryKey: INTEGRATION_SETTINGS_QUERY_KEY });
			closeMenu();
		},
		onError: (error) => toast.error(getErrorMessage(error)),
	});

	// Desligar atendimento desliga os efeitos dependentes: sem esteira não há entrega que dispare
	// estoque/financeiro/fiscal das integrações.
	function toggleFlag(key: TPolicyFlag, value: boolean) {
		setPolicy((prev) => {
			if (key === "fulfillment" && !value) return { fulfillment: false, estoque: false, financeiro: false, fiscal: false };
			return { ...prev, [key]: value };
		});
	}

	const isLoading = settingsQuery.isLoading;

	return (
		<ResponsiveMenu
			menuTitle="EFEITOS DAS INTEGRAÇÕES"
			menuDescription="Defina quais efeitos as vendas das integrações (ex.: iFood) geram no seu ERP."
			menuActionButtonText={canManage ? "SALVAR" : "FECHAR"}
			menuCancelButtonText="CANCELAR"
			actionFunction={() => (canManage ? mutate({ integracaoERP: policy }) : closeMenu())}
			actionIsLoading={isPending}
			stateIsLoading={isLoading}
			closeMenu={closeMenu}
			dialogVariant="fit"
			drawerVariant="md"
		>
			<div className="flex flex-col gap-4 px-1">
				<div
					className="relative overflow-hidden rounded-2xl p-4 shadow-2xs outline-solid outline-1 outline-black/5 dark:outline-white/10"
					style={{ background: "linear-gradient(135deg, #EA1D2C1F, var(--card) 58%)" }}
				>
					<div className="absolute -right-8 -top-10 h-28 w-28 rounded-full blur-2xl" style={{ backgroundColor: "#EA1D2C33" }} />
					<div className="relative flex items-start gap-3">
						<div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl" style={{ backgroundColor: "#EA1D2C18" }}>
							<LayoutGrid className="h-6 w-6 text-[#EA1D2C]" />
						</div>
						<div className="min-w-0 flex-1">
							<p className="text-[0.65rem] font-bold uppercase tracking-[0.22em] text-muted-foreground">Política de canal</p>
							<h2 className="mt-1 text-lg font-bold leading-tight tracking-tight text-balance">Efeitos de ERP das integrações</h2>
							<p className="mt-1 text-sm leading-relaxed text-muted-foreground text-pretty">
								Controla o que acontece na plataforma quando um pedido de integração é recebido e atendido.
							</p>
						</div>
					</div>
				</div>

				{isLoading ? (
					<div className="flex flex-col gap-2">
						{FLAG_METADATA.map((flag) => (
							<Skeleton key={flag.key} className="h-20 w-full rounded-xl" />
						))}
					</div>
				) : (
					<div className="flex flex-col gap-2">
						{FLAG_METADATA.map((flag) => {
							const disabledByParent = flag.key !== "fulfillment" && !policy.fulfillment;
							const disabled = !canManage || flag.comingSoon || disabledByParent || isPending;
							return (
								<div
									key={flag.key}
									className={cn("flex items-start gap-3 rounded-xl border border-border bg-muted/30 p-3 transition-opacity", disabled && "opacity-60")}
								>
									<div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
										<flag.icon className="h-4 w-4" />
									</div>
									<div className="min-w-0 flex-1">
										<div className="flex items-center gap-2">
											<p className="text-sm font-bold tracking-tight">{flag.label}</p>
											{flag.comingSoon ? (
												<span className="rounded-md bg-muted px-1.5 py-0.5 text-[0.6rem] font-semibold uppercase tracking-tight text-muted-foreground">
													Em breve
												</span>
											) : null}
										</div>
										<p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{flag.description}</p>
									</div>
									<Switch checked={policy[flag.key]} disabled={disabled} onCheckedChange={(value) => toggleFlag(flag.key, value)} aria-label={flag.label} />
								</div>
							);
						})}
					</div>
				)}

				{!isLoading && policy.fulfillment && policy.estoque ? (
					<div className="flex items-start gap-3 rounded-xl border border-amber-500/20 bg-amber-500/5 p-3 text-amber-700 dark:text-amber-400">
						<AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
						<p className="text-xs leading-relaxed">
							Com a baixa de estoque ligada, confirme que os produtos das integrações estão vinculados por código no seu catálogo — itens sem vínculo não são
							baixados e ficam registrados no log.
						</p>
					</div>
				) : null}

				{!canManage ? <p className="text-xs leading-relaxed text-muted-foreground">Você não possui permissão para alterar estas configurações.</p> : null}
			</div>
		</ResponsiveMenu>
	);
}
