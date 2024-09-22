import ConfigurationPage from '@/components/Admin/ConfigurationPage'
import ErrorComponent from '@/components/Layouts/ErrorComponent'
import LoadingComponent from '@/components/Layouts/LoadingComponent'
import UnauthenticatedPage from '@/components/Utils/UnauthenticatedPage'
import { getErrorMessage } from '@/lib/errors'
import { useUserSession } from '@/lib/queries/session'
import React from 'react'

function AdminConfigPage() {
  const { data: session, isLoading, isError, isSuccess, error } = useUserSession()

  if (isLoading) return <LoadingComponent />
  if (isError) return <ErrorComponent msg={getErrorMessage(error)} />
  if (isSuccess && !session) return <UnauthenticatedPage />
  if (isSuccess && !!session) return <ConfigurationPage session={session} />
  return <></>
}

export default AdminConfigPage
