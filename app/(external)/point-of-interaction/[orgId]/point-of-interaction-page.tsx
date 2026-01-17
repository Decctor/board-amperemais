"use client";

import type { TCreatePointOfInteractionNewSaleInput } from "@/app/api/point-of-interaction/new-sale/route";
import TextInput from "@/components/Inputs/TextInput";
import ResponsiveMenuViewOnly from "@/components/Utils/ResponsiveMenuViewOnly";
import { LoadingButton } from "@/components/loading-button";
import { Button } from "@/components/ui/button";
import { getErrorMessage } from "@/lib/errors";
import { formatToCPForCNPJ, formatToMoney, formatToPhone } from "@/lib/formatting";
import { createClientViaPointOfInteraction } from "@/lib/mutations/clients";
import { useClientByLookup } from "@/lib/queries/clients";
import type { TCashbackProgramEntity, TOrganizationEntity } from "@/services/drizzle/schema";
import { useMutation } from "@tanstack/react-query";
import { ArrowRight, Building2, Coins, Loader2, ShoppingCart, Trophy } from "lucide-react";
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
	cashbackProgram,
}: {
	cashbackProgram: TCashbackProgramEntity;
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

	const allowAccumulation = cashbackProgram.acumuloPermitirViaPontoIntegracao ?? true;

	return (
		<div className="w-full min-h-screen bg-secondary p-6 md:p-10 flex flex-col items-center">
			{/* HEADER SIMPLIFICADO: Foco na Marca */}
			<header className="flex flex-col items-center mb-12 text-center">
				{org.logoUrl ? (
					<div className="relative w-16 h-16 md:w-24 md:h-24 mb-4 drop-shadow-sm rounded-full overflow-hidden">
						<Image src={org.logoUrl} alt={org.nome} fill className="object-contain" />
					</div>
				) : (
					<div className="w-16 h-16 md:w-24 md:h-24 bg-brand/10 rounded-full overflow-hidden flex items-center justify-center mb-4">
						<Building2 className="w-12 h-12 text-brand" />
					</div>
				)}
				<h1 className="text-xl md:text-2xl font-black uppercase tracking-tighter">{org.nome}</h1>
				<p className="text-muted-foreground font-medium tracking-tight">TOQUE EM UMA OPÇÃO PARA COMEÇAR</p>
			</header>

			{allowAccumulation ? (
				<PointOfInteractionWithAccumulationViaPDI
					org={org}
					cashbackProgram={cashbackProgram}
					router={router}
					handleOpenProfileMenu={() => setShowProfileMenu(true)}
				/>
			) : (
				<PointerOfInteractionWithoutAccumulationViaPDI org={org} router={router} handleOpenProfileMenu={() => setShowProfileMenu(true)} />
			)}

			{/* MODAL DE BUSCA (Mantém a lógica, mas com ajuste visual no input) */}
			{showProfileMenu ? <IdentificationMenu orgId={org.id} closeMenu={() => setShowProfileMenu(false)} /> : null}
		</div>
	);
}

type IdentificationMenuProps = {
	orgId: string;
	closeMenu: () => void;
	callbacks?: {
		onMutate?: () => void;
		onSuccess?: () => void;
		onError?: () => void;
		onSettled?: () => void;
	};
};
function IdentificationMenu({ orgId, closeMenu, callbacks }: IdentificationMenuProps) {
	const {
		data: client,
		isSuccess: isSuccessClient,
		isLoading: isLoadingClient,
		isError: isErrorClient,
		error: errorClient,
		params,
		updateParams,
	} = useClientByLookup({
		initialParams: {
			orgId,
			phone: "",
			clientId: null,
		},
	});

	return (
		<ResponsiveMenuViewOnly
			menuTitle="IDENTIFIQUE-SE"
			menuDescription="Informe seu telefone para ver seu saldo atual"
			menuCancelButtonText="CANCELAR"
			closeMenu={closeMenu}
			stateIsLoading={false}
			stateError={null}
		>
			<TextInput
				label="NÚMERO DO WHATSAPP"
				inputType="tel"
				placeholder="(00) 00000-0000"
				value={params.phone}
				handleChange={(value) => updateParams({ phone: formatToPhone(value) })}
			/>
			{isLoadingClient ? (
				<div className="w-full flex items-center justify-center gap-1.5">
					<Loader2 className="w-4 h-4 animate-spin" />
					<p className="text-sm text-muted-foreground">Buscando registros...</p>
				</div>
			) : null}

			{isSuccessClient && client ? (
				<div className="bg-green-50 border-2 border-green-200 rounded-3xl p-6 flex flex-col items-center gap-4 animate-in zoom-in">
					<div className="text-center">
						<p className="text-green-900 font-black text-2xl uppercase italic">{client.nome}</p>
						<p className="text-green-600 font-bold">{formatToPhone(client.telefone)}</p>
					</div>
					<div className="bg-green-600 w-full rounded-2xl p-4 text-center text-white shadow-md">
						<p className="text-[0.6rem] font-bold opacity-80 uppercase tracking-widest">Saldo Disponível</p>
						<p className="text-3xl font-black">{formatToMoney(client.saldos[0]?.saldoValorDisponivel ?? 0)}</p>
					</div>
					<Button asChild size={"fit"} className="w-full p-4 font-black">
						<Link href={`/point-of-interaction/${orgId}/client-profile/${client.id}`}>VER PERFIL</Link>
					</Button>
				</div>
			) : null}
			{isSuccessClient && !client ? <NewClientForm orgId={orgId} phone={params.phone} closeMenu={closeMenu} callbacks={callbacks} /> : null}
		</ResponsiveMenuViewOnly>
	);
}

