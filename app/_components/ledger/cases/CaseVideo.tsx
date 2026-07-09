"use client";

import { Play } from "lucide-react";
import dynamic from "next/dynamic";
import { useState } from "react";
import type { TCaseVideo } from "./cases-data";

// O MuxPlayer só é baixado quando o visitante clica no play — a landing carrega
// apenas a thumbnail (servida direto pela CDN de imagens do Mux).
const MuxPlayer = dynamic(() => import("@mux/mux-player-react"), { ssr: false });

const KIND_LABELS: Record<TCaseVideo["kind"], string> = {
	resultado: "O resultado, contado pelo cliente",
	depoimento: "Depoimento do cliente",
};

export function CaseVideo({ video, clientName }: { video: TCaseVideo; clientName: string }) {
	const [playing, setPlaying] = useState(false);

	const isPortrait = video.orientation === "portrait";
	const aspectRatio = isPortrait ? "9/16" : "16/9";
	const thumbnailSrc = `https://image.mux.com/${video.muxPlaybackId}/thumbnail.webp?time=${video.thumbnailTime ?? 0}&width=960`;

	return (
		<figure className={`w-full ${isPortrait ? "max-w-[320px] mx-auto" : ""}`}>
			<div
				className="relative overflow-hidden rounded-2xl border border-white/15 bg-black/40 shadow-[0_16px_40px_-16px_rgba(0,0,0,0.45)]"
				style={{ aspectRatio }}
			>
				{playing ? (
					<MuxPlayer
						streamType="on-demand"
						playbackId={video.muxPlaybackId}
						metadata={{ video_title: video.title }}
						accentColor="#ffb900"
						autoPlay
						style={{ width: "100%", height: "100%", aspectRatio }}
					/>
				) : (
					<button
						type="button"
						onClick={() => setPlaying(true)}
						aria-label={`Assistir: ${video.title}`}
						className="group absolute inset-0 flex w-full items-end text-left"
					>
						{/* eslint-disable-next-line @next/next/no-img-element -- thumbnail externa da CDN do Mux */}
						<img
							src={thumbnailSrc}
							alt={`Depoimento em vídeo de ${clientName}`}
							loading="lazy"
							className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
						/>
						<span className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/15 to-black/10" aria-hidden />

						{/* Play */}
						<span
							className="absolute left-1/2 top-1/2 flex h-16 w-16 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-[#ffb900] text-[#171717] shadow-[0_10px_30px_-6px_rgba(0,0,0,0.5)] transition-transform duration-300 group-hover:scale-110"
							aria-hidden
						>
							<Play className="ml-0.5 h-6 w-6 fill-current" />
						</span>

						{/* Legenda */}
						<span className="relative z-10 flex flex-col gap-1.5 p-4 lg:p-5">
							<span className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-[#ffb900]">{KIND_LABELS[video.kind]}</span>
							<span className="text-[14px] font-bold leading-snug text-white lg:text-[15px]">{video.title}</span>
						</span>
					</button>
				)}
			</div>
		</figure>
	);
}
