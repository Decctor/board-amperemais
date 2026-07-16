"use client";

import ErrorComponent from "@/components/Layouts/ErrorComponent";
import LoadingComponent from "@/components/Layouts/LoadingComponent";
import { useIfoodMerchantDetails } from "@/lib/queries/ifood";
import { Info } from "lucide-react";
import { getIfoodOperationLabel } from "../shared/ifood-status-config";

type IfoodOverviewTabProps = {
	merchantId: string | null;
};

/**
 * Visão geral da loja no iFood — somente leitura. A API pública do iFood não possui endpoints para
 * atualizar o cadastro do merchant (foto, descrição, dados); essas alterações são feitas no Portal
 * do Parceiro.
 */
export function IfoodOverviewTab({ merchantId }: IfoodOverviewTabProps) {
	const { data: merchant, isLoading, isError, error } = useIfoodMerchantDetails({ merchantId });

	if (!merchantId) return null;
	if (isLoading) return <LoadingComponent />;
	if (isError) return <ErrorComponent msg={error instanceof Error ? error.message : "Erro ao carregar os detalhes da loja."} />;
	if (!merchant) return null;

	const addressLine = merchant.endereco
		? [merchant.endereco.rua, merchant.endereco.numero, merchant.endereco.bairro, merchant.endereco.cidade, merchant.endereco.estado]
				.filter(Boolean)
				.join(", ")
		: null;

	return (
		<div className="flex w-full flex-col gap-3">
			<div className="flex items-start gap-2 rounded-xl border border-border bg-muted/30 px-3 py-2.5">
				<Info className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
				<p className="text-xs text-muted-foreground">
					O iFood não permite editar o cadastro da loja (foto, descrição e dados) através da API. Para alterar essas informações, utilize o Portal do
					Parceiro do iFood.
				</p>
			</div>

			<div className="bg-card border-border flex w-full flex-col gap-3 rounded-xl border px-3 py-4 shadow-2xs">
				<div className="flex w-full items-start justify-between gap-2">
					<div className="flex flex-col gap-0.5">
						<h2 className="text-lg font-bold tracking-tight">{merchant.nome ?? "Loja sem nome"}</h2>
						{merchant.razaoSocial ? <p className="text-sm text-muted-foreground">{merchant.razaoSocial}</p> : null}
					</div>
					{merchant.status ? (
						<span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-[0.65rem] font-semibold text-muted-foreground">{merchant.status}</span>
					) : null}
				</div>

				{merchant.descricao ? <p className="text-sm text-foreground/80">{merchant.descricao}</p> : null}

				<div className="grid grid-cols-1 gap-3 border-t border-border pt-3 sm:grid-cols-2">
					<OverviewField label="ID DA LOJA" value={merchant.id} />
					<OverviewField label="TIPO" value={merchant.tipo} />
					<OverviewField label="ENDEREÇO" value={addressLine} />
					<OverviewField label="CEP" value={merchant.endereco?.cep ?? null} />
				</div>
			</div>

			{merchant.operacoes.length > 0 ? (
				<div className="bg-card border-border flex w-full flex-col gap-3 rounded-xl border px-3 py-4 shadow-2xs">
					<h3 className="text-xs font-medium tracking-tight uppercase">Operações habilitadas</h3>
					<div className="flex flex-wrap gap-2">
						{merchant.operacoes.map((operacao, index) => (
							<span
								key={`${operacao.nome}-${index}`}
								className="rounded-full border border-border bg-muted/40 px-2.5 py-1 text-xs font-medium text-foreground/80"
							>
								{getIfoodOperationLabel(operacao.nome)}
								{operacao.canalVenda ? ` · ${operacao.canalVenda}` : ""}
							</span>
						))}
					</div>
				</div>
			) : null}
		</div>
	);
}

function OverviewField({ label, value }: { label: string; value: string | null }) {
	return (
		<div className="flex flex-col gap-0.5">
			<span className="text-[0.65rem] font-bold tracking-tight uppercase text-muted-foreground">{label}</span>
			<span className="text-sm font-medium text-foreground">{value ?? "—"}</span>
		</div>
	);
}
