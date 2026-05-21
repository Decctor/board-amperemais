import { useWhatsappConnections } from "@/lib/queries/whatsapp-connections";
import { AnimatedSpinner, MetaIcon, RecompraCRMIconColorful, WhatsappIcon } from "../icons";
import { PlusIcon, XIcon } from "lucide-react";
import { TGetWhatsappConnectionsOutput } from "@/app/api/whatsapp-connections/route";
import { Button } from "../ui/button";
import Link from "next/link";

function getConnectionPhones(connections: TGetWhatsappConnectionsOutput["data"]) {
	return (
		connections
			.map((c) =>
				c.telefones.map((t) => ({
					phoneId: t.id,
					phoneNumber: t.numero,
					connectionType: c.tipoConexao,
				})),
			)
			.flat() || []
	);
}
type TConnectionPhone = ReturnType<typeof getConnectionPhones>[number];

export default function WhatsappConnectionsPills() {
	const { data: whatsappConnections, isPending, isError, isSuccess } = useWhatsappConnections();

	const connectionPhones = getConnectionPhones(whatsappConnections || []);
	return (
		<div className="flex items-center gap-3">
			{isPending ? (
				<span className="flex items-center gap-1.5 text-sm text-muted-foreground">
					<AnimatedSpinner className="w-4 h-4 min-w-4 min-h-4" />
					Buscando conexões...
				</span>
			) : null}
			{isError ? (
				<span className="flex items-center gap-1.5 text-sm text-destructive">
					<XIcon className="w-4 h-4 min-w-4 min-h-4" />
					Erro ao buscar conexões
				</span>
			) : null}
			{isSuccess ? (
				<>
					{connectionPhones.map((connection) => (
						<ConnectionPill key={connection.phoneId} connection={connection} />
					))}
					<Button variant={connectionPhones.length > 0 ? "secondary" : "default"} size="sm" className="flex items-center gap-1.5" asChild>
						<Link href="/api/integrations/whatsapp/auth" prefetch={false}>
							<PlusIcon className="w-4 h-4 min-w-4 min-h-4" />
							ADICIONAR NÚMERO
						</Link>
					</Button>
				</>
			) : null}
		</div>
	);
}

type ConnectionPillProps = {
	connection: TConnectionPhone;
};
function ConnectionPill({ connection }: ConnectionPillProps) {
	return (
		<div className="flex items-center gap-1.5 bg-secondary px-2 py-1 rounded-lg">
			<div className="flex shrink-0 items-center -space-x-3 overflow-visible">
				{connection.connectionType === "META_CLOUD_API" ? (
					<div className="ring-background flex h-6 min-h-6 w-6 min-w-6 items-center justify-center rounded-full bg-[#0869E1] text-white ring-2">
						<MetaIcon className="h-4 w-4" />
					</div>
				) : (
					<div className="ring-background z-10 flex h-6 min-h-6 w-6 min-w-6 items-center justify-center rounded-full bg-[#24549C] ring-2">
						<RecompraCRMIconColorful className="h-4 w-4" />
					</div>
				)}
				<div className="ring-background flex h-6 min-h-6 w-6 min-w-6 items-center justify-center rounded-full bg-[#25D366] text-white ring-2">
					<WhatsappIcon className="h-4 w-4 text-white" />
				</div>
			</div>

			<span className="text-xs font-medium">{connection.phoneNumber}</span>
		</div>
	);
}
