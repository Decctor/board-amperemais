import { BLOG_POSTS, getBlogPost } from "@/app/_content/blog-posts";
import { ArticleCTA } from "@/components/Content/ArticleCTA";
import { ArticleHero } from "@/components/Content/ArticleHero";
import { ArticleSection } from "@/components/Content/ArticleSection";
import { RelatedPosts } from "@/components/Content/RelatedPosts";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

type Props = {
	params: Promise<{ slug: string }>;
};

export async function generateStaticParams() {
	return BLOG_POSTS.map((post) => ({ slug: post.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
	const { slug } = await params;
	const post = getBlogPost(slug);
	if (!post) return {};

	const canonicalUrl = `https://recompracrm.com.br/blog/${post.slug}`;

	return {
		title: post.title,
		description: post.description,
		keywords: post.seo.keywords,
		alternates: { canonical: canonicalUrl },
		openGraph: {
			title: post.title,
			description: post.description,
			url: canonicalUrl,
			type: "article",
			publishedTime: post.publishedAt,
		},
		twitter: {
			card: "summary_large_image",
			title: post.title,
			description: post.description,
		},
	};
}

export default async function BlogPostPage({ params }: Props) {
	const { slug } = await params;
	const post = getBlogPost(slug);
	if (!post) notFound();

	const relatedPosts = BLOG_POSTS.filter((p) => post.relatedSlugs.includes(p.slug));

	const jsonLd = {
		"@context": "https://schema.org",
		"@type": "Article",
		headline: post.title,
		description: post.description,
		datePublished: post.publishedAt,
		publisher: {
			"@type": "Organization",
			name: "RecompraCRM",
			url: "https://recompracrm.com.br",
		},
		keywords: post.seo.keywords.join(", "),
	};

	return (
		<>
			{/* JSON-LD */}
			<script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

			<ArticleHero
				emoji={post.coverEmoji}
				categoryLabel={post.categoryLabel}
				categoryHref={`/blog?categoria=${post.category}`}
				title={post.title}
				description={post.description}
				publishedAt={post.publishedAt}
				readingTime={post.readingTime}
			/>

			<div className="px-6 pb-20">
				<div className="container mx-auto max-w-3xl">
					{/* Divider */}
					<div className="h-px bg-slate-100 mb-10" />

					{/* Article body */}
					{post.sections.map((section, i) => (
						<ArticleSection key={i} section={section} />
					))}

					{/* CTA */}
					<ArticleCTA
						headline={post.cta.headline}
						sub={post.cta.sub}
						buttonText={post.cta.buttonText}
						whatsappMessage={post.cta.whatsappMessage}
					/>

					{/* Related posts */}
					<RelatedPosts posts={relatedPosts} />
				</div>
			</div>
		</>
	);
}
