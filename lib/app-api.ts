import type { Method } from "axios";
import createHttpError from "http-errors";
import { NextRequest, NextResponse } from "next/server";
import type { NextRequest as NextRequestType, NextResponse as NextResponseType } from "next/server";
import { ZodError } from "zod";

export type UnwrapNextResponse<T> = T extends NextResponseType<infer U> ? U : never;

type ApiMethodHandlers = {
	[key in Uppercase<Method>]?: (req: NextRequestType) => Promise<NextResponseType>;
};

export function errorHandler(err: unknown): NextResponseType {
	console.error("ERROR", err);
	if (createHttpError.isHttpError(err) && err.expose) {
		return NextResponse.json({ error: { message: err.message } }, { status: err.statusCode });
	}
	if (err instanceof ZodError) {
		return NextResponse.json({ error: { message: err.errors[0].message } }, { status: 400 });
	}
	return NextResponse.json(
		{
			error: { message: "Oops, algo deu errado!", err },
			status: createHttpError.isHttpError(err) ? err.statusCode : 500,
		},
		{ status: 500 },
	);
}

export function appApiHandler(handler: ApiMethodHandlers) {
	return async (req: NextRequestType): Promise<NextResponseType> => {
		try {
			const methodHandler = handler[req.method as keyof ApiMethodHandlers];
			if (methodHandler) {
				return await methodHandler(req);
			}
			throw new createHttpError.MethodNotAllowed(`O método ${req.method} não permitido para o caminho ${req.nextUrl.pathname}`);
		} catch (error) {
			return errorHandler(error);
		}
	};
}
