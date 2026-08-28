"use client";

import type { TGetProductsOutputById } from "@/app/api/products/route";
import type { TGetProductChannelSettingsOutput, TUpdateProductChannelSettingsInput } from "@/app/api/products/channel-settings/route";
import { Button } from "@/components/ui/button";
import { getErrorMessage } from "@/lib/errors";
import { updateProductChannelSettings } from "@/lib/mutations/product-channel-settings";
import { useProductChannelSettings } from "@/lib/queries/product-channel-settings";
import { cn } from "@/lib/utils";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Radio, Save } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

type TChannelRow = TGetProductChannelSettingsOutput["data"]["channels"][number];
type TSettingRow = TGetProductChannelSettingsOutput["data"]["settings"][number];

const CHANNEL_LABELS: Record<TChannelRow["canal"], string> = {
	POS: "PDV",
	SHOP: "Loja digital",
	COMANDA: "Comandas",
	IFOOD: "iFood",
};

// null = herdar o padrão do canal; true/false = override explícito.
type TAvailabilityChoice = boolean | null;

function nodeKey(canalVendaId: string, produtoVarianteId: string | null) {
	return `${canalVendaId}:${produtoVarianteId ?? ""}`;
}

function buildInitialState(settings: TSettingRow[]) {
	const state = new Map<string, TAvailabilityChoice>();
	for (const setting of settings) {
		state.set(nodeKey(setting.canalVendaId, setting.produtoVarianteId), setting.disponivel);
	}
	return state;
}

type SalesChannelsSectionProps = {
	product: TGetProductsOutputById;
};

/**
 * Matriz de canais de venda do produto: presença e preço por canal, com herança explícita —
 * sem linha, vale o modo do canal (e o preço base); a linha da variante só restringe dentro de
 * produto visível. iFood ainda não sincroniza (fase 4) — o badge deixa claro.
 */
