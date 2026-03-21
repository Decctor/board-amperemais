"use client";
import { PointOfInteractionLinksAndHelpers } from "@/components/PointOfInteraction/LinksAndHelpers";
import { PointOfInteractionTransactionRequestsQueue } from "@/components/PointOfInteraction/TransactionRequestsQueue";
import { TAuthUserSession } from "@/lib/authentication/types";

type PointOfInteractionPageProps = {
	user: TAuthUserSession["user"];
	organization: NonNullable<TAuthUserSession["membership"]>["organizacao"];
};
export default function PointOfInteractionPage({ user: _user, organization }: PointOfInteractionPageProps) {
	return (
		<div className="w-full flex flex-col gap-3 md:flex-1 md:min-h-0">
			<div className="w-full flex gap-3 flex-col-reverse md:flex-row md:flex-1 md:min-h-0 md:items-stretch">
				<div className="w-full md:w-1/2 md:h-full">
					<PointOfInteractionLinksAndHelpers organization={organization} />
				</div>
				<div className="w-full md:w-1/2 md:h-full">
					<PointOfInteractionTransactionRequestsQueue orgId={organization.id} />
				</div>
			</div>
		</div>
	);
}
