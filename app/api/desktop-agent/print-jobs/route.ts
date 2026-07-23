import { authenticateExternalRequest, requireExternalScope } from "@/lib/access/authentication";
import { appApiHandler } from "@/lib/app-api";
import { listPrintJobs, reportPrintJobResult } from "@/lib/desktop-agent/print-jobs";
import { PrintJobStatusEnum } from "@/schemas/enums";
import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const GetPrintJobsInputSchema = z.object({
	status: PrintJobStatusEnum.optional().nullable(),
	limite: z
		.string({ invalid_type_error: "Tipo não válido para o limite." })
		.optional()
		.nullable()
		.transform((value) => (value ? Math.min(Number(value), 50) : 20)),
});
export type TGetPrintJobsInput = z.infer<typeof GetPrintJobsInputSchema>;

// Listagem para diagnóstico do agent (sem conteúdo renderizado — este só sai no claim).
async function getPrintJobsRoute(request: NextRequest) {
	const actor = await authenticateExternalRequest(request);
	requireExternalScope(actor, "desktop-agent:print-jobs:read");

	const input = GetPrintJobsInputSchema.parse({
		status: request.nextUrl.searchParams.get("status"),
		limite: request.nextUrl.searchParams.get("limite"),
	});
	const jobs = await listPrintJobs({ organizacaoId: actor.organizationId, status: input.status, limite: input.limite });
	return NextResponse.json({ data: { jobs }, message: "Jobs de impressão listados com sucesso." }, { status: 200 });
}
export type TGetPrintJobsOutput = {
	data: { jobs: Awaited<ReturnType<typeof listPrintJobs>> };
	message: string;
};

const ReportPrintJobInputSchema = z.object({
	jobId: z.string({
		required_error: "ID do job de impressão não informado.",
		invalid_type_error: "Tipo não válido para o ID do job de impressão.",
	}),
	tentativaId: z.string({
		required_error: "ID da tentativa não informado.",
		invalid_type_error: "Tipo não válido para o ID da tentativa.",
	}),
	resultado: z.enum(["IMPRESSO", "ERRO"], {
		required_error: "Resultado da impressão não informado.",
		invalid_type_error: "Tipo não válido para o resultado da impressão.",
	}),
	erro: z
		.string({ invalid_type_error: "Tipo não válido para a mensagem de erro." })
		.optional()
		.nullable(),
});
export type TReportPrintJobInput = z.infer<typeof ReportPrintJobInputSchema>;

// Report do desfecho: exige a posse da tentativa obtida no claim (lease perdida → 409).
async function reportPrintJobRoute(request: NextRequest) {
	const actor = await authenticateExternalRequest(request);
	requireExternalScope(actor, "desktop-agent:print-jobs:update");

	const input = ReportPrintJobInputSchema.parse(await request.json());
	const reported = await reportPrintJobResult({
		actor,
		jobId: input.jobId,
		tentativaId: input.tentativaId,
		resultado: input.resultado,
		erro: input.erro,
	});
	return NextResponse.json(
		{ data: reported, message: input.resultado === "IMPRESSO" ? "Impressão confirmada com sucesso." : "Falha de impressão registrada." },
		{ status: 200 },
	);
}
export type TReportPrintJobOutput = {
	data: Awaited<ReturnType<typeof reportPrintJobResult>>;
	message: string;
};

export const GET = appApiHandler({ GET: getPrintJobsRoute });
export const PATCH = appApiHandler({ PATCH: reportPrintJobRoute });
