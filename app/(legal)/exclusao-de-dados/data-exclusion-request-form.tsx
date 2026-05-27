"use client";

import { LoadingButton } from "@/components/loading-button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { CheckCircle2, Send, ShieldAlert } from "lucide-react";
import { FormEvent, useState } from "react";
import { TDataDeletionRequestInput } from "../../api/data-deletion-requests/route";
import { useMutation } from "@tanstack/react-query";
import { createDataDeletionRequest } from "@/lib/mutations/utils";
import { toast } from "sonner";
import TextInput from "@/components/Inputs/TextInput";
import TextareaInput from "@/components/Inputs/TextareaInput";
import { formatToCNPJ, formatToPhone } from "@/lib/formatting";
import { Button } from "@/components/ui/button";

const fieldClassName =
	"w-full rounded-md border border-border p-3 text-sm shadow-xs outline-hidden duration-500 ease-in-out placeholder:italic focus:border-border focus-visible:ring-ring/30";

type SubmitStatus = { type: "idle"; message: "" } | { type: "success"; message: string } | { type: "error"; message: string };

export function DataExclusionRequestForm() {
	const [infoHolder, setInfoHolder] = useState<TDataDeletionRequestInput>({
		nome: "",
		email: "",
		detalhes: "",
		telefone: "",
		cnpj: "",
		website: "",
	});
	const { mutate, isPending } = useMutation({
		mutationFn: createDataDeletionRequest,
		onSuccess: () => {
			toast.success("Solicitação enviada com sucesso. Entraremos em contato sobre o andamento do pedido.");
		},
		onError: () => {
			toast.error("Erro ao enviar solicitação. Por favor, tente novamente.");
		},
	});
	return (
		<div className="bg-card border-border flex w-full flex-col gap-1 rounded-xl border px-3 py-4 shadow-2xs">
			<div className="space-y-2">
				<h2 className="text-lg font-bold tracking-tight">ENVIAR SOLICITAÇÃO</h2>
				<p className="text-sm leading-relaxed text-muted-foreground">
					As informações abaixo serão usadas apenas para processar o pedido de exclusão e entrar em contato sobre o andamento da solicitação.
				</p>
			</div>
			<form
				onSubmit={(e: FormEvent<HTMLFormElement>) => {
					e.preventDefault();
					mutate(infoHolder);
				}}
				className="space-y-5"
			>
				<TextInput
					label="Nome"
					value={infoHolder.nome}
					placeholder="Seu nome completo"
					handleChange={(value) => setInfoHolder({ ...infoHolder, nome: value })}
				/>
				<TextInput
					label="E-mail"
					value={infoHolder.email}
					placeholder="voce@email.com"
					handleChange={(value) => setInfoHolder({ ...infoHolder, email: value })}
				/>
				<TextInput
					label="Telefone"
					value={infoHolder.telefone ?? ""}
					placeholder="(00) 00000-0000"
					handleChange={(value) => setInfoHolder({ ...infoHolder, telefone: formatToPhone(value) })}
				/>
				<TextInput
					label="CNPJ"
					value={infoHolder.cnpj ?? ""}
					placeholder="00.000.000/0000-00"
					handleChange={(value) => setInfoHolder({ ...infoHolder, cnpj: formatToCNPJ(value) })}
				/>
				<TextareaInput
					label="Detalhes"
					value={infoHolder.detalhes}
					placeholder="Informe quais dados deseja excluir e qualquer detalhe que ajude a localizar seu cadastro."
					handleChange={(value) => setInfoHolder({ ...infoHolder, detalhes: value })}
				/>

				<Button type="submit" variant="default" className="flex items-center gap-2 w-full justify-center" disabled={isPending}>
					<Send className="h-4 w-4" aria-hidden />
					ENVIAR SOLICITAÇÃO
				</Button>
			</form>
		</div>
	);
}
