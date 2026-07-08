"use client";

import type { TGetAudiencesOutputDefault } from "@/app/api/audiences/route";
import TextInput from "@/components/Inputs/TextInput";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { getErrorMessage } from "@/lib/errors";
import { createAudience, updateAudience } from "@/lib/mutations/audiences";
import { previewAudience } from "@/lib/queries/audiences";
import { cn } from "@/lib/utils";
import type { TCampaignFilters } from "@/schemas/campaigns";
import { RFMLabels } from "@/utils/rfm";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Users } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

const SEGMENT_OPTIONS = RFMLabels.map((label) => label.text);

type AudienceFormModalProps = {
	audience?: TGetAudiencesOutputDefault[number];
	closeModal: () => void;
	onSaved: () => void;
};

export function AudienceFormModal({ audience, closeModal, onSaved }: AudienceFormModalProps) {
	const isEditing = !!audience;
	const [nome, setNome] = useState<string>(audience?.nome ?? "");
	const [descricao, setDescricao] = useState<string>(audience?.descricao ?? "");
	const [segmentacoes, setSegmentacoes] = useState<string[]>(audience?.segmentacoes ?? []);
	// Filtros avançados (árvore) não são editados neste modal; preservamos os existentes na edição.
	const filtros = (audience?.filtros ?? null) as TCampaignFilters | null;

	const previewQuery = useQuery({
		queryKey: ["audience-preview", segmentacoes],
		queryFn: () => previewAudience({ segmentacoes, filtros }),
		enabled: segmentacoes.length > 0 || !!filtros,
	});

	const { mutate, isPending } = useMutation({
		mutationKey: ["save-audience", audience?.id ?? "new"],
		mutationFn: (payload: { nome: string; descricao: string | null; segmentacoes: string[]; filtros: TCampaignFilters | null }) =>
			isEditing ? updateAudience({ id: audience.id, ...payload }) : createAudience(payload),
		onSuccess: (data) => {
			toast.success(data.message);
			onSaved();
			closeModal();
		},
		onError: (error) => toast.error(getErrorMessage(error)),
	});

	function toggleSegment(segment: string) {
		setSegmentacoes((prev) => (prev.includes(segment) ? prev.filter((item) => item !== segment) : [...prev, segment]));
	}

	function handleSave() {
		if (!nome.trim()) {
			toast.error("Informe o nome do público.");
			return;
		}
		if (segmentacoes.length === 0 && !filtros) {
			toast.error("Selecione ao menos uma segmentação.");
			return;
		}
		mutate({ nome: nome.trim(), descricao: descricao.trim() || null, segmentacoes, filtros });
	}

	return (
		<Dialog open onOpenChange={(open) => !open && closeModal()}>
			<DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
				<DialogHeader>
					<DialogTitle className="text-left text-base">{isEditing ? "Editar público" : "Novo público"}</DialogTitle>
					<DialogDescription className="text-left">Construa um público a partir das segmentações RFM da sua base.</DialogDescription>
				</DialogHeader>

				<div className="flex w-full flex-col gap-3">
					<TextInput label="Nome" value={nome} placeholder="Ex.: Campeões e Leais" handleChange={setNome} />
					<TextInput label="Descrição" value={descricao} placeholder="Opcional" handleChange={setDescricao} />

					<div className="flex flex-col gap-1">
						<span className="text-sm font-medium tracking-tight text-foreground/80">Segmentações (RFM)</span>
						<div className="flex flex-wrap gap-1.5">
							{SEGMENT_OPTIONS.map((segment) => {
								const active = segmentacoes.includes(segment);
								return (
									<button
										key={segment}
										type="button"
										onClick={() => toggleSegment(segment)}
										className={cn(
											"rounded-full border px-3 py-1 text-[0.7rem] font-bold uppercase tracking-tight transition-colors",
											active
												? "border-primary bg-primary text-primary-foreground"
												: "border-border bg-transparent text-muted-foreground hover:border-primary/40",
										)}
									>
										{segment}
									</button>
								);
							})}
						</div>
						{filtros ? (
							<span className="text-xs italic text-muted-foreground">Este público também usa filtros avançados definidos anteriormente.</span>
						) : null}
					</div>

					<div className="flex items-center gap-2 rounded-lg border border-border bg-muted/30 p-3">
						<Users className="h-4 w-4 shrink-0 text-muted-foreground" />
						<span className="text-sm text-muted-foreground">
							{previewQuery.isFetching ? (
								"Calculando prévia..."
							) : previewQuery.data ? (
								<>
									<b className="tabular-nums text-foreground">{new Intl.NumberFormat("pt-BR").format(previewQuery.data.totalClients)}</b> clientes no público
								</>
							) : (
								"Selecione segmentações para ver a prévia"
							)}
						</span>
					</div>
				</div>

				<DialogFooter>
					<Button variant="ghost" onClick={closeModal} disabled={isPending}>
						Cancelar
					</Button>
					<Button onClick={handleSave} disabled={isPending}>
						{isPending ? "Salvando..." : isEditing ? "Salvar" : "Criar"}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
