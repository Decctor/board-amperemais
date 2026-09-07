"use client";

import { Button, type ButtonProps } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Check, Copy } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

/**
 * Copia um valor e devolve `copied` por 1,5 s. É a metade reutilizável do botão: use o hook
 * quando a affordance de cópia não for um botão de ícone (um card inteiro clicável, um item de
 * menu, um bloco de código com rótulo próprio).
 *
 * A confirmação é local — troca de ícone — e não um toast. Toast é para o que acontece longe do
 * cursor; aqui o feedback pode nascer onde o clique foi. `copyToClipboard` de `lib/utils` continua
 * existindo para o caso oposto: disparar a cópia de um lugar que não mostra estado.
 */
export function useCopyToClipboard({ resetAfterMs = 1500 }: { resetAfterMs?: number } = {}) {
	const [copied, setCopied] = useState(false);
	const timeoutRef = useRef<number | null>(null);

	useEffect(() => {
		return () => {
			if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
		};
	}, []);

	const copy = useCallback(
		async (value: string) => {
			try {
				await navigator.clipboard.writeText(value);
				setCopied(true);
				if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
				timeoutRef.current = window.setTimeout(() => setCopied(false), resetAfterMs);
				return true;
			} catch {
				toast.error("Não foi possível copiar.");
				return false;
			}
		},
		[resetAfterMs],
	);

	return { copied, copy };
}

type CopyButtonProps = Omit<ButtonProps, "onClick" | "children" | "value"> & {
	value: string;
	/** Rótulo acessível — vira `aria-label` e `title`. Ex.: "Copiar chave de acesso". */
	label: string;
};

/** Botão de ícone que copia `value` e confirma trocando o ícone. */
export function CopyButton({ value, label, className, variant = "ghost", size = "icon-xs", ...props }: CopyButtonProps) {
	const { copied, copy } = useCopyToClipboard();

	return (
		<Button
			type="button"
			variant={variant}
			size={size}
			onClick={() => void copy(value)}
			aria-label={label}
			title={label}
			className={cn("shrink-0 rounded-lg text-muted-foreground hover:text-foreground", className)}
			{...props}
		>
			{copied ? <Check className="text-success" /> : <Copy />}
			<span className="sr-only" aria-live="polite">
				{copied ? "Copiado" : ""}
			</span>
		</Button>
	);
}