export default function SalesChannelsSection({ product }: SalesChannelsSectionProps) {
	const queryClient = useQueryClient();
	const { data, isLoading, isError, queryKey } = useProductChannelSettings({ produtoId: product.id });
	const [choices, setChoices] = useState<Map<string, TAvailabilityChoice>>(new Map());
	const [prices, setPrices] = useState<Map<string, number | null>>(new Map());
	const [dirty, setDirty] = useState(false);

	useEffect(() => {
		if (data) {
			setChoices(buildInitialState(data.settings));
			setPrices(new Map(data.settings.map((setting) => [nodeKey(setting.canalVendaId, setting.produtoVarianteId), setting.precoVenda])));
			setDirty(false);
		}
	}, [data]);

	const { mutate, isPending } = useMutation({
		mutationKey: ["update-product-channel-settings", product.id],
		mutationFn: updateProductChannelSettings,
		onSuccess: (result) => {
			toast.success(result.message);
			queryClient.invalidateQueries({ queryKey });
		},
		onError: (error) => toast.error(getErrorMessage(error)),
	});

	if (isLoading) return null;
	if (isError || !data) return null;

	const activeVariants = product.variantes.filter((variant) => variant.ativo);

	function cycleChoice(key: string) {
		setChoices((previous) => {
			const next = new Map(previous);
			const current = next.get(key) ?? null;
			// herdar → disponível → indisponível → herdar
			next.set(key, current === null ? true : current === true ? false : null);
			return next;
		});
		setDirty(true);
	}

	function updatePrice(key: string, value: number | null) {
		setPrices((previous) => {
			const next = new Map(previous);
			next.set(key, value);
			return next;
		});
		setDirty(true);
	}

	function handleSave() {
		// Envia todos os nós exibidos: o PUT é um patch esparso, então nós com disponibilidade
		// "herdar" e preço vazio voltam a herdar (a linha esparsa é removida).
		const settings: TUpdateProductChannelSettingsInput["settings"] = [];
		for (const channel of data!.channels) {
			settings.push({
				canalVendaId: channel.id,
				produtoVarianteId: null,
				disponivel: choices.get(nodeKey(channel.id, null)) ?? null,
				// Preço nível-produto só é válido para produto sem variantes (regra do PUT).
				precoVenda: activeVariants.length === 0 ? (prices.get(nodeKey(channel.id, null)) ?? null) : null,
			});
			for (const variant of activeVariants) {
				settings.push({
					canalVendaId: channel.id,
					produtoVarianteId: variant.id,
					disponivel: choices.get(nodeKey(channel.id, variant.id)) ?? null,
					precoVenda: prices.get(nodeKey(channel.id, variant.id)) ?? null,
				});
			}
		}
		mutate({ produtoId: product.id, settings });
	}

	return (
		<div className="border-border flex w-full flex-col gap-3 rounded-xl border px-3.5 py-3">
			<div className="flex items-center justify-between gap-1.5">
				<div className="flex items-center gap-1.5">
					<Radio className="h-4 min-h-4 w-4 min-w-4" />
					<span className="text-xs font-bold uppercase tracking-wide">CANAIS DE VENDA</span>
				</div>
				<Button size="sm" variant="secondary" className="flex items-center gap-1.5" disabled={!dirty || isPending} onClick={handleSave}>
					<Save className="h-3.5 w-3.5" />
					{isPending ? "SALVANDO..." : "SALVAR"}
				</Button>
			</div>

			{product.vendavel === false ? (
				<p className="text-xs text-muted-foreground">
					Produto marcado como <span className="font-semibold">não vendável</span> — ele não aparece em nenhum canal, independentemente das configurações
					abaixo.
				</p>
			) : null}

			<div className="flex flex-col gap-2">
				{data.channels.map((channel) => {
					const inheritedVisible = channel.catalogoModo === "TODOS";
					return (
						<div key={channel.id} className="flex flex-col gap-1.5 rounded-lg bg-primary/5 px-3 py-2">
							<div className="flex items-center justify-between gap-2">
								<div className="flex items-center gap-2">
									<span className="text-xs font-semibold">{CHANNEL_LABELS[channel.canal] ?? channel.canal}</span>
									{channel.canal === "IFOOD" ? (
										<span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[0.6rem] font-medium text-amber-600">SEM SINCRONIZAÇÃO</span>
									) : null}
									<span className="text-[0.6rem] text-muted-foreground">padrão do canal: {inheritedVisible ? "visível" : "oculto"}</span>
								</div>
								<div className="flex items-center gap-2">
									{activeVariants.length === 0 ? (
										<ChannelPriceInput
											value={prices.get(nodeKey(channel.id, null)) ?? null}
											basePrice={product.precoVenda}
											onChange={(value) => updatePrice(nodeKey(channel.id, null), value)}
										/>
									) : null}
									<AvailabilityCycleButton
										choice={choices.get(nodeKey(channel.id, null)) ?? null}
										inheritedVisible={inheritedVisible}
										onCycle={() => cycleChoice(nodeKey(channel.id, null))}
									/>
								</div>
							</div>
							{activeVariants.length > 0 ? (
								<div className="flex flex-col gap-1 border-l border-border pl-3">
									{activeVariants.map((variant) => (
										<div key={variant.id} className="flex items-center justify-between gap-2">
											<span className="text-[0.65rem] text-muted-foreground">{variant.nome}</span>
											<div className="flex items-center gap-2">
												<ChannelPriceInput
													value={prices.get(nodeKey(channel.id, variant.id)) ?? null}
													basePrice={variant.precoVenda}
													onChange={(value) => updatePrice(nodeKey(channel.id, variant.id), value)}
												/>
												<AvailabilityCycleButton
													choice={choices.get(nodeKey(channel.id, variant.id)) ?? null}
													inheritedVisible
													variantLevel
													onCycle={() => cycleChoice(nodeKey(channel.id, variant.id))}
												/>
											</div>
										</div>
									))}
								</div>
							) : null}
						</div>
					);
				})}
			</div>
		</div>
	);
}

function AvailabilityCycleButton({
	choice,
	inheritedVisible,
	variantLevel = false,
	onCycle,
}: {
	choice: TAvailabilityChoice;
	inheritedVisible: boolean;
	variantLevel?: boolean;
	onCycle: () => void;
}) {
	const label =
		choice === true
			? "DISPONÍVEL"
			: choice === false
				? "INDISPONÍVEL"
				: variantLevel
					? "HERDAR DO PRODUTO"
					: `HERDAR (${inheritedVisible ? "VISÍVEL" : "OCULTO"})`;
	return (
		<button
			type="button"
			onClick={onCycle}
			className={cn(
				"rounded-full px-2.5 py-1 text-[0.6rem] font-semibold tracking-wide transition-colors",
				choice === true && "bg-emerald-500/15 text-emerald-600",
				choice === false && "bg-red-500/15 text-red-600",
				choice === null && "bg-primary/10 text-primary/70",
			)}
		>
			{label}
		</button>
	);
}

// Campo de preço do canal: vazio = herda o preço base (mostrado no placeholder).
function ChannelPriceInput({
	value,
	basePrice,
	onChange,
}: {
	value: number | null;
	basePrice: number | null;
	onChange: (value: number | null) => void;
}) {
	return (
		<input
			type="number"
			min={0}
			step="0.01"
			inputMode="decimal"
			value={value ?? ""}
			placeholder={basePrice != null ? `R$ ${basePrice.toFixed(2)}` : "R$ —"}
			onChange={(event) => {
				const raw = event.target.value;
				onChange(raw === "" ? null : Math.max(0, Number(raw)));
			}}
			className="w-24 rounded-md border border-border bg-transparent px-2 py-1 text-right text-[0.65rem] tabular-nums outline-none placeholder:text-primary/40 focus:border-primary/40"
		/>
	);
}
