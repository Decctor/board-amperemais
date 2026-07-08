import type { IntegrationMockupKey } from "@/app/_content/integration-pages";
import { ArrowRight, BadgeDollarSign, BadgePercent, Calendar, Check, CircleUser, Package, RefreshCw, ShieldCheck } from "lucide-react";
import Image, { type StaticImageData } from "next/image";
import type { ReactNode } from "react";

/**
 * Réplicas estáticas (não-interativas) que ilustram a CONEXÃO de uma integração
 * — não as telas de produto. Usam os tokens de marca fixos (#24549C azul,
 * #FFB900 âmbar) porque páginas de marketing não têm OrgColorsProvider.
 * São componentes puros (sem estado/efeitos), seguros em Server Components.
 */

const BLUE = "#24549C";

type MockupProps = { logo: StaticImageData; name: string };

// ----------------------------------------------------------------------------
// Frames
// ----------------------------------------------------------------------------

function BrowserFrame({ url, children }: { url: string; children: ReactNode }) {
	return (
		<div className="w-full overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl shadow-slate-900/5">
			<div className="flex items-center gap-2 border-b border-slate-100 bg-slate-50 px-4 py-2.5">
				<span className="h-2.5 w-2.5 rounded-full bg-red-300" />
				<span className="h-2.5 w-2.5 rounded-full bg-amber-300" />
				<span className="h-2.5 w-2.5 rounded-full bg-green-300" />
				<div className="ml-2 flex-1 truncate rounded-md bg-white px-3 py-1 text-[0.65rem] font-medium text-slate-400 ring-1 ring-slate-100">{url}</div>
			</div>
			<div className="p-5">{children}</div>
		</div>
	);
}

function PanelFrame({ label, children }: { label: string; children: ReactNode }) {
	return (
		<div className="w-full overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl shadow-slate-900/5">
			<div className="flex items-center justify-between border-b border-slate-100 bg-slate-50 px-4 py-2.5">
				<span className="text-[0.65rem] font-bold uppercase tracking-widest text-slate-400">{label}</span>
				<span className="flex items-center gap-1.5 rounded-full bg-green-50 px-2.5 py-0.5 text-[0.6rem] font-bold text-green-600">
					<span className="h-1.5 w-1.5 rounded-full bg-green-500" /> Conectado
				</span>
			</div>
			<div className="p-5">{children}</div>
		</div>
	);
}

function LogoLockup({ logo, name, size = 40 }: { logo: StaticImageData; name: string; size?: number }) {
	return (
		<div className="flex items-center gap-3">
			<div className="flex items-center justify-center rounded-xl bg-white p-1.5 ring-1 ring-slate-100" style={{ height: size, width: size }}>
				<Image src={logo} alt={name} className="h-full w-full object-contain" />
			</div>
			<ArrowRight className="h-4 w-4 text-slate-300" />
			<div
				className="flex items-center justify-center rounded-xl text-[0.6rem] font-black uppercase tracking-tight text-white"
				style={{ height: size, width: size, backgroundColor: BLUE }}
			>
				CRM
			</div>
		</div>
	);
}

// ----------------------------------------------------------------------------
// 1. OAuth authorize
// ----------------------------------------------------------------------------

function OAuthConnectMockup({ logo, name }: MockupProps) {
	return (
		<BrowserFrame url={`${name.toLowerCase()}.com.br/autorizar`}>
			<div className="mx-auto flex max-w-sm flex-col items-center gap-4 text-center">
				<LogoLockup logo={logo} name={name} size={48} />
				<div>
					<h4 className="text-sm font-black tracking-tight text-slate-900">
						O RecompraCRM quer acessar sua conta {name}
					</h4>
					<p className="mt-1 text-xs text-slate-500">Acesso somente leitura aos seus dados de venda</p>
				</div>
				<div className="flex w-full flex-col gap-1.5">
					{["Pedidos de venda", "Contatos", "Produtos"].map((scope) => (
						<div key={scope} className="flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-2 text-left">
							<Check className="h-3.5 w-3.5 flex-shrink-0" style={{ color: BLUE }} />
							<span className="text-xs font-semibold text-slate-700">{scope}</span>
							<span className="ml-auto text-[0.6rem] font-medium uppercase tracking-wide text-slate-400">leitura</span>
						</div>
					))}
				</div>
				<div className="flex w-full gap-2">
					<div className="flex-1 rounded-xl border border-slate-200 py-2.5 text-center text-xs font-bold text-slate-500">Cancelar</div>
					<div className="flex flex-1 items-center justify-center gap-1.5 rounded-xl py-2.5 text-center text-xs font-black text-white" style={{ backgroundColor: BLUE }}>
						<ShieldCheck className="h-3.5 w-3.5" /> Autorizar
					</div>
				</div>
			</div>
		</BrowserFrame>
	);
}

