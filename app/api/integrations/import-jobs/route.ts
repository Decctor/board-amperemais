import { appApiHandler } from "@/lib/app-api";
import { getCurrentSessionUncached } from "@/lib/authentication/session";
import type { TAuthUserSession } from "@/lib/authentication/types";
import { canManageIntegrations } from "@/lib/integrations/mask";
import { startHistoricalImport } from "@/lib/integrations/import-jobs/service";
import { getImportJobProgress } from "@/lib/integrations/import-jobs/progress";
import { CreateImportJobInputSchema } from "@/schemas/import-jobs";
import { db } from "@/services/drizzle";
import { integrationImportJobs } from "@/services/drizzle/schema";
import { and, desc, eq } from "drizzle-orm";
import createHttpError from "http-errors";
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
const GetImportJobsInputSchema = z.object({
 id: z.string({ required_error: "Importação não informada.", invalid_type_error: "Importação inválida." }).nullable().optional(),
 integrationId: z.string({ required_error: "Integração não informada.", invalid_type_error: "Integração inválida." }).nullable().optional(),
});
export type TGetImportJobsInput = z.infer<typeof GetImportJobsInputSchema>;
export type TCreateImportJobInput = z.infer<typeof CreateImportJobInputSchema>;
function organizationIdFor(session: TAuthUserSession) {
 const id = session.membership?.organizacao.id;
 if (!id) throw new createHttpError.Unauthorized("Você precisa estar vinculado a uma organização.");
 return id;
}
async function getImportJobs({ input, session }: { input: TGetImportJobsInput; session: TAuthUserSession }) {
 const conditions = [eq(integrationImportJobs.organizacaoId, organizationIdFor(session))];
 if (input.id) conditions.push(eq(integrationImportJobs.id, input.id));
 if (input.integrationId) conditions.push(eq(integrationImportJobs.integracaoId, input.integrationId));
 const jobs = await db.select().from(integrationImportJobs).where(and(...conditions)).orderBy(desc(integrationImportJobs.dataInicio)).limit(100);
 if (input.id && !jobs.length) throw new createHttpError.NotFound("Importação não encontrada.");
 return { data: { byId: input.id ? getImportJobProgress(jobs[0]) : null, default: input.id ? null : jobs.map(getImportJobProgress) }, message: "Importações consultadas com sucesso." };
}
async function createImportJob({ input, session }: { input: TCreateImportJobInput; session: TAuthUserSession }) {
 if (!canManageIntegrations(session.membership?.permissoes)) throw new createHttpError.Forbidden("Você não possui permissão para gerenciar integrações.");
 const job = await startHistoricalImport({ ...input, organizationId: organizationIdFor(session), autorId: session.user.id });
 return { data: { job: getImportJobProgress(job) }, message: "Importação histórica preparada." };
}
export type TGetImportJobsOutput = Awaited<ReturnType<typeof getImportJobs>>;
export type TCreateImportJobOutput = Awaited<ReturnType<typeof createImportJob>>;
async function getImportJobsRoute(request: NextRequest) {
 const session = await getCurrentSessionUncached();
 if (!session) throw new createHttpError.Unauthorized("Você não está autenticado.");
 return NextResponse.json(await getImportJobs({ session, input: GetImportJobsInputSchema.parse(Object.fromEntries(request.nextUrl.searchParams)) }));
}
async function createImportJobRoute(request: NextRequest) {
 const session = await getCurrentSessionUncached();
 if (!session) throw new createHttpError.Unauthorized("Você não está autenticado.");
 return NextResponse.json(await createImportJob({ session, input: CreateImportJobInputSchema.parse(await request.json()) }));
}
export const GET = appApiHandler({ GET: getImportJobsRoute });
export const POST = appApiHandler({ POST: createImportJobRoute });
