-- Telefone opcional no convite de membro da organizacao.
-- Quando preenchido, o convite tambem e entregue por WhatsApp (template
-- recompracrm_organization_invite) alem do email.
ALTER TABLE "ampmais_organization_membership_invitations" ADD COLUMN IF NOT EXISTS "telefone" text;
