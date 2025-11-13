import { SESSION_COOKIE_NAME } from "@/config";
import type { NextApiRequest } from "next";
import { validateSession } from "./session";

export const getCurrentSession = async (cookies: NextApiRequest["cookies"]) => {
	const token = cookies[SESSION_COOKIE_NAME] ?? null;
	if (token === null) return null;

	const sessionResult = await validateSession(token);
	return sessionResult;
};

export const getCurrentSessionUncached = async (cookies: NextApiRequest["cookies"]) => {
	const token = cookies[SESSION_COOKIE_NAME] ?? null;
	if (token === null) return null;

	const sessionResult = await validateSession(token);
	return sessionResult;
};
