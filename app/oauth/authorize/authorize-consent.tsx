"use client";

import type { TApproveOauthAuthorizationInput, TApproveOauthAuthorizationOutput } from "@/app/api/oauth/authorize/route";
import { BrandLogo } from "@/components/Brand/BrandLogo";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { getErrorMessage } from "@/lib/errors";
import { useMutation } from "@tanstack/react-query";
import axios from "axios";
import { CircleCheck } from "lucide-react";
import { toast } from "sonner";

type AuthorizeConsentProps = {
	clientName: string;
	organizationName: string;
	userName: string;
	scopeDescriptors: Array<{ scope: string; label: string; description: string }>;
	authorizationParams: TApproveOauthAuthorizationInput;
};

export function AuthorizeConsent({ clientName, organizationName, userName, scopeDescriptors, authorizationParams }: AuthorizeConsentProps) {
	const { mutate: approve, isPending } = useMutation({
		mutationKey: ["approve-oauth-authorization"],
		mutationFn: async (input: TApproveOauthAuthorizationInput) => {
			const { data } = await axios.post<TApproveOauthAuthorizationOutput>("/api/oauth/authorize", input);
			return data;
		},
		onSuccess: (data) => {
			window.location.assign(data.data.redirectUrl);
		},
		onError: (error) => toast.error(getErrorMessage(error)),
	});

	// Negar não passa pelo servidor: nenhum estado foi criado, só devolve o erro padrão ao cliente.
	function deny() {
		const denyRedirect = new URL(authorizationParams.redirectUri);
		denyRedirect.searchParams.set("error", "access_denied");
		denyRedirect.searchParams.set("error_description", "O usuário negou a autorização.");
		if (authorizationParams.state) denyRedirect.searchParams.set("state", authorizationParams.state);
		window.location.assign(denyRedirect.href);
	}

	return (
		<div className="bg-muted flex min-h-svh flex-col items-center justify-center p-6">
			<div className="w-full max-w-md flex flex-col gap-6">
				<div className="flex justify-center">
					<BrandLogo lockup="horizontal-badge" tone="color-on-light" className="h-10 w-auto object-contain" />
				</div>
				<Card>
					<CardContent className="flex flex-col gap-6 p-8">
						<div className="flex flex-col gap-2 text-center">
							<h1 className="text-xl font-semibold text-foreground">Autorizar {clientName}?</h1>
							<p className="text-sm text-muted-foreground">
								<span className="font-medium text-foreground">{clientName}</span> quer se conectar à organização{" "}
								<span className="font-medium text-foreground">{organizationName}</span>. As ações ficarão registradas sob a responsabilidade de{" "}
								<span className="font-medium text-foreground">{userName}</span>.
							</p>
						</div>
						<div className="flex flex-col gap-3">
							<p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">A aplicação poderá</p>
							<ul className="flex flex-col gap-2">
								{scopeDescriptors.map((descriptor) => (
									<li key={descriptor.scope} className="flex items-start gap-2">
										<CircleCheck className="mt-0.5 h-4 w-4 shrink-0 text-[#24549C]" />
										<div className="flex flex-col">
											<span className="text-sm font-medium text-foreground">{descriptor.label}</span>
											<span className="text-xs text-muted-foreground">{descriptor.description}</span>
										</div>
									</li>
								))}
							</ul>
						</div>
						<div className="flex flex-col gap-2">
							<Button className="bg-[#24549C] hover:bg-[#1e4682] text-white" disabled={isPending} onClick={() => approve(authorizationParams)}>
								{isPending ? "Autorizando..." : "Autorizar"}
							</Button>
							<Button variant="outline" disabled={isPending} onClick={deny}>
								Cancelar
							</Button>
						</div>
						<p className="text-center text-xs text-muted-foreground">Você pode revogar esta conexão a qualquer momento no painel, em conexões de IA.</p>
					</CardContent>
				</Card>
			</div>
		</div>
	);
}
