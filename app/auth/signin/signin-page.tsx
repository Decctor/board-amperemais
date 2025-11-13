"use client";
import { SubmitButton } from "@/components/submit-button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/ui/password-input";
import { login } from "@/lib/authentication/actions";
import type { TLogin } from "@/lib/authentication/types";
import { useActionState, useState } from "react";

function SignInPage() {
	const [actionResult, actionMethod] = useActionState(login, {});

	return (
		<div className="grid min-h-screen place-items-center p-4">
			<Card className="w-full max-w-md">
				<CardHeader className="text-center">
					<CardTitle>Acesso a Dashboard Ampère+</CardTitle>
					<CardDescription>Acesse ao Dashboard validando sua conta</CardDescription>
				</CardHeader>
				<CardContent>
					<form action={actionMethod} className="grid gap-4">
						<div className="space-y-2">
							<Label htmlFor="username">Usuário</Label>
							<Input id="username" placeholder="meuusuario@" autoComplete="email" name="username" type="text" />
						</div>

						<div className="space-y-2">
							<Label htmlFor="password">Senha</Label>
							<PasswordInput id="password" name="password" required autoComplete="current-password" placeholder="********" />
						</div>
						{actionResult?.fieldError ? (
							<ul className="list-disc space-y-1 rounded-lg border bg-destructive/10 p-2 text-[0.8rem] font-medium text-destructive">
								{Object.values(actionResult.fieldError).map((err) => (
									<li className="ml-4" key={err}>
										{err}
									</li>
								))}
							</ul>
						) : actionResult?.formError ? (
							<p className="rounded-lg border bg-destructive/10 p-2 text-[0.8rem] font-medium text-destructive">{actionResult?.formError}</p>
						) : null}
						<SubmitButton className="w-full" aria-label="submit-btn">
							Acessar
						</SubmitButton>
					</form>
				</CardContent>
			</Card>
		</div>
	);
}

export default SignInPage;
