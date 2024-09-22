import '@/styles/globals.css'
import type { AppProps } from 'next/app'
import { Toaster, toast } from 'sonner'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

import FullScreenWrapper from '@/components/Layouts/FullScreenWrapper'

export default function App({ Component, pageProps }: AppProps) {
  const queryClient = new QueryClient()

  return (
    <QueryClientProvider client={queryClient}>
      <FullScreenWrapper>
        <Component {...pageProps} />
      </FullScreenWrapper>
      <Toaster />
    </QueryClientProvider>
  )
}
