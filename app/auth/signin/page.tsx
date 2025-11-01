import { getUserSession } from "@/lib/auth/app-session";
import { redirect } from "next/navigation";
import SignInPage from "./signin-page";

export default async function SignIn() {
	return <SignInPage />;
}
