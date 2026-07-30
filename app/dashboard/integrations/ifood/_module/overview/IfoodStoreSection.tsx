"use client";

import ErrorComponent from "@/components/Layouts/ErrorComponent";
import { Chip } from "@/components/ui/chip";
import { SectionWrapper, SectionWrapperDataRow } from "@/components/ui/section-wrapper";
import { Skeleton } from "@/components/ui/skeleton";
import type { TIfoodMerchantStatusDTO } from "@/lib/integrations/ifood/merchant-types";
import { useIfoodMerchantDetails, useIfoodMerchantStatus } from "@/lib/queries/ifood";
import { Activity, Hash, Info, MapPin, Store, Tag } from "lucide-react";
import { IfoodSectionEmpty } from "../shared/IfoodSectionEmpty";
import { IfoodSectionLoading } from "../shared/IfoodSectionLoading";
import { getIfoodOperationLabel, getIfoodStatusConfig } from "../shared/ifood-status-config";

type IfoodStoreSectionProps = {
	merchantId: string | null;
};

/**
 * Seção da loja: identidade, disponibilidade por operação e cadastro. A disponibilidade se atualiza
 * sozinha a cada 60s. O cadastro é somente leitura — a API pública do iFood não expõe endpoints de
 * escrita para foto, descrição e dados da loja; isso é feito no Portal do Parceiro.
 *
 * As duas queries resolvem de forma independente: uma falha de cadastro não esconde a
 * disponibilidade, que é a informação operacional da seção.
 */
export function IfoodStoreSection({ merchantId }: IfoodStoreSectionProps) {
	const detailsQuery = useIfoodMerchantDetails({ merchantId });
	const statusQuery = useIfoodMerchantStatus({ merchantId });

	const merchant = detailsQuery.data;
	const addressLine = merchant?.endereco
		? [merchant.endereco.rua, merchant.endereco.numero, merchant.endereco.bairro, merchant.endereco.cidade, merchant.endereco.estado]
				.filter(Boolean)
				.join(", ")
		: null;

	if (!merchantId) {
		return (
			<SectionWrapper title="LOJA" icon={<Store className="w-4 h-4 min-w-4 min-h-4" />}>
				<IfoodSectionEmpty icon={Store} message="Selecione uma loja para acompanhar a disponibilidade e o cadastro." />
			</SectionWrapper>
		);
	}

	return (
		<SectionWrapper title="LOJA" icon={<Store className="w-4 h-4 min-w-4 min-h-4" />}>
			{detailsQuery.isLoading ? (
				<div className="flex w-full flex-col gap-2">
					<Skeleton className="h-6 w-56 rounded-lg" />
					<Skeleton className="h-4 w-40 rounded-lg" />
				</div>
			) : merchant ? (
				<div className="flex w-full flex-col gap-1">
					<div className="flex w-full items-start justify-between gap-2">
						<h2 className="text-lg font-bold tracking-tight">{merchant.nome ?? "Loja sem nome"}</h2>
						{merchant.status ? (
							<Chip.Root variant="muted" shape="pill" size="xs">
								<Chip.Label caps weight="bold">
									{merchant.status}
								</Chip.Label>
							</Chip.Root>
						) : null}
					</div>
					{merchant.razaoSocial ? <p className="text-sm text-muted-foreground">{merchant.razaoSocial}</p> : null}
					{merchant.descricao ? <p className="text-sm text-foreground/80">{merchant.descricao}</p> : null}
				</div>
			) : null}

			<div className="grid w-full grid-cols-1 gap-6 lg:grid-cols-2">
				<div className="flex w-full min-w-0 flex-col gap-3">
					<h2 className="text-xs leading-none tracking-tight">DISPONIBILIDADE</h2>
					{statusQuery.isLoading ? (
						<IfoodSectionLoading rows={2} />
					) : statusQuery.isError ? (
						<ErrorComponent msg={statusQuery.error instanceof Error ? statusQuery.error.message : "Erro ao carregar o status da loja."} />
					) : (statusQuery.data ?? []).length === 0 ? (
						<IfoodSectionEmpty icon={Activity} message="Nenhuma operação habilitada para esta loja." />
					) : (
						<div className="flex w-full flex-col divide-y divide-border/60">
							{(statusQuery.data ?? []).map((operacao, index) => (
								<OperationStatusRow key={`${operacao.operacao}-${index}`} operacao={operacao} />
							))}
						</div>
					)}
				</div>

				<div className="flex w-full min-w-0 flex-col gap-3 border-t border-border pt-6 lg:border-t-0 lg:border-l lg:pt-0 lg:pl-6">
					<h2 className="text-xs leading-none tracking-tight">CADASTRO</h2>
					{detailsQuery.isLoading ? (
						<IfoodSectionLoading rows={2} />
					) : detailsQuery.isError ? (
						<ErrorComponent msg={detailsQuery.error instanceof Error ? detailsQuery.error.message : "Erro ao carregar os detalhes da loja."} />
					) : !merchant ? (
						<IfoodSectionEmpty icon={Store} message="Nenhum dado cadastral encontrado para esta loja." />
					) : (
						<>
							<div className="w-full flex flex-col gap-1.5">
								<SectionWrapperDataRow icon={<Hash className="w-4 h-4" />} label="ID" value={merchant.id} />
								<SectionWrapperDataRow icon={<Tag className="w-4 h-4" />} label="TIPO" value={merchant.tipo ?? "NÃO INFORMADO"} />
								<SectionWrapperDataRow icon={<MapPin className="w-4 h-4" />} label="ENDEREÇO" value={addressLine ?? "NÃO INFORMADO"} />
								<SectionWrapperDataRow icon={<MapPin className="w-4 h-4" />} label="CEP" value={merchant.endereco?.cep ?? "NÃO INFORMADO"} />
							</div>
							{merchant.operacoes.length > 0 ? (
								<div className="flex flex-wrap gap-1.5">
									{merchant.operacoes.map((operacao, index) => (
										<Chip.Root key={`${operacao.nome}-${index}`} variant="outline" shape="pill" size="sm">
											<Chip.Label weight="medium">
												{getIfoodOperationLabel(operacao.nome)}
												{operacao.canalVenda ? ` · ${operacao.canalVenda}` : ""}
											</Chip.Label>
										</Chip.Root>
									))}
								</div>
							) : null}
							<p className="flex items-start gap-1.5 text-xs text-muted-foreground">
								<Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
								<span>O cadastro da loja não pode ser editado pela API do iFood. Para alterar foto, descrição e dados, use o Portal do Parceiro.</span>
							</p>
						</>
					)}
				</div>
			</div>
		</SectionWrapper>
	);
}

