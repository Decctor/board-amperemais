import { ArrowRight } from "lucide-react";

type ArticleCTAProps = {
	headline: string;
	sub: string;
	buttonText: string;
	whatsappMessage: string;
};

export function ArticleCTA({ headline, sub, buttonText, whatsappMessage }: ArticleCTAProps) {
	const encodedMessage = encodeURIComponent(whatsappMessage);
	const whatsappUrl = `https://wa.me/553499480791?text=${encodedMessage}`;

	return (
		<section className="my-14 bg-gradient-to-br from-[#24549C] to-[#1a3d7a] rounded-3xl p-8 sm:p-12 text-center relative overflow-hidden">
			{/* Subtle grid overlay */}
			<div
				className="absolute inset-0 opacity-[0.04] rounded-3xl"
				style={{
					backgroundImage: "linear-gradient(white 1px, transparent 1px), linear-gradient(90deg, white 1px, transparent 1px)",
					backgroundSize: "40px 40px",
				}}
			/>

			<div className="relative z-10">
				<div className="inline-flex items-center gap-2 bg-white/10 border border-white/20 rounded-full px-4 py-2 mb-6">
					<div className="w-2 h-2 rounded-full bg-[#FFB900]" />
					<span className="text-sm font-bold text-white/90">Demonstração gratuita</span>
				</div>

				<h2 className="text-2xl sm:text-3xl font-black text-white mb-3 leading-tight tracking-tight">{headline}</h2>
				<p className="text-white/75 mb-8 max-w-xl mx-auto leading-relaxed">{sub}</p>

				<a
					href={whatsappUrl}
					target="_blank"
					rel="noopener noreferrer"
					className="inline-flex items-center gap-2 bg-[#FFB900] hover:bg-[#e6a800] text-[#1a2f5a] px-8 py-4 rounded-2xl font-black text-base shadow-2xl shadow-black/30 hover:-translate-y-0.5 transition-all duration-300"
				>
					{buttonText}
					<ArrowRight className="w-5 h-5" />
				</a>

				<div className="flex flex-wrap items-center justify-center gap-5 text-sm text-white/55 font-medium mt-8">
					<span>✓ Sem compromisso</span>
					<span>✓ 15 dias grátis</span>
					<span>✓ Setup em menos de 1 dia</span>
				</div>
			</div>
		</section>
	);
}
