"use client";
import { api } from "@/convex/_generated/api";
import { useConvexQuery } from "@/convex/utils";
import type { TAuthUserSession } from "@/lib/authentication/types";
import { getErrorMessage } from "@/lib/errors";
import ErrorComponent from "../Layouts/ErrorComponent";
import LoadingComponent from "../Layouts/LoadingComponent";
import ChatsHub from "./ChatsHub";

type ChatsMainProps = {
	user: TAuthUserSession["user"];
};

export default function ChatsMain({ user }: ChatsMainProps) {
	const { data: whatsappConnection, isPending, isError, isSuccess, error } = useConvexQuery(api.queries.connections.getWhatsappConnection);
	if (isPending) return <LoadingComponent />;
	if (isError) return <ErrorComponent msg={getErrorMessage(error)} />;
	if (isSuccess && !!whatsappConnection)
		return <ChatsHub user={user} userHasMessageSendingPermission={true} whatsappConnection={whatsappConnection} />;
	return <></>;
}
