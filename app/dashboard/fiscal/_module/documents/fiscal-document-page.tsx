"use client";

import { Button } from "@/components/ui/button";
import { appRoutes } from "@/lib/navigation/routes";
import { useFiscalDocumentById } from "@/lib/queries/fiscal";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import {
	buildFiscalDocumentHeading,
	FiscalDocumentDetails,
	FiscalDocumentDetailsError,
	FiscalDocumentDetailsSkeleton,
} from "./components/fiscal-document-details";
import type { TFiscalPermissions } from "./helpers/fiscal-document-action-state";

type FiscalDocumentPageProps = {
	documentId: string;
	permissions: TFiscalPermissions;
	exceptionalPresenceEnabled: boolean;
};

/**
 * Pagina de um documento fiscal (`/dashboard/fiscal/documents/[documentId]`). Cabecalho com o
 * numero da nota e o momento que define o estado; o corpo e o mesmo detalhe usado em qualquer
 * superficie que precise mostrar o documento inteiro.
 */
export default function FiscalDocumentPage({ documentId, permissions, exceptionalPresenceEnabled }: FiscalDocumentPageProps) {
	const { data, isLoading, isError, error, isFetching, refetch } = useFiscalDocumentById(documentId);
	const document = data?.document;
	const events = data?.events ?? [];
	const heading = document ? buildFiscalDocumentHeading(document) : null;

	return (
		<div className="flex h-full w-full flex-col gap-4">
			<div className="flex w-full flex-col gap-2">
				<Button variant="ghost" size="sm" asChild className="flex w-fit items-center gap-1.5 px-2">
					<Link href={`${appRoutes.fiscal.root()}?view=documents`}>
						<ArrowLeft className="h-4 w-4 min-h-4 min-w-4" />
						VOLTAR
					</Link>
				</Button>
				<div className="flex flex-col">
					<h1 className="text-xl font-extrabold tracking-tight">{heading?.title ?? "Documento fiscal"}</h1>
					<p className="text-sm text-muted-foreground">{heading?.description ?? "Identificação, venda vinculada, tributos e histórico do documento."}</p>
				</div>
			</div>
			{isLoading ? <FiscalDocumentDetailsSkeleton /> : null}
			{isError ? <FiscalDocumentDetailsError error={error} isFetching={isFetching} retry={() => void refetch()} /> : null}
			{document ? (
				<FiscalDocumentDetails
					key={document.id}
					document={document}
					events={events}
					permissions={permissions}
					exceptionalPresenceEnabled={exceptionalPresenceEnabled}
					onChanged={() => void refetch()}
				/>
			) : null}
		</div>
	);
}
