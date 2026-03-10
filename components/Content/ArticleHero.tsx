import { Calendar, Clock } from "lucide-react";
import Link from "next/link";

type ArticleHeroProps = {
	emoji: string;
	categoryLabel: string;
	categoryHref: string;
	title: string;
	description: string;
	publishedAt?: string;
	readingTime?: string;
};

export function ArticleHero({ emoji, categoryLabel, categoryHref, title, description, publishedAt, readingTime }: ArticleHeroProps) {
	const formattedDate = publishedAt
		? new Date(publishedAt).toLocaleDateString("pt-BR", { day: "numeric", month: "long", year: "numeric" })
		: null;

	return (
		<section className="bg-gradient-to-b from-slate-50 to-white pt-28 pb-12 px-6">
			<div className="container mx-auto max-w-3xl">
				{/* Breadcrumb / Category */}
				<div className="flex items-center gap-2 mb-6">
					<Link href="/blog" className="text-sm text-[#24549C] font-semibold hover:underline">
						Blog
					</Link>
					<span className="text-slate-300">/</span>
					<Link href={categoryHref} className="text-sm text-slate-500 hover:text-[#24549C] transition-colors">
						{categoryLabel}
					</Link>
				</div>

				{/* Emoji cover */}
				<div className="w-16 h-16 rounded-2xl bg-blue-50 flex items-center justify-center text-4xl mb-6 border border-blue-100">
					{emoji}
				</div>

				{/* Title */}
				<h1 className="text-3xl sm:text-4xl font-black text-slate-900 leading-tight tracking-tight mb-4">{title}</h1>

				{/* Description */}
				<p className="text-lg text-slate-600 leading-relaxed mb-6">{description}</p>

				{/* Meta */}
				{(formattedDate || readingTime) && (
					<div className="flex items-center gap-5 text-sm text-slate-400 font-medium">
						{formattedDate && (
							<span className="flex items-center gap-1.5">
								<Calendar className="w-4 h-4" />
								{formattedDate}
							</span>
						)}
						{readingTime && (
							<span className="flex items-center gap-1.5">
								<Clock className="w-4 h-4" />
								{readingTime} de leitura
							</span>
						)}
					</div>
				)}
			</div>
		</section>
	);
}
