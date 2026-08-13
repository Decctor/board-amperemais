import Image from "next/image";
import Link from "next/link";

export default function NotFound() {
	return (
		<main className="flex min-h-svh items-center justify-center overflow-hidden bg-[#f2e7dc] px-5 py-6 text-[#1a3d7a] sm:px-8 sm:py-8">
			<div className="flex w-full max-w-6xl flex-col items-center justify-center">
				<Image
					src="/images/recompra-404.webp"
					alt="Ilustração do símbolo RecompraCRM preservado dentro de um emblema azul quebrado diante do número 404."
					width={1536}
					height={1024}
					preload
					sizes="(max-width: 640px) 100vw, (max-height: 700px) 576px, (max-height: 900px) 768px, 1024px"
					className="h-auto w-full max-w-[min(64rem,calc((100svh-18rem)*1.5))] select-none object-contain"
					style={{
						WebkitMaskImage: "radial-gradient(ellipse 76% 72% at center, black 56%, transparent 100%)",
						maskImage: "radial-gradient(ellipse 76% 72% at center, black 56%, transparent 100%)",
					}}
				/>

				<section className="relative z-10 -mt-1 flex max-w-xl flex-col items-center text-center sm:-mt-3">
					<span className="sr-only">Erro 404. Página não encontrada.</span>
					<h1 className="text-balance text-[clamp(1.75rem,4vw,2.5rem)] leading-[1.08] font-extrabold tracking-[-0.025em] text-[#1a3d7a]">
						Ops... essa página não voltou.
					</h1>
					<p className="mt-3 max-w-md text-pretty text-sm leading-relaxed font-medium text-[#1a3d7a]/70 sm:text-base">
						O endereço pode ter mudado ou não existe mais.
					</p>
					<Link
						href="/"
						className="mt-6 inline-flex h-12 w-full max-w-sm items-center justify-center rounded-2xl bg-[#24549c] px-6 text-sm font-extrabold text-white shadow-[0_16px_40px_-12px_rgba(36,84,156,0.30),0_6px_12px_rgba(36,84,156,0.16)] transition-[transform,background-color,box-shadow] duration-200 ease-out hover:-translate-y-0.5 hover:bg-[#1a3d7a] hover:shadow-[0_18px_42px_-12px_rgba(36,84,156,0.36),0_8px_14px_rgba(36,84,156,0.18)] focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-[#24549c]/25 focus-visible:ring-offset-2 focus-visible:ring-offset-[#f2e7dc] active:translate-y-0 motion-reduce:transform-none motion-reduce:transition-none"
					>
						Voltar para o início
					</Link>
				</section>
			</div>
		</main>
	);
}
