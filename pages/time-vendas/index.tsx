import ErrorComponent from "@/components/Layouts/ErrorComponent";
import LoadingComponent from "@/components/Layouts/LoadingComponent";
import SalesTeamMain from "@/components/SalesTeam/SalesTeamMain";
import UnauthenticatedPage from "@/components/Utils/UnauthenticatedPage";
import { getErrorMessage } from "@/lib/errors";
import { useUserSession } from "@/lib/queries/session";

export default function SalesTeam() {
	const { data: session, isLoading, isError, isSuccess, error } = useUserSession();

	if (isLoading) return <LoadingComponent />;
	if (isError) return <ErrorComponent msg={getErrorMessage(error)} />;
	if (isSuccess && !session) return <UnauthenticatedPage />;
	if (isSuccess && !!session) return <SalesTeamMain user={session} />;
	return <></>;
}
