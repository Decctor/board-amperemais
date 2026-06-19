import { ArrowRight } from "lucide-react";
import Link from "next/link";
import type { FeaturePage } from "@/app/_content/feature-pages";

type FeatureCardProps = {
	feature: FeaturePage;
};

export function FeatureCard({ feature }: FeatureCardProps) {
	return (
		<Link
			href={`/features/${feature.slug}`}
			className="group flex flex-col bg-white rounded-2xl border border-slate-200 hover:border-[#24549C]/30 hover:shadow-lg hover:-translate-y-1 transition-all duration-300 overflow-hidden"
		>
			{/* Emoji cover */}
			<div className="h-36 bg-gradient-to-br from-[#24549C]/5 to-blue-50 flex items-center justify-center text-5xl">{feature.coverEmoji}</div>

			<div className="p-6 flex flex-col flex-1">
				<span className="inline-block text-xs font-bold text-[#24549C] bg-blue-50 px-3 py-1 rounded-full mb-3 w-fit">Funcionalidade</span>

				<h3 className="font-black text-slate-900 leading-snug mb-2 group-hover:text-[#24549C] transition-colors text-base sm:text-lg">
					{feature.headline}
				</h3>

				<p className="text-sm text-slate-500 leading-relaxed mb-4 flex-1">{feature.description}</p>

				<span className="inline-flex items-center gap-1 text-sm text-[#24549C] font-bold group-hover:gap-2 transition-all">
					Saiba mais <ArrowRight className="w-4 h-4" />
				</span>
			</div>
		</Link>
	);
}
