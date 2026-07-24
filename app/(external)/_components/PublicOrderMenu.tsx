"use client";

import type { TCreatePublicTabOrderRequestInput, TCreatePublicTabOrderRequestOutput } from "@/app/api/public/tab-order-requests/route";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getErrorMessage } from "@/lib/errors";
import { formatToMoney } from "@/lib/formatting";
import { useMutation } from "@tanstack/react-query";
import axios from "axios";
import { CheckCheck, Minus, Plus, Search, Send } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

export type TPublicMenuProduct = {
	id: string;
	nome: string;
	grupo: string;
	precoVenda: number | null;
	imagemCapaUrl: string | null;
	variantes: { id: string; nome: string; precoVenda: number }[];
};

type TPublicCartItem = {
	cartKey: string;
	produtoId: string;
	produtoVarianteId: string | null;
	nome: string;
	precoUnitario: number;
	quantidade: number;
};

async function submitOrderRequest(input: TCreatePublicTabOrderRequestInput) {
	const { data } = await axios.post<TCreatePublicTabOrderRequestOutput>("/api/public/tab-order-requests", input);
	return data;
}

type PublicOrderMenuProps = {
	token: string;
	contexto: "PONTO" | "TAB";
	products: TPublicMenuProduct[];
};

/**
 * Cardapio publico do QR (v1: produto/variante/quantidade). Os precos exibidos
 * sao informativos — o payload envia apenas referencias + quantidade e a
 * precificacao autoritativa acontece na aprovacao do operador.
 */
