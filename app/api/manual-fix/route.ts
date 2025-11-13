import type { TUser } from "@/schemas/users";
import { db } from "@/services/drizzle";
import { users } from "@/services/drizzle/schema";
import connectToDatabase from "@/services/mongodb/main-db-connection";
import { NextResponse } from "next/server";

export const GET = async () => {
	const mongoDb = await connectToDatabase();
	const usersCollection = mongoDb.collection<TUser>("users");

	const usersInMongoDB = await usersCollection.find({}).toArray();

	const insertedUsers = await db
		.insert(users)
		.values(
			usersInMongoDB.map((user) => ({
				id: user._id.toString(),
				nome: user.nome,
				email: user.email ?? "",
				telefone: user.telefone ?? "",
				avatarUrl: user.avatar,
				usuario: user.usuario,
				senha: user.senha,
				permissoes:
					user.visualizacao === "GERAL"
						? {
								resultados: {
									escopo: null,
									visualizar: true,
									criarMetas: true,
									visualizarMetas: true,
									editarMetas: true,
									excluirMetas: true,
								},
								atendimentos: {
									visualizar: true,
									iniciar: true,
									responder: true,
									finalizar: true,
								},
								usuarios: {
									visualizar: true,
									criar: true,
									editar: true,
									excluir: true,
								},
							}
						: {
								resultados: {
									escopo: [],
									visualizar: true,
									criarMetas: false,
									visualizarMetas: true,
									editarMetas: false,
									excluirMetas: false,
								},
								atendimentos: {
									visualizar: true,
									iniciar: false,
									responder: false,
									finalizar: false,
								},
								usuarios: {
									visualizar: true,
									criar: false,
									editar: false,
									excluir: false,
								},
							},
				vendedorId: null,
			})),
		)
		.returning({
			id: users.id,
		});
	return NextResponse.json(insertedUsers);
};
