import { BrandLogo } from "@/components/Brand/BrandLogo";
import type { ReactNode } from "react";
import styles from "./onboarding.module.css";

type OnboardingShellProps = { rail: ReactNode; children: ReactNode; actions?: ReactNode; visual?: ReactNode };
export function OnboardingShell({ rail, children, actions, visual }: OnboardingShellProps) {
	return (
		<div className={styles.shell}>
			<a className={styles.skip} href="#onboarding-content">
				Ir para o formulário
			</a>
			<div className={styles.left}>
				<header className={styles.header}>
					<div className="relative h-8 w-36 shrink-0">
						<BrandLogo lockup="horizontal" tone="black" fill className="object-contain object-left dark:hidden" />
						<BrandLogo lockup="horizontal" tone="white" fill className="hidden object-contain object-left dark:block" />
					</div>
					<div className="flex min-w-0 items-center gap-2">{actions}</div>
				</header>
				<main id="onboarding-content" tabIndex={-1} className={styles.content}>
					{rail}
					{children}
				</main>
			</div>
			{visual ? (
				<aside className={styles.visual} aria-label="Sua loja, passo a passo">
					{visual}
				</aside>
			) : null}
		</div>
	);
}