/** Linha de disponibilidade de uma operação, com estado, mensagem do iFood e validações pendentes. */
function OperationStatusRow({ operacao }: { operacao: TIfoodMerchantStatusDTO }) {
	const config = getIfoodStatusConfig(operacao.estado, operacao.disponivel);
	const validacoes = operacao.validacoes.filter((validacao) => validacao.titulo);

	return (
		<div className="flex w-full flex-col gap-1 py-3 first:pt-0 last:pb-0">
			<div className="flex w-full items-center justify-between gap-2">
				<h3 className="text-sm font-semibold tracking-tight">{getIfoodOperationLabel(operacao.operacao)}</h3>
				<Chip.Root shape="pill" size="xs" className={config.className}>
					<Chip.Label caps weight="bold">
						{config.label}
					</Chip.Label>
				</Chip.Root>
			</div>
			{operacao.mensagem?.titulo ? (
				<div className="flex flex-col gap-0.5">
					<p className="text-sm text-foreground/80">{operacao.mensagem.titulo}</p>
					{operacao.mensagem.subtitulo ? <p className="text-xs text-muted-foreground">{operacao.mensagem.subtitulo}</p> : null}
				</div>
			) : null}
			{validacoes.length > 0 ? (
				<div className="flex flex-col gap-0.5">
					{validacoes.map((validacao, index) => (
						<p key={index} className="text-xs text-muted-foreground">
							• {validacao.titulo}
						</p>
					))}
				</div>
			) : null}
		</div>
	);
}
