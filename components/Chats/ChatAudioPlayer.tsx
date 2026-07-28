"use client";

import { cn } from "@/lib/utils";
import { Pause, Play } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

/**
 * Player de áudio das mensagens de voz.
 *
 * **Agnóstico à superfície.** O player vive dentro de bolhas com quatro fundos
 * diferentes (card, primary, muted, destructive), então toda cor deriva de
 * `currentColor` — a bolha define a cor do texto e o player se ajusta. A versão
 * anterior fixava tons de verde e ficava ilegível em três dos quatro fundos.
 *
 * A waveform é decorativa e determinística: não temos os picos reais do arquivo, e
 * decodificá-lo só para desenhar barras custaria mais do que entrega. As barras
 * derivam da URL, então o mesmo áudio desenha sempre igual, e servem de trilha de
 * progresso — a informação real é a posição, não a amplitude.
 */

const WAVEFORM_BARS = 32;
const PLAYBACK_RATES = [1, 1.5, 2] as const;

type ChatAudioPlayerProps = {
	audioUrl: string;
	/** Nome do arquivo, para o rótulo acessível do controle. */
	fileName?: string | null;
	className?: string;
};

function formatDuration(seconds: number) {
	if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
	const minutes = Math.floor(seconds / 60);
	return `${minutes}:${String(Math.floor(seconds % 60)).padStart(2, "0")}`;
}

/** Alturas estáveis por URL: um hash simples evita a waveform "dançar" a cada render. */
function buildWaveform(seed: string) {
	let hash = 0;
	for (let index = 0; index < seed.length; index++) hash = (hash * 31 + seed.charCodeAt(index)) | 0;

	return Array.from({ length: WAVEFORM_BARS }, () => {
		hash = (hash * 1103515245 + 12345) | 0;
		const normalized = Math.abs(hash % 1000) / 1000;
		// Piso de 25%: barras quase zeradas leem como falha de carregamento.
		return 0.25 + normalized * 0.75;
	});
}

export function ChatAudioPlayer({ audioUrl, fileName, className }: ChatAudioPlayerProps) {
	const audioRef = useRef<HTMLAudioElement>(null);
	const [isPlaying, setIsPlaying] = useState(false);
	const [currentTime, setCurrentTime] = useState(0);
	const [duration, setDuration] = useState(0);
	const [playbackRate, setPlaybackRate] = useState<(typeof PLAYBACK_RATES)[number]>(1);
	const [hasError, setHasError] = useState(false);

	const waveform = useMemo(() => buildWaveform(audioUrl), [audioUrl]);
	const progress = duration > 0 ? currentTime / duration : 0;

	useEffect(() => {
		const audio = audioRef.current;
		if (!audio) return;
		audio.playbackRate = playbackRate;
	}, [playbackRate]);

	function togglePlayback() {
		const audio = audioRef.current;
		if (!audio) return;
		if (isPlaying) {
			audio.pause();
			return;
		}
		void audio.play().catch(() => setHasError(true));
	}

	function seekToRatio(ratio: number) {
		const audio = audioRef.current;
		if (!audio || !Number.isFinite(audio.duration)) return;
		audio.currentTime = Math.min(Math.max(ratio, 0), 1) * audio.duration;
	}

	if (hasError) {
		return <p className={cn("text-xs opacity-70", className)}>Não foi possível carregar o áudio.</p>;
	}

	return (
		<div className={cn("flex w-full max-w-[17rem] items-center gap-2", className)}>
			<audio
				ref={audioRef}
				src={audioUrl}
				preload="metadata"
				onLoadedMetadata={(event) => setDuration(event.currentTarget.duration)}
				onTimeUpdate={(event) => setCurrentTime(event.currentTarget.currentTime)}
				onPlay={() => setIsPlaying(true)}
				onPause={() => setIsPlaying(false)}
				onEnded={() => {
					setIsPlaying(false);
					setCurrentTime(0);
				}}
				onError={() => setHasError(true)}
			>
				<track kind="captions" />
			</audio>

			<button
				type="button"
				onClick={togglePlayback}
				aria-label={isPlaying ? "Pausar áudio" : `Reproduzir áudio${fileName ? `: ${fileName}` : ""}`}
				className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-current/15 transition-colors hover:bg-current/25 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-current/30"
			>
				{isPlaying ? <Pause className="h-4 w-4 fill-current" /> : <Play className="ml-0.5 h-4 w-4 fill-current" />}
			</button>

			<div className="flex min-w-0 flex-1 flex-col gap-1">
				{/*
				  O slider é o controle real de busca — a waveform é a pista visual dele.
				  Um input range nativo dá teclado, leitor de tela e arrasto de graça; o
				  desenho por cima é puramente decorativo e não recebe eventos.
				*/}
				<div className="relative h-7">
					<div aria-hidden className="pointer-events-none absolute inset-0 flex items-center gap-[2px]">
						{waveform.map((height, index) => (
							<span
								key={`${audioUrl}-bar-${index}`}
								style={{ height: `${Math.round(height * 100)}%` }}
								className={cn("flex-1 rounded-full transition-opacity", index / WAVEFORM_BARS <= progress ? "bg-current opacity-90" : "bg-current opacity-30")}
							/>
						))}
					</div>
					<input
						type="range"
						min={0}
						max={1000}
						value={Math.round(progress * 1000)}
						onChange={(event) => seekToRatio(Number(event.target.value) / 1000)}
						aria-label="Posição do áudio"
						aria-valuetext={`${formatDuration(currentTime)} de ${formatDuration(duration)}`}
						className="absolute inset-0 h-full w-full cursor-pointer appearance-none bg-transparent focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-current/30 [&::-moz-range-thumb]:h-7 [&::-moz-range-thumb]:w-1 [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:bg-current [&::-webkit-slider-thumb]:h-7 [&::-webkit-slider-thumb]:w-1 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:bg-current"
					/>
				</div>

				<div className="flex items-center justify-between text-[11px] tabular-nums opacity-70">
					<span>{formatDuration(currentTime)}</span>
					<button
						type="button"
						onClick={() => setPlaybackRate(PLAYBACK_RATES[(PLAYBACK_RATES.indexOf(playbackRate) + 1) % PLAYBACK_RATES.length])}
						aria-label={`Velocidade de reprodução: ${playbackRate}x. Tocar para alterar.`}
						className="rounded-full bg-current/15 px-1.5 font-bold transition-colors hover:bg-current/25 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-current/30"
					>
						{playbackRate}x
					</button>
					<span>{formatDuration(duration)}</span>
				</div>
			</div>
		</div>
	);
}
