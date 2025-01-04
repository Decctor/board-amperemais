import { getErrorMessage } from '@/lib/errors'
import LoadingComponent from '@/components/Layouts/LoadingComponent'
import { useUserSession } from '@/lib/queries/session'
import React from 'react'
import UnauthenticatedPage from '@/components/Utils/UnauthenticatedPage'
import ErrorComponent from '@/components/Layouts/ErrorComponent'
import RFMAnalysis from '@/components/RFMAnalysis/RFMAnalysis'

function RFMAnalysisPage() {
  const { data: session, isLoading, isError, isSuccess, error } = useUserSession()

  if (isLoading) return <LoadingComponent />
  if (isError) return <ErrorComponent msg={getErrorMessage(error)} />
  if (isSuccess && !session) return <UnauthenticatedPage />
  if (isSuccess && !!session) return <RFMAnalysis user={session} />
  return <></>
}

export default RFMAnalysisPage
