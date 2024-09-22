import LoadingComponent from '@/components/Layouts/LoadingComponent'
import ErrorComponent from '@/components/Layouts/ErrorComponent'
import { getErrorMessage } from '@/lib/errors'
import { useUserSession } from '@/lib/queries/session'
import DashboardPage from '@/components/Dashboard/DashboardPage'
import UnauthenticatedPage from '@/components/Utils/UnauthenticatedPage'
const currentDate = new Date()

export default function Home() {
  const { data: session, isLoading, isError, isSuccess, error } = useUserSession()

  if (isLoading) return <LoadingComponent />
  if (isError) return <ErrorComponent msg={getErrorMessage(error)} />
  if (isSuccess && !session) return <UnauthenticatedPage />
  if (isSuccess && !!session) return <DashboardPage user={session} />
  return <></>
}
