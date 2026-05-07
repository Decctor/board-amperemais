"use client";

import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { formatToMoney, formatToPhone } from "@/lib/formatting";
import { CreditCard, MapPin, Package, Truck, User } from "lucide-react";
import { useMemo } from "react";
import { useShop } from "../ShopProvider";

type OrderReviewStepProps = {
	onSubmit: () => void;
	isSubmitting: boolean;
};

export default function OrderReviewStep({ onSubmit, isSubmitting }: OrderReviewStepProps) {
	const { catalog, orderState } = useShop();
	const { customer, delivery, cashback, cart } = orderState.state;

	const cartItemsWithDetails = useMemo(() => {
		return cart.items
			.map((item) => {
				const product = catalog.products.find((p) => p.id === item.produtoId);
				if (!product) return null;

				const variant = item.produtoVarianteId
					? product.variantes.find((v) => v.id === item.produtoVarianteId)
					: null;

				let unitPrice = variant?.precoVenda ?? product.precoVenda ?? 0;

				const allReferences = [...product.addOnsReferencias, ...(variant?.addOnsReferencias ?? [])];
				const modifiersDetails = item.modificadores
					.map((mod) => {
						for (const ref of allReferences) {
							const option = ref.grupo.opcoes.find((o) => o.id === mod.opcaoId);
							if (option) {
								return {
									nome: option.nome,
									quantidade: mod.quantidade,
									precoDelta: option.precoDelta,
								};
							}
						}
						return null;
					})
					.filter(Boolean);

				const modifiersPrice = modifiersDetails.reduce(
					(sum, mod) => sum + (mod?.precoDelta ?? 0) * (mod?.quantidade ?? 1),
					0
				);

				const lineTotal = (unitPrice + modifiersPrice) * item.quantidade;

				return {
					...item,
					displayName: variant ? `${product.descricao} - ${variant.nome}` : product.descricao,
					modifiersDetails,
					lineTotal,
				};
			})
			.filter(Boolean);
	}, [cart.items, catalog.products]);

	const subtotal = cartItemsWithDetails.reduce((sum, item) => sum + (item?.lineTotal ?? 0), 0);
	const discount = cashback.resgateSolicitado;
	const total = subtotal - discount;

	const addressParts = delivery.endereco
		? [
				delivery.endereco.localizacaoLogradouro,
				delivery.endereco.localizacaoNumero,
				delivery.endereco.localizacaoComplemento,
				delivery.endereco.localizacaoBairro,
				delivery.endereco.localizacaoCidade,
				delivery.endereco.localizacaoEstado,
			].filter(Boolean)
		: [];

	return (
		<div className="flex flex-col gap-4">
			<div className="flex items-start gap-3 p-3 rounded-xl bg-muted/50 border">
				<User className="w-5 h-5 text-muted-foreground flex-shrink-0 mt-0.5" />
				<div className="flex-1 min-w-0">
					<p className="font-semibold text-sm">{customer.nome || "Cliente"}</p>
					<p className="text-sm text-muted-foreground">{formatToPhone(customer.telefone)}</p>
				</div>
			</div>

			<div className="flex items-start gap-3 p-3 rounded-xl bg-muted/50 border">
				{delivery.modalidade === "RETIRADA" ? (
					<Package className="w-5 h-5 text-muted-foreground flex-shrink-0 mt-0.5" />
				) : (
					<Truck className="w-5 h-5 text-muted-foreground flex-shrink-0 mt-0.5" />
				)}
				<div className="flex-1 min-w-0">
					<p className="font-semibold text-sm">
						{delivery.modalidade === "RETIRADA" ? "Retirada no local" : "Entrega"}
					</p>
					{delivery.modalidade === "ENTREGA" && addressParts.length > 0 && (
						<p className="text-sm text-muted-foreground">{addressParts.join(", ")}</p>
					)}
				</div>
			</div>

			<div className="flex items-start gap-3 p-3 rounded-xl bg-muted/50 border">
				<CreditCard className="w-5 h-5 text-muted-foreground flex-shrink-0 mt-0.5" />
				<div className="flex-1 min-w-0">
					<p className="font-semibold text-sm">Pagamento no local</p>
					<p className="text-sm text-muted-foreground">O pagamento sera feito na retirada ou entrega.</p>
				</div>
			</div>

			<Separator className="my-2" />

			<div className="flex flex-col gap-2">
				<h3 className="font-black text-sm uppercase tracking-wide">Itens do pedido</h3>

				{cartItemsWithDetails.map((item, index) => {
					if (!item) return null;
					return (
						<div key={item.tempId || index} className="flex justify-between items-start py-2">
							<div className="flex-1 min-w-0">
								<p className="font-medium text-sm">
									{item.quantidade}x {item.displayName}
								</p>
								{item.modifiersDetails.length > 0 && (
									<p className="text-xs text-muted-foreground">
										{item.modifiersDetails
											.map((m) => ((m?.quantidade ?? 1) > 1 ? `${m?.quantidade}x ${m?.nome}` : m?.nome))
											.join(", ")}
									</p>
								)}
							</div>
							<span className="font-semibold text-sm ml-2">{formatToMoney(item.lineTotal)}</span>
						</div>
					);
				})}
			</div>

			<Separator className="my-2" />

			<div className="flex flex-col gap-2">
				<div className="flex justify-between items-center">
					<span className="text-sm text-muted-foreground">Subtotal</span>
					<span className="font-semibold">{formatToMoney(subtotal)}</span>
				</div>

				{discount > 0 && (
					<div className="flex justify-between items-center text-green-600">
						<span className="text-sm">Desconto ({catalog.cashbackProgram?.terminologia || "cashback"})</span>
						<span className="font-semibold">-{formatToMoney(discount)}</span>
					</div>
				)}

				<div className="flex justify-between items-center pt-2 border-t">
					<span className="font-bold">Total</span>
					<span className="text-xl font-black text-primary">{formatToMoney(total)}</span>
				</div>
			</div>

			<Button
				className="w-full h-12 rounded-xl font-bold mt-4"
				onClick={onSubmit}
				disabled={isSubmitting}
			>
				Enviar pedido
			</Button>
		</div>
	);
}
