"use client";

import { Chip } from "@/components/ui/chip";
import { type TClientDuplicateEntityType, useClientDuplicatesForEntity } from "@/lib/queries/client-duplicates";
import { CopyXIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { ClientReconciliationDialog } from "./ClientReconciliationDialog";

type ClientDuplicatePillProps = {
	entityType: TClientDuplicateEntityType;
	entityId: string;
	canReconcile: boolean;
};

/**
 * Pill de possível duplicidade nas páginas de detalhe (cliente, venda).
 * Só renderiza quando há pares pendentes; clicar abre o diálogo de
 * reconciliação. Ver e comparar é livre; descartar/mesclar exige a permissão
 * de gestão da empresa (empresa.editar).
 */
export function ClientDuplicatePill({ entityType, entityId, canReconcile }: ClientDuplicatePillProps) {
	const [dialogOpen, setDialogOpen] = useState(false);
	const router = useRouter();

	const duplicatesQuery = useClientDuplicatesForEntity({ entityType, entityId });
	const pairs = duplicatesQuery.data?.items ?? [];
	const clienteId = duplicatesQuery.data?.clienteId ?? null;

	if (!clienteId || pairs.length === 0) return null;

	return (
		<>
			<button
				type="button"
				onClick={() => setDialogOpen(true)}
				aria-label="Abrir reconciliação de clientes duplicados"
				className="cursor-pointer transition-opacity hover:opacity-80"
			>
				<Chip.Root size="sm" shape="pill" className="bg-amber-100 text-amber-700 dark:bg-amber-200/20 dark:text-amber-500">
					<Chip.Icon>
						<CopyXIcon />
					</Chip.Icon>
					<Chip.Label>{pairs.length > 1 ? `Possíveis duplicados (${pairs.length})` : "Possível duplicado"}</Chip.Label>
				</Chip.Root>
			</button>

			{dialogOpen ? (
				<ClientReconciliationDialog
					pairs={pairs}
					perspectiveClienteId={clienteId}
					canReconcile={canReconcile}
					onClose={() => setDialogOpen(false)}
					onResolved={() => void duplicatesQuery.refetch()}
					onMerged={({ keeperId, sourceId }) => {
						// A página atual era do cadastro excluído: leva o usuário ao mantido.
						if (entityType === "client" && entityId === sourceId) {
							router.push(`/dashboard/customers/${keeperId}`);
						}
					}}
				/>
			) : null}
		</>
	);
}
