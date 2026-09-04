"use client";

import { Button } from "@/components/ui/button";
import { getErrorMessage } from "@/lib/errors";
import type { TFiscalProblem } from "@/lib/fiscal/problems";
import { syncFiscalCompany } from "@/lib/mutations/fiscal";
import { FISCAL_PENDING_QUERY_KEY } from "@/lib/queries/fiscal";
import { cn } from "@/lib/utils";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowUpRight, Wrench } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";
import { ProductFiscalProfileQuickMenu } from "./ProductFiscalProfileQuickMenu";
import { resolveFiscalProblemCta } from "./fiscal-problem-presentation";

type FiscalProblemCtaProps = {
	problem: TFiscalProblem;
	// Venda do documento: alvo PAGAMENTOS/VENDA sem id cai nela.
	vendaId?: string | null;
	// Sem permissao de configuracao, o botao explica em vez de agir.
	canConfigureFiscal: boolean;
	onResolved?: () => void;
	size?: "sm" | "default";
	className?: string;
};

/**
 * O botao que resolve um problema fiscal, em qualquer tela. Abre o perfil fiscal do produto inline,
 * sincroniza a empresa ou navega para a configuracao certa — decidido por `resolveFiscalProblemCta`.
 */
export function FiscalProblemCta({ problem, vendaId, canConfigureFiscal, onResolved, size = "sm", className }: FiscalProblemCtaProps) {
	const queryClient = useQueryClient();
	const [productMenuOpen, setProductMenuOpen] = useState(false);
	const cta = resolveFiscalProblemCta(problem, { vendaId });

	const { mutate: syncCompany, isPending: isSyncing } = useMutation({
		mutationKey: ["fiscal-problem-sync-company"],
		mutationFn: syncFiscalCompany,
		onSuccess: async (data) => {
			toast.success(data.message);
			await queryClient.invalidateQueries({ queryKey: FISCAL_PENDING_QUERY_KEY });
			await queryClient.invalidateQueries({ queryKey: ["fiscal-settings"] });
			onResolved?.();
		},
		onError: (error) => toast.error(getErrorMessage(error)),
	});

	if (cta.kind === "none") return null;

	const buttonClassName = cn("h-7 gap-1.5 px-2.5 text-[0.65rem] font-bold uppercase tracking-tight", className);
	const requiresConfigure = cta.kind === "product-profile" || cta.kind === "sync-company";
	if (requiresConfigure && !canConfigureFiscal) {
		return (
			<Button
				type="button"
				variant="outline"
				size={size}
				className={buttonClassName}
				disabled
				title="Você não tem permissão para configurar o fiscal. Peça a um administrador."
			>
				<Wrench className="h-3.5 w-3.5" />
				{cta.label}
			</Button>
		);
	}

	if (cta.kind === "link") {
		return (
			<Button type="button" variant="outline" size={size} className={buttonClassName} asChild>
				<Link href={cta.href}>
					<ArrowUpRight className="h-3.5 w-3.5" />
					{cta.label}
				</Link>
			</Button>
		);
	}

	if (cta.kind === "sync-company") {
		return (
			<Button type="button" variant="outline" size={size} className={buttonClassName} disabled={isSyncing} onClick={() => syncCompany()}>
				<Wrench className="h-3.5 w-3.5" />
				{isSyncing ? "Sincronizando..." : cta.label}
			</Button>
		);
	}

	return (
		<>
			<Button type="button" variant="default" size={size} className={buttonClassName} onClick={() => setProductMenuOpen(true)}>
				<Wrench className="h-3.5 w-3.5" />
				{cta.label}
			</Button>
			{productMenuOpen ? (
				<ProductFiscalProfileQuickMenu productId={cta.produtoId} closeMenu={() => setProductMenuOpen(false)} onSaved={onResolved} />
			) : null}
		</>
	);
}
