import ClientVinculationMenu from "@/components/Clients/ClientVinculationMenu";
import SelectInput from "@/components/Inputs/SelectInput";
import { NewClientLocation } from "@/components/Modals/Clients/Locations/NewClientLocation";
import type { TDiscountAuthority } from "@/lib/permissions/discounts";
import { useClientLocations } from "@/lib/queries/clients/locations";
import type { ClassifiedPayment } from "@/lib/sales/utils";
import { useSellersSimplified } from "@/lib/queries/sellers";
import type { TCashbackProgramEntity } from "@/services/drizzle/schema";
import type { TUseSaleState } from "@/state-hooks/use-sale-state";
import { PencilLine, ShoppingCart } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import ActionsSection from "./checkout/ActionsSection";
import ClientSection from "./checkout/ClientSection";
import DeliverySection from "./checkout/DeliverySection";
import FiscalEmissionSection from "./checkout/FiscalEmissionSection";
import ItemsSection from "./checkout/ItemsSection";
import PaymentsSection from "./checkout/PaymentsSection";
import SummarySection from "./checkout/SummarySection";

// Modo edição de venda confirmada: mesma superfície do checkout, com o que é imutável travado
// (cliente, cupom, resgate de cashback, pagamentos recebidos) e o CTA trocado para salvar.
export type CheckoutPanelEditContext = {
	idExterno: string;
	pagamentosEfetivados: Pick<ClassifiedPayment, "id" | "metodo" | "valor" | "parcela" | "totalParcelas">[];
};

type CheckoutPanelProps = {
	organizationCashbackProgram: TCashbackProgramEntity | null;
	saleState: TUseSaleState;
	organizationAutoFiscalEmission: boolean;
	organizationAutoFiscalCapable: boolean;
	canEmitFiscal: boolean;
	discountAuthority?: TDiscountAuthority | null;
	onCreateDraft: () => void;
	onFinalizeSale: () => void;
	isCreatingDraft?: boolean;
	isFinalizingSale?: boolean;
	onOpenContext?: () => void;
	edit?: CheckoutPanelEditContext | null;
};

export default function CheckoutPanel({
	organizationCashbackProgram,
	saleState,
	organizationAutoFiscalEmission,
	organizationAutoFiscalCapable,
	canEmitFiscal,
	discountAuthority,
	onCreateDraft,
	onFinalizeSale,
	isCreatingDraft,
	isFinalizingSale,
	onOpenContext,
	edit,
}: CheckoutPanelProps) {
	const [isVinculationMenuOpen, setIsVinculationMenuOpen] = useState(false);
	const [isNewLocationOpen, setIsNewLocationOpen] = useState(false);
	const { data: sellers } = useSellersSimplified();
	const { data: clientLocations = [], refetch: refetchClientLocations } = useClientLocations({ clienteId: saleState.state.cliente?.id ?? null });

	const sellerOptions = useMemo(
		() =>
			sellers?.map((seller) => ({
				id: seller.id,
				value: seller.id,
				label: seller.nome,
			})) ?? [],
		[sellers],
	);

	const locationOptions = useMemo(
		() =>
			clientLocations.map((location) => ({
				id: location.id,
				value: location.id,
				label: `${location.titulo} - ${[location.localizacaoCidade, location.localizacaoEstado].filter(Boolean).join("/") || "Sem cidade/UF"}`,
			})),
		[clientLocations],
	);

	useEffect(() => {
		if (saleState.state.entregaModalidade !== "ENTREGA") return;
		const firstLocationId = clientLocations[0]?.id ?? null;
		saleState.ensureEntregaLocation(firstLocationId);
	}, [clientLocations, saleState.state.entregaModalidade, saleState.ensureEntregaLocation]);

	return (
		<>
			<div className="flex flex-col h-full gap-3">
				<div className="flex items-center gap-2">
					<div className="p-2 bg-primary/10 rounded-lg">
						{edit ? <PencilLine className="w-5 h-5 text-foreground" /> : <ShoppingCart className="w-5 h-5 text-foreground" />}
					</div>
					<div>
						<h2 className="font-black text-lg">{edit ? `EDITANDO PEDIDO #${edit.idExterno}` : "CHECKOUT"}</h2>
						<p className="text-xs text-muted-foreground">
							{saleState.itemCount} {saleState.itemCount === 1 ? "ITEM" : "ITENS"}
						</p>
					</div>
				</div>

				<SelectInput
					label="VENDEDOR"
					value={saleState.state.vendedorId}
					options={sellerOptions}
					handleChange={(value) => {
						const seller = sellers?.find((item) => item.id === value);
						saleState.setVendedor(value, seller?.nome ?? null);
					}}
					onReset={() => saleState.setVendedor(null, null)}
					resetOptionLabel="SELECIONE UM VENDEDOR"
				/>

				<ClientSection saleState={saleState} onOpenVinculationMenu={() => setIsVinculationMenuOpen(true)} onOpenContext={onOpenContext} locked={!!edit} />
				<ItemsSection saleState={saleState} />
				<DeliverySection saleState={saleState} locationOptions={locationOptions} onOpenNewLocation={() => setIsNewLocationOpen(true)} />
				<PaymentsSection saleState={saleState} pagamentosEfetivados={edit?.pagamentosEfetivados} />
				<SummarySection
					saleState={saleState}
					organizationCashbackProgram={organizationCashbackProgram}
					discountAuthority={discountAuthority}
					editMode={!!edit}
				/>
				<FiscalEmissionSection
					saleState={saleState}
					organizationAutoFiscalEmission={organizationAutoFiscalEmission}
					organizationAutoFiscalCapable={organizationAutoFiscalCapable}
					canEmitFiscal={canEmitFiscal}
				/>
				<ActionsSection
					saleState={saleState}
					onCreateDraft={onCreateDraft}
					onFinalizeSale={onFinalizeSale}
					isCreatingDraft={isCreatingDraft}
					isFinalizingSale={isFinalizingSale}
					editMode={!!edit}
				/>
			</div>

			{isVinculationMenuOpen ? (
				<ClientVinculationMenu
					closeModal={() => setIsVinculationMenuOpen(false)}
					onSelectClient={(client) => {
						saleState.setModoCliente("VINCULADO");
						saleState.setCliente(client);
						setIsVinculationMenuOpen(false);
					}}
				/>
			) : null}

			{isNewLocationOpen && saleState.state.cliente ? (
				<NewClientLocation
					clienteId={saleState.state.cliente.id}
					closeModal={() => setIsNewLocationOpen(false)}
					callbacks={{
						onSuccess: async () => {
							const response = await refetchClientLocations();
							const firstLocationId = response.data?.[0]?.id ?? null;
							saleState.ensureEntregaLocation(firstLocationId);
						},
					}}
				/>
			) : null}
		</>
	);
}
