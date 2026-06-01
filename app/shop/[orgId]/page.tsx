import { db } from "@/services/drizzle";
import type { Metadata } from "next";
import ShopPage from "./shop-page";

type ShopPageParams = {
	params: Promise<{ orgId: string }>;
};

export async function generateMetadata({ params }: ShopPageParams): Promise<Metadata> {
	const { orgId } = await params;

	const organization = await db.query.organizations.findFirst({
		where: (fields, { eq }) => eq(fields.id, orgId),
		columns: { nome: true, logoUrl: true },
	});

	if (!organization) {
		return {
			title: "Loja Digital",
			description: "Faça seu pedido online.",
		};
	}

	const title = `${organization.nome}`;
	const description = `Faça seu pedido online na ${organization.nome}.`;

	return {
		title,
		description,
		icons: organization.logoUrl ? { icon: organization.logoUrl, apple: organization.logoUrl } : undefined,
		openGraph: {
			title,
			description,
		},
	};
}

export default async function Shop({ params }: ShopPageParams) {
	const { orgId } = await params;
	return <ShopPage orgId={orgId} />;
}
