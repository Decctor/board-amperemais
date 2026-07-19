import { buildFAQPageJsonLd } from "@/components/Content/ArticleFAQ";
import "./_components/ledger/ledger.css";
import LandingAnalyticsTracker from "./_components/LandingAnalyticsTracker";
import { LedgerCases } from "./_components/ledger/cases/Cases";
import { LANDING_FAQS, LedgerFAQ } from "./_components/ledger/FAQ";
import { LedgerClosingCTA, LedgerFooter } from "./_components/ledger/Footer";
import { LedgerFeatures } from "./_components/ledger/Features";
import { LedgerHero } from "./_components/ledger/Hero";
import { LedgerHowItWorks } from "./_components/ledger/HowItWorks";
import { LedgerIntegrations } from "./_components/ledger/Integrations";
import { LedgerNavbar } from "./_components/ledger/Navbar";
import { LedgerPartnershipProgram } from "./_components/ledger/PartnershipProgram";
import { LedgerPricing } from "./_components/ledger/Pricing";
import type { Metadata } from "next";

export const metadata: Metadata = {
	alternates: { canonical: "/" },
};

export default function LandingPage() {
	const faqJsonLd = buildFAQPageJsonLd(LANDING_FAQS);

	return (
		<div className="min-h-screen bg-[#fafaf7] text-[#171717] selection:bg-[#ffb900]/35 selection:text-[#171717]">
			{/* JSON-LD FAQPage */}
			<script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />
			<LandingAnalyticsTracker />
			<LedgerNavbar />
			<main>
				<LedgerHero />
				<LedgerHowItWorks />
				<LedgerCases />
				<LedgerFeatures />
				<LedgerIntegrations />
				<LedgerPricing />
				<LedgerPartnershipProgram />
				<LedgerFAQ />
				<LedgerClosingCTA />
			</main>
			<LedgerFooter />
		</div>
	);
}
