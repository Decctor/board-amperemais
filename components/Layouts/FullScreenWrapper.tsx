import { Raleway } from "next/font/google";
import { cn } from "@/lib/utils";
import type { PropsWithChildren } from "react";

// If loading a variable font, you don't need to specify the font weight
const raleway = Raleway({ subsets: ["latin"] });

function FullScreenWrapper({ children }: PropsWithChildren) {
	return (
		<div className={cn("flex min-h-screen w-screen max-w-full flex-col xl:min-h-screen", raleway.className)}>
			<div className="flex min-h-full grow">
				<div className="flex w-full grow flex-col">{children}</div>
			</div>
		</div>
	);
}

export default FullScreenWrapper;
