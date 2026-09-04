import { formatToMoney } from "@/lib/formatting";
import { appRoutes } from "@/lib/navigation/routes";
import { resend } from "@/services/resend";
import { db } from "@/services/drizzle";
import { organizationMembers } from "@/services/drizzle/schema";
import type { TOrganizationEntity } from "@/services/drizzle/schema";
import type { TSaleEntity } from "@/services/drizzle/schema/sales";
import type { TIbptRefreshFailure, TIbptUf } from "./ibpt-rates";
import { eq, isNotNull } from "drizzle-orm";

function escapeHtml(value: unknown) {
	return String(value ?? "")
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;")
		.replace(/'/g, "&#039;");
}

function getAppBaseUrl() {
	return process.env.NEXT_PUBLIC_APP_URL ?? process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.recompracrm.com.br";
}

async function listFiscalNotificationRecipients(organization: TOrganizationEntity) {
	const members = await db.query.organizationMembers.findMany({
		where: eq(organizationMembers.organizacaoId, organization.id),
		with: {
			usuario: {
				columns: {
					email: true,
					nome: true,
				},
			},
		},
	});

	const emails = new Set<string>();
	if (organization.email) emails.add(organization.email);
	if (organization.fiscalConfiguracao?.emailFiscal) emails.add(organization.fiscalConfiguracao.emailFiscal);

	for (const member of members) {
		const fiscalPermissions = member.permissoes?.fiscal;
		if ((fiscalPermissions?.configurar || fiscalPermissions?.emitir) && member.usuario?.email) {
			emails.add(member.usuario.email);
		}
	}

	return [...emails];
}

type NotifyFiscalEmissionFailureParams = {
	organization: TOrganizationEntity;
	sale: Pick<TSaleEntity, "id" | "valorTotal" | "dataVenda" | "canal">;
	errorMessage: string;
};

export async function notifyFiscalEmissionFailure({ organization, sale, errorMessage }: NotifyFiscalEmissionFailureParams) {
	try {
		const recipients = await listFiscalNotificationRecipients(organization);
		if (recipients.length === 0) return;

		const fiscalUrl = `${getAppBaseUrl()}${appRoutes.fiscal()}`;
		const safeOrganizationName = escapeHtml(organization.nome);
		const safeError = escapeHtml(errorMessage);
		const safeSaleId = escapeHtml(sale.id);
		const safeChannel = escapeHtml(sale.canal ?? "N/A");

		await Promise.allSettled(
			recipients.map((recipient) =>
				resend.emails.send({
					from: "RecompraCRM <fiscal@recompracrm.com.br>",
					to: [recipient],
					subject: "Emissão fiscal pendente no RecompraCRM",
					text: [
						`A venda ${sale.id} foi confirmada, mas a emissão fiscal falhou.`,
						`Organização: ${organization.nome}`,
						`Canal: ${sale.canal ?? "N/A"}`,
						`Valor: ${formatToMoney(sale.valorTotal)}`,
						`Erro: ${errorMessage}`,
						`Acesse o módulo fiscal para revisar e emitir novamente: ${fiscalUrl}`,
					].join("\n"),
					html: `
						<div style="font-family: Arial, sans-serif; color: #111827; line-height: 1.5;">
							<h2 style="margin: 0 0 12px;">Emissão fiscal pendente</h2>
							<p>A venda <strong>${safeSaleId}</strong> foi confirmada, mas a emissão fiscal falhou.</p>
							<table style="border-collapse: collapse; margin: 16px 0; width: 100%; max-width: 560px;">
								<tr><td style="padding: 8px; border: 1px solid #e5e7eb;"><strong>Organização</strong></td><td style="padding: 8px; border: 1px solid #e5e7eb;">${safeOrganizationName}</td></tr>
								<tr><td style="padding: 8px; border: 1px solid #e5e7eb;"><strong>Canal</strong></td><td style="padding: 8px; border: 1px solid #e5e7eb;">${safeChannel}</td></tr>
								<tr><td style="padding: 8px; border: 1px solid #e5e7eb;"><strong>Valor</strong></td><td style="padding: 8px; border: 1px solid #e5e7eb;">${escapeHtml(formatToMoney(sale.valorTotal))}</td></tr>
								<tr><td style="padding: 8px; border: 1px solid #e5e7eb;"><strong>Erro</strong></td><td style="padding: 8px; border: 1px solid #e5e7eb;">${safeError}</td></tr>
							</table>
							<p>Revise a pendência no módulo fiscal e emita novamente quando estiver pronto.</p>
							<p><a href="${fiscalUrl}" style="color: #2563eb; font-weight: 700;">Abrir módulo fiscal</a></p>
						</div>
					`,
				}),
			),
		);
	} catch (error) {
		console.error("[FISCAL] Error notifying fiscal emission failure.", error);
	}
}

type TIbptNotificationFailure = Omit<TIbptRefreshFailure, "uf"> & { uf: TIbptUf | null };

export async function notifyFiscalIbptRefreshFailure(failures: TIbptNotificationFailure[]) {
	if (failures.length === 0) return;

	try {
		const failedUfs = new Set(failures.flatMap((failure) => (failure.uf ? [failure.uf] : [])));
		const fiscalOrganizations = await db.query.organizations.findMany({
			where: (fields) => isNotNull(fields.fiscalConfiguracao),
		});
		const affectedOrganizations =
			failedUfs.size === 0
				? fiscalOrganizations
				: fiscalOrganizations.filter((organization) => failedUfs.has(organization.fiscalConfiguracao?.endereco?.uf?.trim().toUpperCase() as TIbptUf));
		const recipientLists = await Promise.all(affectedOrganizations.map(listFiscalNotificationRecipients));
		const recipients = new Set(recipientLists.flat());
		if (process.env.BUG_REPORT_EMAIL) recipients.add(process.env.BUG_REPORT_EMAIL);

		if (recipients.size === 0) {
			console.error("[IBPT] Nenhum destinatário configurado para o alerta de falha.", failures);
			return;
		}

		const details = failures.map((failure) => `${failure.uf ?? "GERAL"}: falha após ${failure.tentativas} tentativa(s) — ${failure.erro}`);
		const safeDetails = details.map((detail) => `<li>${escapeHtml(detail)}</li>`).join("");
		const result = await Promise.allSettled(
			[...recipients].map(async (recipient) => {
				const { error } = await resend.emails.send({
					from: "RecompraCRM <fiscal@recompracrm.com.br>",
					to: [recipient],
					subject: "[ALERTA] Falha na atualização da tabela IBPT",
					text: [
						"A atualização automática da tabela IBPT falhou após as retentativas configuradas.",
						"",
						...details,
						"",
						"As tabelas instaladas anteriormente foram preservadas. Verifique a API de origem e execute a atualização manual se necessário.",
					].join("\n"),
					html: `
						<div style="font-family: Arial, sans-serif; color: #111827; line-height: 1.5;">
							<h2 style="margin: 0 0 12px;">Falha na atualização da tabela IBPT</h2>
							<p>A atualização automática falhou após as retentativas configuradas:</p>
							<ul>${safeDetails}</ul>
							<p>As tabelas instaladas anteriormente foram preservadas. Verifique a API de origem e execute a atualização manual se necessário.</p>
						</div>
					`,
				});
				if (error) throw new Error(error.message);
			}),
		);

		for (const rejected of result.filter((item) => item.status === "rejected")) {
			console.error("[IBPT] Falha ao enviar e-mail de alerta:", rejected.reason);
		}
	} catch (error) {
		console.error("[IBPT] Erro inesperado ao notificar falha de atualização.", error);
	}
}
