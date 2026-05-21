import { getCurrentSession } from "@/lib/authentication/session";
import { redirect } from "next/navigation";
import MessageTemplateBuilder from "./_components/message-template-builder";

type MessageTemplateBuilderPageProps = {
	searchParams: Promise<{ templateId?: string }>;
};

export default async function MessageTemplateBuilderPage({ searchParams }: MessageTemplateBuilderPageProps) {
	const authSession = await getCurrentSession();
	if (!authSession) redirect("/auth/signin");
	if (!authSession.membership) redirect("/onboarding");

	const { templateId } = await searchParams;

	return (
		<MessageTemplateBuilder
			templateId={typeof templateId === "string" && templateId.trim().length > 0 ? templateId : null}
			organizationId={authSession.membership.organizacao.id}
			organizationName={authSession.membership.organizacao.nome}
		/>
	);
}
