import { AxiosError } from "axios";
import createHttpError from "http-errors";
import { ZodError } from "zod";

export function getErrorMessage(error: any) {
	const isDefaultError = !!error.response && !!error.response.data && !!error.response.data.message;
	if (isDefaultError) return error.response.data.message as string;
	if (createHttpError.isHttpError(error) && error.expose) return error.message as string;
	if (error instanceof AxiosError) {
		const personalizedHttpError = error?.response?.data.error;
		if (personalizedHttpError) return personalizedHttpError.message as string;
		return error.message;
	}
	if (error instanceof ZodError) return error.errors[0].message;
	return "Houve um erro desconhecido, por favor, comunique o setor de tecnologia.";
}
