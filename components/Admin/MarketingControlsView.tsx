import React from "react";

import type { TUserSession } from "@/schemas/users";

import MarketingSalesStats from "../Marketing/MarketingSalesStats";
import MarketingControlsBlock from "../Marketing/MarketingControlsBlock";

type MarketingControlViewProps = {
	session: TUserSession;
};
function MarketingControlView({ session }: MarketingControlViewProps) {
	return (
		<div className="flex h-full grow flex-col gap-6 py-4">
			<MarketingControlsBlock session={session} />
			<MarketingSalesStats />
		</div>
	);
}

export default MarketingControlView;
