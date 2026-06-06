import { getCurrentSession } from "@/lib/authentication/session";
import { sanitizeAuthRedirectTo } from "@/lib/authentication/redirect";
import { redirect } from "next/navigation";
import SignInPage from "./signin-page";

export default async function SignIn({ searchParams }: { searchParams: Promise<{ redirectTo?: string }> }) {
	const { redirectTo: rawRedirectTo } = await searchParams;
	const redirectTo = sanitizeAuthRedirectTo(rawRedirectTo);
	const authSession = await getCurrentSession();
	if (authSession) redirect(redirectTo);
	return <SignInPage redirectTo={redirectTo} />;
}
