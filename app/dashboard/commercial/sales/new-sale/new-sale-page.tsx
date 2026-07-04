"use client";

import { Button } from "@/components/ui/button";
import { Drawer, DrawerContent, DrawerDescription, DrawerHeader, DrawerTitle, DrawerTrigger } from "@/components/ui/drawer";
import CashSessionBar from "@/components/CashSessions/CashSessionBar";
import CashSessionGate from "@/components/CashSessions/CashSessionGate";
import { getErrorMessage } from "@/lib/errors";
import { useIsMobile } from "@/lib/hooks/use-mobile";
import { createAndConfirmSale, createSaleDraft, updateSaleDraft } from "@/lib/mutations/pos";
import { usePOSGroups, usePOSProducts } from "@/lib/queries/pos";
import { useActiveSalesSession } from "@/lib/queries/sales-sessions";
import type { TGetPOSProductsOutput } from "@/app/api/pos/products/route";
import type { TOrganizationConfiguration } from "@/schemas/organizations";
import type { TCashbackProgramEntity } from "@/services/drizzle/schema";
import { type TUseSaleState, getDefaultSaleState, useSaleState } from "@/state-hooks/use-sale-state";
import { useMutation } from "@tanstack/react-query";
import { Check, ShoppingCart } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import CheckoutPanel from "./components/CheckoutPanel";
import ProductBuilderModal from "./components/ProductBuilderModal";
import CategoriesBar from "./components/composition/CategoriesBar";
import PaginationBlock from "./components/composition/PaginationBlock";
import ProductsGridBlock from "./components/composition/ProductsGridBlock";
import SearchBlock from "./components/composition/SearchBlock";
import ViewModeToggle, { type ProductViewMode } from "./components/composition/ViewModeToggle";
import ClientContextPanel from "./components/context/ClientContextPanel";
import ClientContextSheet from "./components/context/ClientContextSheet";

function mapItemsToApi(saleState: TUseSaleState) {
	return saleState.state.itens.map((item) => ({
		produtoId: item.produtoId,
		produtoVarianteId: item.produtoVarianteId,
		nome: item.nome,
		codigo: item.codigo,
		imagemUrl: item.imagemUrl,
		quantidade: item.quantidade,
		valorUnitarioBase: item.valorUnitarioBase,
		valorModificadores: item.valorModificadores,
		valorUnitarioFinal: item.valorUnitarioFinal,
		valorTotalBruto: item.valorTotalBruto,
		valorDesconto: item.valorDesconto,
		valorTotalLiquido: item.valorTotalLiquido,
		modificadores: item.modificadores,
	}));
}

