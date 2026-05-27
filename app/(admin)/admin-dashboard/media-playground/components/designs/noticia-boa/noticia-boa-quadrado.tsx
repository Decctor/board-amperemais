import { NoticiaBoaComposition } from "./compositions/noticia-boa-composition";

type NoticiaBoaQuadradoPostProps = { width: number; height: number };

/** Post quadrado 1080×1080 */
export default function NoticiaBoaQuadradoPost({ width, height }: NoticiaBoaQuadradoPostProps) {
	return <NoticiaBoaComposition width={width} height={height} variant="square" className="noticia-boa-quadrado" />;
}
