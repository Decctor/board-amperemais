"use client";

import type { TGetFiscalPendingOutput } from "@/app/api/fiscal/pending/route";
import { FiscalProblemCta } from "@/components/Fiscal/FiscalProblemCta";
import { FISCAL_PROBLEM_CATEGORY_LABELS, FISCAL_PROBLEM_TARGET_LABELS } from "@/components/Fiscal/fiscal-problem-presentation";
import { ProductFiscalProfileQuickMenu } from "@/components/Fiscal/ProductFiscalProfileQuickMenu";
import SelectInput from "@/components/Inputs/SelectInput";
import TextInput from "@/components/Inputs/TextInput";
import ErrorComponent from "@/components/Layouts/ErrorComponent";
import LoadingComponent from "@/components/Layouts/LoadingComponent";
import { useFiscalDeadline } from "@/components/Modals/FiscalDocument/use-fiscal-deadline";
import ResponsiveMenu from "@/components/Utils/ResponsiveMenu";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Chip } from "@/components/ui/chip";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { Metric } from "@/components/ui/metric";
import { Section } from "@/components/ui/section";
import { getErrorMessage } from "@/lib/errors";
import type { TFiscalProblem } from "@/lib/fiscal/problems";
import { formatDateAsLocale, formatToMoney } from "@/lib/formatting";
import { retryFiscalDocumentsMutation } from "@/lib/mutations/fiscal";
import { createProductFiscalProfile } from "@/lib/mutations/products";
import { FISCAL_PENDING_QUERY_KEY, useFiscalPending, useFiscalTaxGroups } from "@/lib/queries/fiscal";
import { cn } from "@/lib/utils";
import type { TFiscalProductOriginEnum } from "@/schemas/enums";
import { ProductFiscalProfileOriginOptions, UnitsOfMeasurementOptions } from "@/utils/select-options";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, CheckCircle2, ChevronDown, ChevronUp, Clock, ExternalLink, Layers, Package, Send, Wrench } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { formatFiscalDocumentTypeLabel, type TFiscalPermissions } from "../documents/helpers/fiscal-document-action-state";

type TPendingSummary = TGetFiscalPendingOutput["data"];
type TPendingGroup = TPendingSummary["porAlvo"][number];

type FiscalPendingViewProps = {
	permissions: TFiscalPermissions;
	// Abre a página de detalhes do documento fiscal.
	openDocument: (documentId: string) => void;
};

/**
 * Aba Pendencias: o trabalho fiscal a fazer, do mais urgente para o menos. Prazos que expiram,
 * bloqueios agrupados por causa (um perfil fiscal trava dez vendas — resolve-se uma vez) e
 * produtos vendidos sem perfil, antes que a primeira nota deles falhe.
 */
export function FiscalPendingView({ permissions, openDocument }: FiscalPendingViewProps) {
	const { data, isLoading, isError, error, refetch } = useFiscalPending();

	if (isLoading) return <LoadingComponent />;
	if (isError) return <ErrorComponent msg={getErrorMessage(error)} />;
	if (!data) return null;

	const isEmpty = data.prazosExpirando.length === 0 && data.porAlvo.length === 0 && data.produtosSemPerfil.length === 0;
	if (isEmpty) {
		return (
			<Empty className="border border-dashed">
				<EmptyHeader>
					<EmptyMedia variant="icon">
						<CheckCircle2 />
					</EmptyMedia>
					<EmptyTitle>Nenhuma pendência fiscal</EmptyTitle>
					<EmptyDescription>Tudo em dia: nenhum documento travado, nenhum prazo correndo e todos os produtos vendidos têm perfil fiscal.</EmptyDescription>
				</EmptyHeader>
			</Empty>
		);
	}

	return (
		<div className="flex w-full flex-col gap-3">
			<PendingSummaryStrip resumo={data.resumo} />
			{data.prazosExpirando.length > 0 ? <ExpiringDeadlinesSection items={data.prazosExpirando} openDocument={openDocument} /> : null}
			{data.porAlvo.length > 0 ? (
				<BlockersSection groups={data.porAlvo} permissions={permissions} openDocument={openDocument} onChanged={() => void refetch()} />
			) : null}
			{data.produtosSemPerfil.length > 0 ? (
				<ProductsWithoutProfileSection products={data.produtosSemPerfil} permissions={permissions} onChanged={() => void refetch()} />
			) : null}
		</div>
	);
}

