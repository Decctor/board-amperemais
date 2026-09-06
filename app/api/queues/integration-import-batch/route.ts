import { runImportJobBatch } from "@/lib/integrations/import-jobs/runner";
import { handleCallback } from "@vercel/queue";
import { z } from "zod";
const InputSchema = z.object({ jobId: z.string({ required_error: "Importação não informada.", invalid_type_error: "Importação inválida." }).min(1) });
export const runtime = "nodejs";
export const maxDuration = 300;
export const POST = handleCallback(async (message) => { await runImportJobBatch(InputSchema.parse(message)); }, {
 retry: (_error, metadata) => metadata.deliveryCount >= 3 ? { acknowledge: true } : { afterSeconds: 60 },
});
