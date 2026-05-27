import { ArrowRight } from "lucide-react";
import Link from "next/link";
import type { BlogPost } from "@/app/_content/blog-posts";
import { BlogPostCard } from "./BlogPostCard";

type RelatedPostsProps = {
	posts: BlogPost[];
};

export function RelatedPosts({ posts }: RelatedPostsProps) {
	if (posts.length === 0) return null;

	return (
		<section className="mt-16 pt-12 border-t border-slate-100">
			<div className="flex items-center justify-between mb-8">
				<h2 className="text-xl font-black text-slate-900">Leia também</h2>
				<Link href="/blog" className="flex items-center gap-1 text-sm text-[#24549C] font-semibold hover:underline">
					Ver todos os artigos
					<ArrowRight className="w-4 h-4" />
				</Link>
			</div>
			<div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
				{posts.map((post) => (
					<BlogPostCard key={post.slug} post={post} />
				))}
			</div>
		</section>
	);
}
