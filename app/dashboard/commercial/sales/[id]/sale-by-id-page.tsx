import type { TAuthUserSession } from "@/lib/authentication/types";

type SaleByIdPageProps = {
	user: TAuthUserSession["user"];
	saleId: string;
};
export default function SaleByIdPage({ user, saleId }: SaleByIdPageProps) {
	return <div>SaleByIdPage</div>;
}