type NewClientFormProps = {
	orgId: string;
	phone: string;
	closeMenu: () => void;
	callbacks?: {
		onMutate?: () => void;
		onSuccess?: () => void;
		onError?: () => void;
		onSettled?: () => void;
	};
};
function NewClientForm({ orgId, phone, closeMenu, callbacks }: NewClientFormProps) {
	const router = useRouter();
	const [infoHolder, setInfoHolder] = useState<Omit<TCreatePointOfInteractionNewSaleInput["client"], "telefone">>({
		nome: "",
		cpfCnpj: null,
	});
	const { mutate: handleCreateClientMutation, isPending: isCreatingClient } = useMutation({
		mutationKey: ["create-client"],
		mutationFn: createClientViaPointOfInteraction,
		onMutate: async () => {
			if (callbacks?.onMutate) callbacks.onMutate();
			return;
		},
		onSuccess: async (data) => {
			if (callbacks?.onSuccess) callbacks.onSuccess();
			toast.success(data.message);
			return router.push(`/point-of-interaction/${orgId}/client-profile/${data.data.insertedClientId}`);
		},
		onError: async (error) => {
			if (callbacks?.onError) callbacks.onError();
			return toast.error(getErrorMessage(error));
		},
		onSettled: async () => {
			if (callbacks?.onSettled) callbacks.onSettled();
			return;
		},
	});
	return (
		<div className="w-full flex flex-col gap-3">
			<p className="text-sm text-muted-foreground text-pretty">
				Oops, parece que você ainda não tem um cadastro. Por favor, preencha os dados abaixo para criar seu cadastro e começar a ganhar cashback !
			</p>
			<TextInput
				label="NOME DO CLIENTE"
				placeholder="Digite o nome do cliente"
				value={infoHolder.nome}
				handleChange={(value) => setInfoHolder((prev) => ({ ...prev, nome: value }))}
			/>
			<TextInput
				label="CPF/CNPJ"
				placeholder="Digite o CPF/CNPJ do cliente"
				value={infoHolder.cpfCnpj ?? ""}
				handleChange={(value) => setInfoHolder((prev) => ({ ...prev, cpfCnpj: formatToCPForCNPJ(value) }))}
			/>
			<LoadingButton loading={isCreatingClient} onClick={() => handleCreateClientMutation({ orgId, client: { ...infoHolder, telefone: phone } })}>
				CRIAR CADASTRO
			</LoadingButton>
		</div>
	);
}
type PointOfInteractionWithAccumulationViaPDIProps = {
	org: {
		id: TOrganizationEntity["id"];
		cnpj: TOrganizationEntity["cnpj"];
		nome: TOrganizationEntity["nome"];
		logoUrl: TOrganizationEntity["logoUrl"];
		telefone: TOrganizationEntity["telefone"];
	};
	cashbackProgram: TCashbackProgramEntity;
	router: ReturnType<typeof useRouter>;
	handleOpenProfileMenu: () => void;
};
function PointOfInteractionWithAccumulationViaPDI({
	org,
	cashbackProgram,
	router,
	handleOpenProfileMenu,
}: PointOfInteractionWithAccumulationViaPDIProps) {
	return (
		<main className="w-full max-w-5xl">
			<div className="flex items-stretch gap-6 md:gap-10">
				<div className="w-1/2 flex flex-col gap-6">
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
				</div>
				<div className="w-1/2 flex flex-col gap-6">
					{/* MEU SALDO / RESGATAR CASHBACK */}
					<Button
						onClick={handleOpenProfileMenu}
						variant="outline"
						size="fit"
						className="flex flex-col items-center justify-center gap-4 rounded-3xl border-2 border-primary/20 p-6 flex-1 w-full"
					>
						<Coins className="w-10 h-10" />
						<h3 className="text-lg font-bold uppercase">MEU SALDO</h3>
					</Button>

					{/* RANKING CLIENTES */}
					<Button
						onClick={() => router.push(`/point-of-interaction/${org.id}/clients-ranking`)}
						variant="ghost"
						size="fit"
						className="flex flex-col items-center justify-center gap-4 rounded-3xl border-2 border-primary/20 p-6 flex-1 w-full"
					>
						<Trophy className="w-10 h-10" />
						<h3 className="text-lg font-bold uppercase">RANKING CLIENTES</h3>
					</Button>

					{/* RANKING VENDEDORES */}
					<Button
						onClick={() => router.push(`/point-of-interaction/${org.id}/sellers-ranking`)}
						variant="outline"
						size="fit"
						className="flex flex-col items-center justify-center gap-4 rounded-3xl border-2 border-primary/20 p-6 flex-1 w-full"
					>
						<Trophy className="w-10 h-10" />
						<h3 className="text-lg font-bold uppercase">RANKING VENDEDORES</h3>
					</Button>
				</div>
			</div>
			{/* GRID DE AÇÕES: 2 colunas no tablet */}
		</main>
	);
}

