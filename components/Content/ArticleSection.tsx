import type { ContentSection } from "@/app/_content/blog-posts";

type ArticleSectionProps = {
	section: ContentSection;
};

function renderBody(body: string) {
	// Supports **bold** and \n\n paragraphs and \n list items starting with •
	const paragraphs = body.split("\n\n");
	return paragraphs.map((para, i) => {
		// Bullet list paragraph (every line starts with •)
		const lines = para.split("\n");
		const isList = lines.every((l) => l.trim().startsWith("•"));
		if (isList) {
			return (
				<ul key={i} className="list-none space-y-2 my-2">
					{lines.map((line, j) => (
						<li key={j} className="flex gap-2 text-slate-700 leading-relaxed">
							<span className="text-[#24549C] mt-1 shrink-0">✓</span>
							<span dangerouslySetInnerHTML={{ __html: formatInline(line.replace(/^•\s*/, "")) }} />
						</li>
					))}
				</ul>
			);
		}
		return (
			<p key={i} className="text-slate-700 leading-relaxed" dangerouslySetInnerHTML={{ __html: formatInline(para) }} />
		);
	});
}

function formatInline(text: string): string {
	// Replace **text** with <strong>
	return text.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
}

export function ArticleSection({ section }: ArticleSectionProps) {
	if (section.type === "text") {
		return (
			<section className="mb-10">
				{section.heading && <h2 className="text-xl sm:text-2xl font-black text-slate-900 mb-4 tracking-tight">{section.heading}</h2>}
				<div className="space-y-4">{renderBody(section.body)}</div>
			</section>
		);
	}

	if (section.type === "feature-highlight") {
		return (
			<section className="mb-10 bg-blue-50 border border-blue-100 rounded-2xl p-6 sm:p-8">
				<div className="flex items-start gap-4">
					<div className="w-12 h-12 rounded-xl bg-[#24549C]/10 flex items-center justify-center text-2xl shrink-0">{section.icon}</div>
					<div className="flex-1 min-w-0">
						<h2 className="text-lg sm:text-xl font-black text-[#24549C] mb-3 tracking-tight">{section.title}</h2>
						<div className="space-y-3">{renderBody(section.body)}</div>
					</div>
				</div>
			</section>
		);
	}

	if (section.type === "stats") {
		return (
			<section className="mb-10">
				<div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
					{section.items.map((item, i) => (
						<div key={i} className="bg-slate-900 rounded-2xl p-6 text-center">
							<p className="text-4xl font-black text-[#FFB900] mb-2">{item.value}</p>
							<p className="text-sm text-slate-300 leading-snug">{item.label}</p>
						</div>
					))}
				</div>
			</section>
		);
	}

	if (section.type === "quote") {
		return (
			<section className="mb-10">
				<blockquote className="border-l-4 border-[#24549C] bg-slate-50 rounded-r-2xl pl-6 pr-6 py-5">
					<p className="text-lg italic text-slate-700 leading-relaxed mb-3">"{section.text}"</p>
					{section.author && <cite className="text-sm text-slate-500 font-medium not-italic">— {section.author}</cite>}
				</blockquote>
			</section>
		);
	}

	if (section.type === "image") {
		return (
			<section className="mb-10">
				<figure>
					<img src={section.src} alt={section.alt} className="rounded-2xl w-full object-cover" />
					{section.caption && <figcaption className="text-center text-sm text-slate-500 mt-3">{section.caption}</figcaption>}
				</figure>
			</section>
		);
	}

	return null;
}
