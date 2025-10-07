import { apiHandler } from "@/lib/api";
import { getUserSession } from "@/lib/auth/session";
import { handleSimpleChildRowsProcessing } from "@/lib/db-utils";
import { GoalSchema, GoalSellerSchema } from "@/schemas/goals";
import type { TUserSession } from "@/schemas/users";
import { db } from "@/services/drizzle";
import { goals, goalsSellers } from "@/services/drizzle/schema/goals";
import { eq } from "drizzle-orm";
import createHttpError from "http-errors";
import type { NextApiHandler } from "next";
import { z } from "zod";

/**
 *
 *
 *
 * NEW
 *
 *
 *
 *
 */

const GetGoalsInputSchema = z.object({
	id: z
		.string({
			required_error: "ID da meta não informado.",
			invalid_type_error: "Tipo inválido para ID da meta.",
		})
		.optional(),
});
export type TGetGoalsByIdInput = Pick<TGetGoalsInput, "id">;
export type TGetGoalsInput = z.infer<typeof GetGoalsInputSchema>;
async function getGoals({ input, session }: { input: TGetGoalsInput; session: TUserSession }) {
	const { id } = input;

	if (id) {
		if (typeof id !== "string") throw new createHttpError.BadRequest("ID inválido.");

		const goal = await db.query.goals.findFirst({
			where: (fields, { eq }) => eq(fields.id, id),
			with: {
				vendedores: {
					with: {
						vendedor: {
							columns: {
								id: true,
								nome: true,
								avatarUrl: true,
							},
						},
					},
				},
			},
		});
		if (!goal) throw new createHttpError.NotFound("Meta não encontrada.");
		return {
			data: {
				byId: goal,
				default: undefined,
			},
		};
	}

	const goals = await db.query.goals.findMany({
		with: {
			vendedores: {
				with: {
					vendedor: {
						columns: {
							id: true,
							nome: true,
							avatarUrl: true,
						},
					},
				},
			},
		},
		orderBy: (fields, { desc }) => desc(fields.dataInicio),
	});
	return {
		data: {
			byId: undefined,
			default: goals,
		},
	};
}
export type TGetGoalsOutput = Awaited<ReturnType<typeof getGoals>>;
export type TGetGoalsOutputById = Exclude<TGetGoalsOutput["data"]["byId"], undefined>;
export type TGetGoalsOutputDefault = Exclude<TGetGoalsOutput["data"]["default"], undefined>;
const getGoalsHandler: NextApiHandler<TGetGoalsOutput> = async (req, res) => {
	const session = await getUserSession({ request: req });
	if (session.visualizacao !== "GERAL") throw new createHttpError.BadRequest("Você não possui permissão para acessar esse recurso.");

	const input = GetGoalsInputSchema.parse(req.query);
	const goals = await getGoals({ input, session });
	return res.status(200).json(goals);
};

const CreateGoalInputSchema = z.object({
	goal: GoalSchema.omit({ dataInsercao: true }),
	goalSellers: z.array(GoalSellerSchema.omit({ metaId: true })),
});
export type TCreateGoalInput = z.infer<typeof CreateGoalInputSchema>;

async function createGoal({ input, session }: { input: TCreateGoalInput; session: TUserSession }) {
	const { goal: payloadGoal, goalSellers: payloadGoalSellers } = input;

	return await db.transaction(async (tx) => {
		const insertedGoalResponse = await tx.insert(goals).values(payloadGoal).returning({
			id: goals.id,
		});
		const insertedGoal = insertedGoalResponse[0];
		if (!insertedGoal) throw new createHttpError.InternalServerError("Oops, houve um erro desconhecido ao criar meta.");
		const insertedGoalId = insertedGoal.id;
		if (payloadGoalSellers.length > 0) {
			await tx.insert(goalsSellers).values(
				payloadGoalSellers.map((goalSeller) => ({
					...goalSeller,
					metaId: insertedGoalId,
				})),
			);
		}

		return {
			data: {
				insertedId: insertedGoalId,
			},
			message: "Meta criada com sucesso.",
		};
	});
}
export type TCreateGoalOutput = Awaited<ReturnType<typeof createGoal>>;
export type TCreateGoalOutputInsertedId = Exclude<TCreateGoalOutput["data"]["insertedId"], undefined>;
const createGoalHandler: NextApiHandler<TCreateGoalOutput> = async (req, res) => {
	const session = await getUserSession({ request: req });
	if (session.visualizacao !== "GERAL") throw new createHttpError.BadRequest("Você não possui permissão para acessar esse recurso.");

	const input = CreateGoalInputSchema.parse(req.body);
	const goal = await createGoal({ input, session });
	return res.status(200).json(goal);
};