export function PublicOrderMenu({ token, contexto, products }: PublicOrderMenuProps) {
	const [search, setSearch] = useState("");
	const [cart, setCart] = useState<TPublicCartItem[]>([]);
	const [observacoes, setObservacoes] = useState("");
	const [submitted, setSubmitted] = useState(false);
	// Uma intencao de pedido = uma chave; retries reutilizam a mesma.
	const [idempotencyKey, setIdempotencyKey] = useState<string>(() => crypto.randomUUID());

	const { mutate, isPending } = useMutation({
		mutationKey: ["public-tab-order-request", idempotencyKey],
		mutationFn: submitOrderRequest,
		onSuccess: (data) => {
			toast.success(data.message);
			setSubmitted(true);
			setCart([]);
			setObservacoes("");
			setIdempotencyKey(crypto.randomUUID());
		},
		onError: (error) => toast.error(getErrorMessage(error)),
	});

	const filteredProducts = useMemo(() => {
		const term = search.trim().toLowerCase();
		const base = term ? products.filter((product) => product.nome.toLowerCase().includes(term)) : products;
		return [...base].sort((a, b) => a.grupo.localeCompare(b.grupo, "pt-BR") || a.nome.localeCompare(b.nome, "pt-BR"));
	}, [products, search]);

	const cartTotal = cart.reduce((sum, item) => sum + item.precoUnitario * item.quantidade, 0);

	function changeQuantity(entry: Omit<TPublicCartItem, "quantidade">, delta: number) {
		setCart((prev) => {
			const existing = prev.find((item) => item.cartKey === entry.cartKey);
			if (!existing && delta > 0) return [...prev, { ...entry, quantidade: delta }];
			if (!existing) return prev;
			const quantidade = existing.quantidade + delta;
			if (quantidade <= 0) return prev.filter((item) => item.cartKey !== entry.cartKey);
			return prev.map((item) => (item.cartKey === entry.cartKey ? { ...item, quantidade } : item));
		});
	}

	function getQuantity(cartKey: string) {
		return cart.find((item) => item.cartKey === cartKey)?.quantidade ?? 0;
	}

	if (submitted) {
		return (
			<div className="flex flex-col items-center gap-3 rounded-2xl border border-border bg-card px-4 py-8 text-center">
				<CheckCheck className="h-8 w-8 text-green-600" />
				<p className="text-sm font-bold">Pedido enviado!</p>
				<p className="text-xs text-muted-foreground">Sua solicitação foi enviada para aprovação do atendente.</p>
				<Button size="sm" variant="secondary" onClick={() => setSubmitted(false)}>
					FAZER OUTRO PEDIDO
				</Button>
			</div>
		);
	}

	let lastGroup: string | null = null;

	return (
		<div className="flex flex-col gap-3">
			<div className="relative">
				<Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
				<Input value={search} placeholder="Pesquisar no cardápio..." onChange={(event) => setSearch(event.target.value)} className="pl-8 rounded-xl" />
			</div>

			<div className="flex flex-col gap-1 pb-28">
				{filteredProducts.map((product) => {
					const groupHeader =
						product.grupo !== lastGroup ? (
							<p key={`group-${product.grupo}`} className="pt-3 pb-1 text-xs font-bold uppercase tracking-wide text-muted-foreground">
								{product.grupo || "Outros"}
							</p>
						) : null;
					lastGroup = product.grupo;

					const entries =
						product.variantes.length > 0
							? product.variantes.map((variant) => ({
									cartKey: `${product.id}:${variant.id}`,
									produtoId: product.id,
									produtoVarianteId: variant.id,
									nome: `${product.nome} — ${variant.nome}`,
									precoUnitario: variant.precoVenda,
								}))
							: [
									{
										cartKey: `${product.id}:`,
										produtoId: product.id,
										produtoVarianteId: null,
										nome: product.nome,
										precoUnitario: product.precoVenda ?? 0,
									},
								];

					return (
						<div key={product.id}>
							{groupHeader}
							{entries.map((entry) => {
								const quantity = getQuantity(entry.cartKey);
								return (
									<div key={entry.cartKey} className="flex items-center justify-between gap-2 rounded-xl border border-border bg-card px-3 py-2.5 mb-1.5">
										<div className="flex flex-col">
											<span className="text-sm font-medium tracking-tight">{entry.nome}</span>
											<span className="text-xs font-bold text-muted-foreground">{formatToMoney(entry.precoUnitario)}</span>
										</div>
										<div className="flex items-center gap-1.5">
											{quantity > 0 ? (
												<>
													<Button variant="outline" size="icon" className="h-7 w-7" onClick={() => changeQuantity(entry, -1)}>
														<Minus className="h-3 w-3" />
													</Button>
													<span className="w-6 text-center text-sm font-bold">{quantity}</span>
												</>
											) : null}
											<Button variant="outline" size="icon" className="h-7 w-7" onClick={() => changeQuantity(entry, 1)}>
												<Plus className="h-3 w-3" />
											</Button>
										</div>
									</div>
								);
							})}
						</div>
					);
				})}
				{filteredProducts.length === 0 ? <p className="py-6 text-center text-xs text-muted-foreground">Nenhum item encontrado.</p> : null}
			</div>

			{cart.length > 0 ? (
				<div className="fixed inset-x-0 bottom-0 border-t border-border bg-background/95 p-3 backdrop-blur">
					<div className="mx-auto flex w-full max-w-xl flex-col gap-2">
						<Input
							value={observacoes}
							placeholder="Observações (ex: sem cebola)"
							onChange={(event) => setObservacoes(event.target.value)}
							className="rounded-xl"
						/>
						<Button
							className="w-full"
							disabled={isPending}
							onClick={() =>
								mutate({
									token,
									contexto,
									idempotencyKey,
									observacoes: observacoes || null,
									itens: cart.map((item) => ({
										produtoId: item.produtoId,
										produtoVarianteId: item.produtoVarianteId,
										nome: item.nome,
										quantidade: item.quantidade,
									})),
								})
							}
						>
							<Send className="mr-1.5 h-4 w-4" />
							ENVIAR PEDIDO · {formatToMoney(cartTotal)}
						</Button>
					</div>
				</div>
			) : null}
		</div>
	);
}
