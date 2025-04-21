import LoadingComponent from "@/components/Layouts/LoadingComponent";
import ErrorComponent from "@/components/Layouts/ErrorComponent";
import { getErrorMessage } from "@/lib/errors";
import { useUserSession } from "@/lib/queries/session";
import UnauthenticatedPage from "@/components/Utils/UnauthenticatedPage";
import SalesStatsMain from "@/components/SalesStats/SalesStatsMain";
const currentDate = new Date();

export default function Home() {
	const { data: session, isLoading, isError, isSuccess, error } = useUserSession();

	if (isLoading) return <LoadingComponent />;
	if (isError) return <ErrorComponent msg={getErrorMessage(error)} />;
	if (isSuccess && !session) return <UnauthenticatedPage />;
	if (isSuccess && !!session) return <SalesStatsMain user={session} />;
	return <></>;
}
