"use client";

import { MetaIcon, RecompraCRMIconColorful, WhatsappIcon } from "@/components/icons";
import { InternalGatewayQRConnect } from "@/components/Settings/InternalGatewayQRConnect";
import { Button } from "@/components/ui/button";
import { useWhatsappConnections } from "@/lib/queries/whatsapp-connections";
import { cn } from "@/lib/utils";
import { CheckCircle2, Cloud, QrCode } from "lucide-react";
import { useState } from "react";
import { ConnectionBrandmark } from "./ConnectionBrandmark";

export function WhatsappConnectionStage() {
	const { data: connections, isLoading, refetch } = useWhatsappConnections();
	const [showQrConnect, setShowQrConnect] = useState(false);

	const connectedPhones = (connections ?? []).flatMap((connection) =>
		connection.telefones.map((phone) => ({ id: phone.id, nome: phone.nome, numero: phone.numero })),
	);
	const hasConnection = connectedPhones.length > 0;

	return (
		<>
			<div className="flex flex-col gap-4">
				{hasConnection ? (
					<div className="flex flex-col gap-3 rounded-2xl border border-green-200 bg-green-50/60 p-5">
						<div className="flex items-center gap-2 text-green-700">
							<CheckCircle2 className="h-5 w-5" />
							<span className="font-bold tracking-tight">WhatsApp conectado</span>
						</div>
						<div className="flex flex-wrap gap-2">
							{connectedPhones.map((phone) => (
								<span key={phone.id} className="rounded-full border border-green-200 bg-white px-3 py-1 text-sm font-semibold text-gray-700">
									{phone.nome} · {phone.numero}
								</span>
							))}
						</div>
						<p className="text-sm text-green-700/80">Tudo certo para enviar mensagens. Você pode adicionar outro número agora ou seguir adiante.</p>
					</div>
				) : (
					<p className="text-sm text-muted-foreground tracking-tight">
						Conecte um número de WhatsApp para enviar suas campanhas. Escolha a conexão oficial da Meta (recomendada para volume e templates) ou a conexão
						rápida via QR Code.
					</p>
				)}

				<div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
					{/* Official Meta Cloud API */}
					<ConnectionCard
						brandmark={
							<ConnectionBrandmark
								left={<MetaIcon className="h-6 w-6 text-[#0869E1]" />}
								right={<WhatsappIcon className="h-6 w-6 text-[#25D366]" />}
							/>
						}
						title="WhatsApp Cloud API"
						badge="Oficial Meta"
						description="Conexão oficial e estável, ideal para campanhas em escala com templates aprovados pela Meta."
						action={
							<a href="/api/integrations/whatsapp/auth?redirectTo=/onboarding" className="w-full">
								<Button className="w-full gap-1.5 bg-[#24549C] text-white hover:bg-[#1a3d7a] rounded-xl">
									<Cloud className="h-4 w-4" />
									CONECTAR COM META
								</Button>
							</a>
						}
					/>

					{/* Internal Gateway / Baileys QR */}
					<ConnectionCard
						brandmark={
							<ConnectionBrandmark
								left={<RecompraCRMIconColorful className="h-6 w-6" />}
								right={<WhatsappIcon className="h-6 w-6 text-[#25D366]" />}
							/>
						}
						title="Conexão via QR Code"
						badge="Rápida"
						description="Escaneie um QR Code como no WhatsApp Web. Ideal para começar agora, sem burocracia da Meta."
						action={
							<Button onClick={() => setShowQrConnect(true)} variant="outline" className="w-full gap-1.5 rounded-xl">
								<QrCode className="h-4 w-4" />
								CONECTAR VIA QR CODE
							</Button>
						}
					/>
				</div>

				{isLoading && <p className="text-xs text-muted-foreground">Verificando conexões...</p>}
			</div>

			{showQrConnect && (
				<InternalGatewayQRConnect
					onBack={() => setShowQrConnect(false)}
					onSuccess={() => {
						setShowQrConnect(false);
						void refetch();
					}}
				/>
			)}
		</>
	);
}

function ConnectionCard({
	brandmark,
	title,
	badge,
	description,
	action,
}: {
	brandmark: React.ReactNode;
	title: string;
	badge: string;
	description: string;
	action: React.ReactNode;
}) {
	return (
		<div className={cn("flex flex-col gap-4 rounded-2xl border border-border bg-card p-5 shadow-sm")}>
			<div className="flex items-center justify-between">
				{brandmark}
				<span className="rounded-full bg-[#24549C]/10 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-[#24549C]">{badge}</span>
			</div>
			<div className="flex flex-col gap-1">
				<h3 className="font-bold text-gray-900 tracking-tight">{title}</h3>
				<p className="text-sm text-muted-foreground leading-relaxed">{description}</p>
			</div>
			<div className="mt-auto">{action}</div>
		</div>
	);
}
