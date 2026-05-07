"use client";

import { LoadingButton } from "@/components/loading-button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { CheckCircle2, Send, ShieldAlert } from "lucide-react";
import { FormEvent, useState } from "react";

const fieldClassName =
	"w-full rounded-md border border-primary/20 p-3 text-sm shadow-xs outline-hidden duration-500 ease-in-out placeholder:italic focus:border-primary focus-visible:ring-ring/30";

type SubmitStatus =
	| { type: "idle"; message: "" }
	| { type: "success"; message: string }
	| { type: "error"; message: string };

export function DataExclusionRequestForm() {
	const [status, setStatus] = useState<SubmitStatus>({ type: "idle", message: "" });
	const [isSubmitting, setIsSubmitting] = useState(false);

	async function handleSubmit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		setIsSubmitting(true);
		setStatus({ type: "idle", message: "" });

		const formData = new FormData(event.currentTarget);

		try {
			const response = await fetch("/api/data-deletion-requests", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					nome: formData.get("nome"),
					email: formData.get("email"),
					telefone: formData.get("telefone"),
					identificadorMeta: formData.get("identificadorMeta"),
					detalhes: formData.get("detalhes"),
					website: formData.get("website"),
				}),
			});

			const body = await response.json();
			if (!response.ok) {
				throw new Error(body?.error?.message ?? "Não foi possível enviar a solicitação.");
			}

			event.currentTarget.reset();
			setStatus({
				type: "success",
				message: body.message ?? "Solicitação enviada com sucesso.",
			});
		} catch (error) {
			setStatus({
				type: "error",
				message: error instanceof Error ? error.message : "Não foi possível enviar a solicitação.",
			});
		} finally {
			setIsSubmitting(false);
		}
	}

	return (
		<Card className="border-primary/20 shadow-xs">
			<CardContent className="pt-6">
				<form onSubmit={handleSubmit} className="space-y-5">
					<div className="grid gap-4 sm:grid-cols-2">
						<div className="flex flex-col gap-1">
							<Label htmlFor="nome" className="text-sm font-medium tracking-tight text-primary/80">
								Nome
							</Label>
							<Input id="nome" name="nome" autoComplete="name" required placeholder="Seu nome completo" className={fieldClassName} />
						</div>

						<div className="flex flex-col gap-1">
							<Label htmlFor="email" className="text-sm font-medium tracking-tight text-primary/80">
								E-mail
							</Label>
							<Input
								id="email"
								name="email"
								type="email"
								autoComplete="email"
								required
								placeholder="voce@email.com"
								className={fieldClassName}
							/>
						</div>
					</div>

					<div className="grid gap-4 sm:grid-cols-2">
						<div className="flex flex-col gap-1">
							<Label htmlFor="telefone" className="text-sm font-medium tracking-tight text-primary/80">
								Telefone
							</Label>
							<Input id="telefone" name="telefone" type="tel" autoComplete="tel" placeholder="(00) 00000-0000" className={fieldClassName} />
						</div>

						<div className="flex flex-col gap-1">
							<Label htmlFor="identificadorMeta" className="text-sm font-medium tracking-tight text-primary/80">
								ID, perfil ou e-mail usado na Meta
							</Label>
							<Input id="identificadorMeta" name="identificadorMeta" placeholder="Opcional, se souber informar" className={fieldClassName} />
						</div>
					</div>

					<div className="hidden">
						<Label htmlFor="website">Website</Label>
						<Input id="website" name="website" tabIndex={-1} autoComplete="off" />
					</div>

					<div className="flex flex-col gap-1">
						<Label htmlFor="detalhes" className="text-sm font-medium tracking-tight text-primary/80">
							Detalhes da solicitação
						</Label>
						<Textarea
							id="detalhes"
							name="detalhes"
							required
							minLength={10}
							className={cn(fieldClassName, "min-h-32 resize-y field-sizing-content")}
							placeholder="Informe quais dados deseja excluir e qualquer detalhe que ajude a localizar seu cadastro."
						/>
					</div>

					{status.type !== "idle" ? (
						<div
							className={cn(
								"flex items-start gap-2 rounded-lg border p-3 text-sm",
								status.type === "success"
									? "border-primary/25 bg-primary/5 text-foreground"
									: "border-destructive/30 bg-destructive/5 text-destructive",
							)}
							role="status"
						>
							{status.type === "success" ? (
								<CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
							) : (
								<ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
							)}
							<span>{status.message}</span>
						</div>
					) : null}

					<LoadingButton type="submit" variant="default" className="w-full sm:w-auto" loading={isSubmitting}>
						<span className="inline-flex items-center gap-2">
							<Send className="h-4 w-4" aria-hidden />
							Enviar solicitação
						</span>
					</LoadingButton>
				</form>
			</CardContent>
		</Card>
	);
}
