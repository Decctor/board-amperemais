"use client";
import { NuqsAdapter } from "nuqs/adapters/next/app";
import FullScreenWrapper from "../Layouts/FullScreenWrapper";
import TanstackProvider from "./TanstackProvider";
import { ThemeProvider } from "./ThemeProvider";

export default function ProvidersWrapper({ children }: { children: React.ReactNode }) {
	return (
		<ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
			<TanstackProvider>
				<NuqsAdapter>
					<FullScreenWrapper>{children}</FullScreenWrapper>
				</NuqsAdapter>
			</TanstackProvider>
		</ThemeProvider>
	);
}
