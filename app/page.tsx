import "./_components/ledger/ledger.css";
import LandingAnalyticsTracker from "./_components/LandingAnalyticsTracker";
import { LedgerCase } from "./_components/ledger/Case";
import { LedgerClosingCTA, LedgerFooter } from "./_components/ledger/Footer";
import { LedgerFeatures } from "./_components/ledger/Features";
import { LedgerHero } from "./_components/ledger/Hero";
import { LedgerHowItWorks } from "./_components/ledger/HowItWorks";
import { LedgerNavbar } from "./_components/ledger/Navbar";
import { LedgerPartnershipProgram } from "./_components/ledger/PartnershipProgram";
import { LedgerPricing } from "./_components/ledger/Pricing";

export default function LandingPage() {
	return (
		<div className="min-h-screen bg-[#fafaf7] text-[#171717] selection:bg-[#ffb900]/35 selection:text-[#171717]">
			<LandingAnalyticsTracker />
			<LedgerNavbar />
			<main>
				<LedgerHero />
				<LedgerHowItWorks />
				<LedgerCase />
				<LedgerFeatures />
				<LedgerPricing />
				{/* <LedgerPartnershipProgram /> */}
				<LedgerClosingCTA />
			</main>
			<LedgerFooter />
		</div>
	);
}
