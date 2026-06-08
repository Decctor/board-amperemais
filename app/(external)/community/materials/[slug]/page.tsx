"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getErrorMessage } from "@/lib/errors";
import { handleDownload } from "@/lib/files-storage";
import { claimCommunityMaterial } from "@/lib/mutations/community";
import { usePublicCommunityMaterialBySlug } from "@/lib/queries/community";
import { useUserSession } from "@/lib/queries/session";
import { cn } from "@/lib/utils";
import { useMutation } from "@tanstack/react-query";
import { ArrowRight, Check, Download, FileSpreadsheet, FileText, Loader2, LockKeyhole, Mail, ShieldCheck, UserRound } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import type React from "react";
import { use, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

declare global {
	interface Window {
		ctrl?: {
			track?: (event: string, properties?: Record<string, unknown>) => void;
			identify?: (userId: string, traits?: Record<string, unknown>) => void;
		};
	}
}

type MaterialPageProps = {
	params: Promise<{ slug: string }>;
};

type FormState = {
	email: string;
	nome: string;
	telefone: string;
	empresa: string;
	cargo: string;
};

const MATERIAL_TYPE_LABELS: Record<string, string> = {
	EBOOK: "eBook",
	PLAYBOOK: "Playbook",
	PLANILHA: "Planilha",
	TEMPLATE: "Template",
	GUIA: "Guia",
	CHECKLIST: "Checklist",
	INFOGRAFICO: "Infográfico",
	DOCUMENTO: "Documento",
};

function trackControl(event: string, properties?: Record<string, unknown>) {
	if (typeof window === "undefined") return;
	window.ctrl?.track?.(event, properties);
}

function identifyControl(email: string, traits?: Record<string, unknown>) {
	if (typeof window === "undefined") return;
	window.ctrl?.identify?.(email, traits);
}

function getAnonymousId() {
	if (typeof window === "undefined") return undefined;
	try {
		return window.localStorage.getItem("ctrl_aid") ?? undefined;
	} catch {
		return undefined;
	}
}

function getTrackingSnapshot() {
	if (typeof window === "undefined") return {};
	const searchParams = new URLSearchParams(window.location.search);
	return {
		anonymousId: getAnonymousId(),
		pageUrl: window.location.href,
		referrer: document.referrer || undefined,
		utmSource: searchParams.get("utm_source") ?? undefined,
		utmMedium: searchParams.get("utm_medium") ?? undefined,
		utmCampaign: searchParams.get("utm_campaign") ?? undefined,
		utmContent: searchParams.get("utm_content") ?? undefined,
		utmTerm: searchParams.get("utm_term") ?? undefined,
		fbclid: searchParams.get("fbclid") ?? undefined,
		gclid: searchParams.get("gclid") ?? undefined,
	};
}

function getDefaultBenefits(tipo: string) {
	if (tipo === "PLANILHA") {
		return [
			"Organize dados do varejo em uma estrutura pronta.",
			"Ganhe velocidade para analisar oportunidades.",
			"Use como base para campanhas e rotinas comerciais.",
		];
	}
	if (tipo === "CHECKLIST") {
		return [
			"Siga uma sequência objetiva de execução.",
			"Evite esquecimentos nas campanhas.",
			"Padronize uma rotina que pode ser repetida pela equipe.",
		];
	}
	return [
		"Entenda oportunidades práticas de recompra.",
		"Aplique ideias diretamente na operação do varejo.",
		"Use o material como referência para planejar campanhas.",
	];
}

function getMaterialIcon(tipo: string) {
	if (tipo === "PLANILHA") return <FileSpreadsheet className="h-14 w-14 text-[#24549c]" strokeWidth={1.5} />;
	return <FileText className="h-14 w-14 text-[#24549c]" strokeWidth={1.5} />;
}

export default function CommunityMaterialPage({ params }: MaterialPageProps) {
	const { slug } = use(params);
	const { data: material, isLoading, error } = usePublicCommunityMaterialBySlug(slug);
	const { data: session } = useUserSession();
	const [form, setForm] = useState<FormState>({ email: "", nome: "", telefone: "", empresa: "", cargo: "" });
	const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
	const [hasDownloaded, setHasDownloaded] = useState(false);

	const metadata = material?.publicMetadata ?? {};
	const emailWall = metadata.emailWall ?? { ativo: true };
	const landing = metadata.landing ?? {};
	const materialLabel = material ? (MATERIAL_TYPE_LABELS[material.tipo] ?? material.tipo) : "Material";
	const benefits = landing.beneficios?.length ? landing.beneficios : material ? getDefaultBenefits(material.tipo) : [];
	const paraQuem = landing.paraQuem ?? [];
	const oQueVoceRecebe = landing.oQueVoceRecebe ?? [];
	const requiredFields = new Set(emailWall.requiredFields ?? ["email"]);
	const headline = landing.headline || material?.titulo || "Material gratuito para varejo";
	const subheadline = landing.subheadline || material?.descricao || material?.resumo || "Preencha seu email para acessar o material.";
	const hasEmailWall = emailWall.ativo !== false;

	useEffect(() => {
		if (!material) return;
		trackControl("community_material_viewed", {
			materialId: material.id,
			slug: material.slug,
			tipo: material.tipo,
		});
	}, [material]);

	useEffect(() => {
		if (!session?.email || form.email) return;
		setForm((prev) => ({ ...prev, email: session.email, nome: prev.nome || session.nome || "" }));
	}, [session, form.email]);

	const visibleFields = useMemo(() => {
		const fields: Array<keyof FormState> = ["email"];
		for (const field of ["nome", "telefone", "empresa", "cargo"] as Array<keyof FormState>) {
			if (requiredFields.has(field)) fields.push(field);
		}
		return fields;
	}, [requiredFields]);

	const claimMutation = useMutation({
		mutationKey: ["claim-community-material", slug],
		mutationFn: async () => {
			if (!material) throw new Error("Material não encontrado.");
			if (!form.email.trim()) throw new Error("Informe seu email para liberar o material.");

			const email = form.email.trim().toLowerCase();
			const traits = {
				email,
				nome: form.nome.trim() || undefined,
				telefone: form.telefone.trim() || undefined,
				empresa: form.empresa.trim() || undefined,
				cargo: form.cargo.trim() || undefined,
				source: "community_material_claim",
				materialSlug: material.slug,
			};

			identifyControl(email, traits);
			trackControl("community_material_claimed", {
				materialId: material.id,
				slug: material.slug,
				tipo: material.tipo,
			});

			return await claimCommunityMaterial({
				slug: material.slug,
				claimKey: email,
				claimKeyType: "EMAIL",
				metadata: {
					form: traits,
					tracking: getTrackingSnapshot(),
					control: {
						identifyDispatchedAt: new Date().toISOString(),
						claimEventDispatchedAt: new Date().toISOString(),
					},
				},
			});
		},
		onSuccess: (result) => {
			setDownloadUrl(result.data.downloadUrl);
			toast.success(result.message);
		},
		onError: (claimError) => {
			toast.error(getErrorMessage(claimError));
		},
	});

	async function handleDownloadClick() {
		if (!material || !downloadUrl) return;
		trackControl("community_material_download_clicked", {
			materialId: material.id,
			slug: material.slug,
			tipo: material.tipo,
		});
		await handleDownload({ fileName: material.titulo, fileUrl: downloadUrl });
		setHasDownloaded(true);
	}

	if (isLoading) {
		return (
			<div className="mx-auto w-full max-w-6xl px-5 py-10">
				<div className="mb-8 space-y-4">
					<div className="h-6 w-32 animate-pulse rounded-full bg-[#24549c]/10" />
					<div className="h-12 w-full max-w-2xl animate-pulse rounded-xl bg-muted" />
					<div className="h-5 w-full max-w-xl animate-pulse rounded-lg bg-muted" />
				</div>
				<div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_400px]">
					<div className="h-[480px] animate-pulse rounded-2xl bg-muted" />
					<div className="h-[420px] animate-pulse rounded-2xl bg-muted" />
				</div>
			</div>
		);
	}

	if (error || !material) {
		return (
			<div className="flex min-h-[60vh] items-center justify-center px-5 py-16">
				<div className="flex max-w-md flex-col items-center gap-5 text-center">
					<div className="flex size-16 items-center justify-center rounded-2xl border border-border bg-card shadow-sm">
						<FileText className="size-8 text-muted-foreground" strokeWidth={1.5} />
					</div>
					<div className="space-y-2">
						<h1 className="text-2xl font-extrabold tracking-tight text-[#171717]">Material não encontrado</h1>
						<p className="text-sm leading-6 text-muted-foreground">Este material não está disponível ou ainda não foi publicado.</p>
					</div>
					<Button asChild variant="outline" className="h-11 rounded-xl px-6">
						<Link href="/community">Voltar para a comunidade</Link>
					</Button>
				</div>
			</div>
		);
	}

	return (
		<div className="relative overflow-hidden">
			<div
				className="pointer-events-none absolute inset-x-0 top-0 h-[420px] bg-[radial-gradient(ellipse_80%_60%_at_50%_-10%,rgba(36,84,156,0.14),transparent)]"
				aria-hidden
			/>

			<div className="relative mx-auto w-full max-w-6xl px-5 pb-10 pt-8 md:pt-12">
				<header className="mb-8 max-w-3xl space-y-4 md:mb-10">
					<div className="inline-flex items-center gap-2 rounded-full border border-[#24549c]/20 bg-[#24549c]/10 px-3 py-1 text-[11px] font-extrabold uppercase tracking-[0.08em] text-[#24549c]">
						{hasEmailWall ? <LockKeyhole className="size-3.5" /> : <Download className="size-3.5" />}
						{materialLabel} gratuito
					</div>
					<h1 className="text-[2rem] font-extrabold leading-[1.05] tracking-[-0.025em] text-[#171717] md:text-5xl lg:text-[3.25rem]">{headline}</h1>
					<p className="max-w-2xl text-base leading-relaxed text-[#737373] md:text-lg">{subheadline}</p>
					{hasEmailWall ? (
						<ul className="flex flex-wrap gap-x-4 gap-y-2 text-sm font-medium text-[#737373]">
							{["Gratuito", "Para lojistas", "Download imediato"].map((item) => (
								<li key={item} className="flex items-center gap-1.5">
									<span className="size-1.5 shrink-0 rounded-full bg-[#ffb900]" aria-hidden />
									{item}
								</li>
							))}
						</ul>
					) : null}
				</header>

				<div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_400px] lg:gap-10">
					<div className="order-2 flex flex-col gap-10 lg:order-1">
						<div className="grid gap-6 md:grid-cols-[220px_minmax(0,1fr)] md:items-start">
							<div className="relative mx-auto aspect-[4/5] w-full max-w-[220px] overflow-hidden rounded-2xl border border-[#e5e5e5] bg-white shadow-[0_1px_2px_rgba(0,0,0,0.04),0_0_0_1px_rgba(0,0,0,0.04)] md:mx-0">
								{material.capaUrl ? (
									<Image src={material.capaUrl} alt={landing.capaAlt || material.titulo} fill sizes="220px" className="object-cover" priority />
								) : (
									<div className="flex h-full w-full flex-col items-center justify-center gap-3 bg-[#f5f5f5] p-6 text-center">
										{getMaterialIcon(material.tipo)}
										<p className="text-[11px] font-extrabold uppercase tracking-[0.08em] text-[#737373]">{materialLabel}</p>
									</div>
								)}
							</div>

							<div className="space-y-5">
								<div>
									<p className="mb-3 text-[11px] font-extrabold uppercase tracking-[0.08em] text-[#737373]">O que você recebe</p>
									<ul className="space-y-3">
										{benefits.map((benefit) => (
											<li key={benefit} className="flex gap-3 text-sm leading-6 text-[#171717]/80">
												<span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-[#24549c]/10 text-[#24549c]">
													<Check className="size-3" strokeWidth={2.5} />
												</span>
												<span>{benefit}</span>
											</li>
										))}
									</ul>
								</div>
								{material.resumo ? <p className="border-t border-[#e5e5e5] pt-5 text-sm leading-6 text-[#737373]">{material.resumo}</p> : null}
							</div>
						</div>

						{paraQuem.length > 0 ? (
							<section className="space-y-3">
								<h2 className="text-lg font-extrabold tracking-tight text-[#171717]">Para quem é</h2>
								<ul className="space-y-2">
									{paraQuem.map((item) => (
										<li key={item} className="flex gap-3 text-sm leading-6 text-[#171717]/80">
											<span className="mt-2 size-1.5 shrink-0 rounded-full bg-[#ffb900]" aria-hidden />
											{item}
										</li>
									))}
								</ul>
							</section>
						) : null}

						{oQueVoceRecebe.length > 0 ? (
							<section className="space-y-3">
								<h2 className="text-lg font-extrabold tracking-tight text-[#171717]">O que está incluso</h2>
								<ul className="space-y-2">
									{oQueVoceRecebe.map((item) => (
										<li key={item} className="flex gap-3 text-sm leading-6 text-[#171717]/80">
											<span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-[#24549c]/10 text-[#24549c]">
												<Check className="size-3" strokeWidth={2.5} />
											</span>
											{item}
										</li>
									))}
								</ul>
							</section>
						) : null}

						{landing.descricaoLonga ? (
							<section className="space-y-3">
								<h2 className="text-lg font-extrabold tracking-tight text-[#171717]">Sobre este material</h2>
								<p className="max-w-prose text-sm leading-7 text-[#737373] md:text-base">{landing.descricaoLonga}</p>
							</section>
						) : null}
					</div>

					<aside className="order-1 lg:order-2 lg:sticky lg:top-8">
						<ConversionPanel
							hasEmailWall={hasEmailWall}
							downloadUrl={downloadUrl}
							hasDownloaded={hasDownloaded}
							emailWall={emailWall}
							form={form}
							setForm={setForm}
							visibleFields={visibleFields}
							isPending={claimMutation.isPending}
							onSubmit={() => claimMutation.mutate()}
							onDownload={handleDownloadClick}
						/>
					</aside>
				</div>
			</div>
		</div>
	);
}

type ConversionPanelProps = {
	hasEmailWall: boolean;
	downloadUrl: string | null;
	hasDownloaded: boolean;
	emailWall: {
		claimButtonText?: string;
		unlockedButtonText?: string;
		successMessage?: string;
	};
	form: FormState;
	setForm: React.Dispatch<React.SetStateAction<FormState>>;
	visibleFields: Array<keyof FormState>;
	isPending: boolean;
	onSubmit: () => void;
	onDownload: () => void;
};

function ConversionPanel({
	hasEmailWall,
	downloadUrl,
	hasDownloaded,
	emailWall,
	form,
	setForm,
	visibleFields,
	isPending,
	onSubmit,
	onDownload,
}: ConversionPanelProps) {
	const panelTitle = downloadUrl ? "MATERIAL LIBERADO" : hasEmailWall ? "PREENCHA OS DADOS PARA LIBERAR O DOWNLOAD" : "BAIXAR MATERIAL";

	const panelDescription = downloadUrl
		? emailWall.successMessage || "Seu arquivo está pronto. Baixe agora e salve para consultar quando quiser."
		: hasEmailWall
			? "Informe seus dados para liberar o arquivo na hora."
			: "Clique abaixo para liberar o download.";

	return (
		<div className="overflow-hidden rounded-2xl border border-[#e5e5e5] bg-white shadow-[0_12px_32px_-12px_rgba(36,84,156,0.18),0_4px_8px_rgba(0,0,0,0.04)]">
			<div className="border-b border-[#e5e5e5] bg-[#24549c] px-5 py-4">
				<p className="text-[11px] font-extrabold uppercase tracking-[0.08em] text-white/60">{hasEmailWall ? "Acesso exclusivo" : "Download direto"}</p>
				<h2 className="mt-1 text-xl font-extrabold tracking-tight text-white">{panelTitle}</h2>
			</div>

			<div className="space-y-4 p-5">
				<p className="text-sm leading-6 text-[#737373]">{panelDescription}</p>

				{downloadUrl ? (
					<div className="space-y-3">
						<Button
							type="button"
							className="h-12 w-full rounded-xl bg-[#ffb900] text-[15px] font-extrabold text-[#171717] shadow-[0_6px_14px_-4px_rgba(255,185,0,0.42),0_2px_4px_rgba(0,0,0,0.08)] hover:bg-[#e6a700]"
							onClick={onDownload}
						>
							<Download className="mr-2 size-4" />
							{hasDownloaded ? "Baixar novamente" : emailWall.unlockedButtonText || "Baixar material"}
						</Button>
						<p className="flex items-center justify-center gap-1.5 text-center text-xs text-[#737373]">
							<ShieldCheck className="size-3.5 text-[#16a34a]" />
							Link liberado para este acesso
						</p>
					</div>
				) : (
					<form
						className="space-y-3"
						onSubmit={(event) => {
							event.preventDefault();
							onSubmit();
						}}
					>
						<ClaimField
							icon={<Mail className="size-4" />}
							type="email"
							label="Email"
							placeholder="seu@email.com"
							value={form.email}
							onChange={(email) => setForm((prev) => ({ ...prev, email }))}
							required
							autoComplete="email"
						/>
						{visibleFields.includes("nome") ? (
							<ClaimField
								icon={<UserRound className="size-4" />}
								label="Nome"
								placeholder="Seu nome"
								value={form.nome}
								onChange={(nome) => setForm((prev) => ({ ...prev, nome }))}
								autoComplete="name"
							/>
						) : null}
						{visibleFields.includes("telefone") ? (
							<ClaimField
								label="Telefone"
								placeholder="Seu telefone"
								value={form.telefone}
								onChange={(telefone) => setForm((prev) => ({ ...prev, telefone }))}
								autoComplete="tel"
							/>
						) : null}
						{visibleFields.includes("empresa") ? (
							<ClaimField
								label="Empresa"
								placeholder="Nome da loja ou empresa"
								value={form.empresa}
								onChange={(empresa) => setForm((prev) => ({ ...prev, empresa }))}
								autoComplete="organization"
							/>
						) : null}
						{visibleFields.includes("cargo") ? (
							<ClaimField label="Cargo" placeholder="Seu cargo" value={form.cargo} onChange={(cargo) => setForm((prev) => ({ ...prev, cargo }))} />
						) : null}

						<Button
							type="submit"
							disabled={isPending}
							className="h-12 w-full rounded-xl bg-[#ffb900] text-[15px] font-extrabold text-[#171717] shadow-[0_6px_14px_-4px_rgba(255,185,0,0.42),0_2px_4px_rgba(0,0,0,0.08)] hover:bg-[#e6a700] disabled:opacity-70"
						>
							{isPending ? (
								<>
									<Loader2 className="mr-2 size-4 animate-spin" />
									Liberando...
								</>
							) : (
								<>
									{emailWall.claimButtonText || (hasEmailWall ? "LIBERAR DOWNLOAD" : "BAIXAR AGORA")}
									<ArrowRight className="ml-2 size-4" />
								</>
							)}
						</Button>

						{hasEmailWall ? (
							<p className="text-xs leading-5 text-[#737373]">
								Usaremos seu email para enviar conteúdos sobre varejo, CRM e recompra. Você pode cancelar quando quiser.
							</p>
						) : null}
					</form>
				)}
			</div>
		</div>
	);
}

function ClaimField({
	icon,
	label,
	value,
	onChange,
	placeholder,
	type = "text",
	required = false,
	autoComplete,
}: {
	icon?: React.ReactNode;
	label: string;
	value: string;
	onChange: (value: string) => void;
	placeholder: string;
	type?: string;
	required?: boolean;
	autoComplete?: string;
}) {
	const fieldId = `claim-${label.toLowerCase().replace(/\s+/g, "-")}`;

	return (
		<div className="space-y-1.5">
			<label htmlFor={fieldId} className="text-[11px] font-extrabold uppercase tracking-[0.08em] text-[#737373]">
				{label}
			</label>
			<div className="relative">
				{icon ? (
					<span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#737373]" aria-hidden>
						{icon}
					</span>
				) : null}
				<Input
					id={fieldId}
					type={type}
					required={required}
					value={value}
					autoComplete={autoComplete}
					onChange={(event) => onChange(event.target.value)}
					placeholder={placeholder}
					className={cn(
						"h-11 rounded-lg border-[#e5e5e5] bg-white text-sm text-[#171717] placeholder:text-[#737373]/70 focus-visible:border-[#24549c] focus-visible:ring-[3px] focus-visible:ring-[#24549c]/15",
						icon ? "pl-10" : "",
					)}
				/>
			</div>
		</div>
	);
}
