"use client";

import { PageHeader } from "@/components/Layouts/PageHeader";
import { appRoutes } from "@/lib/navigation/routes";
import { useFiscalDocumentById } from "@/lib/queries/fiscal";
import { FiscalDocumentDetails, FiscalDocumentDetailsError, FiscalDocumentDetailsSkeleton } from "./components/fiscal-document-details";
import type { TFiscalPermissions } from "./helpers/fiscal-document-action-state";
import { buildFiscalDocumentHeading } from "./helpers/fiscal-document-heading";

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
			<PageHeader.Root>
				<PageHeader.Bar>
					<PageHeader.Back href={`${appRoutes.fiscal.root()}?view=documents`} />
				</PageHeader.Bar>
				<PageHeader.Heading>
					<PageHeader.Title>{heading?.title ?? "Documento fiscal"}</PageHeader.Title>
					<PageHeader.Description>{heading?.description ?? "Identificação, venda vinculada, tributos e histórico do documento."}</PageHeader.Description>
				</PageHeader.Heading>
			</PageHeader.Root>
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
