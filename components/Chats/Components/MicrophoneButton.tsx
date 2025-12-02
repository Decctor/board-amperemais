"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Mic } from "lucide-react";

type MicrophoneButtonProps = {
	onClick: () => void;
	disabled?: boolean;
	isRecording?: boolean;
	className?: string;
};

/**
 * Microphone button for starting audio recording
 * Integrates with existing chat input styling
 */
export function MicrophoneButton({ onClick, disabled = false, isRecording = false, className }: MicrophoneButtonProps) {
	return (
		<Button
			type="button"
			size="icon"
			onClick={onClick}
			disabled={disabled}
			className={cn(
				"h-10 w-10 rounded-full flex-shrink-0 transition-all duration-200",
				"hover:scale-105 active:scale-95",
				isRecording
					? "bg-red-500 hover:bg-red-600 text-white animate-pulse shadow-lg shadow-red-500/30"
					: "bg-gradient-to-br from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white shadow-md hover:shadow-lg",
				"disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100",
				className,
			)}
			title={isRecording ? "Gravando áudio..." : "Gravar áudio"}
			aria-label={isRecording ? "Gravando áudio" : "Gravar mensagem de áudio"}
		>
			<Mic className="w-4 h-4" />
		</Button>
	);
}
