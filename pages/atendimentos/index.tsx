import ChatsMain from "@/components/Chats/ChatsMain";
import ErrorComponent from "@/components/Layouts/ErrorComponent";
import LoadingComponent from "@/components/Layouts/LoadingComponent";
import UnauthenticatedPage from "@/components/Utils/UnauthenticatedPage";
import { getErrorMessage } from "@/lib/errors";
import { useUserSession } from "@/lib/queries/session";

export default function Services() {
	const { data: session, isLoading, isError, isSuccess, error } = useUserSession();

	if (isLoading) return <LoadingComponent />;
	if (isError) return <ErrorComponent msg={getErrorMessage(error)} />;
	if (isSuccess && !session) return <UnauthenticatedPage />;
	if (isSuccess && !!session) return <ChatsMain user={session} />;
	return <></>;
}