function PendingSummaryStrip({ resumo }: { resumo: TPendingSummary["resumo"] }) {
	const items = [
		{ label: "Documentos travados", value: String(resumo.documentos), tone: resumo.documentos > 0 ? "danger" : "neutral" },
		{ label: "Valor travado", value: formatToMoney(resumo.valorTravado), tone: resumo.valorTravado > 0 ? "danger" : "neutral" },
		{ label: "Prazos correndo", value: String(resumo.prazosExpirando), tone: resumo.prazosExpirando > 0 ? "warning" : "neutral" },
		{ label: "Produtos sem perfil", value: String(resumo.produtosSemPerfil), tone: resumo.produtosSemPerfil > 0 ? "warning" : "neutral" },
		{ label: "Vendas sem nota (30d)", value: String(resumo.vendasSemDocumento), tone: "neutral" },
	] as const;
	return (
		<div className="grid grid-cols-2 gap-2 md:grid-cols-5">
			{items.map((item) => (
				<Metric.Root key={item.label} surface tone={item.tone} className={cn(item.tone === "neutral" && "bg-card")}>
					<Metric.Label>{item.label}</Metric.Label>
					<Metric.Value toned={item.tone !== "neutral"}>{item.value}</Metric.Value>
				</Metric.Root>
			))}
		</div>
	);
}

function ExpiringDeadlinesSection({ items, openDocument }: { items: TPendingSummary["prazosExpirando"]; openDocument: (id: string) => void }) {
	return (
		<Section.Root>
			<Section.Header>
				<Section.Icon>
					<Clock className="h-4 min-h-4 w-4 min-w-4" />
				</Section.Icon>
				<Section.Title>PRAZOS EXPIRANDO</Section.Title>
			</Section.Header>
			<Section.Body>
				<p className="-mt-3 text-xs text-muted-foreground">
					Documentos autorizados ainda dentro da janela de cancelamento. Passado o prazo, a saída passa a ser a devolução.
				</p>
				<div className="flex flex-col divide-y divide-border rounded-lg border">
					{items.map((item) => (
						<ExpiringDeadlineRow key={item.documentoId} item={item} openDocument={openDocument} />
					))}
				</div>
			</Section.Body>
		</Section.Root>
	);
}

function ExpiringDeadlineRow({ item, openDocument }: { item: TPendingSummary["prazosExpirando"][number]; openDocument: (id: string) => void }) {
	const deadline = useFiscalDeadline(item.prazoLimite);
	if (deadline.expired) return null;
	return (
		<div className="flex flex-col gap-2 px-3 py-2 sm:flex-row sm:items-center sm:justify-between">
			<div className="flex min-w-0 flex-col">
				<span className="text-sm font-semibold">
					{formatFiscalDocumentTypeLabel(item.tipo)} {item.numero ? `nº ${item.numero}` : ""}
					{item.valorVenda != null ? <span className="ml-1.5 font-medium text-muted-foreground">· {formatToMoney(item.valorVenda)}</span> : null}
				</span>
				<span className={cn("text-xs tabular-nums", deadline.urgent ? "font-bold text-destructive" : "text-muted-foreground")}>
					Cancelamento disponível por {deadline.label}
				</span>
			</div>
			<Button
				type="button"
				size="sm"
				variant={deadline.urgent ? "destructive" : "outline"}
				onClick={() => openDocument(item.documentoId)}
				className="gap-1.5"
			>
				<ExternalLink className="h-3.5 w-3.5" />
				Abrir e cancelar
			</Button>
		</div>
	);
}

function toProblem(group: TPendingGroup): TFiscalProblem {
	return { ...group.problema, alvo: group.alvo };
}

function BlockersSection({
	groups,
	permissions,
	openDocument,
	onChanged,
}: {
	groups: TPendingGroup[];
	permissions: TFiscalPermissions;
	openDocument: (id: string) => void;
	onChanged: () => void;
}) {
	return (
		<Section.Root>
			<Section.Header>
				<Section.Icon>
					<AlertTriangle className="h-4 min-h-4 w-4 min-w-4" />
				</Section.Icon>
				<Section.Title>BLOQUEIOS POR CAUSA</Section.Title>
			</Section.Header>
			<Section.Body>
				<p className="-mt-3 text-xs text-muted-foreground">Cada card é uma causa. Resolva o alvo uma vez e reenvie todos os documentos que ela travou.</p>
				<div className="flex flex-col gap-2">
					{groups.map((group) => (
						<BlockerCard key={group.chave} group={group} permissions={permissions} openDocument={openDocument} onChanged={onChanged} />
					))}
				</div>
			</Section.Body>
		</Section.Root>
	);
}