type NewSalePageProps = {
	organizationCashbackProgram: TCashbackProgramEntity | null;
	organizationConfiguration: TOrganizationConfiguration;
	organizationFiscalEmissaoAutomatica: boolean;
	organizationAutoFiscalCapable: boolean;
	canEmitirFiscal: boolean;
};
export default function NewSalePage({
	organizationCashbackProgram,
	organizationConfiguration,
	organizationFiscalEmissaoAutomatica,
	organizationAutoFiscalCapable,
	canEmitirFiscal,
}: NewSalePageProps) {
	const isMobile = useIsMobile();
	const [selectedGroup, setSelectedGroup] = useState<string | null>(null);
	const [searchValue, setSearchValue] = useState("");
	const [viewMode, setViewMode] = useState<ProductViewMode>("grid");
	const [builderProduct, setBuilderProduct] = useState<TGetPOSProductsOutput["data"]["products"][number] | null>(null);
	const [isCheckoutDrawerOpen, setIsCheckoutDrawerOpen] = useState(false);
	const [isContextPanelOpen, setIsContextPanelOpen] = useState(false);
	const [isContextSheetOpen, setIsContextSheetOpen] = useState(false);
	const saleState = useSaleState({ organizationConfig: organizationConfiguration });

	// Sessões de venda (caixa): resolve a sessão aberta do vendedor selecionado (escopo OPERADOR).
	const sessoesConfig = organizationConfiguration.preferencias.sessoesVenda;
	const cashEnabled = !!sessoesConfig?.habilitado;
	const cashObrigatorio = !!sessoesConfig?.obrigatorio;
	const { session: activeSession, isLoading: cashLoading } = useActiveSalesSession({
		vendedorId: saleState.state.vendedorId,
		enabled: cashEnabled,
	});

	const linkedClient = saleState.state.cliente;
	const linkedClientId = linkedClient?.id ?? null;

	// Unique product ids in the basket — drives cross-sell, stable against quantity changes.
	const basketProductIds = useMemo(() => [...new Set(saleState.state.itens.map((item) => item.produtoId))], [saleState.state.itens]);

	// Auto-open the context panel when a client is freshly linked; collapse when unlinked.
	const previousClientIdRef = useRef<string | null>(null);
	useEffect(() => {
		const previousClientId = previousClientIdRef.current;
		if (linkedClientId && linkedClientId !== previousClientId) {
			setIsContextPanelOpen(true);
		}
		if (!linkedClientId) {
			setIsContextPanelOpen(false);
			setIsContextSheetOpen(false);
		}
		previousClientIdRef.current = linkedClientId;
	}, [linkedClientId]);

	const { mutate: createDraft, isPending: isCreatingDraft } = useMutation({
		mutationKey: ["create-sale-draft"],
		mutationFn: createSaleDraft,
		onSuccess: async (data) => {
			try {
				await updateSaleDraft({
					id: data.data.saleId,
					vendedorId: saleState.state.vendedorId,
					vendedorNome: saleState.state.vendedorNome,
					entregaModalidade: saleState.state.entregaModalidade,
					entregaLocalizacaoId: saleState.state.entregaLocalizacaoId,
					comandaNumero: saleState.state.comandaNumero,
					observacoes: saleState.state.observacoes || null,
					descontosTotal: saleState.state.descontoGeral,
					acrescimosTotal: saleState.state.acrescimoGeral,
					cashbackResgate: saleState.state.cashbackResgate,
					cupomResgate: saleState.state.cupomResgate,
					rascunhoMetadados: saleState.getDraftMetadata(),
					emissaoFiscalAutomatica: saleState.state.emissaoFiscalAutomatica,
				});
				saleState.setSuccess({
					mode: "ORCAMENTO",
					title: "Orçamento criado com sucesso",
					description: "Você pode iniciar uma nova venda agora.",
				});
			} catch (error) {
				toast.error(getErrorMessage(error));
			}
		},
		onError: (error) => {
			toast.error(getErrorMessage(error));
		},
	});

	const { mutate: finalizeSale, isPending: isFinalizingSale } = useMutation({
		mutationKey: ["create-and-confirm-sale"],
		mutationFn: createAndConfirmSale,
		onSuccess: (data) => {
			if (data.data.confirmation.fiscal.status === "ERRO") {
				toast.warning(`Venda finalizada, mas a emissao fiscal falhou: ${data.data.confirmation.fiscal.error}`);
			}
			saleState.setSuccess({
				mode: "FINALIZADA",
				title: "Venda finalizada com sucesso",
				description: "Pagamento confirmado e venda concluída.",
			});
		},
		onError: (error) => {
			toast.error(getErrorMessage(error));
		},
	});

	const { data: groupsData, isLoading: groupsLoading } = usePOSGroups();
	const {
		data: productsData,
		isLoading: productsLoading,
		isError: productsError,
		error: productsErrorData,
		filters,
		updateFilters,
	} = usePOSProducts({
		initialFilters: { page: 1, search: searchValue, group: selectedGroup },
	});

	const handleGroupSelect = (group: string | null) => {
		setSelectedGroup(group);
		updateFilters({ group, page: 1 });
	};

	const handleSearchChange = (value: string) => {
		setSearchValue(value);
		updateFilters({ search: value, page: 1 });
	};

	// Estável (só depende de addItem, que é estável) para não invalidar o memo da grade de produtos a cada edição do carrinho.
	const addItem = saleState.addItem;
	const handleProductClick = useCallback(
		(product: TGetPOSProductsOutput["data"]["products"][number]) => {
			const hasVariants = product.variantes.length > 0;
			const hasAddOns = product.addOnsReferencias.length > 0;
			const isComplex = hasVariants || hasAddOns;
			if (isComplex) {
				setBuilderProduct(product);
				return;
			}

			addItem({
				tempId: crypto.randomUUID(),
				produtoId: product.id,
				produtoVarianteId: null,
				nome: product.nome,
				codigo: product.codigo,
				imagemUrl: product.imagemCapaUrl,
				quantidade: 1,
				valorUnitarioBase: product.precoVenda ?? 0,
				valorModificadores: 0,
				valorUnitarioFinal: product.precoVenda ?? 0,
				valorTotalBruto: product.precoVenda ?? 0,
				valorDesconto: 0,
				valorTotalLiquido: product.precoVenda ?? 0,
				modificadores: [],
			});
			toast.success(`${product.nome} adicionado ao carrinho.`);
		},
		[addItem],
	);

	const handleCreateDraft = () => {
		if (!saleState.isReadyForDraft) {
			toast.error("Preencha o carrinho para criar o orçamento.");
			return;
		}

		createDraft({
			clienteId: saleState.state.cliente?.id ?? null,
			vendedorId: saleState.state.vendedorId,
			vendedorNome: saleState.state.vendedorNome,
			entregaModalidade: saleState.state.entregaModalidade,
			entregaLocalizacaoId: saleState.state.entregaLocalizacaoId,
			comandaNumero: saleState.state.comandaNumero,
			observacoes: saleState.state.observacoes || null,
			descontosTotal: saleState.state.descontoGeral,
			acrescimosTotal: saleState.state.acrescimoGeral,
			cashbackResgate: saleState.state.cashbackResgate,
			cupomResgate: saleState.state.cupomResgate,
			rascunhoMetadados: saleState.getDraftMetadata(),
			emissaoFiscalAutomatica: saleState.state.emissaoFiscalAutomatica,
			itens: mapItemsToApi(saleState),
		});
	};

	const handleFinalizeSale = () => {
		if (!saleState.isReadyForFinalize) {
			toast.error("Complete entrega e pagamento para finalizar a venda.");
			return;
		}

		finalizeSale({
			clienteId: saleState.state.cliente?.id ?? null,
			vendedorId: saleState.state.vendedorId,
			vendedorNome: saleState.state.vendedorNome,
			entregaModalidade: saleState.state.entregaModalidade,
			entregaLocalizacaoId: saleState.state.entregaLocalizacaoId,
			comandaNumero: saleState.state.comandaNumero,
			observacoes: saleState.state.observacoes || null,
			descontosTotal: saleState.state.descontoGeral,
			acrescimosTotal: saleState.state.acrescimoGeral,
			rascunhoMetadados: saleState.getDraftMetadata(),
			sessaoVendaId: activeSession?.id ?? null,
			pagamentos: saleState.state.pagamentos.map((payment) => ({
				metodo: payment.metodo,
				valor: payment.valor,
				totalParcelas: payment.totalParcelas,
				efetivacaoTipo: payment.efetivacaoTipo,
				dataPrevisao: payment.dataPrevisao,
				observacoes: payment.observacoes,
			})),
			cashbackResgate: saleState.state.cashbackResgate,
			cupomResgate: saleState.state.cupomResgate,
			emissaoFiscalAutomatica: saleState.state.emissaoFiscalAutomatica,
			itens: mapItemsToApi(saleState),
		});
	};

	if (saleState.state.success) {
		return (
			<div className="w-full h-[calc(100vh-8rem)] flex items-center justify-center p-4">
				<div className="w-full max-w-lg rounded-2xl border bg-card p-6 flex flex-col gap-4 items-center text-center">
					<div className="h-12 w-12 rounded-full bg-green-500/15 flex items-center justify-center">
						<Check className="h-6 w-6 text-green-600" />
					</div>
					<h2 className="text-xl font-black">{saleState.state.success.title}</h2>
					<p className="text-sm text-muted-foreground">{saleState.state.success.description}</p>
					<Button
						onClick={() => {
							saleState.clearSuccess();
							saleState.resetState(getDefaultSaleState());
						}}
					>
						NOVA VENDA
					</Button>
				</div>
			</div>
		);
	}

	// Modo obrigatório sem caixa aberto: bloqueia a entrada do fluxo de venda (gate cedo).
	if (cashEnabled && cashObrigatorio && !cashLoading && !activeSession) {
		return (
			<div className="w-full h-[calc(100vh-8rem)] flex flex-col p-4">
				<CashSessionGate
					vendedorId={saleState.state.vendedorId || null}
					onVendedorChange={saleState.setVendedor}
					exigirFundoTroco={!!sessoesConfig?.exigirFundoTroco}
				/>
			</div>
		);
	}

	return (
		<div className="w-full h-[calc(100vh-8rem)] flex flex-col gap-3 p-4">
			{cashEnabled ? (
				<CashSessionBar
					session={activeSession}
					isLoading={cashLoading}
					vendedorId={saleState.state.vendedorId || null}
					onVendedorChange={saleState.setVendedor}
					exigirFundoTroco={!!sessoesConfig?.exigirFundoTroco}
					conferenciaCega={!!sessoesConfig?.conferenciaCega}
				/>
			) : null}
			<div className="flex flex-1 min-h-0 gap-3">
				<div className="flex min-w-0 flex-1 flex-col gap-4 rounded-xl bg-background">
					<div className="shrink-0 flex flex-col gap-3">
						<div className="flex items-center gap-2">
							<div className="flex-1">
								<SearchBlock searchValue={searchValue} onSearchChange={handleSearchChange} isLoading={productsLoading} />
							</div>
							<ViewModeToggle value={viewMode} onChange={setViewMode} />
						</div>
						{groupsLoading ? null : (
							<CategoriesBar groups={groupsData?.groups ?? []} selectedGroup={selectedGroup} onGroupSelect={handleGroupSelect} isLoading={productsLoading} />
						)}
					</div>

					<div className="flex-1 min-h-0 flex flex-col gap-4 overflow-y-auto scrollbar-thin scrollbar-track-primary/10 scrollbar-thumb-primary/30 pr-1 pb-20 lg:pb-0">
						<ProductsGridBlock
							productsData={productsData}
							isLoading={productsLoading}
							isError={productsError}
							error={productsErrorData}
							viewMode={viewMode}
							onProductClick={handleProductClick}
						/>

						{productsData ? (
							<PaginationBlock
								currentPage={productsData.currentPage}
								totalPages={productsData.totalPages}
								isLoading={productsLoading}
								onPrevious={() => updateFilters({ page: Math.max(1, filters.page - 1) })}
								onNext={() => updateFilters({ page: Math.min(productsData.totalPages, filters.page + 1) })}
							/>
						) : null}
					</div>
				</div>

				{linkedClient ? (
					<ClientContextPanel
						isOpen={isContextPanelOpen}
						onClose={() => setIsContextPanelOpen(false)}
						clientId={linkedClient.id}
						fallbackName={linkedClient.nome}
						fallbackPhone={linkedClient.telefone}
						basketProductIds={basketProductIds}
						organizationCashbackProgram={organizationCashbackProgram}
						onSelectProduct={handleProductClick}
					/>
				) : null}

				<div className="hidden w-[420px] shrink-0 overflow-hidden rounded-xl border border-border/70 bg-muted/45 lg:block">
					<div className="h-full overflow-y-auto p-3 scrollbar-thin scrollbar-track-primary/10 scrollbar-thumb-primary/30">
						<CheckoutPanel
							organizationCashbackProgram={organizationCashbackProgram}
							saleState={saleState}
							organizationFiscalEmissaoAutomatica={organizationFiscalEmissaoAutomatica}
							organizationAutoFiscalCapable={organizationAutoFiscalCapable}
							canEmitirFiscal={canEmitirFiscal}
							onCreateDraft={handleCreateDraft}
							onFinalizeSale={handleFinalizeSale}
							isCreatingDraft={isCreatingDraft}
							isFinalizingSale={isFinalizingSale}
							onOpenContext={() => setIsContextPanelOpen(true)}
						/>
					</div>
				</div>

				{isMobile ? (
					<div className="fixed bottom-4 right-4 z-50 lg:hidden">
						<Drawer open={isCheckoutDrawerOpen} onOpenChange={setIsCheckoutDrawerOpen}>
							<DrawerTrigger asChild>
								<Button className="rounded-full shadow-lg px-4">
									<ShoppingCart className="w-4 h-4 mr-2" /> CHECKOUT ({saleState.itemCount})
								</Button>
							</DrawerTrigger>
							<DrawerContent className="h-[90vh]">
								<DrawerHeader>
									<DrawerTitle>Checkout</DrawerTitle>
									<DrawerDescription>Finalize ou salve como orçamento.</DrawerDescription>
								</DrawerHeader>
								<div className="overflow-y-auto pb-4">
									<CheckoutPanel
										organizationCashbackProgram={organizationCashbackProgram}
										saleState={saleState}
										organizationFiscalEmissaoAutomatica={organizationFiscalEmissaoAutomatica}
										organizationAutoFiscalCapable={organizationAutoFiscalCapable}
										canEmitirFiscal={canEmitirFiscal}
										onCreateDraft={handleCreateDraft}
										onFinalizeSale={handleFinalizeSale}
										isCreatingDraft={isCreatingDraft}
										isFinalizingSale={isFinalizingSale}
										onOpenContext={() => {
											setIsCheckoutDrawerOpen(false);
											setIsContextSheetOpen(true);
										}}
									/>
								</div>
							</DrawerContent>
						</Drawer>
					</div>
				) : null}

				{isMobile && linkedClient ? (
					<ClientContextSheet
						open={isContextSheetOpen}
						onOpenChange={setIsContextSheetOpen}
						clientId={linkedClient.id}
						fallbackName={linkedClient.nome}
						fallbackPhone={linkedClient.telefone}
						basketProductIds={basketProductIds}
						organizationCashbackProgram={organizationCashbackProgram}
						onSelectProduct={handleProductClick}
					/>
				) : null}

				{builderProduct ? <ProductBuilderModal product={builderProduct} onAddToCart={saleState.addItem} onClose={() => setBuilderProduct(null)} /> : null}
			</div>
		</div>
	);
}
