import { BLOG_POSTS } from "@/app/_content/blog-posts";
import { FEATURE_PAGES } from "@/app/_content/feature-pages";
import { BlogPostCard } from "@/components/Content/BlogPostCard";
import { FeatureCard } from "@/components/Content/FeatureCard";
import type { Metadata } from "next";

export const metadata: Metadata = {
	title: "Blog — Estratégias de retenção para o varejo",
	description:
		"Artigos, casos de uso e guias práticos para donos de lojas físicas que querem aumentar a fidelização de clientes, reduzir o churn e crescer com o RecompraCRM.",
	alternates: {
		canonical: "https://recompracrm.com.br/blog",
	},
	openGraph: {
		title: "Blog RecompraCRM — Estratégias de retenção para o varejo",
		description:
			"Artigos, casos de uso e guias práticos para donos de lojas físicas que querem aumentar a fidelização de clientes.",
		url: "https://recompracrm.com.br/blog",
		type: "website",
	},
};

export default function BlogIndexPage() {
	const casosDeUso = BLOG_POSTS.filter((p) => p.category === "casos-de-uso");
	const outros = BLOG_POSTS.filter((p) => p.category !== "casos-de-uso");

	return (
		<main className="pt-24 pb-20 px-6">
			<div className="container mx-auto max-w-5xl">
				{/* Page Header */}
				<div className="text-center mb-14">
					<span className="inline-block text-xs font-bold text-[#24549C] bg-blue-50 px-4 py-2 rounded-full mb-5 uppercase tracking-widest">
						Blog & Recursos
					</span>
					<h1 className="text-4xl sm:text-5xl font-black text-slate-900 tracking-tight mb-4">
						Estratégias para <span className="text-[#24549C]">vender mais</span> e{" "}
						<span className="text-[#24549C]">fidelizar clientes</span>
					</h1>
					<p className="text-lg text-slate-500 max-w-2xl mx-auto leading-relaxed">
						Guias práticos, casos de uso e ideias acionáveis para donos de lojas físicas que querem crescer sem aumentar o
						custo de aquisição.
					</p>
				</div>

				{/* Casos de Uso */}
				{casosDeUso.length > 0 && (
					<section className="mb-16">
						<div className="flex items-center gap-3 mb-8">
							<h2 className="text-xl font-black text-slate-900">Casos de Uso por Segmento</h2>
							<div className="flex-1 h-px bg-slate-100" />
						</div>
						<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
							{casosDeUso.map((post) => (
								<BlogPostCard key={post.slug} post={post} />
							))}
						</div>
					</section>
				)}

				{/* Funcionalidades */}
				{FEATURE_PAGES.length > 0 && (
					<section className="mb-16">
						<div className="flex items-center gap-3 mb-8">
							<h2 className="text-xl font-black text-slate-900">Conheça as Funcionalidades</h2>
							<div className="flex-1 h-px bg-slate-100" />
						</div>
						<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
							{FEATURE_PAGES.map((feature) => (
								<FeatureCard key={feature.slug} feature={feature} />
							))}
						</div>
					</section>
				)}

				{/* Other posts */}
				{outros.length > 0 && (
					<section>
						<div className="flex items-center gap-3 mb-8">
							<h2 className="text-xl font-black text-slate-900">Outros Artigos</h2>
							<div className="flex-1 h-px bg-slate-100" />
						</div>
						<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
							{outros.map((post) => (
								<BlogPostCard key={post.slug} post={post} />
							))}
						</div>
					</section>
				)}

				{/* Empty state */}
				{BLOG_POSTS.length === 0 && (
					<div className="text-center py-20 text-slate-400">
						<p className="text-lg font-medium">Novos artigos em breve.</p>
					</div>
				)}
			</div>
		</main>
	);
}