// ----------------------------------------------------------------------------
// 1b. Credentials connect (token / API key based integrations)
// ----------------------------------------------------------------------------

function CredentialConnectMockup({ logo, name }: MockupProps) {
	const fields = ["Identificador da loja", "Chave de acesso"];
	return (
		<BrowserFrame url="app.recompracrm.com.br/configuracoes">
			<div className="mx-auto flex max-w-sm flex-col gap-4">
				<div className="flex items-center gap-3">
					<div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white p-1.5 ring-1 ring-slate-100">
						<Image src={logo} alt={name} className="h-full w-full object-contain" />
					</div>
					<div>
						<h4 className="text-sm font-black tracking-tight text-slate-900">Conectar {name}</h4>
						<p className="text-[0.65rem] text-slate-400">Configurações → Integrações</p>
					</div>
				</div>
				<div className="flex flex-col gap-3">
					{fields.map((field) => (
						<div key={field} className="flex flex-col gap-1">
							<span className="text-[0.6rem] font-bold uppercase tracking-wide text-slate-400">{field}</span>
							<div className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 ring-1 ring-slate-100">
								<span className="text-xs font-semibold tracking-widest text-slate-400">••••••••••</span>
								<Check className="h-3.5 w-3.5" style={{ color: BLUE }} />
							</div>
						</div>
					))}
				</div>
				<div className="flex items-center justify-center gap-1.5 rounded-xl py-2.5 text-xs font-black text-white" style={{ backgroundColor: BLUE }}>
					<ShieldCheck className="h-3.5 w-3.5" /> Conectar
				</div>
			</div>
		</BrowserFrame>
	);
}

// ----------------------------------------------------------------------------
// 2. Sync status
// ----------------------------------------------------------------------------

function SyncStatusMockup({ logo, name }: MockupProps) {
	const counters = [
		{ label: "Pedidos", value: "1.284" },
		{ label: "Contatos", value: "947" },
		{ label: "Produtos", value: "312" },
	];
	return (
		<PanelFrame label={`Integração · ${name}`}>
			<div className="flex flex-col gap-4">
				<div className="flex items-center justify-between">
					<LogoLockup logo={logo} name={name} size={36} />
					<span className="flex items-center gap-1.5 text-[0.65rem] font-semibold text-slate-400">
						<RefreshCw className="h-3 w-3" style={{ color: BLUE }} /> há 2 min
					</span>
				</div>
				<div className="grid grid-cols-3 gap-2">
					{counters.map((c) => (
						<div key={c.label} className="rounded-xl bg-slate-50 px-3 py-2.5 text-center">
							<p className="text-lg font-black tabular-nums text-slate-900">{c.value}</p>
							<p className="text-[0.6rem] font-bold uppercase tracking-widest text-slate-400">{c.label}</p>
						</div>
					))}
				</div>
				<div className="flex items-center gap-2 rounded-xl px-3 py-2.5" style={{ backgroundColor: "rgba(36,84,156,0.06)" }}>
					<span className="relative flex h-2 w-2">
						<span className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-60 motion-reduce:animate-none" style={{ backgroundColor: BLUE }} />
						<span className="relative inline-flex h-2 w-2 rounded-full" style={{ backgroundColor: BLUE }} />
					</span>
					<span className="text-xs font-semibold" style={{ color: BLUE }}>
						Sincronizando novos pedidos automaticamente
					</span>
				</div>
			</div>
		</PanelFrame>
	);
}

// ----------------------------------------------------------------------------
// 3. Field mapping
// ----------------------------------------------------------------------------

