"use client";

import type {
	TCreateCashbackProgramRedemptionInput,
	TCreateCashbackProgramRedemptionOutput,
} from "@/app/api/cashback-programs/transactions/redemption/route";
import ResponsiveMenuV2 from "@/components/Utils/ResponsiveMenuV2";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getErrorMessage } from "@/lib/errors";
import { formatDateAsLocale, formatToMoney, formatToNumericPassword, formatToPhone } from "@/lib/formatting";
import { createCashbackProgramRedemption } from "@/lib/mutations/cashback-programs";
import { cn } from "@/lib/utils";
import type { TCashbackProgramEntity } from "@/services/drizzle/schema/cashback-programs";
import { useMutation } from "@tanstack/react-query";
import {
	AlertTriangle,
	ArrowLeft,
	ArrowRight,
	Award,
	CheckCircle2,
	History,
	LockIcon,
	PartyPopper,
	Plus,
	ShoppingCart,
	TrendingUp,
	Wallet,
	X,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import useSound from "use-sound";

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
		<div className="h-full bg-slate-50 p-4 md:p-6 flex flex-col items-center overflow-hidden">
			<div className="w-full max-w-6xl flex flex-col gap-4 h-full min-h-0">
				{/* 1. HEADER: Informações e Status (Conforme Rascunho) */}
				<header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3 bg-white p-4 rounded-[2rem] shadow-sm border border-slate-100 flex-shrink-0">
					<div className="flex items-center gap-3">
						<Button variant="ghost" size="fit" asChild className="rounded-full hover:bg-brand/10 flex items-center gap-1 px-2 py-2">
							<Link href={`/point-of-interaction/${orgId}`} className="flex items-center gap-1">
								<ArrowLeft className="w-5 h-5" />
								VOLTAR
							</Link>
						</Button>
						<div>
							<h1 className="text-xl font-black text-black uppercase italic leading-none">{client.nome}</h1>
							<p className="text-xs font-bold text-muted-foreground mt-0.5">{formatToPhone(client.telefone)}</p>
						</div>
					</div>

					{/* Badge de Saldo e Ranking em estilo "Pílula" */}
					<div className="flex items-center bg-brand/5 border-2 border-brand/10 rounded-full px-6 py-2 gap-6 shadow-inner">
						<div className="flex flex-col items-center border-r-2 border-brand/10 pr-6">
							<span className="text-[0.6rem] font-black text-black uppercase tracking-widest">Saldo Disponível</span>
							<span className="text-xl font-black text-brand">{formatToMoney(balance.saldoValorDisponivel)}</span>
						</div>
						<div className="flex flex-col items-center">
							<span className="text-[0.6rem] font-black text-black uppercase tracking-widest">Ranking</span>
							<div className="flex items-center gap-1">
								<Award className="w-4 h-4 text-amber-500" />
								<span className="text-xl font-black text-brand">#{rankingPosition}</span>
							</div>
						</div>
					</div>
				</header>
				{/* 2. BOTÃO CENTRAL: Ação de Nova Compra */}

				{allowAccumulation ? (
					<Button
						onClick={() => router.push(`/point-of-interaction/${orgId}/new-sale?clientId=${client.id}`)}
						className="w-full h-16 rounded-2xl shadow-lg shadow-brand/20 group transition-all border-none bg-brand text-brand-foreground hover:bg-brand/90 flex-shrink-0"
					>
						<div className="flex items-center gap-3 text-left">
							<div className="bg-brand-foreground p-2 rounded-xl group-hover:scale-110 transition-transform">
								<ShoppingCart className="w-6 h-6 text-brand" />
							</div>
							<div>
								<span className="block text-xl font-black text-brand-foreground italic leading-none uppercase">Nova Compra</span>
								<span className="text-[0.65rem] font-bold text-muted-foreground uppercase tracking-widest">Registre pontos e acumule cashback</span>
							</div>
						</div>
						<ArrowRight className="ml-auto mr-3 w-6 h-6 text-brand-foreground opacity-50 group-hover:translate-x-2 transition-transform" />
					</Button>
				) : null}
				{/* Banner de saldo zerado */}
				{balance.saldoValorDisponivel <= 0 && (
					<div className="mb-6 p-5 bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-100 rounded-2xl shadow-sm flex-shrink-0 relative overflow-hidden">
						{/* Decorative background circle */}
						<div className="absolute -right-4 -top-4 w-24 h-24 bg-amber-200/20 rounded-full blur-2xl" />

						<div className="flex items-center gap-4 relative z-10">
							<div className="p-3 bg-white rounded-xl shadow-sm text-amber-500 flex-shrink-0">
								<Wallet className="w-6 h-6" />
							</div>
							<div>
								<h4 className="text-base font-bold text-amber-900 leading-tight">Seu saldo ainda está decolando! 🚀</h4>
								<p className="text-sm text-amber-700/80 mt-1">Identifique-se em suas compras para acumular pontos e resgatar prêmios incríveis.</p>
							</div>
						</div>
					</div>
				)}
				{/* 3. GRID INFERIOR: Resgates e Histórico */}
				<div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-stretch flex-1 min-h-0">
					{/* Seção de Resgate Rápido (Lado Esquerdo) */}
					<section className="md:col-span-5 bg-card rounded-[2rem] p-6 shadow-sm border border-brand/20 flex flex-col min-h-0 overflow-hidden">
						<div className="flex items-center gap-3 mb-4 flex-shrink-0">
							<div className="p-2 bg-green-50 rounded-lg text-green-600">
								<TrendingUp className="w-5 h-5" />
							</div>
							<h2 className="text-lg font-black text-black uppercase italic">PAINEL DE RESGATES</h2>
						</div>

						<div className="flex flex-col gap-2 flex-1 min-h-0 overflow-y-auto custom-scrollbar pr-1">
							{[10, 20, 30, 50].map((value) => {
								const isDisabled = balance.saldoValorDisponivel < value;
								return (
									<Button
										key={value}
										onClick={() => handleRedemptionClick(value)}
										disabled={isDisabled}
										variant="outline"
										className={cn(
											"h-14 rounded-xl border-2 font-black text-lg flex justify-between items-center px-4 transition-all flex-shrink-0",
											!isDisabled
												? "border-brand/20 hover:border-green-500 hover:bg-green-50 text-brand"
												: "opacity-50 bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed",
										)}
									>
										<span className="flex items-center gap-2">
											{isDisabled && <LockIcon className="w-4 h-4 text-slate-400" />}
											<span>RESGATE {value}</span>
										</span>
										<span>{formatToMoney(value)}</span>
									</Button>
								);
							})}
							{(() => {
								const isDisabled = balance.saldoValorDisponivel <= 0;
								return (
									<Button
										onClick={() => handleRedemptionClick(balance.saldoValorDisponivel)}
										disabled={isDisabled}
										variant="outline"
										className={cn(
											"h-14 rounded-xl border-2 font-black text-lg flex justify-between items-center px-4 transition-all flex-shrink-0",
											!isDisabled
												? "border-brand/20 hover:border-green-500 hover:bg-green-50 text-brand"
												: "opacity-50 bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed",
										)}
									>
										<span className="flex items-center gap-2">
											{isDisabled && <LockIcon className="w-4 h-4 text-slate-400" />}
											<span>RESGATE PERSONALIZADO</span>
										</span>
									</Button>
								);
							})()}
						</div>
						<div className="mt-4 p-3 bg-brand/5 rounded-xl border border-brand/20 text-center flex-shrink-0">
							<p className="text-[0.6rem] font-bold text-muted-foreground uppercase tracking-widest leading-relaxed">
								Atenção: Todos os resgates devem ser <br /> validados pelo operador da loja.
							</p>
						</div>
					</section>

					{/* Seção de Histórico (Lado Direito) */}
					<section className="md:col-span-7 bg-card rounded-[2rem] p-6 shadow-sm border border-brand/20 flex flex-col min-h-0 overflow-hidden">
						<div className="flex items-center justify-between mb-4 flex-shrink-0">
							<div className="flex items-center gap-3">
								<div className="p-2 bg-brand/5 rounded-lg text-muted-foreground">
									<History className="w-5 h-5" />
								</div>
								<h2 className="text-lg font-black text-black uppercase italic">Histórico</h2>
							</div>
						</div>

						<div className="flex flex-col gap-2 overflow-y-auto flex-1 min-h-0 pr-1 custom-scrollbar">
							{transactions.length === 0 ? (
								<div className="flex flex-col items-center justify-center flex-1 text-muted-foreground italic font-bold">
									<History className="w-10 h-10 mb-3 opacity-10" />
									Nenhuma movimentação recente.
								</div>
							) : (
								transactions.map((t) => (
									<div
										key={t.id}
										className="flex items-center justify-between p-3 rounded-xl border border-brand/20 bg-brand/5 hover:bg-brand/10 transition-colors flex-shrink-0"
									>
										<div className="flex flex-col">
											<span className={cn("text-[0.65rem] font-black uppercase tracking-widest", t.tipo === "ACÚMULO" ? "text-green-600" : "text-red-500")}>
												{t.tipo}
											</span>
											<span className="text-[0.6rem] font-bold text-muted-foreground">{formatDateAsLocale(t.dataInsercao, true)}</span>
										</div>
										<div className="text-right">
											<p className={cn("text-lg font-black leading-none", t.tipo === "ACÚMULO" ? "text-green-600" : "text-red-500")}>
												{t.tipo === "ACÚMULO" ? "+" : "-"} {formatToMoney(t.valor)}
											</p>
											<p className="text-[0.55rem] font-bold text-muted-foreground mt-0.5 uppercase">Saldo Final: {formatToMoney(t.saldoValorPosterior)}</p>
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
					redemptionLimit={{
						tipo: cashbackProgram.resgateLimiteTipo ?? null,
						valor: cashbackProgram.resgateLimiteValor ?? null,
					}}
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
	redemptionLimit: {
		tipo: string | null;
		valor: number | null;
	};
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
	redemptionLimit,
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
	const [successData, setSuccessData] = useState<Awaited<TCreateCashbackProgramRedemptionOutput>["data"] | null>(null);

	const [playSuccess] = useSound("/sounds/success.mp3");

	// Calculate max allowed redemption based on limit config
	const getMaxAllowedRedemption = () => {
		let maxByLimit = Number.MAX_SAFE_INTEGER; // No limit by default
		if (redemptionLimit.tipo && redemptionLimit.valor !== null) {
			if (redemptionLimit.tipo === "FIXO") {
				maxByLimit = redemptionLimit.valor;
			} else if (redemptionLimit.tipo === "PERCENTUAL" && infoHolder.saleValue > 0) {
				maxByLimit = (infoHolder.saleValue * redemptionLimit.valor) / 100;
			}
		}
		return Math.min(clientAvailableBalance, maxByLimit);
	};

	const getLimitDescription = () => {
		if (!redemptionLimit.tipo || redemptionLimit.valor === null) return null;
		if (redemptionLimit.tipo === "FIXO") {
			return `Limite máximo: ${formatToMoney(redemptionLimit.valor)}`;
		}
		return `Limite máximo: ${redemptionLimit.valor}% do valor da compra`;
	};

	const isExceedingLimit = () => {
		const maxAllowed = getMaxAllowedRedemption();
		return infoHolder.redemptionValue > maxAllowed;
	};

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
			playSuccess();
			setSuccessData(data.data);
			toast.success(data.message);
			return;
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
		<ResponsiveMenuV2
			menuTitle={successData ? "" : "VALIDAR RESGATE"}
			menuDescription={successData ? "" : `Confirme o resgate de ${formatToMoney(infoHolder.redemptionValue)} para este cliente.`}
			menuActionButtonText="CONFIRMAR E BAIXAR"
			menuCancelButtonText="CANCELAR"
			closeMenu={closeMenu}
			actionFunction={() => handleCreateCashbackProgramRedemptionMutation(infoHolder)}
			actionIsLoading={isCreatingCashbackProgramRedemption}
			stateIsLoading={false}
			stateError={null}
			dialogVariant="sm"
			successContent={
				successData ? (
					<div className="flex flex-col items-center text-center space-y-6 animate-in zoom-in duration-300">
						<div className="relative">
							<div className="absolute inset-0 bg-green-500/20 blur-2xl rounded-full scale-125 animate-pulse" />
							<div className="relative bg-green-600 p-6 rounded-full text-white shadow-xl shadow-green-600/20">
								<CheckCircle2 className="w-12 h-12" />
							</div>
							<div className="absolute -top-2 -right-2 bg-yellow-400 p-2 rounded-xl text-yellow-900 shadow-md">
								<PartyPopper className="w-4 h-4" />
							</div>
						</div>

						<div className="space-y-1">
							<h3 className="text-2xl font-black uppercase tracking-tight text-green-700">RESGATE REALIZADO!</h3>
							<p className="text-muted-foreground font-bold text-sm">O saldo foi baixado com sucesso.</p>
						</div>

						<div className="grid grid-cols-1 gap-4 w-full">
							<div className="bg-green-50 border-2 border-green-200 rounded-2xl p-4">
								<p className="text-[0.6rem] font-black text-green-600 uppercase tracking-widest mb-1">VALOR RESGATADO</p>
								<p className="text-3xl font-black text-green-700">{formatToMoney(infoHolder.redemptionValue)}</p>
							</div>
							<div className="bg-brand/5 border-2 border-brand/20 rounded-2xl p-4">
								<p className="text-[0.6rem] font-black text-brand uppercase tracking-widest mb-1">SALDO DISPONÍVEL</p>
								<p className="text-3xl font-black text-brand">{formatToMoney(successData.newBalance)}</p>
							</div>
						</div>

						<Button
							onClick={() => {
								if (callbacks?.onSuccess) callbacks.onSuccess();
								closeMenu();
							}}
							size="lg"
							className="w-full rounded-2xl h-16 text-lg font-black shadow-lg uppercase tracking-wider"
						>
							VOLTAR AO PERFIL
						</Button>
					</div>
				) : null
			}
		>
			<form
				className="w-full flex flex-col gap-6"
				onSubmit={(e) => {
					e.preventDefault();
					handleCreateCashbackProgramRedemptionMutation(infoHolder);
				}}
			>
				<button type="submit" className="hidden" />
				<div className="w-full flex flex-col gap-1.5">
					<h2 className="text-xl font-medium uppercase tracking-tight">Qual o valor da compra?</h2>
					<div className="relative max-w-md mx-auto">
						<span className="absolute left-6 top-1/2 -translate-y-1/2 text-2xl font-black text-muted-foreground">R$</span>
						<Input
							type="number"
							value={infoHolder.saleValue.toString()}
							onChange={(e) => updateInfoHolder({ saleValue: Number(e.target.value) })}
							className="h-24 text-5xl font-black text-center rounded-3xl border-4 border-brand/20 focus:border-brand px-12"
							onFocus={(e) => {
								setTimeout(() => {
									e.target.scrollIntoView({ behavior: "smooth", block: "center" });
								}, 300);
							}}
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
							onFocus={(e) => {
								setTimeout(() => {
									e.target.scrollIntoView({ behavior: "smooth", block: "center" });
								}, 300);
							}}
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
					<div className="w-full flex items-center justify-center flex-col px-1.5 py-3 bg-red-200 text-red-600 rounded-2xl gap-1.5">
						<div className="w-fit self-center flex items-center justify-center gap-1.5">
							<AlertTriangle className="w-4 h-4" />
							<p className="text-xs font-medium text-center italic">Oops, saldo insuficiente para este resgate :(</p>
						</div>
						<button
							type="button"
							onClick={() => updateInfoHolder({ redemptionValue: clientAvailableBalance })}
							className="px-2 py-1 rounded-xl bg-red-600 text-white text-xs font-medium"
						>
							USAR SALDO DISPONÍVEL
						</button>
					</div>
				) : isExceedingLimit() ? (
					<div className="w-full flex items-center justify-center flex-col px-1.5 py-3 bg-red-200 text-red-600 rounded-2xl gap-1.5">
						<div className="w-fit self-center flex items-center justify-center gap-1.5">
							<AlertTriangle className="w-4 h-4" />
							<p className="text-xs font-medium text-center italic">O valor do cashback não pode ser maior que o valor máximo permitido.</p>
						</div>
						<button
							type="button"
							onClick={() => updateInfoHolder({ redemptionValue: getMaxAllowedRedemption() })}
							className="px-2 py-1 rounded-xl bg-red-600 text-white text-xs font-medium"
						>
							USAR VALOR MÁXIMO
						</button>
					</div>
				) : null}
				{getLimitDescription() && (
					<p className="text-[0.65rem] font-medium text-muted-foreground text-center italic">
						{getLimitDescription()}
						{infoHolder.saleValue > 0 && redemptionLimit.tipo === "PERCENTUAL" && <> (Máx: {formatToMoney(getMaxAllowedRedemption())})</>}
					</p>
				)}
				<div className="w-full flex flex-col gap-1.5">
					<h2 className="text-xl font-medium uppercase tracking-tight">SENHA DO OPERADOR</h2>
					<div className="relative max-w-md mx-auto">
						<LockIcon className="w-4 h-4 absolute left-6 top-1/2 -translate-y-1/2 text-muted-foreground" />
						<Input
							type="number"
							value={infoHolder.operatorIdentifier}
							onChange={(e) => updateInfoHolder({ operatorIdentifier: formatToNumericPassword(e.target.value) })}
							placeholder="*****"
							className="h-24 text-5xl font-black text-center rounded-3xl border-4 border-brand/20 focus:border-brand px-12"
							onFocus={(e) => {
								setTimeout(() => {
									e.target.scrollIntoView({ behavior: "smooth", block: "center" });
								}, 300);
							}}
						/>
					</div>
				</div>
			</form>
		</ResponsiveMenuV2>
	);
}
