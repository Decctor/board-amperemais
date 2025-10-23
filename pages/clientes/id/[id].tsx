import ClientMain from "@/components/Clients/ClientMain";
import ErrorComponent from "@/components/Layouts/ErrorComponent";
import LoadingComponent from "@/components/Layouts/LoadingComponent";
import UnauthenticatedPage from "@/components/Utils/UnauthenticatedPage";
import { getErrorMessage } from "@/lib/errors";
import { useUserSession } from "@/lib/queries/session";
import { useRouter } from "next/router";

export default function ClientPage() {
	const router = useRouter();
	const { id } = router.query;
	if (!id) return <LoadingComponent />;
	if (typeof id !== "string") return <ErrorComponent msg="ID inválido" />;
	const { data: session, isLoading, isError, isSuccess, error } = useUserSession();
	if (isLoading) return <LoadingComponent />;
	if (isError) return <ErrorComponent msg={getErrorMessage(error)} />;
	if (isSuccess && !session) return <UnauthenticatedPage />;
	if (isSuccess && !!session) return <ClientMain id={id} session={session} />;
	return <></>;
}
