import { NoticiaBoaComposition } from "./compositions/noticia-boa-composition";

type NoticiaBoaReelsPostProps = { width: number; height: number };

/** Reels / Stories 1080×1920 */
export default function NoticiaBoaReelsPost({ width, height }: NoticiaBoaReelsPostProps) {
	return <NoticiaBoaComposition width={width} height={height} variant="reels" className="noticia-boa-reels" />;
}
