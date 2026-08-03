"use client";

import CommunicationTemplatesPage from "@/app/dashboard/communication/_components/communication-templates-page";

type CampaignTemplatesViewProps = {
	organizationName: string;
};

export function CampaignTemplatesView({ organizationName }: CampaignTemplatesViewProps) {
	return <CommunicationTemplatesPage organizationName={organizationName} showNewTemplateAction={false} />;
}