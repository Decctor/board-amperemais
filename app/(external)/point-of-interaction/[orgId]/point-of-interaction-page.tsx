"use client";

import TextInput from "@/components/Inputs/TextInput";
import ResponsiveMenu from "@/components/Utils/ResponsiveMenu";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatLocation, formatToMoney, formatToPhone } from "@/lib/formatting";
import { fetchClientByLookup } from "@/lib/queries/clients";
import type { TOrganizationEntity } from "@/services/drizzle/schema";
import { ArrowRight, Building2, IdCard, Mail, MapPin, Phone, ShoppingCart, Trophy, Users } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

type ClientLookupResult = {
	id: string;
	nome: string;
	telefone: string;
	email: string | null;
	saldos: Array<{
		id: string;
		saldoValorDisponivel: number;
		saldoValorAcumuladoTotal: number;
		saldoValorResgatadoTotal: number;
	}>;
};

export default function PointOfInteractionContent({
	org,
}: {
	org: {
		id: TOrganizationEntity["id"];
		cnpj: TOrganizationEntity["cnpj"];
		nome: TOrganizationEntity["nome"];
		logoUrl: TOrganizationEntity["logoUrl"];
		telefone: TOrganizationEntity["telefone"];
	};
}) {
	const router = useRouter();
	const [showProfileMenu, setShowProfileMenu] = useState(false);
	const [phoneSearch, setPhoneSearch] = useState("");
	const [searchIsLoading, setSearchIsLoading] = useState(false);
	const [foundClient, setFoundClient] = useState<ClientLookupResult | null>(null);

	const handleSearchClient = async () => {
		if (!phoneSearch.trim()) {
			toast.error("Por favor, digite um telefone.");
			return;
		}

		setSearchIsLoading(true);
		try {
			const result = await fetchClientByLookup({ orgId: org.id, phone: phoneSearch });

			if (!result) {
				toast.error("Cliente não encontrado.");
				setFoundClient(null);
				return;
			}

			setFoundClient(result);
			toast.success("Cliente encontrado!");
		} catch (error) {
			console.error("Error searching client:", error);
			toast.error("Erro ao buscar cliente. Tente novamente.");
			setFoundClient(null);
		} finally {
			setSearchIsLoading(false);
		}
	};

	const handleAccessProfile = () => {
		if (foundClient) {
			router.push(`/point-of-interaction/${org.id}/client-profile/${foundClient.id}`);
		}
	};

	const handleCloseProfileMenu = () => {
		setShowProfileMenu(false);
		setPhoneSearch("");
		setFoundClient(null);
	};
	return (
		<div className="w-full min-h-screen bg-secondary p-6 md:p-10 flex flex-col items-center">
			{/* HEADER SIMPLIFICADO: Foco na Marca */}
			<header className="flex flex-col items-center mb-12 text-center">
				{org.logoUrl ? (
					<div className="relative w-24 h-24 md:w-32 md:h-32 mb-4 drop-shadow-sm rounded-full overflow-hidden">
						<Image src={org.logoUrl} alt={org.nome} fill className="object-contain" />
					</div>
				) : (
					<div className="w-24 h-24 md:w-32 md:h-32 bg-brand/10 rounded-full overflow-hidden flex items-center justify-center mb-4">
						<Building2 className="w-12 h-12 text-brand" />
					</div>
				)}
				<h1 className="text-3xl md:text-4xl font-black uppercase tracking-tighter">{org.nome}</h1>
				<p className="text-muted-foreground font-medium tracking-tight">TOQUE EM UMA OPÇÃO PARA COMEÇAR</p>
			</header>

			<main className="w-full max-w-5xl">
				{/* GRID DE AÇÕES: 2 colunas no tablet */}
				<div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-10">
					{/* CARD PRINCIPAL: NOVA COMPRA (MAIOR DESTAQUE) */}
					<Button
						onClick={() => router.push(`/point-of-interaction/${org.id}/new-sale`)}
						variant="default"
						className="group relative flex flex-col items-center justify-center gap-4 h-auto aspect-4/3 md:aspect-square rounded-3xl shadow-xl hover:scale-[1.02] transition-all border-none p-8 bg-brand text-brand-foreground hover:bg-brand/80"
					>
						<div className="bg-white/20 p-6 rounded-3xl group-hover:scale-110 transition-transform">
							<ShoppingCart className="w-16 h-16 md:w-20 md:h-20" />
						</div>
						<div className="text-center">
							<h3 className="text-2xl md:text-3xl font-black tracking-tight">GANHAR CASHBACK</h3>
							<p className="text-sm md:text-base opacity-90 mt-2 font-medium">
								Registre sua compra agora e <br className="hidden md:block" /> acumule saldo para usar depois.
							</p>
						</div>
						<ArrowRight className="absolute bottom-8 right-8 w-8 h-8 opacity-50" />
					</Button>

					{/* MEU PERFIL */}
					<Button
						onClick={() => setShowProfileMenu(true)}
						variant="outline"
						className="group flex flex-col items-center justify-center gap-4 h-auto aspect-4/3 md:aspect-square rounded-3xl shadow-md border-2 border-primary/20 p-8"
					>
						<div className="bg-slate-100 p-6 rounded-3xl group-hover:bg-brand/10 transition-colors">
							<Users className="w-12 h-12 md:w-16 md:h-16 text-brand" />
						</div>
						<div className="text-center">
							<h3 className="text-xl md:text-2xl font-bold tracking-tight uppercase">MEU SALDO</h3>
							<p className="text-sm text-slate-500 mt-1">
								Veja quanto você já tem <br /> de cashback acumulado.
							</p>
						</div>
					</Button>

					{/* RANKING CLIENTES */}
					<Button
						onClick={() => router.push(`/point-of-interaction/${org.id}/clients-ranking`)}
						variant="ghost"
						className="flex flex-col items-center justify-center gap-4 h-auto aspect-video rounded-3xl border-2 border-primary/20 p-6"
					>
						<Trophy className="w-10 h-10" />
						<h3 className="text-lg font-bold uppercase">RANKING CLIENTES</h3>
					</Button>

					{/* RANKING VENDEDORES */}
					<Button
						onClick={() => router.push(`/point-of-interaction/${org.id}/sellers-ranking`)}
						variant="outline"
						className="flex flex-col items-center justify-center gap-4 h-auto aspect-video rounded-3xl border-2 border-primary/20 p-6"
					>
						<Trophy className="w-10 h-10" />
						<h3 className="text-lg font-bold uppercase">RANKING VENDEDORES</h3>
					</Button>
				</div>
			</main>

			{/* MODAL DE BUSCA (Mantém a lógica, mas com ajuste visual no input) */}
			{showProfileMenu && (
				<ResponsiveMenu
					menuTitle="IDENTIFIQUE-SE"
					menuDescription="Informe seu telefone para ver seu saldo atual"
					menuActionButtonText={foundClient ? "VER MEU PERFIL" : "BUSCAR"}
					menuCancelButtonText="VOLTAR"
					closeMenu={handleCloseProfileMenu}
					actionFunction={foundClient ? handleAccessProfile : handleSearchClient}
					actionIsLoading={searchIsLoading}
					stateIsLoading={false}
					stateError={null}
					dialogVariant="sm"
				>
					<div className="py-4">
						<TextInput
							label="NÚMERO DO WHATSAPP"
							placeholder="(00) 00000-0000"
							value={formatToPhone(phoneSearch)}
							handleChange={(value) => setPhoneSearch(value)}
						/>
					</div>

					{foundClient && (
						<div className="bg-green-50 border-2 border-green-200 rounded-3xl p-6 flex flex-col items-center gap-4 animate-in zoom-in">
							<div className="text-center">
								<p className="text-green-900 font-black text-2xl uppercase italic">{foundClient.nome}</p>
								<p className="text-green-600 font-bold">{formatToPhone(foundClient.telefone)}</p>
							</div>
							<div className="bg-green-600 w-full rounded-2xl p-4 text-center text-white shadow-md">
								<p className="text-[0.6rem] font-bold opacity-80 uppercase tracking-widest">Saldo Disponível</p>
								<p className="text-3xl font-black">{formatToMoney(foundClient.saldos[0]?.saldoValorDisponivel ?? 0)}</p>
							</div>
						</div>
					)}
				</ResponsiveMenu>
			)}
		</div>
	);
}
