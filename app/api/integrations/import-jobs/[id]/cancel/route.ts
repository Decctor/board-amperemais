import { appApiHandler } from "@/lib/app-api";
import { getCurrentSessionUncached } from "@/lib/authentication/session";
import type { TAuthUserSession } from "@/lib/authentication/types";
import { canManageIntegrations } from "@/lib/integrations/mask";
import { changeImportJob } from "@/lib/integrations/import-jobs/service";
import { getImportJobProgress } from "@/lib/integrations/import-jobs/progress";
import createHttpError from "http-errors";
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
const InputSchema = z.object({ id: z.string({ required_error: "Importação não informada.", invalid_type_error: "Importação inválida." }).min(1) });
export type TCancelImportJobInput = z.infer<typeof InputSchema>;
async function cancelImportJob({ input, session }: { input: TCancelImportJobInput; session: TAuthUserSession }) {
 const organizationId = session.membership?.organizacao.id;
 if (!organizationId) throw new createHttpError.Unauthorized("Você precisa estar vinculado a uma organização.");
 if (!canManageIntegrations(session.membership?.permissoes)) throw new createHttpError.Forbidden("Você não possui permissão para gerenciar integrações.");
 const job = await changeImportJob({ ...input, organizationId, action: "cancel" });
 return { data: { job: getImportJobProgress(job) }, message: "Importação cancelada." };
}
export type TCancelImportJobOutput = Awaited<ReturnType<typeof cancelImportJob>>;
async function cancelImportJobRoute(_request: NextRequest, context: { params: Promise<{ id: string }> }) {
 const session = await getCurrentSessionUncached();
 if (!session) throw new createHttpError.Unauthorized("Você não está autenticado.");
 return NextResponse.json(await cancelImportJob({ session, input: InputSchema.parse(await context.params) }));
}
export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
 return appApiHandler({ POST: (req) => cancelImportJobRoute(req, context) })(request);
}
