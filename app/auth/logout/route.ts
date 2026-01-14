import { deleteSession, deleteSessionTokenCookie, getCurrentSession } from "@/lib/authentication/session";
import { redirect } from "next/navigation";
import type { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
	const session = await getCurrentSession();
	if (!session) redirect("/auth/signin");

	await deleteSession(session.session.id);
	await deleteSessionTokenCookie();

	redirect("/auth/signin");
}
