"use client";

import type { TAuthUserSession } from "@/lib/authentication/types";
import { getErrorMessage } from "@/lib/errors";
import { useWhatsappConnection } from "@/lib/queries/whatsapp-connections";
import ErrorComponent from "../Layouts/ErrorComponent";
import LoadingComponent from "../Layouts/LoadingComponent";
import ChatsHub from "./ChatsHub";

type ChatsMainProps = {
	user: TAuthUserSession["user"];
	organizationId: string;
};

export default function ChatsMain({ user, organizationId }: ChatsMainProps) {
	const { data: whatsappConnection, isPending, isError, error } = useWhatsappConnection();

	if (isPending) return <LoadingComponent />;
	if (isError) return <ErrorComponent msg={getErrorMessage(error)} />;
	if (!whatsappConnection) return <ErrorComponent msg="Conexão do WhatsApp não encontrada." />;

	return <ChatsHub user={user} organizationId={organizationId} userHasMessageSendingPermission={true} whatsappConnection={whatsappConnection} />;
}
