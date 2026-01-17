"use client";

import { Button } from "@/components/ui/button";
import { CheckCircle2 } from "lucide-react";
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

	const handleRedirectNow = () => {
		router.push("/dashboard");
	};

	return (
		<div className="flex flex-col items-center justify-center min-h-screen bg-linear-to-br from-gray-50 to-gray-100 p-4">
			<div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 space-y-6 text-center">
				{/* Success Icon */}
				<div className="flex justify-center">
					<div className="rounded-full bg-emerald-100 p-4">
						<CheckCircle2 className="h-16 w-16 text-emerald-600" />
					</div>
				</div>

				{/* Title */}
				<div className="space-y-2">
					<h1 className="font-bold text-3xl text-gray-900 tracking-tight">Pagamento Confirmado!</h1>
					<p className="text-gray-600 text-base">Sua assinatura foi processada com sucesso.</p>
				</div>

				{/* Message */}
				<div className="space-y-3 pt-4">
					<p className="text-gray-700 text-sm">Obrigado por escolher nosso serviço! Você já pode começar a usar todas as funcionalidades.</p>
					<p className="text-gray-500 text-sm">Redirecionando para o dashboard em {countdown} segundos...</p>
				</div>

				{/* Action Button */}
				<div className="pt-4">
					<Button
						onClick={handleRedirectNow}
						size="lg"
						className="w-full bg-[#24549C] text-white hover:bg-[#1e4682] transition-all rounded-xl py-3 font-semibold"
					>
						IR PARA O DASHBOARD AGORA
					</Button>
				</div>
			</div>
		</div>
	);
}
