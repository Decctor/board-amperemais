import "@/styles/globals.css";
import { Raleway } from "next/font/google";
import { cn } from "@/lib/utils";
import type { Metadata, Viewport } from "next";
import ProvidersWrapper from "@/components/Providers/Wrapper";
import { Toaster } from "sonner";

const raleway = Raleway({
	variable: "--font-raleway",
	subsets: ["cyrillic", "cyrillic-ext"],
});
export const metadata: Metadata = {
	title: {
		default: "Board Ampère Mais",
		template: "Board Ampère Mais",
	},
	description: "Plataforma de gestão.",
	icons: [{ rel: "icon", url: "/icon.png" }],
};

export const viewport: Viewport = {
	themeColor: [
		{ media: "(prefers-color-scheme: light)", color: "white" },
		{ media: "(prefers-color-scheme: dark)", color: "black" },
	],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
	return (
		<html lang="pt-BR" suppressHydrationWarning>
			<body className={cn(`min-h-screen min-w-screen bg-background text-primary overflow-x-hidden antialiased ${raleway.variable}`)}>
				<ProvidersWrapper>
					{children}
					<Toaster />
				</ProvidersWrapper>
			</body>
		</html>
	);
}
