import { cva, type VariantProps } from "class-variance-authority";

/**
 * Superfície suave de um tom semântico (`DESIGN.md §2`): fundo, borda e a cor de destaque
 * exposta como `--tone-accent` para as partes internas.
 *
 * Vive fora de `Callout` e `Metric` porque os dois precisam do mesmo mapeamento — e um tom que
 * significa uma coisa no aviso e outra no indicador é como a paleta se abre de novo.
 */
export const toneSurfaceVariants = cva("", {
	variants: {
		tone: {
			danger: "border-destructive/25 bg-destructive-surface [--tone-accent:var(--destructive-surface-foreground)]",
			warning: "border-warning/35 bg-warning-surface [--tone-accent:var(--warning-surface-foreground)]",
			info: "border-info/25 bg-info-surface [--tone-accent:var(--info-surface-foreground)]",
			success: "border-success/25 bg-success-surface [--tone-accent:var(--success-surface-foreground)]",
			neutral: "border-border bg-muted/20 [--tone-accent:var(--muted-foreground)]",
			/** Sem superfície: só declara o destaque, para quando o tom pinta texto dentro de um cartão comum. */
			plain: "[--tone-accent:var(--muted-foreground)]",
		},
	},
	defaultVariants: { tone: "neutral" },
});

export type TTone = NonNullable<VariantProps<typeof toneSurfaceVariants>["tone"]>;

/** Classe do texto que herda o destaque do tom da superfície mais próxima. */
export const TONE_ACCENT_TEXT = "text-[color:var(--tone-accent)]";
