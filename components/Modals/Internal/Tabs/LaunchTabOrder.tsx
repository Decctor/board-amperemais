import type { TCreateTabOrderInput } from "@/app/api/tabs/orders/route";
import TextInput from "@/components/Inputs/TextInput";
import ResponsiveMenu from "@/components/Utils/ResponsiveMenu";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getErrorMessage } from "@/lib/errors";
import { formatToMoney } from "@/lib/formatting";
import { createTabOrder } from "@/lib/mutations/tabs";
import { usePOSProducts } from "@/lib/queries/pos";
import { useMutation } from "@tanstack/react-query";
import { Minus, Plus, Search } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

type TCartItem = TCreateTabOrderInput["itens"][number] & { cartKey: string };

type LaunchTabOrderProps = {
	tabId: string;
	closeModal: () => void;
	callbacks?: {
		onSuccess?: () => void;
	};
};

/**
 * Fluxo rapido de lancamento de pedido do operador (v1: produto/variante/quantidade;
 * adicionais entram com a composicao compartilhada do cardapio na fase de QR).
 * O id do tabOrder e gerado AQUI no client: duplo toque/retry reenvia o mesmo id
 * e o pedido nao duplica (dedupe por PK no service).
 */
export function LaunchTabOrder({ tabId, closeModal, callbacks }: LaunchTabOrderProps) {
	const { data: productsResult, filters, updateFilters, isLoading } = usePOSProducts();
	const [cart, setCart] = useState<TCartItem[]>([]);
	const [observacoes, setObservacoes] = useState<string>("");
	// Um id por "intencao de pedido": permanece o mesmo em retries, muda apenas apos sucesso.
	const [tabOrderId] = useState<string>(() => crypto.randomUUID());

	const { mutate, isPending } = useMutation({
		mutationKey: ["create-tab-order", tabOrderId],
		mutationFn: createTabOrder,
		onSuccess: (data) => {
			callbacks?.onSuccess?.();
			toast.success(data.message);
			closeModal();
		},
		onError: (error) => toast.error(getErrorMessage(error)),
	});

	const cartTotal = useMemo(() => cart.reduce((sum, item) => sum + item.valorTotalLiquido, 0), [cart]);

	function addToCart({
		produtoId,
		produtoVarianteId,
		nome,
		codigo,
		imagemUrl,
		precoVenda,
	}: {
		produtoId: string;
		produtoVarianteId: string | null;
		nome: string;
		codigo: string;
		imagemUrl: string | null;
		precoVenda: number;
	}) {
		const cartKey = `${produtoId}:${produtoVarianteId ?? ""}`;
		setCart((prev) => {
			const existing = prev.find((item) => item.cartKey === cartKey);
			if (existing) return prev.map((item) => (item.cartKey === cartKey ? buildCartItem(item, item.quantidade + 1) : item));
			return [
				...prev,
				buildCartItem(
					{
						cartKey,
						produtoId,
						produtoVarianteId,
						nome,
						codigo,
						imagemUrl,
						quantidade: 0,
						valorUnitarioBase: precoVenda,
						valorModificadores: 0,
						valorUnitarioFinal: precoVenda,
						valorTotalBruto: 0,
						valorDesconto: 0,
						valorTotalLiquido: 0,
						modificadores: [],
					},
					1,
				),
			];
		});
	}

	function buildCartItem(item: TCartItem, quantidade: number): TCartItem {
		const valorTotalBruto = item.valorUnitarioFinal * quantidade;
		return { ...item, quantidade, valorTotalBruto, valorTotalLiquido: valorTotalBruto - item.valorDesconto };
	}

	function changeQuantity(cartKey: string, delta: number) {
		setCart((prev) =>
			prev
				.map((item) => (item.cartKey === cartKey ? buildCartItem(item, item.quantidade + delta) : item))
				.filter((item) => item.quantidade > 0),
		);
	}

	return (
		<ResponsiveMenu
			menuTitle="LANÇAR PEDIDO"
			menuDescription="Monte a rodada e envie para a cozinha. O pagamento acontece apenas no fechamento da conta."
			menuActionButtonText={cart.length > 0 ? `ENVIAR PEDIDO · ${formatToMoney(cartTotal)}` : "ENVIAR PEDIDO"}
			menuActionButtonDisabled={cart.length === 0}
			menuCancelButtonText="CANCELAR"
			actionFunction={() =>
				mutate({
					tabId,
					tabOrderId,
					observacoes: observacoes || null,
					itens: cart.map(({ cartKey: _cartKey, ...item }) => item),
				})
			}
			actionIsLoading={isPending}
			stateIsLoading={false}
			stateError={null}
			closeMenu={closeModal}
			dialogVariant="md"
			drawerVariant="lg"
		>
			<div className="flex flex-col gap-3 p-1">
				<div className="relative">
					<Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
					<Input
						value={filters.search ?? ""}
						placeholder="Pesquisar produto..."
						onChange={(event) => updateFilters({ search: event.target.value })}
						className="pl-8 rounded-xl"
					/>
				</div>

				<div className="flex max-h-56 flex-col gap-1 overflow-y-auto">
					{isLoading ? <p className="py-4 text-center text-xs text-muted-foreground">Carregando produtos...</p> : null}
					{(productsResult?.products ?? []).map((product) => {
						const hasVariants = product.variantes.length > 0;
						if (!hasVariants) {
							return (
								<button
									key={product.id}
									type="button"
									className="flex items-center justify-between rounded-lg px-2.5 py-2 text-left hover:bg-secondary/60 transition-colors"
									onClick={() =>
										addToCart({
											produtoId: product.id,
											produtoVarianteId: null,
											nome: product.nome,
											codigo: product.codigo,
											imagemUrl: product.imagemCapaUrl,
											precoVenda: product.precoVenda ?? 0,
										})
									}
								>
									<span className="text-sm font-medium tracking-tight">{product.nome}</span>
									<span className="text-xs font-bold">{formatToMoney(product.precoVenda ?? 0)}</span>
								</button>
							);
						}
						return (
							<div key={product.id} className="flex flex-col rounded-lg px-2.5 py-1.5">
								<span className="text-sm font-medium tracking-tight">{product.nome}</span>
								<div className="flex flex-wrap gap-1.5 pt-1">
									{product.variantes.map((variant) => (
										<button
											key={variant.id}
											type="button"
											className="flex items-center gap-1.5 rounded-md bg-secondary px-2 py-1 text-xs hover:bg-secondary/70 transition-colors"
											onClick={() =>
												addToCart({
													produtoId: product.id,
													produtoVarianteId: variant.id,
													nome: `${product.nome} — ${variant.nome}`,
													codigo: variant.codigo ?? product.codigo,
													imagemUrl: variant.imagemCapaUrl ?? product.imagemCapaUrl,
													precoVenda: variant.precoVenda,
												})
											}
										>
											{variant.nome}
											<span className="font-bold">{formatToMoney(variant.precoVenda)}</span>
										</button>
									))}
								</div>
							</div>
						);
					})}
				</div>

				{cart.length > 0 ? (
					<div className="flex flex-col gap-1.5 rounded-xl border border-border p-2.5">
						{cart.map((item) => (
							<div key={item.cartKey} className="flex items-center justify-between gap-2">
								<span className="text-sm tracking-tight grow">{item.nome}</span>
								<div className="flex items-center gap-1.5">
									<Button variant="outline" size="icon" className="h-6 w-6" onClick={() => changeQuantity(item.cartKey, -1)}>
										<Minus className="w-3 h-3" />
									</Button>
									<span className="w-6 text-center text-sm font-bold">{item.quantidade}</span>
									<Button variant="outline" size="icon" className="h-6 w-6" onClick={() => changeQuantity(item.cartKey, 1)}>
										<Plus className="w-3 h-3" />
									</Button>
								</div>
								<span className="w-20 text-right text-xs font-bold">{formatToMoney(item.valorTotalLiquido)}</span>
							</div>
						))}
					</div>
				) : null}

				<TextInput
					label="OBSERVAÇÕES DO PEDIDO"
					value={observacoes}
					placeholder='Ex: "sem cebola", nome da pessoa da rodada'
					handleChange={setObservacoes}
				/>
			</div>
		</ResponsiveMenu>
	);
}
