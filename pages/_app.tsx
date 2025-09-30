import "@/styles/globals.css";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { AppProps } from "next/app";
import { Toaster, toast } from "sonner";

import FullScreenWrapper from "@/components/Layouts/FullScreenWrapper";
import ConvexClientProvider from "@/components/Providers/ConvexClientProvider";

export default function App({ Component, pageProps }: AppProps) {
	const queryClient = new QueryClient();

	return (
		<QueryClientProvider client={queryClient}>
			<ConvexClientProvider>
				<FullScreenWrapper>
					<Component {...pageProps} />
				</FullScreenWrapper>
			</ConvexClientProvider>
			<Toaster />
		</QueryClientProvider>
	);
}
