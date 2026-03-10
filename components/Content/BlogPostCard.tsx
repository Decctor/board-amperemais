import { Clock } from "lucide-react";
import Link from "next/link";
import type { BlogPost } from "@/app/_content/blog-posts";

type BlogPostCardProps = {
	post: BlogPost;
};

export function BlogPostCard({ post }: BlogPostCardProps) {
	const formattedDate = new Date(post.publishedAt).toLocaleDateString("pt-BR", {
		day: "numeric",
		month: "short",
		year: "numeric",
	});

	return (
		<Link
			href={`/blog/${post.slug}`}
			className="group flex flex-col bg-white rounded-2xl border border-slate-200 hover:border-[#24549C]/30 hover:shadow-lg hover:-translate-y-1 transition-all duration-300 overflow-hidden"
		>
			{/* Emoji cover */}
			<div className="h-40 bg-gradient-to-br from-blue-50 to-slate-100 flex items-center justify-center text-6xl">
				{post.coverEmoji}
			</div>

			<div className="p-6 flex flex-col flex-1">
				{/* Category badge */}
				<span className="inline-block text-xs font-bold text-[#24549C] bg-blue-50 px-3 py-1 rounded-full mb-3 w-fit">
					{post.categoryLabel}
				</span>

				{/* Title */}
				<h3 className="font-black text-slate-900 leading-snug mb-2 group-hover:text-[#24549C] transition-colors text-base sm:text-lg">
					{post.title}
				</h3>

				{/* Headline */}
				<p className="text-sm text-slate-500 leading-relaxed mb-4 flex-1">{post.headline}</p>

				{/* Meta */}
				<div className="flex items-center gap-4 text-xs text-slate-400 font-medium pt-3 border-t border-slate-100">
					<span>{formattedDate}</span>
					<span className="flex items-center gap-1">
						<Clock className="w-3 h-3" />
						{post.readingTime}
					</span>
				</div>
			</div>
		</Link>
	);
}
