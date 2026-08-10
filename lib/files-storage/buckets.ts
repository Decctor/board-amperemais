/**
 * Nome do bucket privado, sem a marca `server-only`: scripts de manutenção rodam fora do runtime do
 * Next e precisam do mesmo nome. O que não pode vazar é a chave de acesso — essa continua atrás de
 * `services/supabase/admin.ts`, que segue marcado.
 */
export const PRIVATE_FILES_BUCKET = process.env.SUPABASE_PRIVATE_FILES_BUCKET ?? "private-files";
