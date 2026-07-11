import { getIntegrationPage, INTEGRATION_PAGES } from "@/app/_content/integration-pages";
import { ArticleCTA } from "@/components/Content/ArticleCTA";
import { ArticleFAQ, buildFAQPageJsonLd } from "@/components/Content/ArticleFAQ";
import { IntegrationCard } from "@/components/Content/Integration/IntegrationCard";
import { IntegrationHero } from "@/components/Content/Integration/IntegrationHero";
import { IntegrationHowItWorks } from "@/components/Content/Integration/IntegrationHowItWorks";
import { IntegrationUnlocks } from "@/components/Content/Integration/IntegrationUnlocks";
import { WhatWeImportTable } from "@/components/Content/Integration/WhatWeImportTable";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { IntegrationMockup } from "../_components/mockups";

const BASE_URL = "https://www.recompracrm.com.br";

type Props = {
	params: Promise<{ slug: string }>;
};

export function generateStaticParams() {
	return INTEGRATION_PAGES.map((page) => ({ slug: page.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
	const { slug } = await params;
	const page = getIntegrationPage(slug);
	if (!page) return {};

	const canonicalUrl = `${BASE_URL}/integrations/${page.slug}`;

	return {
		title: page.title,
		description: page.description,
		keywords: page.seo.keywords,
		alternates: { canonical: canonicalUrl },
		openGraph: {
			title: page.title,
			description: page.description,
			url: canonicalUrl,
			type: "website",
		},
		twitter: {
			card: "summary_large_image",
			title: page.title,
			description: page.description,
		},
	};
}

function formatUpdatedAt(iso: string) {
	return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "long", year: "numeric" }).format(new Date(iso));
}

export default async function IntegrationDetailPage({ params }: Props) {
	const { slug } = await params;
	const page = getIntegrationPage(slug);
	if (!page) notFound();

	const canonicalUrl = `${BASE_URL}/integrations/${page.slug}`;
	const relatedIntegrations = INTEGRATION_PAGES.filter((p) => page.relatedIntegrationSlugs.includes(p.slug));

	const softwareJsonLd = {
		"@context": "https://schema.org",
		"@type": "SoftwareApplication",
		name: `RecompraCRM — Integração ${page.name}`,
		description: page.description,
		applicationCategory: "BusinessApplication",
		operatingSystem: "Web",
		offers: {
			"@type": "Offer",
			price: "0",
			priceCurrency: "BRL",
			description: "15 dias grátis, sem cartão de crédito",
		},
		publisher: {
			"@type": "Organization",
			name: "RecompraCRM",
			url: BASE_URL,
		},
		keywords: page.seo.keywords.join(", "),
	};

	const faqJsonLd = page.faqs.length > 0 ? buildFAQPageJsonLd(page.faqs) : null;

	const breadcrumbJsonLd = {
		"@context": "https://schema.org",
		"@type": "BreadcrumbList",
		itemListElement: [
			{ "@type": "ListItem", position: 1, name: "Home", item: BASE_URL },
			{ "@type": "ListItem", position: 2, name: "Integrações", item: `${BASE_URL}/integrations` },
			{ "@type": "ListItem", position: 3, name: page.name, item: canonicalUrl },
		],
	};

	const stepMockups = page.howItWorks.map((step) => <IntegrationMockup key={step.mockupKey} mockupKey={step.mockupKey} logo={page.logo} name={page.name} />);

	return (
		<>
			<script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(softwareJsonLd) }} />
			<script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }} />
			{faqJsonLd && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />}

			<IntegrationHero page={page} />

			<div className="px-6 pb-20">
				<div className="container mx-auto max-w-5xl">
					{/* Answer block — extractable definition */}
					<div className="mb-16 rounded-3xl border border-slate-200 bg-slate-50/60 p-8 sm:p-10">
						<div className="flex items-center justify-between gap-4">
							<h2 className="text-lg font-black tracking-tight text-slate-900">O que é a integração {page.name}?</h2>
							<span className="hidden whitespace-nowrap text-xs font-medium text-slate-400 sm:block">Atualizado em {formatUpdatedAt(page.updatedAt)}</span>
						</div>
						<p className="mt-4 text-lg leading-relaxed text-slate-700">{page.answerBlock}</p>
						<span className="mt-4 block text-xs font-medium text-slate-400 sm:hidden">Atualizado em {formatUpdatedAt(page.updatedAt)}</span>
					</div>

					<WhatWeImportTable name={page.name} groups={page.whatWeImport} />

					<IntegrationHowItWorks name={page.name} steps={page.howItWorks} mockups={stepMockups} />

					<IntegrationUnlocks name={page.name} unlocks={page.unlocks} />

					<ArticleCTA headline={page.cta.headline} sub={page.cta.sub} buttonText={page.cta.buttonText} whatsappMessage={page.cta.whatsappMessage} />

					<ArticleFAQ faqs={page.faqs} />

					{relatedIntegrations.length > 0 && (
						<section className="mt-16 border-t border-slate-100 pt-12">
							<h2 className="mb-8 text-xl font-black text-slate-900">Outras integrações</h2>
							<div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
								{relatedIntegrations.map((integration) => (
									<IntegrationCard key={integration.slug} integration={integration} />
								))}
							</div>
						</section>
					)}
				</div>
			</div>
		</>
	);
}
