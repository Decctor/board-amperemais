"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Download, Pause, Play } from "lucide-react";
import { useEffect, useRef, useState } from "react";

type AudioPlayerProps = {
	audioUrl: string;
	className?: string;
	variant?: "sent" | "received";
	onDownload?: () => void;
	showDownload?: boolean;
};

export function AudioPlayer({ audioUrl, className, variant = "received", onDownload, showDownload = false }: AudioPlayerProps) {
	const audioRef = useRef<HTMLAudioElement>(null);
	const [isPlaying, setIsPlaying] = useState(false);
	const [currentTime, setCurrentTime] = useState(0);
	const [duration, setDuration] = useState(0);
	const [isLoading, setIsLoading] = useState(true);
	const [playbackRate, setPlaybackRate] = useState(1);
	const [isDragging, setIsDragging] = useState(false);

	useEffect(() => {
		const audio = audioRef.current;
		if (!audio) return;

		const handleLoadedMetadata = () => {
			setDuration(audio.duration);
			setIsLoading(false);
		};

		const handleTimeUpdate = () => {
			if (!isDragging) {
				setCurrentTime(audio.currentTime);
			}
		};

		const handleEnded = () => {
			setIsPlaying(false);
			setCurrentTime(0);
		};

		const handleError = () => {
			setIsLoading(false);
			console.error("Error loading audio");
		};

		audio.addEventListener("loadedmetadata", handleLoadedMetadata);
		audio.addEventListener("timeupdate", handleTimeUpdate);
		audio.addEventListener("ended", handleEnded);
		audio.addEventListener("error", handleError);

		return () => {
			audio.removeEventListener("loadedmetadata", handleLoadedMetadata);
			audio.removeEventListener("timeupdate", handleTimeUpdate);
			audio.removeEventListener("ended", handleEnded);
			audio.removeEventListener("error", handleError);
		};
	}, [isDragging]);

	const togglePlay = () => {
		const audio = audioRef.current;
		if (!audio) return;

		if (isPlaying) {
			audio.pause();
		} else {
			audio.play();
		}
		setIsPlaying(!isPlaying);
	};

	const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
		const audio = audioRef.current;
		if (!audio) return;

		const rect = e.currentTarget.getBoundingClientRect();
		const percent = (e.clientX - rect.left) / rect.width;
		const newTime = percent * duration;

		audio.currentTime = newTime;
		setCurrentTime(newTime);
	};

	const handleDownload = async () => {
		if (onDownload) {
			onDownload();
			return;
		}

		try {
			const response = await fetch(audioUrl);
			const blob = await response.blob();
			const url = window.URL.createObjectURL(blob);
			const a = document.createElement("a");
			a.href = url;
			a.download = `audio-${Date.now()}.mp3`;
			document.body.appendChild(a);
			a.click();
			window.URL.revokeObjectURL(url);
			document.body.removeChild(a);
		} catch (error) {
			console.error("Error downloading audio:", error);
		}
	};

	const handleMouseDown = () => {
		setIsDragging(true);
	};

	const handleMouseUp = () => {
		setIsDragging(false);
	};

	const cyclePlaybackRate = () => {
		const rates = [1, 1.25, 1.5, 2];
		const currentIndex = rates.indexOf(playbackRate);
		const nextRate = rates[(currentIndex + 1) % rates.length];
		setPlaybackRate(nextRate);

		if (audioRef.current) {
			audioRef.current.playbackRate = nextRate;
		}
	};

	const formatTime = (time: number) => {
		if (Number.isNaN(time)) return "0:00";
		const minutes = Math.floor(time / 60);
		const seconds = Math.floor(time % 60);
		return `${minutes}:${seconds.toString().padStart(2, "0")}`;
	};

	const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

	// Theme styles based on variant
	const bgStyles = variant === "sent" ? "bg-green-500/20 dark:bg-green-500/30" : "bg-primary/10";

	const buttonStyles = variant === "sent" ? "bg-green-600/30 hover:bg-green-600/40" : "bg-primary/20 hover:bg-primary/30";

	const progressBg = variant === "sent" ? "bg-green-600/30" : "bg-primary/20";

	const progressFill = variant === "sent" ? "bg-green-100 dark:bg-green-300" : "bg-primary/80";

	const waveformPlayed = variant === "sent" ? "bg-green-100/80 dark:bg-green-300/80" : "bg-primary";

	const waveformUnplayed = variant === "sent" ? "bg-green-600/30" : "bg-primary/20";

	return (
		<div className={cn("flex items-center gap-2 p-3 rounded-2xl backdrop-blur-sm min-w-[200px] max-w-[320px]", bgStyles, className)}>
			{/* Audio Element */}
			<audio ref={audioRef} src={audioUrl} preload="metadata">
				<track kind="captions" />
			</audio>

			{/* Play/Pause Button */}
			<Button
				variant="ghost"
				size="icon"
				onClick={togglePlay}
				disabled={isLoading}
				className={cn(
					"h-8 w-8 lg:h-10 lg:w-10 rounded-full shrink-0 transition-all duration-200",
					buttonStyles,
					"hover:scale-105 active:scale-95",
					isPlaying && "ring-2 ring-white/30",
				)}
			>
				{isLoading ? (
					<div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
				) : isPlaying ? (
					<Pause className="w-4 h-4 lg:w-5 lg:h-5 fill-current" />
				) : (
					<Play className="w-4 h-4 lg:w-5 lg:h-5 fill-current ml-0.5" />
				)}
			</Button>

			{/* Waveform and Progress Container */}
			<div className="flex-1 flex flex-col gap-1">
				{/* Progress Bar with Waveform */}
				<div
					className="relative h-8 flex items-center cursor-pointer group"
					onClick={handleSeek}
					onMouseDown={handleMouseDown}
					onMouseUp={handleMouseUp}
					onMouseLeave={handleMouseUp}
					onKeyDown={() => {}}
				>
					{/* Background Track */}
					<div className="absolute inset-0 flex items-center">
						<div className={cn("w-full h-1 rounded-full overflow-hidden", progressBg)}>
							{/* Progress Fill */}
							<div className={cn("h-full transition-all duration-100 rounded-full relative", progressFill)} style={{ width: `${progress}%` }}>
								{/* Progress Handle */}
								<div
									className={cn(
										"absolute right-0 top-1/2 -translate-y-1/2",
										"w-3 h-3 bg-primary rounded-full shadow-lg",
										"opacity-0 group-hover:opacity-100 transition-opacity",
										isDragging && "opacity-100 scale-125",
									)}
								/>
							</div>
						</div>
					</div>

					{/* Waveform Visualization (Decorative) */}
					<div className="absolute inset-0 flex items-center gap-0.5 px-0.5 pointer-events-none">
						{Array.from({ length: 40 }).map((_, i) => {
							const height = Math.sin(i * 0.5) * 40 + 60;
							const isPlayed = (i / 40) * 100 < progress;
							return (
								<div
									key={i.toString()}
									className={cn("flex-1 rounded-full transition-all duration-100 bg-primary", isPlayed ? waveformPlayed : waveformUnplayed)}
									style={{
										height: `${height}%`,
										minHeight: "2px",
									}}
								/>
							);
						})}
					</div>
				</div>

				{/* Time Display */}
				<div
					className={cn("flex items-center justify-between text-[10px] font-medium px-0.5", variant === "sent" ? "text-green-100/80" : "text-primary")}
				>
					<span>{formatTime(currentTime)}</span>
					<span>{formatTime(duration)}</span>
				</div>
			</div>

			{/* Playback Speed Button */}
			<Button
				variant="ghost"
				size="sm"
				onClick={cyclePlaybackRate}
				className={cn(
					"h-8 px-2 rounded-full shrink-0 text-xs font-semibold transition-all",
					variant === "sent" ? "bg-green-600/30 hover:bg-green-600/40" : "bg-primary-foreground/10 hover:bg-primary-foreground/20",
					"hover:scale-105",
					playbackRate !== 1 &&
						(variant === "sent" ? "bg-green-600/40 ring-2 ring-green-100/30" : "bg-primary-foreground/20 ring-2 ring-primary-foreground/30"),
				)}
			>
				{playbackRate}x
			</Button>

			{/* Download Button (Optional) */}
			{showDownload && (
				<Button
					variant="ghost"
					size="icon"
					onClick={handleDownload}
					className={cn(
						"h-8 w-8 rounded-full shrink-0 transition-all",
						variant === "sent" ? "bg-green-600/30 hover:bg-green-600/40" : "bg-primary-foreground/10 hover:bg-primary-foreground/20",
						"hover:scale-105",
					)}
					title="Download audio"
				>
					<Download className="w-4 h-4" />
				</Button>
			)}
		</div>
	);
}
