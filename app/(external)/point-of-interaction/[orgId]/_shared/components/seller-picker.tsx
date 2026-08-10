"use client";

import { usePoiSellers } from "@/lib/queries/sellers";
import { cn } from "@/lib/utils";
import { Check, HelpCircle } from "lucide-react";
import Image from "next/image";

type SellerPickerProps = {
	orgId: string;
	/** Vendedor escolhido; `null` = nenhuma escolha feita ainda (ou "NÃO SEI"). */
	selectedSellerId: string | null;
	/** Distingue "tocou em NÃO SEI" de "nem interagiu com o campo" — ambos mandam `null` no payload. */
	isSkipped: boolean;
	onSelectSeller: (sellerId: string | null) => void;
	onSkip: () => void;
	className?: string;
};

/**
 * "Quem te atendeu?": seleção opcional de vendedor no autocadastro do ponto de interação.
 *
 * Vive aqui, e não dentro de uma das telas, porque as duas superfícies de cadastro (o formulário
 * rápido do hub e o assistente do fluxo COMPLETO) precisam oferecer exatamente a mesma coisa —
 * duas cópias divergiriam no primeiro ajuste.
 *
 * Não renderiza nada quando a organização não tem vendedores ativos: um campo vazio só adicionaria
 * um passo morto entre o cliente e o cadastro.
 */
export function SellerPicker({ orgId, selectedSellerId, isSkipped, onSelectSeller, onSkip, className }: SellerPickerProps) {
	const { data: poiSellers, isLoading: isLoadingPoiSellers } = usePoiSellers({ orgId });

	if (isLoadingPoiSellers) {
		return (
			<div className={cn("flex flex-col gap-1.5", className)}>
				<span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">QUEM TE ATENDEU? (OPCIONAL)</span>
				<div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
					{[0, 1, 2, 3].map((placeholder) => (
						<div
							key={placeholder}
							className="flex flex-col items-center gap-1.5 rounded-xl border-2 border-border p-2.5 short:p-2 animate-pulse motion-reduce:animate-none"
						>
							<div className="w-12 h-12 short:w-10 short:h-10 rounded-full bg-muted" />
							<div className="h-2.5 w-12 rounded bg-muted" />
						</div>
					))}
				</div>
			</div>
		);
	}

	if (!poiSellers || poiSellers.length === 0) return null;

	return (
		<div className={cn("flex flex-col gap-1.5", className)}>
			<span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">QUEM TE ATENDEU? (OPCIONAL)</span>
			{/* Teto de altura: orgs com muitos vendedores rolam aqui dentro, o AVANÇAR nunca sai da dobra. */}
			<div className="max-h-[15.5rem] short:max-h-44 overflow-y-auto overscroll-contain pr-1">
				<div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
					{poiSellers.map((seller, sellerIndex) => {
						const isSelected = selectedSellerId === seller.id;
						return (
							<button
								key={seller.id}
								type="button"
								aria-pressed={isSelected}
								onClick={() => onSelectSeller(selectedSellerId === seller.id ? null : seller.id)}
								style={{ animationDelay: `${Math.min(sellerIndex * 30, 240)}ms`, animationFillMode: "backwards" }}
								className={cn(
									"relative flex flex-col items-center gap-1.5 rounded-xl border-2 p-2.5 short:p-2 transition-all active:scale-95 motion-reduce:active:scale-100",
									"animate-in fade-in slide-in-from-bottom-2 motion-reduce:animate-none",
									"focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2",
									isSelected ? "border-brand bg-brand/10 shadow-md" : "border-border bg-background hover:border-brand/50",
								)}
							>
								{isSelected ? (
									<span className="absolute -top-1.5 -right-1.5 flex items-center justify-center w-5 h-5 rounded-full bg-brand text-brand-foreground shadow-sm">
										<Check className="w-3 h-3" strokeWidth={3} />
									</span>
								) : null}
								<div className="relative w-12 h-12 short:w-10 short:h-10 rounded-full overflow-hidden bg-brand/10 flex items-center justify-center">
									{seller.avatarUrl ? (
										<Image src={seller.avatarUrl} alt={seller.nome} fill sizes="48px" className="object-cover" />
									) : (
										<span className="text-base font-black text-foreground/80">
											{seller.nome
												.split(" ")
												.slice(0, 2)
												.map((part) => part.charAt(0).toUpperCase())
												.join("")}
										</span>
									)}
								</div>
								<span className="w-full text-[0.65rem] font-bold uppercase leading-tight text-center truncate text-foreground">
									{seller.nome.split(" ")[0]}
								</span>
							</button>
						);
					})}
					<button
						type="button"
						aria-pressed={isSkipped}
						onClick={onSkip}
						style={{ animationDelay: `${Math.min(poiSellers.length * 30, 240)}ms`, animationFillMode: "backwards" }}
						className={cn(
							"relative flex flex-col items-center gap-1.5 rounded-xl border-2 border-dashed p-2.5 short:p-2 transition-all active:scale-95 motion-reduce:active:scale-100",
							"animate-in fade-in slide-in-from-bottom-2 motion-reduce:animate-none",
							"focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2",
							isSkipped ? "border-brand bg-brand/10 shadow-md" : "border-border bg-background hover:border-brand/50",
						)}
					>
						{isSkipped ? (
							<span className="absolute -top-1.5 -right-1.5 flex items-center justify-center w-5 h-5 rounded-full bg-brand text-brand-foreground shadow-sm">
								<Check className="w-3 h-3" strokeWidth={3} />
							</span>
						) : null}
						<div className="relative w-12 h-12 short:w-10 short:h-10 rounded-full bg-muted flex items-center justify-center">
							<HelpCircle className="w-6 h-6 text-muted-foreground" />
						</div>
						<span className="w-full text-[0.65rem] font-bold uppercase leading-tight text-center truncate text-muted-foreground">NÃO SEI</span>
					</button>
				</div>
			</div>
		</div>
	);
}
