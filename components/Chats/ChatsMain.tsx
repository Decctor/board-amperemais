"use client";
import { api } from "@/convex/_generated/api";
import type { TUserSession } from "@/schemas/users";
import LoadingComponent from "../Layouts/LoadingComponent";
import { useConvexQuery } from "@/convex/utils";
import ChatsHub from "./ChatsHub";
import ErrorComponent from "../Layouts/ErrorComponent";
import { getErrorMessage } from "@/lib/errors";

type ChatsMainProps = {
	user: TUserSession;
};

export default function ChatsMain({ user }: ChatsMainProps) {
	const { data: whatsappConnection, isPending, isError, isSuccess, error } = useConvexQuery(api.queries.connections.getWhatsappConnection);
	if (isPending) return <LoadingComponent />;
	if (isError) return <ErrorComponent msg={getErrorMessage(error)} />;
	if (isSuccess && !!whatsappConnection)
		return <ChatsHub session={user} userHasMessageSendingPermission={true} whatsappConnection={whatsappConnection} />;
	return <></>;
}
