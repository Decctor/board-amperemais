import { cookies } from "next/headers";
import { lucia } from "./lucia";
import type { TSession, TUser } from "@/schemas/users";
import connectToDatabase from "@/services/mongodb/main-db-connection";
import createHttpError from "http-errors";
import { ObjectId } from "mongodb";
import { redirect } from "next/navigation";

export async function getUserSession() {
	const cookiesStore = await cookies();
	const sessionId = cookiesStore.get(lucia.sessionCookieName)?.value;
	console.log("SESSION ID", sessionId);

	const db = await connectToDatabase();
	const sessionsCollection = db.collection<TSession>("sessions");
	const usersCollection = db.collection<TUser>("users");
	// if (!sessionId) throw new createHttpError.NotFound("Sessão de usuário não encontrada.");
	if (!sessionId) redirect("/auth/signin");

	// @ts-ignore
	const session = await sessionsCollection.findOne({ _id: sessionId });
	if (!session) redirect("/auth/signin");

	const userId = session.user_id;
	const user = await usersCollection.findOne({ _id: new ObjectId(userId) }, { projection: { senha: 0 } });
	if (!user) redirect("/auth/signin");

	return { ...user, _id: user._id.toString() };
}
