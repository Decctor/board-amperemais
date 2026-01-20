import ErrorComponent from "@/components/Layouts/ErrorComponent";
import { getCurrentSession } from "@/lib/authentication/session";
import { db } from "@/services/drizzle";
import { redirect } from "next/navigation";
import CashbackProgramsPage from "./cashback-programs-page";
import NewCashbackProgramsPage from "./new-cashback-programs-page";

export default async function CashbackPrograms() {
	const sessionUser = await getCurrentSession();
	if (!sessionUser) redirect("/auth/signin");

	const userOrgId = sessionUser.membership?.organizacao.id;
	if (!userOrgId) redirect("/dashboard/commercial");

	const cashbackProgram = await db.query.cashbackPrograms.findFirst({
		where: (fields, { eq }) => eq(fields.organizacaoId, userOrgId),
	});
	if (!cashbackProgram) return <NewCashbackProgramsPage user={sessionUser.user} />;
	return <CashbackProgramsPage user={sessionUser.user} cashbackProgram={cashbackProgram} organizationId={userOrgId} />;
}
