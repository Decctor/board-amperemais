import { api } from "@/convex/_generated/api";
import type { TUserSession } from "@/schemas/users";
import Header from "../Layouts/Header";
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
	return (
		<div className="flex h-full flex-col">
			<Header session={user} />
			<div className="flex w-full max-w-full grow flex-col overflow-x-hidden bg-background px-6 lg:px-12 py-6 gap-6">
				{isPending ? <LoadingComponent /> : null}
				{isError ? <ErrorComponent msg={getErrorMessage(error)} /> : null}
				{isSuccess && !!whatsappConnection ? (
					<ChatsHub session={user} userHasMessageSendingPermission={true} whatsappConnection={whatsappConnection} />
				) : null}
			</div>
		</div>
	);
}
