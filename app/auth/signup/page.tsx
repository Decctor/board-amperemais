import { getCurrentSession } from "@/lib/authentication/session";
import { redirect } from "next/navigation";
import SignInPage from "./signup-page";

export default async function SignIn() {
	const authSession = await getCurrentSession();
	if (authSession) redirect("/dashboard");
	return <SignInPage />;
}
