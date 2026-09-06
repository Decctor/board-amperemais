import { appApiHandler } from "@/lib/app-api";
import { assertCronAuthorized } from "@/lib/cron/assert-cron-authorized";
import { sweepImportJobs } from "@/lib/integrations/import-jobs/service";
import { NextResponse, type NextRequest } from "next/server";
async function sweepImportJobsRoute(request: NextRequest) {
 assertCronAuthorized(request);
 return NextResponse.json({ data: await sweepImportJobs(), message: "Importações enfileiradas." });
}
export const GET = appApiHandler({ GET: sweepImportJobsRoute });
export const maxDuration = 300;
