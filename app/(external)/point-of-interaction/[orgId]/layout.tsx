"use client";

import { BrandLogo } from "@/components/Brand/BrandLogo";
import { ConnectionStatusProvider } from "./_shared/providers/connection-status-provider";
import { KioskModeProvider, KioskModeToggleButton } from "./_shared/providers/kiosk-provider";

export default function PointOfInteractionLayout({ children }: { children: React.ReactNode }) {
	return (
		<ConnectionStatusProvider>
			<KioskModeProvider>
				<KioskModeToggleButton />
				<div className="flex flex-col h-dvh print:h-auto print:block w-full">
					<div className="flex-1 w-full overflow-y-auto print:overflow-visible overflow-x-hidden flex flex-col">{children}</div>
					<div className="w-full self-center bg-[#24549C] flex items-center justify-center gap-3 px-4 py-1 flex-shrink-0 rounded-tl-3xl rounded-tr-3xl print:hidden">
						<p className="text-sm xl:text-base text-white font-medium tracking-tighter">Powered by</p>
						<div className="w-24 xl:w-36 h-8 xl:h-12 relative">
							<BrandLogo lockup="horizontal" tone="color-on-dark" alt="RecompraCRM" fill className="object-contain" />
						</div>
					</div>
				</div>
			</KioskModeProvider>
		</ConnectionStatusProvider>
	);
}
