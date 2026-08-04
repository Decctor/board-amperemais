import { appApiHandler } from "@/lib/app-api";
import { getCurrentSessionUncached } from "@/lib/authentication/session";
import { IFOOD_IMAGE_ALLOWED_TYPES, IFOOD_IMAGE_MAX_SIZE_BYTES, IFOOD_IMAGE_MAX_SIZE_LABEL } from "@/lib/integrations/ifood/catalog-types";
import { resolveIfoodManagementContext } from "@/lib/integrations/ifood/context";
import { uploadIfoodImage } from "@/lib/integrations/ifood/image";
import { canManageIntegrations } from "@/lib/integrations/mask";
import createHttpError from "http-errors";
import { type NextRequest, NextResponse } from "next/server";
import z from "zod";

const UploadIfoodImageInputSchema = z.object({
	merchantId: z
		.string({
			required_error: "ID da loja do iFood não informado.",
			invalid_type_error: "Tipo inválido para o ID da loja do iFood.",
		})
		.min(1, "ID da loja do iFood não informado."),
});
export type TUploadIfoodImageInput = z.infer<typeof UploadIfoodImageInputSchema>;

async function uploadIfoodImageService({ input, file, organizacaoId }: { input: TUploadIfoodImageInput; file: File; organizacaoId: string }) {
	const context = await resolveIfoodManagementContext({ organizacaoId, merchantId: input.merchantId });
	const result = await uploadIfoodImage(context.client, input.merchantId, { file, fileName: file.name });
	return { data: result, message: "Imagem enviada com sucesso ao iFood." };
}
export type TUploadIfoodImageOutput = Awaited<ReturnType<typeof uploadIfoodImageService>>;

async function uploadIfoodImageRoute(request: NextRequest) {
	const session = await getCurrentSessionUncached();
	if (!session) throw new createHttpError.Unauthorized("Você precisa estar autenticado para gerenciar a integração do iFood.");
	const organizacaoId = session.membership?.organizacao.id;
	if (!organizacaoId) throw new createHttpError.BadRequest("Você precisa estar vinculado a uma organização para gerenciar a integração do iFood.");
	if (!canManageIntegrations(session.membership?.permissoes))
		throw new createHttpError.Forbidden("Você não possui permissão para gerenciar integrações.");

	const formData = await request.formData();
	const input = UploadIfoodImageInputSchema.parse({ merchantId: formData.get("merchantId") });

	const file = formData.get("file");
	if (!(file instanceof File)) throw new createHttpError.BadRequest("Arquivo de imagem não informado.");
	if (!IFOOD_IMAGE_ALLOWED_TYPES.includes(file.type)) throw new createHttpError.BadRequest("Formato de imagem inválido. Envie um arquivo PNG ou JPG.");
	if (file.size > IFOOD_IMAGE_MAX_SIZE_BYTES)
		throw new createHttpError.BadRequest(`Imagem muito grande. O tamanho máximo aceito pelo iFood é de ${IFOOD_IMAGE_MAX_SIZE_LABEL}.`);

	const result = await uploadIfoodImageService({ input, file, organizacaoId });
	return NextResponse.json(result);
}

export const POST = appApiHandler({ POST: uploadIfoodImageRoute });

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
