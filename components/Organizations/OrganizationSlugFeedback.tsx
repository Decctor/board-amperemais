"use client";

import { ORGANIZATION_SLUG_INVALID_MESSAGE } from "@/lib/organizations/slug";
import { useOrganizationSlugAvailability } from "@/lib/queries/organizations";
import { cn } from "@/lib/utils";
import { CheckCircle2, CircleAlert, Loader2 } from "lucide-react";

type OrganizationSlugFeedbackProps = {
	slug: string;
	/** Slug já salvo da organização: quando o campo está igual a ele, não há o que verificar. */
	savedSlug?: string | null;
	onApplySuggestion?: (suggestion: string) => void;
	className?: string;
};

export function OrganizationSlugFeedback({ slug, savedSlug, onApplySuggestion, className }: OrganizationSlugFeedbackProps) {
	const isUnchanged = Boolean(savedSlug) && slug === savedSlug;
	const { data, isFetching, debouncedSlug } = useOrganizationSlugAvailability({ slug, enabled: !isUnchanged });

	if (!slug) return null;

	const origin = typeof window !== "undefined" ? window.location.origin : "";
	const previewUrl = `${origin}/shop/${slug}`;

	if (isUnchanged) {
		return <p className={cn("text-xs text-muted-foreground", className)}>Endereço atual da sua loja: {previewUrl}</p>;
	}

	if (isFetching || debouncedSlug !== slug) {
		return (
			<p className={cn("flex items-center gap-1 text-xs text-muted-foreground", className)}>
				<Loader2 className="h-3 w-3 animate-spin" />
				Verificando disponibilidade...
			</p>
		);
	}

	if (!data) return null;

	if (data.available) {
		return (
			<p className={cn("flex items-center gap-1 text-xs text-emerald-600", className)}>
				<CheckCircle2 className="h-3 w-3" />
				Disponível: {previewUrl}
			</p>
		);
	}

	if (!data.valid) {
		return (
			<p className={cn("flex items-center gap-1 text-xs text-amber-600", className)}>
				<CircleAlert className="h-3 w-3" />
				{ORGANIZATION_SLUG_INVALID_MESSAGE}
			</p>
		);
	}

	return (
		<p className={cn("flex flex-wrap items-center gap-1 text-xs text-red-600", className)}>
			<CircleAlert className="h-3 w-3" />
			Este endereço já está em uso.
			{onApplySuggestion ? (
				<button type="button" className="font-semibold underline underline-offset-2" onClick={() => onApplySuggestion(data.suggestion)}>
					Usar {data.suggestion}
				</button>
			) : null}
		</p>
	);
}