function BlockerCard({
	group,
	permissions,
	openDocument,
	onChanged,
}: {
	group: TPendingGroup;
	permissions: TFiscalPermissions;
	openDocument: (id: string) => void;
	onChanged: () => void;
}) {
	const queryClient = useQueryClient();
	const [expanded, setExpanded] = useState(false);
	const problem = toProblem(group);
	const title = group.alvo.rotulo ? `${FISCAL_PROBLEM_TARGET_LABELS[group.alvo.tipo]} "${group.alvo.rotulo}"` : group.problema.mensagem;

	const { mutate: retryAll, isPending } = useMutation({
		mutationKey: ["retry-fiscal-documents-group", group.chave],
		mutationFn: retryFiscalDocumentsMutation,
		onSuccess: async (data) => {
			if (data.data.falhas > 0) toast.warning(data.message);
			else toast.success(data.message);
			await queryClient.invalidateQueries({ queryKey: FISCAL_PENDING_QUERY_KEY });
			await queryClient.invalidateQueries({ queryKey: ["fiscal-documents"] });
			onChanged();
		},
		onError: (error) => toast.error(getErrorMessage(error)),
	});

	return (
		<div className="flex w-full flex-col gap-2 rounded-xl border border-destructive/30 bg-card px-3 py-3">
			{/* Botoes abaixo do texto no celular: ao lado, o texto virava uma coluna de uma palavra. */}
			<div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
				<div className="flex w-full min-w-0 flex-col gap-1 sm:flex-1">
					<div className="flex flex-wrap items-center gap-1.5">
						<Chip.Root variant="destructive" size="xs">
							<Chip.Label>{FISCAL_PROBLEM_CATEGORY_LABELS[group.problema.categoria]}</Chip.Label>
						</Chip.Root>
						<span className="text-xs text-muted-foreground tabular-nums">
							{group.documentos.length} documento{group.documentos.length > 1 ? "s" : ""} · {formatToMoney(group.valorTravado)} travados
						</span>
					</div>
					{/* `anywhere`: mensagens da SEFAZ trazem chaves de acesso de 44 digitos sem espaco. */}
					<p className="text-sm font-bold tracking-tight [overflow-wrap:anywhere]">{title}</p>
					{group.alvo.rotulo ? <p className="text-xs text-muted-foreground [overflow-wrap:anywhere]">{group.problema.mensagem}</p> : null}
					<p className="flex items-start gap-1 text-xs text-muted-foreground [overflow-wrap:anywhere]">
						<Wrench className="mt-0.5 h-3 w-3 shrink-0" />
						{group.problema.acaoSugerida}
					</p>
				</div>
				<div className="flex flex-wrap items-center gap-1.5 sm:shrink-0 sm:justify-end">
					<FiscalProblemCta problem={problem} canConfigureFiscal={permissions.configurar} onResolved={onChanged} />
					{group.problema.reenviavel ? (
						<Button
							type="button"
							size="sm"
							variant="outline"
							className="h-7 gap-1.5 px-2.5 text-[0.65rem] font-bold uppercase tracking-tight"
							disabled={!permissions.emitir || isPending}
							title={permissions.emitir ? undefined : "Você não tem permissão para reenviar documentos fiscais."}
							onClick={() => retryAll({ documentIds: group.documentos.slice(0, 50).map((document) => document.id) })}
						>
							<Send className={cn("h-3.5 w-3.5", isPending && "animate-spin")} />
							Reenviar {Math.min(group.documentos.length, 50)}
						</Button>
					) : null}
				</div>
			</div>
			<button
				type="button"
				onClick={() => setExpanded((prev) => !prev)}
				className="flex items-center gap-1 self-start text-xs font-semibold text-muted-foreground hover:text-foreground"
			>
				{expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
				{expanded ? "Ocultar documentos" : "Ver documentos"}
			</button>
			{expanded ? (
				<div className="flex max-h-64 flex-col divide-y divide-border overflow-y-auto rounded-lg border">
					{group.documentos.map((document) => (
						<button
							key={document.id}
							type="button"
							onClick={() => openDocument(document.id)}
							className="flex items-center justify-between gap-2 px-2.5 py-1.5 text-left text-xs transition-colors hover:bg-muted/50"
						>
							<span className="flex min-w-0 flex-col">
								<span className="truncate font-medium">
									{formatFiscalDocumentTypeLabel(document.tipo)} {document.numero ? `nº ${document.numero}` : "sem número"}
								</span>
								<span className="text-[10px] text-muted-foreground">{formatDateAsLocale(document.dataVenda ?? document.dataInsercao, true)}</span>
							</span>
							<span className="shrink-0 tabular-nums">{document.valorVenda != null ? formatToMoney(document.valorVenda) : "—"}</span>
						</button>
					))}
				</div>
			) : null}
		</div>
	);
}

function ProductsWithoutProfileSection({
	products,
	permissions,
	onChanged,
}: {
	products: TPendingSummary["produtosSemPerfil"];
	permissions: TFiscalPermissions;
	onChanged: () => void;
}) {
	const [selected, setSelected] = useState<Set<string>>(new Set());
	const [quickMenuProductId, setQuickMenuProductId] = useState<string | null>(null);
	const [bulkOpen, setBulkOpen] = useState(false);

	const toggle = (productId: string) => {
		setSelected((prev) => {
			const next = new Set(prev);
			if (next.has(productId)) next.delete(productId);
			else next.add(productId);
			return next;
		});
	};
	const allSelected = selected.size === products.length && products.length > 0;

	return (
		<Section.Root>
			<Section.Header>
				<Section.Icon>
					<Package className="h-4 min-h-4 w-4 min-w-4" />
				</Section.Icon>
				<Section.Title>PRODUTOS SEM PERFIL FISCAL</Section.Title>
				<Section.Actions>
					{permissions.configurar ? (
						<div className="flex flex-wrap items-center gap-1.5">
							<Button
								type="button"
								size="sm"
								variant="ghost"
								className="h-7 text-[0.65rem] font-bold uppercase"
								onClick={() => setSelected(allSelected ? new Set() : new Set(products.map((p) => p.produtoId)))}
							>
								{allSelected ? "Limpar seleção" : "Selecionar todos"}
							</Button>
							<Button
								type="button"
								size="sm"
								variant="outline"
								className="h-7 gap-1.5 text-[0.65rem] font-bold uppercase"
								disabled={selected.size === 0}
								onClick={() => setBulkOpen(true)}
							>
								<Layers className="h-3.5 w-3.5" />
								Aplicar em lote ({selected.size})
							</Button>
						</div>
					) : null}
				</Section.Actions>
			</Section.Header>
			<Section.Body>
				<p className="-mt-3 text-xs text-muted-foreground">
					Vendidos nos últimos 30 dias sem perfil fiscal ativo. A próxima nota deles vai falhar — cadastre antes.
				</p>
				<div className="flex max-h-96 flex-col divide-y divide-border overflow-y-auto rounded-lg border">
					{products.map((product) => (
						<div key={product.produtoId} className="flex items-center justify-between gap-2 px-3 py-2">
							<div className="flex min-w-0 items-center gap-2">
								{permissions.configurar ? <Checkbox checked={selected.has(product.produtoId)} onCheckedChange={() => toggle(product.produtoId)} /> : null}
								<div className="flex min-w-0 flex-col">
									<span className="truncate text-sm font-semibold">{product.nome}</span>
									<span className="text-xs text-muted-foreground tabular-nums">
										{product.vendasRecentes} venda{product.vendasRecentes === 1 ? "" : "s"} nos últimos 30 dias
									</span>
								</div>
							</div>
							<Button
								type="button"
								size="sm"
								variant="default"
								className="h-7 gap-1.5 px-2.5 text-[0.65rem] font-bold uppercase tracking-tight"
								disabled={!permissions.configurar}
								onClick={() => setQuickMenuProductId(product.produtoId)}
							>
								<Wrench className="h-3.5 w-3.5" />
								Cadastrar
							</Button>
						</div>
					))}
				</div>
				{quickMenuProductId ? (
					<ProductFiscalProfileQuickMenu productId={quickMenuProductId} closeMenu={() => setQuickMenuProductId(null)} onSaved={onChanged} />
				) : null}
				{bulkOpen ? (
					<BulkFiscalProfileMenu
						products={products.filter((product) => selected.has(product.produtoId))}
						closeMenu={() => setBulkOpen(false)}
						onSaved={() => {
							setSelected(new Set());
							onChanged();
						}}
					/>
				) : null}
			</Section.Body>
		</Section.Root>
	);
}

type BulkState = { grupoTributarioId: string | null; ncm: string; origemMercadoria: TFiscalProductOriginEnum; unidadeComercial: string };

function BulkFiscalProfileMenu({
	products,
	closeMenu,
	onSaved,
}: {
	products: TPendingSummary["produtosSemPerfil"];
	closeMenu: () => void;
	onSaved: () => void;
}) {
	const queryClient = useQueryClient();
	const { data: taxGroups } = useFiscalTaxGroups();
	const [state, setState] = useState<BulkState>({ grupoTributarioId: null, ncm: "", origemMercadoria: "NACIONAL", unidadeComercial: "UN" });
	const ncmIsValid = /^\d{8}$/.test(state.ncm.replace(/\D/g, ""));

	const { mutate, isPending } = useMutation({
		mutationKey: ["bulk-product-fiscal-profiles"],
		mutationFn: async () => {
			const results = { ok: 0, failed: [] as string[] };
			for (const product of products) {
				try {
					await createProductFiscalProfile({
						productId: product.produtoId,
						fiscalProfile: {
							grupoTributarioId: state.grupoTributarioId,
							ncm: state.ncm.replace(/\D/g, ""),
							origemMercadoria: state.origemMercadoria,
							unidadeComercial: state.unidadeComercial,
							exTipi: null,
							cest: null,
							cfopPadrao: null,
							codigoBeneficioFiscal: null,
							ativo: true,
							dataInsercao: new Date(),
						},
					});
					results.ok += 1;
				} catch (error) {
					results.failed.push(`${product.nome}: ${getErrorMessage(error)}`);
				}
			}
			return results;
		},
		onSuccess: async (results) => {
			await queryClient.invalidateQueries({ queryKey: FISCAL_PENDING_QUERY_KEY });
			if (results.failed.length > 0) toast.warning(`${results.ok} perfil(is) criado(s); ${results.failed.length} falha(s): ${results.failed[0]}`);
			else toast.success(`${results.ok} perfil(is) fiscal(is) criado(s).`);
			onSaved();
			closeMenu();
		},
		onError: (error) => toast.error(getErrorMessage(error)),
	});

	return (
		<ResponsiveMenu
			menuTitle="APLICAR PERFIL FISCAL EM LOTE"
			menuDescription={`Cria o mesmo perfil fiscal para ${products.length} produto(s). Use só quando eles compartilham NCM e tributação.`}
			menuActionButtonText={`CRIAR ${products.length} PERFIL(IS)`}
			menuActionButtonDisabled={!ncmIsValid}
			menuCancelButtonText="CANCELAR"
			actionFunction={() => mutate()}
			actionIsLoading={isPending}
			stateIsLoading={false}
			closeMenu={closeMenu}
		>
			<div className="flex w-full flex-col gap-3">
				<div className="flex max-h-32 flex-wrap gap-1 overflow-y-auto rounded-md border bg-muted/20 p-2">
					{products.map((product) => (
						<Chip.Root key={product.produtoId} variant="secondary" size="xs">
							<Chip.Label>{product.nome}</Chip.Label>
						</Chip.Root>
					))}
				</div>
				<TextInput
					label="NCM"
					placeholder="8 dígitos, ex.: 22021000"
					value={state.ncm}
					handleChange={(value) => setState((prev) => ({ ...prev, ncm: value }))}
				/>
				<SelectInput
					label="GRUPO TRIBUTÁRIO"
					value={state.grupoTributarioId}
					options={(taxGroups ?? []).map((group) => ({ id: group.id, value: group.id, label: group.nome }))}
					resetOptionLabel="SEM GRUPO"
					handleChange={(value) => setState((prev) => ({ ...prev, grupoTributarioId: value }))}
					onReset={() => setState((prev) => ({ ...prev, grupoTributarioId: null }))}
				/>
				<SelectInput
					label="ORIGEM DA MERCADORIA"
					value={state.origemMercadoria}
					options={ProductFiscalProfileOriginOptions}
					resetOptionLabel="NACIONAL"
					handleChange={(value) => setState((prev) => ({ ...prev, origemMercadoria: value as TFiscalProductOriginEnum }))}
					onReset={() => setState((prev) => ({ ...prev, origemMercadoria: "NACIONAL" }))}
				/>
				<SelectInput
					label="UNIDADE COMERCIAL"
					value={state.unidadeComercial}
					options={UnitsOfMeasurementOptions}
					resetOptionLabel="UN"
					handleChange={(value) => setState((prev) => ({ ...prev, unidadeComercial: value }))}
					onReset={() => setState((prev) => ({ ...prev, unidadeComercial: "UN" }))}
				/>
			</div>
		</ResponsiveMenu>
	);
}
