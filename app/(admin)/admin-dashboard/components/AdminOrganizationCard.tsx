"use client";
import { formatDateAsLocale } from "@/lib/formatting";
import { Building2, Calendar, Users } from "lucide-react";
import Image from "next/image";

type AdminOrganizationCardProps = {
	id: string;
	nome: string;
	cnpj: string;
	logoUrl: string | null;
	userCount: number;
	dataInsercao: Date;
};

export default function AdminOrganizationCard({ id, nome, cnpj, logoUrl, userCount, dataInsercao }: AdminOrganizationCardProps) {
	return (
		<div className="bg-card border-primary/20 flex w-full flex-col gap-3 rounded-xl border p-4 shadow-2xs hover:shadow-md transition-shadow">
			{/* Logo e Nome */}
			<div className="flex items-center gap-3">
				<div className="relative h-16 w-16 min-w-16 min-h-16 rounded-lg overflow-hidden bg-primary/10 flex items-center justify-center">
					{logoUrl ? <Image src={logoUrl} alt={nome} fill className="object-cover" /> : <Building2 className="w-8 h-8 text-primary/40" />}
				</div>
				<div className="flex flex-col flex-1 min-w-0">
					<h3 className="text-base font-semibold tracking-tight truncate">{nome}</h3>
					<p className="text-xs text-primary/60 truncate">{cnpj}</p>
				</div>
			</div>

			{/* Informações */}
			<div className="flex items-center justify-between gap-4 pt-2 border-t border-primary/10">
				<div className="flex items-center gap-2 text-xs text-primary/70">
					<Calendar className="w-3.5 h-3.5 min-w-3.5 min-h-3.5" />
					<span>Criada em {formatDateAsLocale(dataInsercao)}</span>
				</div>
				<div className="flex items-center gap-1.5 bg-primary/10 rounded-lg px-2 py-1">
					<Users className="w-3.5 h-3.5 min-w-3.5 min-h-3.5 text-primary/70" />
					<span className="text-xs font-semibold text-primary">{userCount}</span>
				</div>
			</div>
		</div>
	);
}
