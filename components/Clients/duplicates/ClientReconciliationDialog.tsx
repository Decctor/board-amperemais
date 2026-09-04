"use client";

import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { getErrorMessage } from "@/lib/errors";
import { formatDateAsLocale, formatToMoney } from "@/lib/formatting";
import { dismissClientDuplicate, mergeClientDuplicate } from "@/lib/mutations/client-duplicates";
import { useClientDuplicateComparison } from "@/lib/queries/client-duplicates";
import { cn } from "@/lib/utils";
import type { TGetClientDuplicatesOutput } from "@/app/api/clients/duplicates/route";
import type { TGetClientDuplicateComparisonOutput } from "@/app/api/clients/duplicates/comparison/route";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { BadgeDollarSign, CreditCardIcon, InstagramIcon, MailIcon, PhoneIcon, TriangleAlertIcon } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

type TPairSummary = NonNullable<TGetClientDuplicatesOutput["data"]["byEntity"]>["items"][number];
type TComparison = TGetClientDuplicateComparisonOutput["data"];
type TComparisonClient = TComparison["clienteA"];

type ClientReconciliationDialogProps = {
	pairs: TPairSummary[];
	/** Cliente da página atual — vira o keeper padrão. */
	perspectiveClienteId: string;
	canReconcile: boolean;
	onClose: () => void;
	onResolved: () => void;
	/** Chamado após um merge bem sucedido (para redirecionar quando a página era do cliente removido). */
	onMerged?: (result: { keeperId: string; sourceId: string }) => void;
};

const SIGNAL_LABELS: Record<string, { label: string; icon: typeof PhoneIcon }> = {
	TELEFONE: { label: "Mesmo telefone", icon: PhoneIcon },
	EMAIL: { label: "Mesmo e-mail", icon: MailIcon },
	CPF_CNPJ: { label: "Mesmo CPF/CNPJ", icon: CreditCardIcon },
	INSTAGRAM_USERNAME: { label: "Mesmo @ do Instagram", icon: InstagramIcon },
};

/** Campos com escolha explícita quando keeper e origem conflitam. */
const CHOOSABLE_FIELDS: { field: string; label: string }[] = [
	{ field: "nome", label: "Nome" },
	{ field: "telefone", label: "Telefone" },
	{ field: "email", label: "E-mail" },
	{ field: "cpfCnpj", label: "CPF/CNPJ" },
	{ field: "instagram", label: "Instagram" },
];

const RECORD_LABELS: Record<string, string> = {
	vendas: "vendas",
	conversas: "conversas",
	interacoes: "interações",
	cuponsAtribuidos: "cupons",
	cuponsResgatados: "resgates de cupom",
	comandas: "comandas",
};

function fieldValue(client: TComparisonClient, field: string): string {
	const value = (client as unknown as Record<string, unknown>)[field];
	return typeof value === "string" ? value.trim() : "";
}

function ClientColumn({ client, isKeeper }: { client: TComparisonClient; isKeeper: boolean }) {
	return (
		<div className={cn("flex min-w-0 flex-col gap-0.5 rounded-lg border p-3", isKeeper ? "border-primary/40 bg-primary/5" : "border-border")}>
			<p className="truncate text-sm font-semibold">{client.nome}</p>
			<p className="text-[11px] text-muted-foreground">Criado em {formatDateAsLocale(client.dataInsercao ?? undefined)}</p>
			<div className="mt-1.5 flex flex-wrap gap-1">
				{Object.entries(RECORD_LABELS)
					.map(([key, label]) => ({ label, count: (client.registros as unknown as Record<string, number>)[key] ?? 0 }))
					.filter(({ count }) => count > 0)
					.map(({ label, count }) => (
						<Chip.Root key={label} variant="muted" size="xs" shape="pill">
							<Chip.Label>
								{count} {label}
							</Chip.Label>
						</Chip.Root>
					))}
				{client.registros.valorTotalComprado > 0 ? (
					<Chip.Root variant="muted" size="xs" shape="pill">
						<Chip.Label>{formatToMoney(client.registros.valorTotalComprado)} comprados</Chip.Label>
					</Chip.Root>
				) : null}
			</div>
		</div>
	);
}

