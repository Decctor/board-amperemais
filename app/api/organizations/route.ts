import { OrganizationSchema } from "@/schemas/organizations";
import z from "zod";

export const CreateOrganizationInputSchema = z.object({
	organization: OrganizationSchema.omit({ dataInsercao: true }),
	subscription: z.enum(["ESSENCIAL-MONTHLY", "ESSENCIAL-YEARLY", "CRESCIMENTO-MONTHLY", "CRESCIMENTO-YEARLY", "FREE-TRIAL"]).optional().nullable(),
});

export type TCreateOrganizationInputSchema = z.infer<typeof CreateOrganizationInputSchema>;

// This route must be called at the end of the onboarding process
async function createOrganization(input: TCreateOrganizationInputSchema) {}
