"use client";

import UnauthorizedPage from "@/components/Utils/UnauthorizedPage";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { appRoutes } from "@/lib/navigation/routes";
import { useFiscalPending } from "@/lib/queries/fiscal";
import { AlertTriangle, BookText, Settings } from "lucide-react";
import { useRouter } from "next/navigation";
import { parseAsStringEnum, useQueryState } from "nuqs";
import { FiscalConfigurationView } from "./_module/configuration/fiscal-configuration-view";
import type { TFiscalPermissions } from "./_module/documents/helpers/fiscal-document-action-state";
import { FiscalDocumentsView } from "./_module/documents/fiscal-documents-view";
import { FiscalPendingView } from "./_module/pending/fiscal-pending-view";

const FISCAL_VIEWS = ["pending", "documents", "configuration"] as const;
type TFiscalView = (typeof FISCAL_VIEWS)[number];

type FiscalPageProps = {
	userHasFiscalViewPermission: boolean;
	userHasFiscalConfigurePermission: boolean;
	userHasFiscalEmitPermission: boolean;
	userHasFiscalCancelPermission: boolean;
};

const NO_VIEW_PERMISSION_MESSAGE = "Oops,  você não possui permissão para visualizar o módulo fiscal.";

export default function FiscalPage({
	userHasFiscalViewPermission,
	userHasFiscalConfigurePermission,
	userHasFiscalEmitPermission,
	userHasFiscalCancelPermission,
}: FiscalPageProps) {
	const router = useRouter();
	const [viewMode, setViewMode] = useQueryState("view", parseAsStringEnum([...FISCAL_VIEWS]));

	const { data: pending } = useFiscalPending({ enabled: userHasFiscalViewPermission });
	const pendingTotal = pending?.resumo.total ?? 0;
	// Sem `view` na URL: pendencia manda. Quem chega sem contexto ve o que precisa de acao.
	const activeView: TFiscalView = viewMode ?? (pendingTotal > 0 ? "pending" : "documents");
	const permissions: TFiscalPermissions = {
		emitir: userHasFiscalEmitPermission,
		cancelar: userHasFiscalCancelPermission,
		configurar: userHasFiscalConfigurePermission,
	};
	const openDocument = (documentId: string) => router.push(appRoutes.fiscal.document(documentId));

	return (
		<div className="w-full h-full flex flex-col gap-3">
			<Tabs value={activeView} onValueChange={(v) => setViewMode(v as TFiscalView)}>
				<TabsList variant="page">
					<TabsTrigger value="pending">
						<AlertTriangle className="w-4 h-4 min-w-4 min-h-4" />
						Pendências
						{pendingTotal > 0 ? (
							<span className="ml-1 rounded-full bg-destructive px-1.5 py-px text-[10px] font-bold tabular-nums text-destructive-foreground">
								{pendingTotal > 99 ? "99+" : pendingTotal}
							</span>
						) : null}
					</TabsTrigger>
					<TabsTrigger value="documents">
						<BookText className="w-4 h-4 min-w-4 min-h-4" />
						Documentos
					</TabsTrigger>
					<TabsTrigger value="configuration">
						<Settings className="w-4 h-4 min-w-4 min-h-4" />
						Configuração
					</TabsTrigger>
				</TabsList>
				<TabsContent value="pending" className="flex flex-col gap-3">
					{userHasFiscalViewPermission ? (
						<FiscalPendingView permissions={permissions} openDocument={openDocument} />
					) : (
						<UnauthorizedPage message={NO_VIEW_PERMISSION_MESSAGE} />
					)}
				</TabsContent>
				<TabsContent value="documents" className="flex flex-col gap-3">
					{userHasFiscalViewPermission ? <FiscalDocumentsView permissions={permissions} /> : <UnauthorizedPage message={NO_VIEW_PERMISSION_MESSAGE} />}
				</TabsContent>
				<TabsContent value="configuration" className="flex flex-col gap-3">
					{userHasFiscalConfigurePermission ? (
						<FiscalConfigurationView canEdit={userHasFiscalConfigurePermission} />
					) : (
						<UnauthorizedPage message={NO_VIEW_PERMISSION_MESSAGE} />
					)}
				</TabsContent>
			</Tabs>
		</div>
	);
}
