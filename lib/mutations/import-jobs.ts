import axios from "axios";
import type { TCreateImportJobInput, TCreateImportJobOutput } from "@/app/api/integrations/import-jobs/route";
export async function createImportJob(input: TCreateImportJobInput) {
 return (await axios.post<TCreateImportJobOutput>("/api/integrations/import-jobs", input)).data;
}
export async function retryImportJob(id: string) {
 return (await axios.post(`/api/integrations/import-jobs/${encodeURIComponent(id)}/retry`)).data;
}
export async function cancelImportJob(id: string) {
 return (await axios.post(`/api/integrations/import-jobs/${encodeURIComponent(id)}/cancel`)).data;
}
