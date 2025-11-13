import { getCurrentSession } from "@/lib/authentication/session";
import { redirect } from "next/navigation";
import SignInPage from "./signin-page";

export default async function SignIn() {
	const authSession = await getCurrentSession();
	if (authSession) redirect("/dashboard");
	return <SignInPage />;
}