const UpdateGoalInputSchema = z.object({
	goalId: z.string({
		required_error: "ID da meta não informado.",
		invalid_type_error: "Tipo inválido para ID da meta.",
	}),
	goal: GoalSchema.partial(),
	goalSellers: z.array(
		GoalSellerSchema.omit({ metaId: true }).extend({
			id: z
				.string({
					required_error: "ID da meta do vendedor não informado.",
					invalid_type_error: "Tipo inválido para ID da meta do vendedor.",
				})
				.optional(),
			deletar: z
				.boolean({
					required_error: "Deletar meta do vendedor não informado.",
					invalid_type_error: "Tipo inválido para deletar meta do vendedor.",
				})
				.optional(),
		}),
	),
});
export type TUpdateGoalInput = z.infer<typeof UpdateGoalInputSchema>;

async function updateGoal({ input, session }: { input: TUpdateGoalInput; session: TUserSession }) {
	const { goalId, goal: payloadGoal, goalSellers: payloadGoalSellers } = input;

	return await db.transaction(async (tx) => {
		const updatedGoalResponse = await tx.update(goals).set(payloadGoal).where(eq(goals.id, goalId)).returning({
			id: goals.id,
		});
		const updatedGoal = updatedGoalResponse[0];
		if (!updatedGoal) throw new createHttpError.InternalServerError("Oops, houve um erro desconhecido ao atualizar meta.");
		const updatedGoalId = updatedGoal.id;
		await handleSimpleChildRowsProcessing({
			trx: tx,
			table: goalsSellers,
			entities: payloadGoalSellers,
			fatherEntityKey: "metaId",
			fatherEntityId: updatedGoalId,
		});
		return {
			data: {
				updatedId: updatedGoalId,
			},
			message: "Meta atualizada com sucesso.",
		};
	});
}
export type TUpdateGoalOutput = Awaited<ReturnType<typeof updateGoal>>;
const updateGoalHandler: NextApiHandler<TUpdateGoalOutput> = async (req, res) => {
	const session = await getUserSession({ request: req });
	if (session.visualizacao !== "GERAL") throw new createHttpError.BadRequest("Você não possui permissão para acessar esse recurso.");
	const input = UpdateGoalInputSchema.parse(req.body);
	const goal = await updateGoal({ input, session });
	return res.status(200).json(goal);
};

const DeleteGoalInputSchema = z.object({
	goalId: z.string({
		required_error: "ID da meta não informado.",
		invalid_type_error: "Tipo inválido para ID da meta.",
	}),
});
export type TDeleteGoalInput = z.infer<typeof DeleteGoalInputSchema>;

async function deleteGoal({ input, session }: { input: TDeleteGoalInput; session: TUserSession }) {
	const { goalId } = input;

	return await db.transaction(async (tx) => {
		await tx.delete(goalsSellers).where(eq(goalsSellers.metaId, goalId));
		await tx.delete(goals).where(eq(goals.id, goalId));
		return {
			data: {
				deletedId: goalId,
			},
		};
	});
}
export type TDeleteGoalOutput = Awaited<ReturnType<typeof deleteGoal>>;
export type TDeleteGoalOutputDeletedId = Exclude<TDeleteGoalOutput["data"]["deletedId"], undefined>;
const deleteGoalHandler: NextApiHandler<TDeleteGoalOutput> = async (req, res) => {
	const session = await getUserSession({ request: req });
	if (session.visualizacao !== "GERAL") throw new createHttpError.BadRequest("Você não possui permissão para acessar esse recurso.");
	const input = DeleteGoalInputSchema.parse(req.query);
	const goal = await deleteGoal({ input, session });
	return res.status(200).json(goal);
};

export default apiHandler({
	GET: getGoalsHandler,
	POST: createGoalHandler,
	PUT: updateGoalHandler,
	DELETE: deleteGoalHandler,
});
