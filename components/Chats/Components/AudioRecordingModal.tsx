"use client";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogOverlay } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { Check, Mic, X } from "lucide-react";
import { useEffect, useState } from "react";
import type { AudioRecorderResult } from "../Hooks/useAudioRecorder";

type AudioRecordingModalProps = {
	isOpen: boolean;
	recordingState: AudioRecorderResult["recordingState"];
	recordingDuration: number;
	audioLevels: number[];
	error: string | null;
	onCancel: () => void;
	onSend: () => void;
	onStopRecording: () => void;
};

/**
 * Modal overlay for audio recording with WhatsApp-inspired design
 * Features: pulsing mic icon, live waveform, timer, cancel/send buttons
 */
export function AudioRecordingModal({
	isOpen,
	recordingState,
	recordingDuration,
	audioLevels,
	error,
	onCancel,
	onSend,
	onStopRecording,
}: AudioRecordingModalProps) {
	const [mounted, setMounted] = useState(false);

	useEffect(() => {
		setMounted(true);
	}, []);

	if (!mounted) return null;

	const formatDuration = (seconds: number): string => {
		const mins = Math.floor(seconds / 60);
		const secs = seconds % 60;
		return `${mins}:${secs.toString().padStart(2, "0")}`;
	};

	const isRecording = recordingState === "recording";
	const isStopped = recordingState === "stopped";
	const hasError = recordingState === "error";

	return (
		<Dialog open={isOpen} onOpenChange={(open) => !open && onCancel()}>
			<DialogOverlay className="bg-black/60 backdrop-blur-sm" />
			<DialogContent
				className={cn("max-w-md w-[90vw] p-0 overflow-hidden border-none shadow-2xl", "bg-linear-to-br from-background via-background to-primary/5")}
				onInteractOutside={(e) => e.preventDefault()}
				onEscapeKeyDown={onCancel}
			>
				<div className="flex flex-col items-center justify-center p-8 gap-6">
					{/* Error State */}
					{hasError && (
						<div className="text-center space-y-4">
							<div className="w-20 h-20 mx-auto rounded-full bg-red-500/10 flex items-center justify-center">
								<X className="w-10 h-10 text-red-500" />
							</div>
							<div>
								<h3 className="text-lg font-semibold text-red-600 dark:text-red-400 mb-1">Erro ao Gravar</h3>
								<p className="text-sm text-muted-foreground">{error}</p>
							</div>
							<Button onClick={onCancel} variant="default" className="w-full">
								Fechar
							</Button>
						</div>
					)}

					{/* Recording/Stopped State */}
					{!hasError && (
						<>
							{/* Microphone Icon with Pulse Animation */}
							<div className="relative">
								<div
									className={cn(
										"w-24 h-24 rounded-full flex items-center justify-center transition-all duration-300",
										isRecording ? "bg-red-500 shadow-lg shadow-red-500/50" : "bg-green-500 shadow-lg shadow-green-500/50",
									)}
								>
									{isRecording ? <Mic className="w-12 h-12 text-white" /> : <Check className="w-12 h-12 text-white" />}
								</div>

								{/* Pulse rings for recording state */}
								{isRecording && (
									<>
										<div className="absolute inset-0 rounded-full bg-red-500 animate-ping opacity-20" />
										<div className="absolute inset-0 rounded-full bg-red-500 animate-pulse opacity-30" />
									</>
								)}
							</div>

							{/* Status Text */}
							<div className="text-center">
								<h3 className="text-xl font-semibold mb-1">{isRecording ? "Gravando áudio..." : "Gravação concluída"}</h3>
								<p className="text-sm text-muted-foreground">
									{isRecording ? "Clique em parar quando terminar" : "Envie o áudio ou cancele para gravar novamente"}
								</p>
							</div>

							{/* Duration Timer */}
							<div className="w-full">
								<div className="text-center">
									<div
										className={cn(
											"inline-flex items-center justify-center px-6 py-3 rounded-full text-3xl font-mono font-bold",
											"bg-primary/10 border-2 border-primary/20",
											isRecording && "animate-pulse",
										)}
									>
										{formatDuration(recordingDuration)}
									</div>
								</div>

								{/* Max duration warning */}
								{recordingDuration > 240 && isRecording && (
									<p className="text-xs text-amber-600 dark:text-amber-400 text-center mt-2 animate-pulse">
										Tempo restante: {formatDuration(300 - recordingDuration)}
									</p>
								)}
							</div>

							{/* Waveform Visualization */}
							<div className="w-full px-4">
								<div className="flex items-center justify-center gap-1 h-20">
									{audioLevels.map((level, index) => {
										// Dynamic height based on audio level
										const height = Math.max(8, level); // Minimum 8% height
										const barIndex = index;

										return (
											<div
												key={barIndex}
												className={cn(
													"flex-1 rounded-full transition-all duration-100",
													isRecording ? "bg-gradient-to-t from-red-500 to-red-400" : "bg-gradient-to-t from-green-500 to-green-400",
												)}
												style={{
													height: `${height}%`,
													minHeight: "8px",
													maxHeight: "100%",
													opacity: 0.6 + (level / 100) * 0.4, // Dynamic opacity
												}}
											/>
										);
									})}
								</div>
							</div>

							{/* Action Buttons */}
							<div className="flex items-center gap-3 w-full pt-4">
								{/* Cancel Button */}
								<Button
									onClick={onCancel}
									variant="outline"
									size="lg"
									className={cn(
										"flex-1 gap-2 border-2",
										"hover:bg-destructive/10 hover:border-destructive hover:text-destructive",
										"transition-all duration-200",
									)}
								>
									<X className="w-5 h-5" />
									Cancelar
								</Button>

								{/* Stop/Send Button */}
								{isRecording ? (
									<Button
										onClick={onStopRecording}
										variant="default"
										size="lg"
										className={cn("flex-1 gap-2", "bg-red-500 hover:bg-red-600 text-white", "shadow-lg shadow-red-500/30", "transition-all duration-200")}
									>
										<div className="w-3 h-3 bg-white rounded-sm" />
										Parar
									</Button>
								) : (
									<Button
										onClick={onSend}
										variant="default"
										size="lg"
										className={cn("flex-1 gap-2", "bg-green-500 hover:bg-green-600 text-white", "shadow-lg shadow-green-500/30", "transition-all duration-200")}
									>
										<Check className="w-5 h-5" />
										Enviar
									</Button>
								)}
							</div>
						</>
					)}
				</div>
			</DialogContent>
		</Dialog>
	);
}
