"use server";
import { db } from "@/services/drizzle";
import { redirect } from "next/navigation";
import { createSession, generateSessionToken, setSetSessionCookie } from "./session";
import { LoginSchema, type TLogin } from "./types";

type TLoginResult = {
	formError?: string;
	fieldError?: {
		[key in keyof TLogin]?: string;
	};
};
export async function login(_: TLoginResult, input: FormData): Promise<TLoginResult> {
	const data = {
		username: input.get("username") as string,
		password: input.get("password") as string,
	};
	const validationParsed = LoginSchema.safeParse(data);
	if (!validationParsed.success) {
		const err = validationParsed.error.flatten();
		return {
			fieldError: {
				username: err.fieldErrors.username?.[0],
				password: err.fieldErrors.password?.[0],
			},
		};
	}

	const { username, password } = data;

	const user = await db.query.users.findFirst({
		where: (fields, { eq }) => eq(fields.usuario, username),
	});
	if (!user) {
		return {
			formError: "Usuário ou senha incorretos.",
		};
	}

	if (password !== user.senha) {
		return {
			formError: "Usuário ou senha incorretos.",
		};
	}

	const sessionToken = await generateSessionToken();
	const session = await createSession({
		token: sessionToken,
		userId: user.id,
	});
	try {
		await setSetSessionCookie({
			token: sessionToken,
			expiresAt: session.dataExpiracao,
		});
	} catch (error) {
		console.log("[ERROR] [LOGIN] Error setting session cookie", error);
		const errorMsg = "Um erro desconhecido ocorreu.";
		return {
			formError: errorMsg,
		};
	}
	redirect("/dashboard");
}
