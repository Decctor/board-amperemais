"use client";

import ResponsiveMenu from "@/components/Utils/ResponsiveMenu";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatDateAsLocale, formatToMoney, formatToPhone } from "@/lib/formatting";
import { cn } from "@/lib/utils";
import { ArrowLeft, ArrowRight, Award, CheckCircle2, History, ShoppingCart, TrendingUp, Wallet } from "lucide-react";
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

export default function ClientProfileContent({ orgId, client, balance, rankingPosition, transactions }: ClientProfileContentProps) {
	const router = useRouter();

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

	const handleRedemption = async () => {
		if (!operatorPassword || operatorPassword.length !== 4) {
			toast.error("A senha do operador deve ter 4 dígitos.");
			return;
		}

		setRedemptionIsLoading(true);
		try {
			const response = await fetch("/api/cashback-programs/transactions/redemption", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					orgId,
					clienteId: client.id,
					valor: selectedRedemptionValue,
					senhaOperador: operatorPassword,
				}),
			});

			const result = await response.json();

			if (!response.ok) {
				throw new Error(result.error?.message || "Erro ao processar resgate.");
			}

			toast.success(`Resgate de ${formatToMoney(selectedRedemptionValue)} realizado!`);
			handleCloseRedemptionMenu();
			router.refresh(); // Atualiza os dados da página
		} catch (error: any) {
			toast.error(error.message);
		} finally {
			setRedemptionIsLoading(false);
		}
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
							<h1 className="text-2xl font-black text-brand uppercase italic leading-none">{client.nome}</h1>
							<p className="text-sm font-bold text-muted-foreground mt-1">{formatToPhone(client.telefone)}</p>
						</div>
					</div>

					{/* Badge de Saldo e Ranking em estilo "Pílula" */}
					<div className="flex items-center bg-brand/5 border-2 border-brand/10 rounded-full px-8 py-3 gap-8 shadow-inner">
						<div className="flex flex-col items-center border-r-2 border-brand/10 pr-8">
							<span className="text-[0.65rem] font-black text-brand uppercase tracking-widest">Saldo Disponível</span>
							<span className="text-2xl font-black text-brand">{formatToMoney(balance.saldoValorDisponivel)}</span>
						</div>
						<div className="flex flex-col items-center">
							<span className="text-[0.65rem] font-black text-brand uppercase tracking-widest">Ranking</span>
							<div className="flex items-center gap-1">
								<Award className="w-5 h-5 text-amber-500" />
								<span className="text-2xl font-black text-brand">#{rankingPosition}</span>
							</div>
						</div>
					</div>
				</header>

				{/* 2. BOTÃO CENTRAL: Ação de Nova Compra */}
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
				<ResponsiveMenu
					menuTitle="VALIDAR RESGATE"
					menuDescription={`Confirme o resgate de ${formatToMoney(selectedRedemptionValue)} para este cliente.`}
					menuActionButtonText="CONFIRMAR E BAIXAR"
					menuCancelButtonText="CANCELAR"
					closeMenu={handleCloseRedemptionMenu}
					actionFunction={handleRedemption}
					actionIsLoading={redemptionIsLoading}
					stateIsLoading={false}
					stateError={null}
					dialogVariant="sm"
				>
					<div className="space-y-6 py-4">
						<div className="bg-brand/10 rounded-2xl p-6 text-center border-2 border-brand/20 animate-in zoom-in duration-300">
							<p className="text-xs font-bold text-brand uppercase tracking-widest mb-1">Valor a ser resgatado</p>
							<p className="text-4xl font-black text-brand italic">{formatToMoney(selectedRedemptionValue)}</p>
						</div>

						<div className="space-y-3">
							<Label className="font-black text-xs text-muted-foreground uppercase tracking-widest ml-1">Senha do Operador</Label>
							<Input
								type="password"
								inputMode="numeric"
								maxLength={4}
								placeholder="••••"
								value={operatorPassword}
								onChange={(e) => setOperatorPassword(e.target.value.replace(/\D/g, ""))}
								className="h-20 text-4xl text-center tracking-[1.5rem] rounded-2xl border-4 border-brand/20 focus:border-brand transition-all font-black"
								autoFocus
							/>
						</div>

						<div className="flex items-center gap-2 text-amber-600 bg-amber-50 p-4 rounded-xl border border-amber-200">
							<CheckCircle2 className="w-5 h-5 shrink-0" />
							<p className="text-[0.7rem] font-bold uppercase leading-tight">
								Esta operação é irreversível. O saldo será deduzido imediatamente após a confirmação.
							</p>
						</div>
					</div>
				</ResponsiveMenu>
			)}
		</div>
	);
}
