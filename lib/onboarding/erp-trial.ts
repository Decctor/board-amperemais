import { AppSubscriptionPlans } from "@/config";
import { db } from "@/services/drizzle";
import { organizations } from "@/services/drizzle/schema";
import { eq } from "drizzle-orm";
import createHttpError from "http-errors";

/** Switching product during an existing trial never renews its deadline or changes a paid plan. */
export async function enableErpTrial({ organizationId }: { organizationId: string }) {
 await db.transaction(async (tx) => {
  const [organization] = await tx.select().from(organizations).where(eq(organizations.id, organizationId)).for("update");
  if (!organization) throw new createHttpError.NotFound("Organização não encontrada.");
  if (organization.configuracao.recursos.erp.acesso) return;
  if (organization.stripeSubscriptionId || !organization.periodoTesteFim || organization.periodoTesteFim <= new Date()) throw new createHttpError.Forbidden("O período de teste não está disponível para esta organização.");
  await tx.update(organizations).set({ assinaturaPlano: "ESCALA", configuracao: { ...organization.configuracao, recursos: AppSubscriptionPlans.ESCALA.capabilities, preferencias: { ...organization.configuracao.preferencias, rastreamentoEstoque: true } } }).where(eq(organizations.id, organizationId));
 });
}