export function ClientReconciliationDialog({
	pairs,
	perspectiveClienteId,
	canReconcile,
	onClose,
	onResolved,
	onMerged,
}: ClientReconciliationDialogProps) {
	const [selectedPairId, setSelectedPairId] = useState(pairs[0]?.id ?? "");
	const [keeperId, setKeeperId] = useState(perspectiveClienteId);
	const [fieldPicks, setFieldPicks] = useState<Record<string, string>>({});
	const [confirmingMerge, setConfirmingMerge] = useState(false);

	const queryClient = useQueryClient();
	const comparisonQuery = useClientDuplicateComparison({ pairId: selectedPairId });
	const comparison = comparisonQuery.data;

	function invalidateAfterResolution() {
		void queryClient.invalidateQueries({ queryKey: ["client-duplicates-by-entity"] });
		void queryClient.invalidateQueries({ queryKey: ["client-duplicates-pending"] });
		void queryClient.invalidateQueries({ queryKey: ["client-duplicates-pending-count"] });
	}

	const dismissMutation = useMutation({
		mutationKey: ["dismiss-client-duplicate"],
		mutationFn: dismissClientDuplicate,
		onSuccess: (result) => {
			toast.success(result.message);
			invalidateAfterResolution();
			onResolved();
			onClose();
		},
		onError: (error) => toast.error(getErrorMessage(error)),
	});

	const mergeMutation = useMutation({
		mutationKey: ["merge-client-duplicate"],
		mutationFn: mergeClientDuplicate,
		onSuccess: (result, variables) => {
			toast.success(result.message);
			invalidateAfterResolution();
			void queryClient.invalidateQueries({ queryKey: ["clients"] });
			onResolved();
			if (comparison) {
				const sourceId = variables.keeperId === comparison.clienteA.id ? comparison.clienteB.id : comparison.clienteA.id;
				onMerged?.({ keeperId: variables.keeperId, sourceId });
			}
			onClose();
		},
		onError: (error) => {
			toast.error(getErrorMessage(error));
			setConfirmingMerge(false);
		},
	});

	const conflicts = useMemo(() => {
		if (!comparison) return [];
		return CHOOSABLE_FIELDS.flatMap(({ field, label }) => {
			const valueA = fieldValue(comparison.clienteA, field);
			const valueB = fieldValue(comparison.clienteB, field);
			if (!valueA || !valueB || valueA === valueB) return [];
			return [{ field, label, valueA, valueB }];
		});
	}, [comparison]);

	// Saldo resultante por programa: união dos programas dos dois lados.
	const cashbackPreview = useMemo(() => {
		if (!comparison) return [];
		const byProgram = new Map<string, { titulo: string; saldoA: number; saldoB: number }>();
		for (const balance of comparison.clienteA.saldosCashback) {
			byProgram.set(balance.programaId, { titulo: balance.programaTitulo, saldoA: balance.saldoValorDisponivel, saldoB: 0 });
		}
		for (const balance of comparison.clienteB.saldosCashback) {
			const existing = byProgram.get(balance.programaId);
			if (existing) existing.saldoB = balance.saldoValorDisponivel;
			else byProgram.set(balance.programaId, { titulo: balance.programaTitulo, saldoA: 0, saldoB: balance.saldoValorDisponivel });
		}
		return [...byProgram.entries()].map(([programaId, entry]) => ({ programaId, ...entry }));
	}, [comparison]);

	if (!comparison) {
		return (
			<Dialog open onOpenChange={(open) => !open && onClose()}>
				<DialogContent className="sm:max-w-2xl">
					<DialogHeader>
						<DialogTitle>Reconciliação de clientes</DialogTitle>
						<DialogDescription>Carregando comparação…</DialogDescription>
					</DialogHeader>
					<div className="space-y-2">
						{[0, 1, 2].map((index) => (
							<div key={index} className="h-16 animate-pulse rounded-lg bg-muted/60" />
						))}
					</div>
				</DialogContent>
			</Dialog>
		);
	}

	const keeper = keeperId === comparison.clienteB.id ? comparison.clienteB : comparison.clienteA;
	const source = keeper.id === comparison.clienteA.id ? comparison.clienteB : comparison.clienteA;
	const isPending = dismissMutation.isPending || mergeMutation.isPending;

	function handleMerge() {
		if (!confirmingMerge) {
			setConfirmingMerge(true);
			return;
		}
		const fieldChoices: Record<string, "keeper" | "source"> = {};
		for (const conflict of conflicts) {
			const pick = fieldPicks[conflict.field];
			if (!pick || !comparison) continue;
			const pickedSource = (keeper.id === comparison.clienteA.id && pick === "B") || (keeper.id === comparison.clienteB.id && pick === "A");
			fieldChoices[conflict.field] = pickedSource ? "source" : "keeper";
		}
		mergeMutation.mutate({ pairId: selectedPairId, keeperId: keeper.id, fieldChoices });
	}

	return (
		<Dialog open onOpenChange={(open) => !open && onClose()}>
			<DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
				<DialogHeader>
					<DialogTitle>Reconciliação de clientes</DialogTitle>
					<DialogDescription>
						Compare os cadastros, escolha qual será mantido e mescle o histórico — ou descarte o par se não forem a mesma pessoa.
					</DialogDescription>
				</DialogHeader>

				{pairs.length > 1 ? (
					<div className="flex flex-wrap gap-1.5">
						{pairs.map((pair) => (
							<Button
								key={pair.id}
								type="button"
								variant={pair.id === selectedPairId ? "default" : "outline"}
								size="xs"
								onClick={() => {
									setSelectedPairId(pair.id);
									setFieldPicks({});
									setConfirmingMerge(false);
								}}
							>
								{pair.clienteA?.nome ?? "Cliente"} × {pair.clienteB?.nome ?? "Cliente"}
							</Button>
						))}
					</div>
				) : null}

				<div className="flex flex-wrap gap-1.5">
					{comparison.motivos.map((reason, index) => {
						const signal = SIGNAL_LABELS[reason.tipo];
						const SignalIcon = signal?.icon ?? TriangleAlertIcon;
						return (
							<Chip.Root
								key={`${reason.tipo}-${index}`}
								variant="muted"
								size="sm"
								shape="pill"
								className="bg-amber-100 text-amber-700 dark:bg-amber-200/20 dark:text-amber-500"
							>
								<Chip.Icon>
									<SignalIcon />
								</Chip.Icon>
								<Chip.Label>
									{signal?.label ?? reason.tipo}: {reason.valor}
								</Chip.Label>
							</Chip.Root>
						);
					})}
				</div>

				{/* Escolha do keeper */}
				<RadioGroup value={keeper.id} onValueChange={(value) => setKeeperId(value)} className="grid grid-cols-1 gap-2 sm:grid-cols-2">
					{[comparison.clienteA, comparison.clienteB].map((client) => (
						<Label key={client.id} htmlFor={`keeper-${client.id}`} className="flex cursor-pointer items-start gap-2">
							<RadioGroupItem value={client.id} id={`keeper-${client.id}`} className="mt-3.5" />
							<div className="grow">
								<ClientColumn client={client} isKeeper={client.id === keeper.id} />
							</div>
						</Label>
					))}
				</RadioGroup>
				<p className="text-[11px] text-muted-foreground">
					O cadastro selecionado será <span className="font-semibold">mantido</span>. O outro será removido e todo o histórico (vendas, cashback,
					conversas, cupons) passa para o mantido.
				</p>

				{/* Cashback resultante */}
				{cashbackPreview.length > 0 ? (
					<div className="flex flex-col gap-1.5 rounded-lg border border-border p-3">
						<p className="flex items-center gap-1.5 text-xs font-semibold">
							<BadgeDollarSign className="h-3.5 w-3.5" />
							Saldo de cashback após a mesclagem
						</p>
						{cashbackPreview.map((entry) => {
							const keeperIsA = keeper.id === comparison.clienteA.id;
							const keeperBalance = keeperIsA ? entry.saldoA : entry.saldoB;
							const sourceBalance = keeperIsA ? entry.saldoB : entry.saldoA;
							return (
								<p key={entry.programaId} className="text-[11px] text-muted-foreground">
									<span className="font-medium text-foreground">{entry.titulo}</span>: {formatToMoney(keeperBalance)} + {formatToMoney(sourceBalance)} ={" "}
									<span className="font-semibold text-foreground">{formatToMoney(keeperBalance + sourceBalance)}</span>
								</p>
							);
						})}
					</div>
				) : null}

				{/* Conflitos de campo */}
				{conflicts.length > 0 ? (
					<div className="flex flex-col gap-2 rounded-lg border border-border p-3">
						<p className="text-xs font-semibold">Campos em conflito — escolha o valor que fica</p>
						{conflicts.map((conflict) => (
							<div key={conflict.field} className="flex flex-col gap-1">
								<p className="text-[11px] font-medium text-muted-foreground">{conflict.label}</p>
								<RadioGroup
									value={fieldPicks[conflict.field] ?? (keeper.id === comparison.clienteA.id ? "A" : "B")}
									onValueChange={(value) => setFieldPicks((previous) => ({ ...previous, [conflict.field]: value }))}
									className="flex flex-wrap gap-2"
								>
									<Label className="flex cursor-pointer items-center gap-1.5 rounded-md border border-border px-2 py-1 text-xs">
										<RadioGroupItem value="A" />
										{conflict.valueA}
									</Label>
									<Label className="flex cursor-pointer items-center gap-1.5 rounded-md border border-border px-2 py-1 text-xs">
										<RadioGroupItem value="B" />
										{conflict.valueB}
									</Label>
								</RadioGroup>
							</div>
						))}
					</div>
				) : null}

				{/* Avisos */}
				{comparison.alerts.acumuloNaMesmaVenda ? (
					<div className="flex items-start gap-2 rounded-lg border border-amber-300/60 bg-amber-50 p-3 text-[11px] text-amber-800 dark:bg-amber-200/10 dark:text-amber-500">
						<TriangleAlertIcon className="mt-0.5 h-3.5 w-3.5 shrink-0" />
						<span>
							Os dois cadastros acumularam cashback na <span className="font-semibold">mesma venda</span> — isso costuma indicar comprador e parceiro, ou
							seja, duas pessoas diferentes. Considere descartar o par em vez de mesclar.
						</span>
					</div>
				) : null}
				{comparison.alerts.cpfCnpjDivergentes ? (
					<div className="flex items-start gap-2 rounded-lg border border-amber-300/60 bg-amber-50 p-3 text-[11px] text-amber-800 dark:bg-amber-200/10 dark:text-amber-500">
						<TriangleAlertIcon className="mt-0.5 h-3.5 w-3.5 shrink-0" />
						<span>
							Os cadastros têm <span className="font-semibold">CPF/CNPJ diferentes</span>. Documentos fiscais já emitidos não são alterados pela mesclagem —
							confirme que são de fato a mesma pessoa antes de continuar.
						</span>
					</div>
				) : null}

				<DialogFooter className="flex-col gap-2 sm:flex-row sm:justify-between">
					{canReconcile ? (
						<>
							<Button type="button" variant="ghost" disabled={isPending} onClick={() => dismissMutation.mutate({ pairId: selectedPairId })}>
								Não são a mesma pessoa
							</Button>
							<div className="flex items-center gap-2">
								{confirmingMerge ? (
									<Button type="button" variant="ghost" disabled={isPending} onClick={() => setConfirmingMerge(false)}>
										Voltar
									</Button>
								) : null}
								<Button type="button" variant={confirmingMerge ? "destructive" : "default"} disabled={isPending} onClick={handleMerge}>
									{mergeMutation.isPending ? "Mesclando…" : confirmingMerge ? `Confirmar — remover "${source.nome}"` : "Mesclar cadastros"}
								</Button>
							</div>
						</>
					) : (
						<p className="text-[11px] text-muted-foreground">Apenas usuários com permissão de gestão da empresa podem mesclar ou descartar cadastros.</p>
					)}
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
