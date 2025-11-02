"use client";

import { cn } from "@/lib/utils";
import type { ReactNode } from "react";
import { useChatHub } from "./context";

export type ChatHubLayoutProps = {
	listPanel: ReactNode;
	contentPanel: ReactNode;
	className?: string;
};

export function Layout({ listPanel, contentPanel, className }: ChatHubLayoutProps) {
	const { isDesktop, selectedChatId } = useChatHub();

	// For mobile: show list when no chat is selected, show content when chat is selected
	const showingListPanel = !selectedChatId || isDesktop;

	return (
		<div className={cn("w-full h-full flex", className)}>
			{isDesktop ? (
				// Desktop Layout - Two columns side by side
				<>
					{/* List Panel - Left Side */}
					<div className="flex flex-col w-1/3 h-full border-r border-primary/20 bg-background/30">{listPanel}</div>

					{/* Content Panel - Right Side */}
					<div className="flex flex-col w-2/3 h-full bg-background/50">{contentPanel}</div>
				</>
			) : (
				// Mobile Layout - Sliding panels
				<div className="relative w-full h-full overflow-hidden">
					{/* List Panel - Mobile */}
					<div
						className={cn(
							"absolute inset-0 w-full h-full flex flex-col",
							"transition-transform duration-300 ease-in-out bg-background/30",
							showingListPanel ? "translate-x-0" : "-translate-x-full",
						)}
					>
						{listPanel}
					</div>

					{/* Content Panel - Mobile */}
					<div
						className={cn(
							"absolute inset-0 w-full h-full flex flex-col",
							"transition-transform duration-300 ease-in-out bg-background/50",
							showingListPanel ? "translate-x-full" : "translate-x-0",
						)}
					>
						{contentPanel}
					</div>
				</div>
			)}
		</div>
	);
}
