"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { CheckCircle2, Cloud, QrCode, Smartphone } from "lucide-react";

export type WhatsAppConnectionType = "META_CLOUD_API" | "INTERNAL_GATEWAY";

type WhatsAppConnectionTypeSelectorProps = {
	selectedType: WhatsAppConnectionType | null;
	onSelectType: (type: WhatsAppConnectionType) => void;
	disabled?: boolean;
};

export function WhatsAppConnectionTypeSelector({ selectedType, onSelectType, disabled = false }: WhatsAppConnectionTypeSelectorProps) {
	return (
		<div className="flex flex-col gap-4">
			<div className="flex flex-col">
				<h2 className="text-sm font-medium">Selecione o tipo de conexão</h2>
				<p className="text-xs text-muted-foreground">Escolha como você deseja conectar seu WhatsApp</p>
			</div>

			<div className="grid gap-4 md:grid-cols-2">
				{/* Meta Cloud API Card */}
				<Card
					className={cn(
						"cursor-pointer transition-all hover:border-primary/50",
						selectedType === "META_CLOUD_API" && "border-primary ring-2 ring-primary/20",
						disabled && "opacity-50 cursor-not-allowed",
					)}
					onClick={() => !disabled && onSelectType("META_CLOUD_API")}
				>
					<CardHeader className="pb-3">
						<div className="flex items-center justify-between">
							<div className="flex items-center gap-2">
								<div className="rounded-lg bg-blue-100 p-2">
									<Cloud className="h-5 w-5 text-blue-600" />
								</div>
								<CardTitle className="text-base">API Oficial do WhatsApp (CloudAPI)</CardTitle>
							</div>
							{selectedType === "META_CLOUD_API" && <CheckCircle2 className="h-5 w-5 text-primary" />}
						</div>
						<CardDescription className="text-xs">Conexão oficial via WhatsApp Cloud API</CardDescription>
					</CardHeader>
					<CardContent className="pt-0">
						<ul className="space-y-1.5 text-xs text-muted-foreground">
							<li className="flex items-center gap-2">
								<span className="h-1 w-1 rounded-full bg-green-500" />
								Autenticação OAuth segura
							</li>
							<li className="flex items-center gap-2">
								<span className="h-1 w-1 rounded-full bg-green-500" />
								Envio de templates aprovados
							</li>
							<li className="flex items-center gap-2">
								<span className="h-1 w-1 rounded-full bg-green-500" />
								Envio de mídia (imagens, áudios, documentos)
							</li>
							<li className="flex items-center gap-2">
								<span className="h-1 w-1 rounded-full bg-green-500" />
								Alta disponibilidade
							</li>
						</ul>
					</CardContent>
				</Card>

				{/* Internal Gateway Card */}
				<Card
					className={cn(
						"cursor-pointer transition-all hover:border-primary/50",
						selectedType === "INTERNAL_GATEWAY" && "border-primary ring-2 ring-primary/20",
						disabled && "opacity-50 cursor-not-allowed",
					)}
					onClick={() => !disabled && onSelectType("INTERNAL_GATEWAY")}
				>
					<CardHeader className="pb-3">
						<div className="flex items-center justify-between">
							<div className="flex items-center gap-2">
								<div className="rounded-lg bg-green-100 p-2">
									<QrCode className="h-5 w-5 text-green-600" />
								</div>
								<CardTitle className="text-base">API Não Oficial do WhatsApp (Baileys)</CardTitle>
							</div>
							{selectedType === "INTERNAL_GATEWAY" && <CheckCircle2 className="h-5 w-5 text-primary" />}
						</div>
						<CardDescription className="text-xs">Conexão via QR Code (Baileys)</CardDescription>
					</CardHeader>
					<CardContent className="pt-0">
						<ul className="space-y-1.5 text-xs text-muted-foreground">
							<li className="flex items-center gap-2">
								<span className="h-1 w-1 rounded-full bg-green-500" />
								Configuração rápida via QR Code
							</li>
							<li className="flex items-center gap-2">
								<span className="h-1 w-1 rounded-full bg-green-500" />
								Sem necessidade de conta Business
							</li>
							<li className="flex items-center gap-2">
								<span className="h-1 w-1 rounded-full bg-yellow-500" />
								Apenas mensagens de texto
							</li>
							<li className="flex items-center gap-2">
								<span className="h-1 w-1 rounded-full bg-yellow-500" />
								Requer reconexão periódica
							</li>
						</ul>
					</CardContent>
				</Card>
			</div>
		</div>
	);
}
