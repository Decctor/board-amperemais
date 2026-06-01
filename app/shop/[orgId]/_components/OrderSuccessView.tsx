"use client";

import { Button } from "@/components/ui/button";
import { CheckCircle2, CreditCard, Package, Truck } from "lucide-react";
import Image from "next/image";
import { useShop } from "./ShopProvider";

export default function OrderSuccessView() {
	const { catalog, orderState } = useShop();
	const { lastOrder, delivery } = orderState.state;
	const { organization, shopSettings } = catalog;

	const handleNewOrder = () => {
		orderState.resetState();
	};

	const handleBackToCatalog = () => {
		orderState.resetCheckout();
	};

	return (
		<div
			className="min-h-screen bg-background flex flex-col"
			style={
				{
					"--shop-primary": organization.corPrimaria || "hsl(var(--primary))",
					"--shop-primary-foreground": organization.corPrimariaForeground || "hsl(var(--primary-foreground))",
				} as React.CSSProperties
			}
		>
			<div className="flex-1 flex flex-col items-center justify-center px-4 py-12">
				<div className="w-full max-w-sm flex flex-col items-center text-center">
					<div className="relative mb-6">
						<div className="w-24 h-24 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center">
							<CheckCircle2 className="w-12 h-12 text-green-600 dark:text-green-400" />
						</div>
						{organization.logoUrl && (
							<div className="absolute -bottom-2 -right-2 w-12 h-12 rounded-full overflow-hidden border-4 border-background bg-background">
								<Image
									src={organization.logoUrl}
									alt={organization.nome}
									fill
									className="object-cover"
								/>
							</div>
						)}
					</div>

					<h1 className="text-2xl font-black mb-2">Pedido enviado!</h1>
					<p className="text-muted-foreground mb-6">
						Seu pedido foi recebido e está aguardando confirmação da loja.
					</p>

					{lastOrder && (
						<div className="w-full p-4 rounded-xl bg-primary/5 border border-primary/20 mb-6">
							<p className="text-sm text-muted-foreground">Número do pedido</p>
							<p className="text-xl font-black text-primary">{lastOrder.orderNumber}</p>
						</div>
					)}

					<div className="w-full flex flex-col gap-3 mb-8">
						<div className="flex items-center gap-3 p-3 rounded-xl bg-muted/50 border">
							{delivery.modalidade === "RETIRADA" ? (
								<Package className="w-5 h-5 text-muted-foreground" />
							) : (
								<Truck className="w-5 h-5 text-muted-foreground" />
							)}
							<div className="flex-1 text-left">
								<p className="font-semibold text-sm">
									{delivery.modalidade === "RETIRADA" ? "Retirada no local" : "Entrega"}
								</p>
								<p className="text-xs text-muted-foreground">
									{delivery.modalidade === "RETIRADA"
										? "Aguarde a confirmação para retirar seu pedido."
										: "Seu pedido será entregue no endereço informado."}
								</p>
							</div>
						</div>

						<div className="flex items-center gap-3 p-3 rounded-xl bg-muted/50 border">
							<CreditCard className="w-5 h-5 text-muted-foreground" />
							<div className="flex-1 text-left">
								<p className="font-semibold text-sm">Pagamento no local</p>
								<p className="text-xs text-muted-foreground">
									Realize o pagamento no momento da{" "}
									{delivery.modalidade === "RETIRADA" ? "retirada" : "entrega"}.
								</p>
							</div>
						</div>
					</div>

					<div className="w-full flex flex-col gap-3">
						<Button className="w-full h-12 rounded-xl font-bold" onClick={handleNewOrder}>
							Fazer novo pedido
						</Button>
						<Button
							variant="outline"
							className="w-full h-12 rounded-xl font-bold"
							onClick={handleBackToCatalog}
						>
							Voltar ao {shopSettings.modo === "CARDAPIO" ? "cardápio" : "catálogo"}
						</Button>
					</div>
				</div>
			</div>
		</div>
	);
}
