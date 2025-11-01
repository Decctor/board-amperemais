"use client";
import FullScreenWrapper from "../Layouts/FullScreenWrapper";
import ConvexClientProvider from "./ConvexClientProvider";
import TanstackProvider from "./TanstackProvider";
import { ThemeProvider } from "./ThemeProvider";

export default function ProvidersWrapper({ children }: { children: React.ReactNode }) {
	return (
		<ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
			<TanstackProvider>
				<ConvexClientProvider>
					<FullScreenWrapper>{children}</FullScreenWrapper>
				</ConvexClientProvider>
			</TanstackProvider>
		</ThemeProvider>
	);
}