type PointOfInteractionWithoutAccumulationViaPDIProps = {
	org: {
		id: TOrganizationEntity["id"];
		cnpj: TOrganizationEntity["cnpj"];
		nome: TOrganizationEntity["nome"];
		logoUrl: TOrganizationEntity["logoUrl"];
		telefone: TOrganizationEntity["telefone"];
	};
	router: ReturnType<typeof useRouter>;
	handleOpenProfileMenu: () => void;
};
function PointerOfInteractionWithoutAccumulationViaPDI({ org, router, handleOpenProfileMenu }: PointOfInteractionWithoutAccumulationViaPDIProps) {
	return (
		<main className="w-full max-w-5xl">
			{/* GRID DE AÇÕES: 2 colunas no tablet */}
			<div className="flex items-stretch gap-6 md:gap-10">
				<div className="w-1/2 flex flex-col gap-6">
					{/* CARD PRINCIPAL: NOVA COMPRA (MAIOR DESTAQUE) */}
					<Button
						onClick={handleOpenProfileMenu}
						variant="default"
						className="group relative flex flex-col items-center justify-center gap-4 h-auto aspect-4/3 md:aspect-square rounded-3xl shadow-xl hover:scale-[1.02] transition-all border-none p-8 bg-brand text-brand-foreground hover:bg-brand/80"
					>
						<div className="bg-white/20 p-6 rounded-3xl group-hover:scale-110 transition-transform">
							<ShoppingCart className="w-16 h-16 md:w-20 md:h-20" />
						</div>
						<div className="text-center">
							<h3 className="text-2xl md:text-3xl font-black tracking-tight">RESGATAR CASHBACK</h3>
							<p className="text-sm md:text-base opacity-90 mt-2 font-medium">
								Use seu saldo acumulado <br className="hidden md:block" /> para pagar suas compras.
							</p>
						</div>
						<ArrowRight className="absolute bottom-8 right-8 w-8 h-8 opacity-50" />
					</Button>
				</div>

				<div className="w-1/2 flex flex-col gap-6">
					{/* RANKING CLIENTES */}
					<Button
						onClick={() => router.push(`/point-of-interaction/${org.id}/clients-ranking`)}
						variant="ghost"
						size="fit"
						className="flex flex-col items-center justify-center gap-4 rounded-3xl border-2 border-primary/20 p-6 flex-1 w-full"
					>
						<Trophy className="w-10 h-10" />
						<h3 className="text-lg font-bold uppercase">RANKING DE CLIENTES</h3>
					</Button>

					{/* RANKING VENDEDORES */}
					<Button
						onClick={() => router.push(`/point-of-interaction/${org.id}/sellers-ranking`)}
						variant="outline"
						size={"fit"}
						className="flex flex-col items-center justify-center gap-4 rounded-3xl border-2 border-primary/20 p-6 flex-1 w-full"
					>
						<Trophy className="w-10 h-10" />
						<h3 className="text-lg font-bold uppercase">RANKING DE VENDEDORES</h3>
					</Button>
				</div>
			</div>
		</main>
	);
}