function FieldMappingMockup({ name }: MockupProps) {
	const rows = [
		{ emoji: "🧾", from: "Pedidos", to: "Vendas" },
		{ emoji: "👤", from: "Contatos", to: "Clientes" },
		{ emoji: "📦", from: "Itens", to: "Produtos" },
	];
	return (
		<PanelFrame label="Organização automática">
			<div className="flex flex-col gap-2.5">
				<div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 px-1">
					<span className="text-[0.6rem] font-black uppercase tracking-widest text-slate-400">No {name}</span>
					<span className="w-4" />
					<span className="text-right text-[0.6rem] font-black uppercase tracking-widest" style={{ color: BLUE }}>
						No RecompraCRM
					</span>
				</div>
				{rows.map((r) => (
					<div key={r.from} className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
						<span className="flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-2 text-xs font-bold text-slate-700 ring-1 ring-slate-100">
							<span>{r.emoji}</span>
							{r.from}
						</span>
						<ArrowRight className="h-3.5 w-3.5 flex-shrink-0 text-slate-300" />
						<span className="rounded-lg px-3 py-2 text-right text-xs font-bold text-white" style={{ backgroundColor: BLUE }}>
							{r.to}
						</span>
					</div>
				))}
				<p className="mt-1 text-center text-[0.6rem] font-medium text-slate-400">Sem duplicar quem já está na sua base</p>
			</div>
		</PanelFrame>
	);
}

// ----------------------------------------------------------------------------
// 4. Imported sales → retention
// ----------------------------------------------------------------------------

// Mirrors the real sale card (app/dashboard/commercial/sales) — same layout:
// client + meta chips, cashback/total badges, item count, seller footer. Adds
// a partner-logo "via {name}" chip that the product card doesn't have.
function ImportedSalesMockup({ logo, name }: MockupProps) {
	return (
		<PanelFrame label="Venda importada">
			<div className="rounded-xl border border-slate-200 bg-white px-4 py-3.5 shadow-sm">
				<div className="flex flex-col gap-3 sm:flex-row sm:justify-between">
					{/* Client + meta */}
					<div className="flex flex-col gap-1.5">
						<div className="flex items-center gap-1.5">
							<CircleUser className="h-4 w-4 text-slate-400" />
							<span className="text-xs font-bold uppercase tracking-tight text-slate-900">Maria Silva</span>
						</div>
						<div className="flex flex-wrap items-center gap-1.5 text-[0.6rem] font-medium text-slate-500">
							<span className="flex items-center gap-1 rounded-md bg-slate-100 px-1.5 py-0.5">
								<Calendar className="h-2.5 w-2.5" /> 08/07 14:32
							</span>
							<span className="flex items-center gap-1 rounded-md bg-slate-100 px-1.5 py-0.5">
								<span className="flex h-3 w-3 items-center justify-center overflow-hidden rounded-[3px] bg-white">
									<Image src={logo} alt="" className="h-full w-full object-contain" />
								</span>
								via {name}
							</span>
						</div>
					</div>
					{/* Financials */}
					<div className="flex flex-col items-start gap-1.5 sm:items-end">
						<div className="flex items-center gap-1.5">
							<span className="flex items-center gap-1 rounded-md bg-green-50 px-2 py-1 text-[0.6rem] font-bold text-green-600">
								<BadgePercent className="h-3 w-3" /> +R$ 6,00
							</span>
							<span className="flex items-center gap-1 rounded-md px-2 py-1 text-xs font-bold text-slate-900" style={{ backgroundColor: "rgba(36,84,156,0.10)" }}>
								<BadgeDollarSign className="h-3.5 w-3.5" /> R$ 120,00
							</span>
						</div>
						<span className="flex items-center gap-1 text-[0.6rem] text-slate-500">
							<Package className="h-2.5 w-2.5" /> 3 itens
						</span>
					</div>
				</div>
				{/* Seller footer */}
				<div className="mt-3 flex items-center gap-2 border-t border-slate-100 pt-3">
					<span className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-100 text-[0.55rem] font-bold text-slate-600">JV</span>
					<div className="flex flex-col leading-none">
						<span className="text-[0.55rem] font-medium uppercase tracking-wide text-slate-400">Vendedor</span>
						<span className="mt-0.5 text-[0.65rem] font-bold text-slate-800">João Vendas</span>
					</div>
				</div>
			</div>
		</PanelFrame>
	);
}

// ----------------------------------------------------------------------------
// Registry
// ----------------------------------------------------------------------------

export function IntegrationMockup({ mockupKey, logo, name }: { mockupKey: IntegrationMockupKey; logo: StaticImageData; name: string }) {
	switch (mockupKey) {
		case "connect":
			return <OAuthConnectMockup logo={logo} name={name} />;
		case "connect-credentials":
			return <CredentialConnectMockup logo={logo} name={name} />;
		case "sync":
			return <SyncStatusMockup logo={logo} name={name} />;
		case "mapping":
			return <FieldMappingMockup logo={logo} name={name} />;
		case "imported":
			return <ImportedSalesMockup logo={logo} name={name} />;
		default:
			return null;
	}
}
