import { notFound } from "next/navigation";
import { CashbackTransactionsStudio } from "./cashback-transactions-studio";

export default function CashbackTransactionsStudioPage() {
	if (process.env.NODE_ENV !== "development") notFound();

	return <CashbackTransactionsStudio />;
}
