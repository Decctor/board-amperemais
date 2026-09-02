"use client";

import ErrorComponent from "@/components/Layouts/ErrorComponent";
import LoadingComponent from "@/components/Layouts/LoadingComponent";
import ResponsiveMenu from "@/components/Utils/ResponsiveMenu";
import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { Input } from "@/components/ui/input";
import { getErrorMessage } from "@/lib/errors";
import { createProductAddOnReference } from "@/lib/mutations/products";
import { useProductAddOns } from "@/lib/queries/products";
import type { TGetProductAddOnsOutputDefault } from "@/app/api/products/add-ons/route";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Layers, LinkIcon, ListChecks, Package } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

function RuleField({ label, value, min, onChange }: { label: string; value: number; min: number; onChange: (value: number) => void }) {
	return (
		<label className="inline-flex h-8 items-center gap-1 rounded-md border border-border bg-background px-1.5">
			<span className="text-[0.62rem] font-medium uppercase tracking-wide text-muted-foreground">{label}</span>
			<input
				type="number"
				min={min}
				value={value}
				onChange={(event) => onChange(Math.max(min, Math.round(Number(event.target.value) || min)))}
				aria-label={`${label} de opções neste produto`}
				className="w-9 bg-transparent text-center text-xs tabular-nums outline-hidden"
			/>
		</label>
	);
}

type LinkProductAddOnProps = {
	productId: string;
	linkedAddOnIds: string[];
	closeModal: () => void;
	callbacks?: {
		onMutate?: () => void;
		onSuccess?: () => void;
		onError?: (error: Error) => void;
		onSettled?: () => void;
	};
};

export default function LinkProductAddOn({ productId, linkedAddOnIds, closeModal, callbacks }: LinkProductAddOnProps) {
	const queryClient = useQueryClient();
	const { data: addOns, isLoading, isError, isSuccess, error, filters, updateFilters } = useProductAddOns({
		initialFilters: { activeOnly: true },
	});

	const { mutate: attach, isPending: attachIsPending } = useMutation({
		mutationKey: ["create-product-add-on-reference", productId],
		mutationFn: createProductAddOnReference,
		onMutate: () => callbacks?.onMutate?.(),
		onSuccess: (data) => {
			callbacks?.onSuccess?.();
			toast.success(data.message);
			queryClient.invalidateQueries({ queryKey: ["product-add-ons"] });
			queryClient.invalidateQueries({ queryKey: ["product-add-on-by-id"] });
		},
		onError: (error) => {
			callbacks?.onError?.(error);
			toast.error(getErrorMessage(error));
		},
		onSettled: () => callbacks?.onSettled?.(),
	});

	const availableAddOns = addOns?.filter((addOn) => !linkedAddOnIds.includes(addOn.id)) ?? [];

	return (
		<ResponsiveMenu
			mode="read-only"
			menuTitle="VINCULAR GRUPO DE ADICIONAIS"
			menuDescription="Selecione um grupo já cadastrado para vincular a esse produto. Alterações no grupo afetam todos os produtos vinculados."
			menuCancelButtonText="FECHAR"
			stateIsLoading={false}
			stateError={null}
			closeMenu={closeModal}
			dialogVariant="md"
			drawerVariant="md"
		>
			<div className="flex w-full flex-col gap-3">
				<Input
					value={filters.search}
					placeholder="Pesquisar grupo de adicionais..."
					onChange={(e) => updateFilters({ search: e.target.value })}
					className="w-full rounded-xl"
				/>
				{isLoading ? <LoadingComponent /> : null}
				{isError ? <ErrorComponent msg={getErrorMessage(error)} /> : null}
				{isSuccess ? (
					availableAddOns.length > 0 ? (
						<div className="flex w-full flex-col gap-1.5">
							{availableAddOns.map((addOn) => (
								<LinkableAddOnRow
									key={addOn.id}
									addOn={addOn}
									attachIsPending={attachIsPending}
									onAttach={(rules) => attach({ productId, productAddOnId: addOn.id, ...rules })}
								/>
							))}
						</div>
					) : (
						<p className="w-full py-3 text-center text-xs font-medium tracking-tight text-muted-foreground">
							Nenhum grupo disponível para vincular. Crie novos grupos na aba Adicionais da página de produtos.
						</p>
					)
				) : null}
			</div>
		</ResponsiveMenu>
	);
}

type TAttachRules = { minOpcoes: number | null; maxOpcoes: number | null };

type LinkableAddOnRowProps = {
	addOn: TGetProductAddOnsOutputDefault[number];
	attachIsPending: boolean;
	onAttach: (rules: TAttachRules) => void;
};

/**
 * A regra do vínculo começa herdando o grupo: os campos vêm preenchidos com o padrão e só viram
 * override quando o valor difere. Assim vincular sem pensar na regra continua sendo um clique.
 */
function LinkableAddOnRow({ addOn, attachIsPending, onAttach }: LinkableAddOnRowProps) {
	const [minOpcoes, setMinOpcoes] = useState<number>(addOn.minOpcoes);
	const [maxOpcoes, setMaxOpcoes] = useState<number>(addOn.maxOpcoes);

	function handleAttach() {
		if (maxOpcoes < minOpcoes) {
			toast.error("Máximo de opções não pode ser menor que o mínimo.");
			return;
		}
		onAttach({
			minOpcoes: minOpcoes === addOn.minOpcoes ? null : minOpcoes,
			maxOpcoes: maxOpcoes === addOn.maxOpcoes ? null : maxOpcoes,
		});
	}

	return (
		<div className="flex w-full items-center justify-between gap-2 rounded-lg border border-border bg-background px-2.5 py-2">
			<div className="flex min-w-0 flex-1 items-start gap-2">
				<span className="mt-0.5 inline-flex h-6 min-w-6 shrink-0 items-center justify-center rounded-md border border-border bg-background">
					<Layers className="h-3 w-3 text-muted-foreground" />
				</span>
				<div className="min-w-0 flex-1">
					<p className="truncate text-sm font-semibold tracking-tight text-foreground">{addOn.nome}</p>
					<div className="flex flex-wrap items-center gap-1.5 pt-0.5">
						{addOn.internoNome ? (
							<span className="truncate text-xs font-medium tracking-tight text-muted-foreground">{addOn.internoNome}</span>
						) : null}
						<Chip.Root variant="outline" size="xs">
							<Chip.Icon>
								<ListChecks />
							</Chip.Icon>
							<Chip.Label>{addOn.opcoes.length === 1 ? "1 opção" : `${addOn.opcoes.length} opções`}</Chip.Label>
						</Chip.Root>
						<Chip.Root variant="outline" size="xs">
							<Chip.Icon>
								<Package />
							</Chip.Icon>
							<Chip.Label>
								{addOn.produtos.length === 0
									? "Sem produtos"
									: addOn.produtos.length === 1
										? "1 produto"
										: `${addOn.produtos.length} produtos`}
							</Chip.Label>
						</Chip.Root>
					</div>
				</div>
			</div>
			<div className="flex shrink-0 items-center gap-1.5">
				<RuleField label="Mín" value={minOpcoes} min={0} onChange={setMinOpcoes} />
				<RuleField label="Máx" value={maxOpcoes} min={1} onChange={setMaxOpcoes} />
				<Button type="button" variant="outline" size="sm" disabled={attachIsPending} onClick={handleAttach} className="flex items-center gap-1.5">
					<LinkIcon className="h-3.5 w-3.5" />
					VINCULAR
				</Button>
			</div>
		</div>
	);
}
