"use client";

import type { TCreateCashbackProgramRedemptionInput } from "@/app/api/cashback-programs/transactions/redemption/route";
import ResponsiveMenu from "@/components/Utils/ResponsiveMenu";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getErrorMessage } from "@/lib/errors";
import { formatDateAsLocale, formatToMoney, formatToPhone } from "@/lib/formatting";
import { createCashbackProgramRedemption } from "@/lib/mutations/cashback-programs";
import { cn } from "@/lib/utils";
import type { TCashbackProgramEntity } from "@/services/drizzle/schema/cashback-programs";
import { useMutation } from "@tanstack/react-query";
import { ArrowLeft, ArrowRight, Award, CheckCircle2, History, LockIcon, Plus, ShoppingCart, TrendingUp, Wallet, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

// --- Tipagens ---

type Transaction = {
	id: string;
	tipo: "ACÚMULO" | "RESGATE" | "EXPIRAÇÃO";
	status: "ATIVO" | "CONSUMIDO" | "EXPIRADO";
	valor: number;
	dataInsercao: Date;
	saldoValorPosterior: number;
};

type ClientProfileContentProps = {
	orgId: string;
	cashbackProgram: TCashbackProgramEntity;
	client: {
		id: string;
		nome: string;
		telefone: string;
		email: string | null;
	};
	balance: {
		saldoValorDisponivel: number;
		saldoValorAcumuladoTotal: number;
		saldoValorResgatadoTotal: number;
	};
	rankingPosition: number;
	transactions: Transaction[];
};

// --- Componente Principal ---

export default function ClientProfileContent({ orgId, cashbackProgram, client, balance, rankingPosition, transactions }: ClientProfileContentProps) {
	const router = useRouter();

	const allowAccumulation = cashbackProgram.acumuloPermitirViaPontoIntegracao;
	// Estados para o fluxo de resgate
	const [showRedemptionMenu, setShowRedemptionMenu] = useState(false);
	const [selectedRedemptionValue, setSelectedRedemptionValue] = useState<number>(0);
	const [operatorPassword, setOperatorPassword] = useState("");
	const [redemptionIsLoading, setRedemptionIsLoading] = useState(false);

	// --- Handlers de Lógica ---

	const handleRedemptionClick = (value: number) => {
		if (balance.saldoValorDisponivel < value) {
			toast.error("Saldo insuficiente para este resgate.");
			return;
		}
		setSelectedRedemptionValue(value);
		setShowRedemptionMenu(true);
	};

	const handleCloseRedemptionMenu = () => {
		setShowRedemptionMenu(false);
		setOperatorPassword("");
		setSelectedRedemptionValue(0);
	};

	return (
		<div className="min-h-screen bg-slate-50 p-4 md:p-8 flex flex-col items-center">
			<div className="w-full max-w-6xl flex flex-col gap-6">
				{/* 1. HEADER: Informações e Status (Conforme Rascunho) */}
				<header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-[2.5rem] shadow-sm border border-slate-100">
					<div className="flex items-center gap-4">
						<Button variant="ghost" size="icon" onClick={() => router.push(`/point-of-interaction/${orgId}`)} className="rounded-full">
							<ArrowLeft className="w-5 h-5" />
						</Button>
						<div>
							<h1 className="text-2xl font-black text-black uppercase italic leading-none">{client.nome}</h1>
							<p className="text-sm font-bold text-muted-foreground mt-1">{formatToPhone(client.telefone)}</p>
						</div>
					</div>

					{/* Badge de Saldo e Ranking em estilo "Pílula" */}
					<div className="flex items-center bg-brand/5 border-2 border-brand/10 rounded-full px-8 py-3 gap-8 shadow-inner">
						<div className="flex flex-col items-center border-r-2 border-brand/10 pr-8">
							<span className="text-[0.65rem] font-black text-black uppercase tracking-widest">Saldo Disponível</span>
							<span className="text-2xl font-black text-brand">{formatToMoney(balance.saldoValorDisponivel)}</span>
						</div>
						<div className="flex flex-col items-center">
							<span className="text-[0.65rem] font-black text-black uppercase tracking-widest">Ranking</span>
							<div className="flex items-center gap-1">
								<Award className="w-5 h-5 text-amber-500" />
								<span className="text-2xl font-black text-brand">#{rankingPosition}</span>
							</div>
						</div>
					</div>
				</header>
				{/* 2. BOTÃO CENTRAL: Ação de Nova Compra */}

				{allowAccumulation ? (
					<Button
						onClick={() => router.push(`/point-of-interaction/${orgId}/new-sale?clientId=${client.id}`)}
						className="w-full h-24 rounded-3xl shadow-xl shadow-brand/20 group transition-all border-none bg-brand text-brand-foreground hover:bg-brand/90"
					>
						<div className="flex items-center gap-4 text-left">
							<div className="bg-brand-foreground p-3 rounded-2xl group-hover:scale-110 transition-transform">
								<ShoppingCart className="w-8 h-8 text-brand" />
							</div>
							<div>
								<span className="block text-2xl font-black text-brand-foreground italic leading-none uppercase">Nova Compra</span>
								<span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Registre pontos e acumule cashback</span>
							</div>
						</div>
						<ArrowRight className="ml-auto mr-4 w-8 h-8 text-brand-foreground opacity-50 group-hover:translate-x-2 transition-transform" />
					</Button>
				) : null}

				{/* 3. GRID INFERIOR: Resgates e Histórico */}
				<div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
					{/* Seção de Resgate Rápido (Lado Esquerdo) */}
					<section className="md:col-span-5 bg-card rounded-[2.5rem] p-8 shadow-sm border border-brand/20">
						<div className="flex items-center gap-3 mb-8">
							<div className="p-2 bg-green-50 rounded-lg text-green-600">
								<TrendingUp className="w-5 h-5" />
							</div>
							<h2 className="text-xl font-black text-brand uppercase italic">Novo Resgate</h2>
						</div>

						<div className="grid grid-cols-1 gap-4">
							{[10, 20, 30, 50].map((value) => (
								<Button
									key={value}
									onClick={() => handleRedemptionClick(value)}
									disabled={balance.saldoValorDisponivel < value}
									variant="outline"
									className={cn(
										"h-20 rounded-2xl border-2 font-black text-xl flex justify-between px-6 transition-all",
										balance.saldoValorDisponivel >= value
											? "border-brand/20 hover:border-green-500 hover:bg-green-50 text-brand"
											: "opacity-40 bg-brand/5 italic text-muted-foreground border-transparent cursor-not-allowed",
									)}
								>
									<span>RESGATE {value}</span>
									<span className={balance.saldoValorDisponivel >= value ? "text-green-600" : ""}>{formatToMoney(value)}</span>
								</Button>
							))}
							<Button
								onClick={() => handleRedemptionClick(balance.saldoValorDisponivel)}
								disabled={balance.saldoValorDisponivel <= 0}
								variant="outline"
								className={cn(
									"h-20 rounded-2xl border-2 font-black text-xl flex justify-between px-6 transition-all",
									balance.saldoValorDisponivel > 0
										? "border-brand/20 hover:border-green-500 hover:bg-green-50 text-brand"
										: "opacity-40 bg-brand/5 italic text-muted-foreground border-transparent cursor-not-allowed",
								)}
							>
								<span>RESGATE PERSONALIZADO</span>
							</Button>
						</div>
						<div className="mt-8 p-4 bg-brand/5 rounded-2xl border border-brand/20 text-center">
							<p className="text-[0.65rem] font-bold text-muted-foreground uppercase tracking-widest leading-relaxed">
								Atenção: Todos os resgates devem ser <br /> validados pelo operador da loja.
							</p>
						</div>
					</section>

					{/* Seção de Histórico (Lado Direito) */}
					<section className="md:col-span-7 bg-card rounded-[2.5rem] p-8 shadow-sm border border-brand/20 h-full flex flex-col">
						<div className="flex items-center justify-between mb-8">
							<div className="flex items-center gap-3">
								<div className="p-2 bg-brand/5 rounded-lg text-muted-foreground">
									<History className="w-5 h-5" />
								</div>
								<h2 className="text-xl font-black text-brand uppercase italic">Histórico</h2>
							</div>
						</div>

						<div className="space-y-3 overflow-y-auto max-h-[440px] pr-2 custom-scrollbar">
							{transactions.length === 0 ? (
								<div className="flex flex-col items-center justify-center py-20 text-muted-foreground italic font-bold">
									<History className="w-12 h-12 mb-4 opacity-10" />
									Nenhuma movimentação recente.
								</div>
							) : (
								transactions.map((t) => (
									<div
										key={t.id}
										className="flex items-center justify-between p-5 rounded-2xl border border-brand/20 bg-brand/5 hover:bg-brand/10 transition-colors"
									>
										<div className="flex flex-col">
											<span className={cn("text-xs font-black uppercase tracking-widest", t.tipo === "ACÚMULO" ? "text-green-600" : "text-red-500")}>
												{t.tipo}
											</span>
											<span className="text-[0.65rem] font-bold text-muted-foreground">{formatDateAsLocale(t.dataInsercao, true)}</span>
										</div>
										<div className="text-right">
											<p className={cn("text-xl font-black leading-none", t.tipo === "ACÚMULO" ? "text-green-600" : "text-red-500")}>
												{t.tipo === "ACÚMULO" ? "+" : "-"} {formatToMoney(t.valor)}
											</p>
											<p className="text-[0.6rem] font-bold text-muted-foreground mt-1 uppercase">Saldo Final: {formatToMoney(t.saldoValorPosterior)}</p>
										</div>
									</div>
								))
							)}
						</div>
					</section>
				</div>
			</div>

			{/* 4. MODAL DE CONFIRMAÇÃO DE RESGATE */}
			{showRedemptionMenu && (
				<NewCashbackProgramRedemption
					orgId={orgId}
					clientId={client.id}
					clientAvailableBalance={balance.saldoValorDisponivel}
					initialRedemptionValue={selectedRedemptionValue}
					callbacks={{
						onSuccess() {
							handleCloseRedemptionMenu();
							router.refresh();
						},
					}}
					closeMenu={handleCloseRedemptionMenu}
				/>
			)}
		</div>
	);
}

type NewCashbackProgramRedemptionProps = {
	orgId: string;
	clientId: string;
	clientAvailableBalance: number;
	initialRedemptionValue: number;
	callbacks: {
		onMutate?: () => void;
		onSuccess?: () => void;
		onError?: () => void;
		onSettled?: () => void;
	};
	closeMenu: () => void;
};
function NewCashbackProgramRedemption({
	orgId,
	clientId,
	clientAvailableBalance,
	initialRedemptionValue,
	callbacks,
	closeMenu,
}: NewCashbackProgramRedemptionProps) {
	const [infoHolder, setInfoHolder] = useState<TCreateCashbackProgramRedemptionInput>({
		orgId,
		clientId,
		saleValue: 0,
		redemptionValue: initialRedemptionValue,
		operatorIdentifier: "",
	});

	function updateInfoHolder(changes: Partial<TCreateCashbackProgramRedemptionInput>) {
		setInfoHolder((prev) => ({ ...prev, ...changes }));
	}

	const { mutate: handleCreateCashbackProgramRedemptionMutation, isPending: isCreatingCashbackProgramRedemption } = useMutation({
		mutationKey: ["create-cashback-program-redemption"],
		mutationFn: createCashbackProgramRedemption,
		onMutate: async () => {
			if (callbacks?.onMutate) callbacks.onMutate();
			return;
		},
		onSuccess: async (data) => {
			if (callbacks?.onSuccess) callbacks.onSuccess();
			toast.success(data.message);
			return closeMenu();
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
	const valueHelpers = [10, 25, 50, 100];

	return (
		<ResponsiveMenu
			menuTitle="VALIDAR RESGATE"
			menuDescription={`Confirme o resgate de ${formatToMoney(infoHolder.redemptionValue)} para este cliente.`}
			menuActionButtonText="CONFIRMAR E BAIXAR"
			menuCancelButtonText="CANCELAR"
			closeMenu={closeMenu}
			actionFunction={() => handleCreateCashbackProgramRedemptionMutation(infoHolder)}
			actionIsLoading={isCreatingCashbackProgramRedemption}
			stateIsLoading={false}
			stateError={null}
			dialogVariant="sm"
		>
			<div className="w-full flex flex-col gap-1.5">
				<h2 className="text-xl font-medium uppercase tracking-tight">Qual o valor da compra?</h2>
				<div className="relative max-w-md mx-auto">
					<span className="absolute left-6 top-1/2 -translate-y-1/2 text-2xl font-black text-muted-foreground">R$</span>
					<Input
						type="number"
						value={infoHolder.saleValue.toString()}
						onChange={(e) => updateInfoHolder({ saleValue: Number(e.target.value) })}
						className="h-24 text-5xl font-black text-center rounded-3xl border-4 border-brand/20 focus:border-brand px-12"
					/>
				</div>
				<div className="grid grid-cols-2 md:grid-cols-4 gap-3 max-w-xl mx-auto">
					{valueHelpers.map((h) => (
						<Button
							key={h}
							variant="secondary"
							onClick={() => updateInfoHolder({ saleValue: infoHolder.saleValue + h })}
							className="h-14 rounded-xl font-black text-lg"
						>
							<Plus className="w-4 h-4 mr-1 text-brand" /> {h}
						</Button>
					))}
					<Button
						variant="ghost"
						onClick={() => updateInfoHolder({ saleValue: 0 })}
						className="h-14 rounded-xl font-bold text-muted-foreground col-span-2 md:col-span-4 italic"
					>
						<X className="w-4 h-4 mr-1" /> LIMPAR VALOR
					</Button>
				</div>
			</div>
			<div className="w-full flex flex-col gap-1.5">
				<h2 className="text-xl font-medium uppercase tracking-tight">Qual o valor do resgate?</h2>
				<div className="relative max-w-md mx-auto">
					<span className="absolute left-6 top-1/2 -translate-y-1/2 text-2xl font-black text-muted-foreground">R$</span>
					<Input
						type="number"
						value={infoHolder.redemptionValue.toString()}
						onChange={(e) => updateInfoHolder({ redemptionValue: Number(e.target.value) })}
						className="h-24 text-5xl font-black text-center rounded-3xl border-4 border-brand/20 focus:border-brand px-12"
					/>
				</div>
				<div className="grid grid-cols-2 md:grid-cols-4 gap-3 max-w-xl mx-auto">
					{valueHelpers.map((h) => (
						<Button
							key={h}
							variant="secondary"
							onClick={() => updateInfoHolder({ redemptionValue: Math.min(infoHolder.redemptionValue + h, clientAvailableBalance) })}
							className="h-14 rounded-xl font-black text-lg"
						>
							<Plus className="w-4 h-4 mr-1 text-brand" /> {h}
						</Button>
					))}
					<Button
						variant="ghost"
						onClick={() => updateInfoHolder({ redemptionValue: 0 })}
						className="h-14 rounded-xl font-bold text-muted-foreground col-span-2 md:col-span-4 italic"
					>
						<X className="w-4 h-4 mr-1" /> LIMPAR VALOR
					</Button>
				</div>
			</div>
			{infoHolder.redemptionValue > clientAvailableBalance ? (
				<h3 className="text-red-500 font-black text-center p-2 rounded-lg border border-red-500 bg-red-200">
					OOPS, SALDO INSUFICIENTE PARA ESTE RESGATE :(
				</h3>
			) : null}
			<div className="w-full flex flex-col gap-1.5">
				<h2 className="text-xl font-medium uppercase tracking-tight">SENHA DO OPERADOR</h2>
				<div className="relative max-w-md mx-auto">
					<LockIcon className="w-4 h-4 absolute left-6 top-1/2 -translate-y-1/2 text-muted-foreground" />
					<Input
						value={infoHolder.operatorIdentifier}
						onChange={(e) => updateInfoHolder({ operatorIdentifier: e.target.value })}
						placeholder="******"
						className="h-24 text-5xl font-black text-center rounded-3xl border-4 border-brand/20 focus:border-brand px-12"
					/>
				</div>
			</div>
		</ResponsiveMenu>
	);
}
