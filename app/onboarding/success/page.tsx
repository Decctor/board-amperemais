"use client";

import { BrandLogo } from "@/components/Brand/BrandLogo";
import { Button } from "@/components/ui/button";
import { ArrowRight, Check } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function OnboardingSuccessPage() {
	const router = useRouter();
	const [countdown, setCountdown] = useState(5);

	useEffect(() => {
		const timer = setInterval(() => {
			setCountdown((prev) => {
				if (prev <= 1) {
					clearInterval(timer);
					router.push("/dashboard");
					return 0;
				}
				return prev - 1;
			});
		}, 1000);
		return () => clearInterval(timer);
	}, [router]);

	return (
		<div className="flex min-h-dvh flex-col bg-background text-foreground">
			<header className="border-b border-border">
				<div className="mx-auto flex h-14 w-full max-w-[1120px] items-center px-5 lg:px-10">
					<div className="relative h-7 w-40">
						<BrandLogo lockup="horizontal" tone="black" fill className="object-contain object-left dark:hidden" />
						<BrandLogo lockup="horizontal" tone="white" fill className="hidden object-contain object-left dark:block" />
					</div>
				</div>
			</header>
			<main className="mx-auto flex w-full max-w-[560px] grow flex-col justify-center gap-6 px-5 py-12">
				<span className="flex size-10 items-center justify-center rounded-full bg-brand text-brand-foreground">
					<Check className="size-5" strokeWidth={3} />
				</span>
				<div className="flex flex-col gap-2">
					<h1 className="text-2xl font-extrabold tracking-tight">Pagamento confirmado</h1>
					<p className="text-sm text-muted-foreground">
						Sua assinatura foi processada. O painel abre em {countdown} {countdown === 1 ? "segundo" : "segundos"}.
					</p>
				</div>
				<div>
					<Button size="lg" onClick={() => router.push("/dashboard")} className="gap-1.5 font-bold">
						Ir para o painel agora
						<ArrowRight className="size-4" />
					</Button>
				</div>
			</main>
		</div>
	);
}
