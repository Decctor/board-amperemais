"use client";

import type { TAuthUserSession } from "@/lib/authentication/types";
import { getErrorMessage } from "@/lib/errors";
import { useWhatsappConnections } from "@/lib/queries/whatsapp-connections";
import ErrorComponent from "../Layouts/ErrorComponent";
import LoadingComponent from "../Layouts/LoadingComponent";
import ChatsWorkspace from "./ChatsWorkspace";

type ChatsMainProps = {
	user: TAuthUserSession["user"];
	organizationId: string;
	/** `atendimentos.finalizar`: libera o ranking nominal na aba de estatísticas. */
	canManageAttendances: boolean;
};

export default function ChatsMain({ user, organizationId, canManageAttendances }: ChatsMainProps) {
	const { data: whatsappConnections, isPending, isError, error } = useWhatsappConnections();

	if (isPending) return <LoadingComponent />;
	if (isError) return <ErrorComponent msg={getErrorMessage(error)} />;
	if (whatsappConnections.length === 0) return <ErrorComponent msg="Conexão do WhatsApp não encontrada." />;

	// As permissões passam a ser aplicadas na API; a UI reage aos 403 e ao estado de posse
	// do atendimento, em vez do antigo `userHasMessageSendingPermission={true}` fixo.
	return (
		<ChatsWorkspace
			user={user}
			organizationId={organizationId}
			whatsappConnections={whatsappConnections}
			canManageAttendances={canManageAttendances}
		/>
	);
}
