import { send } from "@vercel/queue";
export async function enqueueImportJobBatch({ jobId, delaySeconds = 1 }: { jobId: string; delaySeconds?: number }) {
 await send("integration-import-batches", { jobId }, { delaySeconds });
}
