"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Clapperboard, LayoutDashboard, Wand2 } from "lucide-react";
import { CaptureFrame } from "./_capture/capture-frame";
import { BuilderShowcase, BuilderShowcaseControls, useBuilderShowcaseState } from "./_static/builder/builder-showcase";
import { CampaignStatsSection } from "./_static/stats/CampaignStatsSection";

export default function MediaAdminPage() {
	const builder = useBuilderShowcaseState();

	return (
		<div className="flex w-full flex-col gap-6">
			<div className="flex flex-col gap-1">
				<h1 className="flex items-center gap-2 text-2xl font-bold">
					<Clapperboard className="size-6" />
					Estúdio de Mídia
				</h1>
				<p className="text-sm text-muted-foreground">
					Réplicas estáticas das telas do produto, com dados fictícios, prontas para exportar como PNG e usar em anúncios, landing pages e apresentações.
				</p>
			</div>

			<Tabs defaultValue="dashboard" className="flex w-full flex-col">
				<TabsList variant="page">
					<TabsTrigger value="dashboard">
						<LayoutDashboard className="h-4 w-4 min-h-4 min-w-4" />
						Dashboard
					</TabsTrigger>
					<TabsTrigger value="builder">
						<Wand2 className="h-4 w-4 min-h-4 min-w-4" />
						Construtor de campanha
					</TabsTrigger>
				</TabsList>

				<TabsContent value="dashboard" className="mt-3">
					<CaptureFrame filename="recompra-dashboard-campanhas" defaultPresetKey="fit" defaultContentWidth={1440}>
						<CampaignStatsSection />
					</CaptureFrame>
				</TabsContent>

				<TabsContent value="builder" className="mt-3 flex flex-col gap-3">
					<BuilderShowcaseControls
						stage={builder.stage}
						onStageChange={builder.setStage}
						triggerPanel={builder.triggerPanel}
						onTriggerPanelChange={builder.setTriggerPanel}
						showStepper={builder.showStepper}
						onShowStepperChange={builder.setShowStepper}
					/>
					<CaptureFrame filename={`recompra-construtor-${builder.stage}`} defaultPresetKey="fit" defaultContentWidth={1280}>
						<BuilderShowcase stage={builder.stage} triggerPanel={builder.triggerPanel} showStepper={builder.showStepper} />
					</CaptureFrame>
				</TabsContent>
			</Tabs>
		</div>
	);
}
