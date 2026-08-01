"use client";
import type { TGetInboundDocumentsOutputDefault } from "@/app/api/fiscal/inbound/route";
import ErrorComponent from "@/components/Layouts/ErrorComponent";
import LoadingComponent from "@/components/Layouts/LoadingComponent";
import { Button } from "@/components/ui/button";
import GeneralPaginationComponent from "@/components/Utils/Pagination";
import { getErrorMessage } from "@/lib/errors";
import { formatDateAsLocale } from "@/lib/formatting";
import { manifestInboundDocumentMutation } from "@/lib/mutations/fiscal";
import { useFiscalInboundDocuments } from "@/lib/queries/fiscal";
import type { TFiscalInboundManifestEventEnum } from "@/schemas/enums";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Download, FileText } from "lucide-react";
import { toast } from "sonner";

const MANIFEST_LABELS: Record<TFiscalInboundManifestEventEnum, string> = {
	CIENCIA: "CIÊNCIA",
	CONFIRMACAO: "CONFIRMADA",
	DESCONHECIMENTO: "DESCONHECIDA",
	NAO_REALIZADA: "NÃO REALIZADA",
};

export default function InboundDocumentsTab() {
	const queryClient = useQueryClient();
	const { data, isLoading, isError, isSuccess, error, queryKey, page, setPage } = useFiscalInboundDocuments();
	const documents = data?.documents ?? [];
	const totalPages = data?.totalPages ?? 0;
	const matched = data?.documentsMatched ?? 0;

	const { mutate: manifest, isPending } = useMutation({
		mutationKey: ["manifest-inbound-document"],
		mutationFn: manifestInboundDocumentMutation,
		onSuccess: (res) => {
			toast.success(res.message);
			queryClient.invalidateQueries({ queryKey });
		},
		onError: (err) => toast.error(getErrorMessage(err)),
	});

	function handleManifest(inboundId: string, evento: TFiscalInboundManifestEventEnum) {
		let justificativa: string | null = null;
		if (evento === "DESCONHECIMENTO" || evento === "NAO_REALIZADA") {
			justificativa = window.prompt("Informe a justificativa (mínimo 15 caracteres).");
			if (!justificativa?.trim()) return;
			if (justificativa.trim().length < 15) return toast.error("A justificativa deve ter ao menos 15 caracteres.");
		}
		manifest({ inboundId, evento, justificativa: justificativa?.trim() });
	}

	return (
		<div className="w-full flex flex-col gap-3">
			<GeneralPaginationComponent
				activePage={page}
				queryLoading={isLoading}
				selectPage={(p) => setPage(p)}
				totalPages={totalPages || 0}
				itemsMatchedText={`${matched} nota(s) recebida(s).`}
				itemsShowingText={`Mostrando ${documents.length} nota(s).`}
			/>
			{isLoading ? <LoadingComponent /> : null}
			{isError ? <ErrorComponent msg={getErrorMessage(error)} /> : null}
			{isSuccess
				? documents.length > 0
					? documents.map((doc) => <InboundDocumentCard key={doc.id} doc={doc} isPending={isPending} onManifest={handleManifest} />)
					: (
							<div className="flex items-center justify-center py-10">
								<p className="text-sm text-muted-foreground">Nenhuma nota recebida. As notas dos seus fornecedores aparecem aqui automaticamente.</p>
							</div>
						)
				: null}
		</div>
	);
}

type InboundDocumentCardProps = {
	doc: TGetInboundDocumentsOutputDefault["documents"][number];
	isPending: boolean;
	onManifest: (inboundId: string, evento: TFiscalInboundManifestEventEnum) => void;
};
function InboundDocumentCard({ doc, isPending, onManifest }: InboundDocumentCardProps) {
	return (
		<div className="bg-card border-border flex w-full flex-col gap-2 rounded-xl border px-3 py-3 shadow-2xs">
			<div className="flex w-full items-center justify-between gap-2 flex-wrap">
				<div className="flex items-center gap-2">
					<FileText className="h-4 w-4 text-muted-foreground" />
					<h3 className="text-sm font-bold tracking-tight">{doc.fornecedor?.nome ?? doc.emitenteNome ?? "Fornecedor não identificado"}</h3>
				</div>
				<div className="flex items-center gap-2">
					{doc.manifestacaoAtual ? (
						<span className="rounded bg-secondary px-2 py-0.5 text-[10px] font-bold uppercase tracking-tight">{MANIFEST_LABELS[doc.manifestacaoAtual]}</span>
					) : (
						<span className="rounded bg-amber-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-tight text-amber-700">SEM MANIFESTAÇÃO</span>
					)}
					{doc.situacao ? <span className="text-[10px] font-medium uppercase text-muted-foreground">{doc.situacao}</span> : null}
				</div>
			</div>
			<div className="flex w-full items-center gap-3 flex-wrap text-[0.7rem] font-medium text-muted-foreground">
				<span title={doc.chaveAcesso} className="font-mono">{doc.chaveAcesso}</span>
				{doc.emitenteCnpj ? <span>CNPJ {doc.emitenteCnpj}</span> : null}
				{typeof doc.valorTotal === "number" ? <span>R$ {doc.valorTotal.toFixed(2)}</span> : null}
				{doc.dataEmissao ? <span>{formatDateAsLocale(doc.dataEmissao, true)}</span> : null}
			</div>
			<div className="flex w-full items-center gap-1.5 flex-wrap">
				<Button variant="ghost" size="xs" disabled={isPending} onClick={() => onManifest(doc.id, "CIENCIA")}>Ciência</Button>
				<Button variant="ghost" size="xs" disabled={isPending} onClick={() => onManifest(doc.id, "CONFIRMACAO")}>Confirmar</Button>
				<Button variant="ghost" size="xs" disabled={isPending} onClick={() => onManifest(doc.id, "DESCONHECIMENTO")}>Desconhecer</Button>
				<Button variant="ghost" size="xs" disabled={isPending} onClick={() => onManifest(doc.id, "NAO_REALIZADA")}>Não realizada</Button>
				{doc.xmlStoragePath ? (
					<Button variant="ghost" size="xs" onClick={() => window.open(`/api/fiscal/inbound/xml?inboundId=${doc.id}`, "_blank", "noopener,noreferrer")}>
						<Download className="h-3.5 w-3.5" />
						XML
					</Button>
				) : null}
			</div>
		</div>
	);
}
