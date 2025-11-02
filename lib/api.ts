import createHttpError from "http-errors";

import type { NextApiHandler, NextApiRequest, NextApiResponse } from "next";

import type { Method } from "axios";
import { ZodError } from "zod";

interface ErrorResponse {
	error: {
		message: string;
		err?: any;
	};
	status?: number;
}
type ApiMethodHandlers = {
	[key in Uppercase<Method>]?: NextApiHandler;
};

// // Validação de sessão para rotas autenticadas
// export async function validateAuthentication(
//   req: NextApiRequest | NextRequest,
//   res: NextApiResponse | typeof NextResponse
// ) {
//   // @ts-ignore
//   const sessionToken = await auth(req, res);
//   if (!sessionToken)
//     throw new createHttpError.Unauthorized(
//       `Rota não acessível a usuários não autenticados.`
//     );
//   return sessionToken;
// }
// export async function validateAuthenticationWithSession(
//   req: NextApiRequest,
//   res: NextApiResponse
// ) {
//   // @ts-ignore
//   const session = await auth(req, res);
//   if (!session)
//     throw new createHttpError.Unauthorized(
//       `Recurso não acessível a usuários não autenticados.`
//     );
//   return session;
// }
// // Validação de niveis de autorização para rotas
// export async function validateAuthorization<
//   T extends keyof TUser["permissoes"],
//   K extends keyof TUser["permissoes"][T]
// >(
//   req: NextApiRequest,
//   res: NextApiResponse,
//   field: T,
//   permission: K,
//   validate: any
// ) {
//   // @ts-ignore
//   const session = await auth(req, res);

//   if (session) {
//     // console.log('PERMISSAO', session.user.permissoes[field][permission])
//     if (session.user.permissoes[field][permission] == validate) return session;
//     else
//       throw new createHttpError.Unauthorized(
//         `Nível de autorização insuficiente.`
//       );
//   } else {
//     throw new createHttpError.Unauthorized(
//       `Nível de autorização insuficiente.`
//     );
//   }
// }

// export async function validateAdminAuthorizaton(
//   req: NextApiRequest,
//   res: NextApiResponse
// ) {
//   // @ts-ignore
//   const session = await auth(req, res);
//   if (session) {
//     const idAdmin = !!session.user.administrador;
//     if (!idAdmin)
//       throw new createHttpError.Unauthorized(
//         "Nível de autorização insuficiente."
//       );
//     return session;
//   } else
//     throw new createHttpError.InternalServerError("Sessão não encontrada.");
// }
// Criando o handler de erros
function errorHandler(err: unknown, res: NextApiResponse<ErrorResponse>) {
	console.log("ERROR", err);
	if (createHttpError.isHttpError(err) && err.expose) {
		// Lidar com os erros lançados pelo módulo http-errors
		return res.status(err.statusCode).json({ error: { message: err.message } });
	}
	if (err instanceof ZodError) {
		// Lidar com erros vindo de uma validação Zod
		return res.status(400).json({ error: { message: err.errors[0].message } });
	}
	// Erro de servidor padrão 500
	return res.status(500).json({
		error: { message: "Oops, algo deu errado!", err: err },
		status: createHttpError.isHttpError(err) ? err.statusCode : 500,
	});
}

export function apiHandler(handler: ApiMethodHandlers) {
	return async (req: NextApiRequest, res: NextApiResponse) => {
		try {
			const method = req.method ? (req.method.toUpperCase() as keyof ApiMethodHandlers) : undefined;

			// validando se o handler suporta o metodo HTTP requisitado
			if (!method) throw new createHttpError.MethodNotAllowed(`Método não especificado no caminho: ${req.url}`);

			const methodHandler = handler[method];
			if (!methodHandler) throw new createHttpError.MethodNotAllowed(`O método ${req.method} não permitido para o caminho ${req.url}`);

			// Se passou pelas validações, chamar o handler
			await methodHandler(req, res);
		} catch (error) {
			errorHandler(error, res);
		}
	};
}
