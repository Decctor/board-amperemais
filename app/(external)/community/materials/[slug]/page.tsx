"use client";

import { CommunityHeader } from "@/components/Community/CommunityHeader";
import { CommunityPageShell } from "@/components/Community/CommunityPageShell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getErrorMessage } from "@/lib/errors";
import { handleDownload } from "@/lib/files-storage";
import { MATERIAL_TYPE_LABELS } from "@/lib/community-hub";
import { claimCommunityMaterial } from "@/lib/mutations/community";
import { usePublicCommunityMaterialBySlug } from "@/lib/queries/community";
import { useUserSession } from "@/lib/queries/session";
import { cn } from "@/lib/utils";
import { useMutation } from "@tanstack/react-query";
import { ArrowRight, Check, Download, FileSpreadsheet, FileText, Loader2, Mail, ShieldCheck, UserRound } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import type React from "react";
import { use, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

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
	if (tipo === "PLANILHA") return <FileSpreadsheet className="size-12 text-primary" strokeWidth={1.5} />;
	return <FileText className="size-12 text-primary" strokeWidth={1.5} />;
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
	const materialLabel = material ? (MATERIAL_TYPE_LABELS[material.tipo as keyof typeof MATERIAL_TYPE_LABELS] ?? material.tipo) : "Material";
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
			<CommunityPageShell wide className="animate-pulse space-y-6">
				<div className="h-4 w-48 rounded bg-muted" />
				<div className="rounded-2xl border border-border bg-card p-6">
					<div className="grid gap-6 lg:grid-cols-[200px_1fr]">
						<div className="aspect-[4/5] rounded-xl bg-muted" />
						<div className="space-y-4">
							<div className="h-8 w-2/3 rounded bg-muted" />
							<div className="h-4 w-full rounded bg-muted" />
							<div className="h-32 rounded-xl bg-muted" />
						</div>
					</div>
				</div>
			</CommunityPageShell>
		);
	}

	if (error || !material) {
		return (
			<CommunityPageShell wide className="flex min-h-[50vh] items-center justify-center">
				<div className="flex max-w-md flex-col items-center gap-5 text-center">
					<div className="flex size-16 items-center justify-center rounded-2xl border border-border bg-card shadow-sm">
						<FileText className="size-8 text-muted-foreground" strokeWidth={1.5} />
					</div>
					<div className="space-y-2">
						<h1 className="text-2xl font-extrabold tracking-tight">Material não encontrado</h1>
						<p className="text-sm leading-6 text-muted-foreground">Este material não está disponível ou ainda não foi publicado.</p>
					</div>
					<Button asChild variant="outline" className="rounded-full px-6">
						<Link href="/community">Voltar para a comunidade</Link>
					</Button>
				</div>
			</CommunityPageShell>
		);
	}

	return (
		<CommunityPageShell wide className="flex flex-col gap-8">
			<CommunityHeader
				breadcrumbs={[
					{ label: "Início", href: "/community" },
					{ label: "Materiais", href: "/community/materials" },
					{ label: material.titulo },
				]}
			/>

			<article className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
				<div className="flex flex-col lg:grid lg:grid-cols-[minmax(180px,220px)_minmax(0,1fr)]">
					<div className="relative aspect-[16/10] w-full shrink-0 overflow-hidden bg-muted sm:aspect-[4/5] lg:aspect-auto lg:min-h-full">
						{material.capaUrl ? (
							<Image src={material.capaUrl} alt={landing.capaAlt || material.titulo} fill sizes="(max-width: 1024px) 220px, 220px" className="object-cover" priority />
						) : (
							<div className="flex h-full w-full flex-col items-center justify-center gap-3 p-6 text-center">
								{getMaterialIcon(material.tipo)}
								<p className="text-[11px] font-bold uppercase tracking-[0.06em] text-muted-foreground">{materialLabel}</p>
							</div>
						)}
					</div>

					<div className="flex flex-col gap-6 border-t border-border p-5 sm:p-6 lg:border-t-0 lg:border-l">
						<div className="space-y-3">
							<div className="flex flex-wrap items-center gap-2">
								<Badge variant="secondary" className="text-[10px] font-bold uppercase tracking-[0.06em]">
									{materialLabel}
								</Badge>
								<span className="text-[11px] font-medium text-muted-foreground">Gratuito</span>
							</div>
							<h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">{headline}</h1>
							<p className="max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">{subheadline}</p>
						</div>

						<div>
							<p className="mb-3 text-[11px] font-bold uppercase tracking-[0.06em] text-muted-foreground">O que você recebe</p>
							<ul className="space-y-2.5">
								{benefits.map((benefit) => (
									<li key={benefit} className="flex gap-3 text-sm leading-6 text-foreground/85">
										<span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
											<Check className="size-3" strokeWidth={2.5} />
										</span>
										<span>{benefit}</span>
									</li>
								))}
							</ul>
							{material.resumo ? <p className="mt-4 text-sm leading-6 text-muted-foreground">{material.resumo}</p> : null}
						</div>

						<div className="border-t border-border pt-6">
							<MaterialAccessForm
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
						</div>
					</div>
				</div>
			</article>

			{paraQuem.length > 0 ? (
				<section className="space-y-3">
					<h2 className="text-base font-extrabold tracking-tight">Para quem é</h2>
					<ul className="space-y-2 rounded-xl border border-border bg-card p-5">
						{paraQuem.map((item) => (
							<li key={item} className="flex gap-3 text-sm leading-6 text-foreground/85">
								<span className="mt-2 size-1.5 shrink-0 rounded-full bg-brand" aria-hidden />
								{item}
							</li>
						))}
					</ul>
				</section>
			) : null}

			{oQueVoceRecebe.length > 0 ? (
				<section className="space-y-3">
					<h2 className="text-base font-extrabold tracking-tight">O que está incluso</h2>
					<ul className="space-y-2 rounded-xl border border-border bg-card p-5">
						{oQueVoceRecebe.map((item) => (
							<li key={item} className="flex gap-3 text-sm leading-6 text-foreground/85">
								<span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
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
					<h2 className="text-base font-extrabold tracking-tight">Sobre este material</h2>
					<p className="rounded-xl border border-border bg-card p-5 text-sm leading-7 text-muted-foreground">{landing.descricaoLonga}</p>
				</section>
			) : null}
		</CommunityPageShell>
	);
}

type MaterialAccessFormProps = {
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

function MaterialAccessForm({
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
}: MaterialAccessFormProps) {
	const accessLabel = downloadUrl ? "Material liberado" : hasEmailWall ? "Liberar acesso" : "Download";
	const accessDescription = downloadUrl
		? emailWall.successMessage || "Seu arquivo está pronto. Baixe agora e salve para consultar quando quiser."
		: hasEmailWall
			? "Informe seus dados para liberar o arquivo na hora."
			: "Clique abaixo para liberar o download.";

	return (
		<div className="space-y-4">
			<div>
				<p className="text-[11px] font-bold uppercase tracking-[0.06em] text-muted-foreground">{accessLabel}</p>
				<p className="mt-1 text-sm leading-6 text-muted-foreground">{accessDescription}</p>
			</div>

			{downloadUrl ? (
				<div className="space-y-3">
					<Button type="button" className="h-11 w-full rounded-full sm:w-auto sm:px-8" onClick={onDownload}>
						<Download className="mr-2 size-4" />
						{hasDownloaded ? "Baixar novamente" : emailWall.unlockedButtonText || "Baixar material"}
					</Button>
					<p className="flex items-center gap-1.5 text-xs text-muted-foreground">
						<ShieldCheck className="size-3.5 text-primary" />
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

					<Button type="submit" disabled={isPending} className="h-11 w-full rounded-full sm:w-auto sm:px-8">
						{isPending ? (
							<>
								<Loader2 className="mr-2 size-4 animate-spin" />
								Liberando...
							</>
						) : (
							<>
								{emailWall.claimButtonText || (hasEmailWall ? "Liberar download" : "Baixar agora")}
								<ArrowRight className="ml-2 size-4" />
							</>
						)}
					</Button>

					{hasEmailWall ? (
						<p className="text-xs leading-5 text-muted-foreground">
							Usaremos seu email para enviar conteúdos sobre varejo, CRM e recompra. Você pode cancelar quando quiser.
						</p>
					) : null}
				</form>
			)}
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
			<label htmlFor={fieldId} className="text-[11px] font-bold uppercase tracking-[0.06em] text-muted-foreground">
				{label}
			</label>
			<div className="relative">
				{icon ? (
					<span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" aria-hidden>
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
					className={cn("h-11 rounded-xl bg-background", icon ? "pl-10" : "")}
				/>
			</div>
		</div>
	);
}
