import { notFound } from "next/navigation";
import { SaleFulfillmentStudio } from "./sale-fulfillment-studio";

export default function SaleFulfillmentStudioPage() {
	if (process.env.NODE_ENV !== "development") notFound();

	return <SaleFulfillmentStudio />;
}
