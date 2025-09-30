import { ConvexProvider, ConvexReactClient } from "convex/react";

const convexClient = new ConvexReactClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export default function ConvexClientProvider({ children }: { children: React.ReactNode }) {
	return <ConvexProvider client={convexClient}>{children}</ConvexProvider>;
}
