"use client";

import type { TApproveOauthAuthorizationInput, TApproveOauthAuthorizationOutput } from "@/app/api/oauth/authorize/route";
import { BrandLogo } from "@/components/Brand/BrandLogo";
import { ConnectorMark } from "@/components/Brand/ConnectorMark";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { SelectGroup, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getErrorMessage } from "@/lib/errors";
import { useMutation } from "@tanstack/react-query";
import axios from "axios";
import { CircleCheck, Globe, TriangleAlert } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

type TScopeDescriptor = { scope: string; label: string; description: string };

// Valor sentinela do Select para o consentimento de plataforma — vira organizationId nulo no
// POST. Ids de organização são UUIDs, então não há colisão possível.
const PLATFORM_ACCESS_VALUE = "__PLATFORM__";

type AuthorizeConsentProps = {
	clientName: string;
	connectorCode: string;
	userName: string;
	organizations: Array<{ id: string; nome: string }>;
	defaultOrganizationId: string | null;
	organizationScopeDescriptors: TScopeDescriptor[];
	// Nulo quando o usuário não é admin ou a aplicação não comporta platform:* — a opção some.
	platformScopeDescriptors: TScopeDescriptor[] | null;
	// Conjunto do acesso geral COM gestão assistida. Nulo quando a aplicação não comporta mutação.
	platformMutationScopeDescriptors: TScopeDescriptor[] | null;
	authorizationParams: Omit<TApproveOauthAuthorizationInput, "organizationId" | "platformMutations">;
};

export function AuthorizeConsent({
	clientName,
	connectorCode,
	userName,
	organizations,
	defaultOrganizationId,
	organizationScopeDescriptors,
	platformScopeDescriptors,
	platformMutationScopeDescriptors,
	authorizationParams,
}: AuthorizeConsentProps) {
	const [selectedTarget, setSelectedTarget] = useState<string>(defaultOrganizationId ?? (platformScopeDescriptors ? PLATFORM_ACCESS_VALUE : ""));
	// Desligado por padrão: gestão assistida é decisão consciente, nunca herdada do silêncio.
	const [platformMutations, setPlatformMutations] = useState(false);
	const isPlatformSelected = selectedTarget === PLATFORM_ACCESS_VALUE;
	const scopeDescriptors = isPlatformSelected
		? platformMutations && platformMutationScopeDescriptors
			? platformMutationScopeDescriptors
			: (platformScopeDescriptors ?? organizationScopeDescriptors)
		: organizationScopeDescriptors;

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
						<div className="flex flex-col items-center gap-3 text-center">
							<ConnectorMark connectorCode={connectorCode} className="h-10 w-10 text-foreground" />
							<h1 className="text-xl font-semibold text-foreground">Autorizar {clientName}?</h1>
							<p className="text-sm text-muted-foreground">
								As ações desta conexão ficarão registradas sob a responsabilidade de <span className="font-medium text-foreground">{userName}</span>.
							</p>
						</div>

						<div className="flex flex-col gap-2">
							<p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Conectar à organização</p>
							<Select
								items={[
									...organizations.map((organization) => ({ value: organization.id, label: organization.nome })),
									...(platformScopeDescriptors
										? {
												value: PLATFORM_ACCESS_VALUE,
												label: (
													<>
														{" "}
														<span className="flex items-center gap-2">
															<Globe className="h-4 w-4" />
															Acesso geral (plataforma)
														</span>{" "}
													</>
												),
											}
										: null),
								]}
								value={selectedTarget}
								onValueChange={(value) => {
									if (value !== null) setSelectedTarget(value);
								}}
								disabled={isPending}
							>
								<SelectTrigger className="w-full">
									<SelectValue placeholder="Escolha a organização" />
								</SelectTrigger>
								<SelectContent>
									<SelectGroup>
										{organizations.map((organization) => (
											<SelectItem key={organization.id} value={organization.id}>
												{organization.nome}
											</SelectItem>
										))}
										{platformScopeDescriptors ? (
											<SelectItem value={PLATFORM_ACCESS_VALUE}>
												<span className="flex items-center gap-2">
													<Globe className="h-4 w-4" />
													Acesso geral (plataforma)
												</span>
											</SelectItem>
										) : null}
									</SelectGroup>
								</SelectContent>
							</Select>
						</div>

						{isPlatformSelected ? (
							<div className="flex flex-col gap-3">
								<div className="flex items-start gap-2 rounded-md border border-amber-500/60 bg-amber-500/10 p-3">
									<TriangleAlert className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
									<p className="text-xs text-foreground">
										<span className="font-semibold">Acesso de plataforma:</span> esta conexão enxerga{" "}
										<span className="font-semibold">todas as organizações da base</span>
										{platformMutations ? " e pode gerenciar campanhas nas contas sob gestão assistida" : ", em modo somente leitura"}. Use apenas para operação
										interna.
									</p>
								</div>
								{platformMutationScopeDescriptors ? (
									<label className="flex items-start gap-3 rounded-md border border-border p-3">
										<Checkbox
											checked={platformMutations}
											onCheckedChange={(checked) => setPlatformMutations(checked === true)}
											disabled={isPending}
											className="mt-0.5"
										/>
										<span className="flex flex-col gap-1">
											<span className="text-sm font-medium text-foreground">Gerenciar campanhas das contas gerenciadas</span>
											<span className="text-xs text-muted-foreground">
												Permite criar e ajustar campanhas e templates. Vale apenas para organizações com consultoria ativa e onde você é membro; ativação de
												campanha e envio à Meta continuam exigindo aprovação humana.
											</span>
										</span>
									</label>
								) : null}
							</div>
						) : null}

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
							<Button
								className="bg-[#24549C] hover:bg-[#1e4682] text-white"
								disabled={isPending || !selectedTarget}
								onClick={() =>
									approve({
										...authorizationParams,
										organizationId: isPlatformSelected ? null : selectedTarget,
										platformMutations: isPlatformSelected && platformMutations,
									})
								}
							>
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
