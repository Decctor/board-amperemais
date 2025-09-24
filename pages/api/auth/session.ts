import { apiHandler } from "@/lib/api";
import { lucia } from "@/lib/auth/lucia";
import type { TSession, TUser } from "@/schemas/users";
import connectToDatabase from "@/services/mongodb/main-db-connection";
import createHttpError from "http-errors";
import { Session } from "lucia";
import { ObjectId } from "mongodb";
import type { NextApiHandler } from "next";

type GetResponse = {
	data: TUser | null;
};
const getUserSession: NextApiHandler<GetResponse> = async (req, res) => {
	const sessionId = req.cookies[lucia.sessionCookieName];
	console.log("SESSION ID", sessionId);

	const db = await connectToDatabase();
	const sessionsCollection = db.collection<TSession>("sessions");
	const usersCollection = db.collection<TUser>("users");
	if (!sessionId) return res.status(200).json({ data: null });

	// @ts-ignore
	const session = await sessionsCollection.findOne({ _id: sessionId });
	if (!session) return res.status(200).json({ data: null });

	const userId = session.user_id;
	const user = await usersCollection.findOne({ _id: new ObjectId(userId) }, { projection: { senha: 0 } });
	if (!user) return res.status(200).json({ data: null });

	return res.status(200).json({ data: user });
};

export default apiHandler({ GET: getUserSession });
