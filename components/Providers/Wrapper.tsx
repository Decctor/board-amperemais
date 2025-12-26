"use client";
import FullScreenWrapper from "../Layouts/FullScreenWrapper";
import ConvexClientProvider from "./ConvexClientProvider";
import TanstackProvider from "./TanstackProvider";
import { ThemeProvider } from "./ThemeProvider";
import { NuqsAdapter } from 'nuqs/adapters/next/app'

export default function ProvidersWrapper({ children }: { children: React.ReactNode }) {
	return (
		<ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
			<TanstackProvider>
				<ConvexClientProvider>
					<NuqsAdapter>
						<FullScreenWrapper>{children}</FullScreenWrapper>
					</NuqsAdapter>
				</ConvexClientProvider>
			</TanstackProvider>
		</ThemeProvider>
	);
}
