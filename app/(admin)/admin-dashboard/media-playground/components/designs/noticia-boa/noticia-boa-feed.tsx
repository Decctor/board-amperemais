import { NoticiaBoaComposition } from "./compositions/noticia-boa-composition";

type NoticiaBoaFeedPostProps = { width: number; height: number };

/** Feed Instagram 1080×1350 — relatório semanal no WhatsApp */
export default function NoticiaBoaFeedPost({ width, height }: NoticiaBoaFeedPostProps) {
	return <NoticiaBoaComposition width={width} height={height} variant="feed" className="noticia-boa-feed" />;
}
