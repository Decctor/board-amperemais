import { TAuthUserSession } from "@/lib/authentication/types";
import { Copy, ExternalLink, QrCode } from "lucide-react";
import { Button } from "../ui/button";
import { copyToClipboard } from "@/lib/utils";
import Link from "next/link";

type PointOfInteractionLinksAndHelpersProps = {
	organization: NonNullable<TAuthUserSession["membership"]>["organizacao"];
};
export function PointOfInteractionLinksAndHelpers({ organization }: PointOfInteractionLinksAndHelpersProps) {
	const poiKioskPath = `/point-of-interaction/${organization.id}?mode=kiosk`;
	const poiMobilePath = `/point-of-interaction/${organization.id}?mode=mobile`;

	function getAbsolutePoiUrl(path: string) {
		const baseUrl = typeof window !== "undefined" ? window.location.origin : (process.env.NEXT_PUBLIC_APP_URL ?? "");
		return `${baseUrl}${path}`;
	}

	return (
		<div className="bg-card border-primary/20 flex w-full flex-col gap-3 rounded-xl border px-3 py-4 shadow-2xs md:h-full">
			<div className="flex flex-col">
				<div className="flex items-center justify-between">
					<h1 className="text-xs font-medium tracking-tight uppercase">UTILITÁRIOS</h1>
					<div className="flex items-center gap-2">
						<QrCode className="w-4 h-4 min-w-4 min-h-4" />
					</div>
				</div>
				<p className="text-[0.65rem] text-muted-foreground">Links e utilitários do Ponto de Interação.</p>
			</div>

			<div className="w-full flex flex-col gap-1.5">
				<h1 className="text-xs font-medium tracking-tight uppercase">PONTO DE INTERAÇÃO - MODO KIOSK</h1>
				<div className="bg-primary/10 flex aspect-square w-[35%] self-center items-center justify-center overflow-hidden rounded-md">
					{organization.poiQrCodeKioskDataUrl ? (
						<img
							src={organization.poiQrCodeKioskDataUrl}
							alt={`QR Code do POI kiosk da organização ${organization.nome}`}
							className="h-full w-full object-contain"
						/>
					) : (
						<p className="text-primary/70 text-center text-[0.6rem] font-medium uppercase">QR indisponível</p>
					)}
				</div>
				<div className="w-full flex items-center justify-center">
					<div className="flex items-center gap-3 px-2 py-1 rounded-lg bg-primary/10 text-primary">
						<p className="text-xs font-medium tracking-tight">LINK POI KIOSK</p>
						<div className="flex items-center gap-1.5">
							<Button
								onClick={() => copyToClipboard(getAbsolutePoiUrl(poiKioskPath))}
								size="fit"
								className="flex items-center justify-center p-2 rounded-lg"
								variant={"ghost-brand"}
							>
								<Copy className="w-4 h-4 min-w-4 min-h-4" />
							</Button>
							<Button size="fit" className="flex items-center justify-center p-2 rounded-lg" variant={"brand"} asChild>
								<Link href={poiKioskPath}>
									<ExternalLink className="w-4 h-4 min-w-4 min-h-4" />
								</Link>
							</Button>
						</div>
					</div>
				</div>
			</div>
			<div className="w-full flex flex-col gap-1.5">
				<h1 className="text-xs font-medium tracking-tight uppercase">PONTO DE INTERAÇÃO - MODO MOBILE</h1>
				<div className="bg-primary/10 flex aspect-square w-[35%] self-center items-center justify-center overflow-hidden rounded-md">
					{organization.poiQrCodeMobileDataUrl ? (
						<img
							src={organization.poiQrCodeMobileDataUrl}
							alt={`QR Code do POI mobile da organização ${organization.nome}`}
							className="h-full w-full object-contain"
						/>
					) : (
						<p className="text-primary/70 text-center text-[0.6rem] font-medium uppercase">QR indisponível</p>
					)}
				</div>
				<div className="w-full flex items-center justify-center">
					<div className="flex items-center gap-3 px-2 py-1 rounded-lg bg-primary/10 text-primary">
						<p className="text-xs font-medium tracking-tight">LINK POI MOBILE</p>
						<div className="flex items-center gap-1.5">
							<Button
								onClick={() => copyToClipboard(getAbsolutePoiUrl(poiMobilePath))}
								size="fit"
								className="flex items-center justify-center p-2 rounded-lg"
								variant={"ghost-brand"}
							>
								<Copy className="w-4 h-4 min-w-4 min-h-4" />
							</Button>
							<Button size="fit" className="flex items-center justify-center p-2 rounded-lg" variant={"brand"} asChild>
								<Link href={poiMobilePath}>
									<ExternalLink className="w-4 h-4 min-w-4 min-h-4" />
								</Link>
							</Button>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}
