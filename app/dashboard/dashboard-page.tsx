"use client";
import type { ReactNode } from "react";
import StatsPeriodComparisonMenu from "@/components/Modals/Stats/StatsPeriodComparisonMenu";
import SalesQueryParamsMenu from "@/components/SalesStats/SalesQueryParamsMenu";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { TAuthUserSession } from "@/lib/authentication/types";
import { formatDateAsLocale } from "@/lib/formatting";
import { useUsers } from "@/lib/queries/users";
import type { TSaleStatsGeneralQueryParams } from "@/schemas/query-params-utils";
import dayjs from "dayjs";
import {
  GitCompare,
  ListFilter,
  X,
  Smartphone,
  UserRound,
  UserPlus,
  Repeat2,
  BadgePercent,
  Wallet,
  Trophy,
  ArrowUpRight,
} from "lucide-react";
import { useMemo, useState } from "react";

/**
 * ✅ O que vamos medir (com base no que você descreveu):
 * - Origem da venda: tablet | caixa
 * - Tipo de cliente: novo | recorrente (já cliente)
 * - Cashback: gerado e/ou resgatado
 * - Autor da venda: identificado pela SENHA (vendedor ou caixa)
 */

type SaleSource = "tablet" | "caixa";
type ClientType = "novo" | "recorrente";
type OperatorType = "vendedor" | "caixa";

type CapturedSale = {
  id: string;
  createdAt: string;
  total: number;

  // origem
  source: SaleSource;

  // cliente
  clientId?: string | null;
  clientType: ClientType;

  // cashback
  cashbackGenerated: number; // gerado na compra
  cashbackRedeemed: number; // quanto foi usado/resgatado na compra (0 se não resgatou)

  // confirmação por senha
  operatorId: string; // id do vendedor ou caixa (pela senha)
  operatorType: OperatorType;
};

const initialPeriodStart = dayjs().startOf("month").toISOString();
const initialPeriodEnd = dayjs().endOf("day").toISOString();

type DashboardPageProps = {
  user: TAuthUserSession["user"];
};

export function DashboardPage({ user }: DashboardPageProps) {
  const initialSellers = user.permissoes.resultados.escopo ? user.permissoes.resultados.escopo : [];

  const [filterMenuIsOpen, setFilterMenuIsOpen] = useState(false);
  const [comparisonMenuIsOpen, setComparisonMenuIsOpen] = useState(false);

  const [generalQueryParams, setGeneralQueryParams] = useState<TSaleStatsGeneralQueryParams>({
    period: {
      after: initialPeriodStart,
      before: initialPeriodEnd,
    },
    total: {},
    saleNatures: [],
    sellers: initialSellers,
    clientRFMTitles: [],
    productGroups: [],
    excludedSalesIds: [],
  });

  function updateGeneralQueryParams(newParams: Partial<TSaleStatsGeneralQueryParams>) {
    setGeneralQueryParams((prevParams) => ({ ...prevParams, ...newParams }));
  }

  const { data: users } = useUsers({ initialFilters: {} });

  /**
   * ✅ MOCK DE DADOS (para o dashboard ficar pronto agora)
   * Quando tiver endpoint/hook, substitua isso por:
   * const { data: sales } = useCapturedSalesDashboard(generalQueryParams)
   */
  const capturedSales: CapturedSale[] = useMemo(() => {
    const now = dayjs();
    const ids = [
      "s1","s2","s3","s4","s5","s6","s7","s8","s9","s10","s11","s12"
    ];

    const operators = [
      { id: initialSellers?.[0] || "op-1", type: "vendedor" as const },
      { id: initialSellers?.[1] || "op-2", type: "vendedor" as const },
      { id: "caixa-1", type: "caixa" as const },
    ];

    return ids.map((id, idx) => {
      const total = [120, 260, 89, 540, 310, 150, 990, 75, 430, 210, 180, 640][idx] ?? 120;
      const source: SaleSource = idx % 3 === 0 ? "tablet" : "caixa";
      const clientType: ClientType = idx % 4 === 0 ? "novo" : "recorrente";

      const cashbackGenerated = Math.round(total * 0.05 * 100) / 100; // 5% exemplo
      const cashbackRedeemed = idx % 5 === 0 ? Math.min(30, cashbackGenerated) : 0;

      const op = operators[idx % operators.length];

      return {
        id,
        createdAt: now.subtract(idx, "day").toISOString(),
        total,
        source,
        clientId: clientType === "novo" ? null : `c-${idx}`,
        clientType,
        cashbackGenerated,
        cashbackRedeemed,
        operatorId: op.id,
        operatorType: op.type,
      };
    });
  }, [initialSellers]);

  const dashboard = useMemo(() => buildDashboard(capturedSales), [capturedSales]);

  return (
    <div className="w-full h-full flex flex-col gap-3">
      {/* Top actions */}
      <div className="w-full flex items-center justify-end gap-2">
        <Button
          variant="secondary"
          type="button"
          onClick={() => setComparisonMenuIsOpen(true)}
          className="flex items-center gap-2"
          size="sm"
        >
          <GitCompare className="w-4 h-4 min-w-4 min-h-4" />
          COMPARAR PERÍODOS
        </Button>
        <Button className="flex items-center gap-2" size="sm" onClick={() => setFilterMenuIsOpen(true)}>
          <ListFilter className="w-4 h-4 min-w-4 min-h-4" />
          FILTROS
        </Button>
      </div>

      {/* Filters showcase */}
      <DashboardPageFiltersShowcase
        defaultQueryParams={{
          sellers: initialSellers,
        }}
        queryParams={generalQueryParams}
        updateQueryParams={updateGeneralQueryParams}
      />

      {/* ✅ NOVOS BLOCOS do dashboard */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">
        {/* KPIs */}
        <div className="lg:col-span-8 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
          <KpiCard
            title="Vendas (R$)"
            value={formatCurrencyBRL(dashboard.totalRevenue)}
            icon={<ArrowUpRight className="w-4 h-4" />}
            hint={`${dashboard.totalTransactions} vendas no período`}
          />
          <KpiCard
            title="Ticket médio"
            value={formatCurrencyBRL(dashboard.avgTicket)}
            icon={<Wallet className="w-4 h-4" />}
            hint="média por transação"
          />
          <KpiCard
            title="Cashback gerado"
            value={formatCurrencyBRL(dashboard.cashbackGenerated)}
            icon={<BadgePercent className="w-4 h-4" />}
            hint="gerado nas compras"
          />
          <KpiCard
            title="Cashback resgatado"
            value={formatCurrencyBRL(dashboard.cashbackRedeemed)}
            icon={<BadgePercent className="w-4 h-4" />}
            hint="usado na compra"
          />
        </div>

        {/* Origem das vendas */}
        <Card className="lg:col-span-4 bg-background/50 border border-border p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Origem da venda</p>
              <p className="text-lg font-semibold">Tablet vs Caixa</p>
            </div>
            <Smartphone className="w-5 h-5 text-muted-foreground" />
          </div>

          <div className="mt-4 space-y-3">
            <ProgressRow
              label="Tablet"
              value={`${dashboard.bySource.tablet.count} vendas`}
              pct={dashboard.bySource.tablet.pct}
            />
            <ProgressRow
              label="Caixa"
              value={`${dashboard.bySource.caixa.count} vendas`}
              pct={dashboard.bySource.caixa.pct}
            />
          </div>

          <div className="mt-4 text-xs text-muted-foreground">
            * Tablet = cliente digitou número/valor e escolheu resgatar ou não
          </div>
        </Card>
      </div>

      {/* Novos vs Recorrentes */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">
        <Card className="lg:col-span-7 bg-background/50 border border-border p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Aquisição & Retenção</p>
              <p className="text-lg font-semibold">Novos vs Recorrentes (LTV)</p>
            </div>
            <UserRound className="w-5 h-5 text-muted-foreground" />
          </div>

          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
            <MiniStat
              title="Novos clientes"
              icon={<UserPlus className="w-4 h-4" />}
              value={`${dashboard.clients.new.count} cadastros`}
              sub={`${formatCurrencyBRL(dashboard.clients.new.revenue)} em vendas`}
            />
            <MiniStat
              title="Recorrentes"
              icon={<Repeat2 className="w-4 h-4" />}
              value={`${dashboard.clients.returning.count} compras`}
              sub={`${formatCurrencyBRL(dashboard.clients.returning.revenue)} em vendas`}
            />
          </div>

          <div className="mt-4 space-y-3">
            <ProgressRow label="Receita - Novos" value={formatCurrencyBRL(dashboard.clients.new.revenue)} pct={dashboard.clients.new.pctRevenue} />
            <ProgressRow
              label="Receita - Recorrentes"
              value={formatCurrencyBRL(dashboard.clients.returning.revenue)}
              pct={dashboard.clients.returning.pctRevenue}
            />
          </div>

          <div className="mt-4 text-xs text-muted-foreground">
            * “Recorrentes” aqui é baseado em cliente já cadastrado (LTV). Quando você ligar no seu CRM real, isso fica automático.
          </div>
        </Card>

        {/* Ranking */}
        <Card className="lg:col-span-5 bg-background/50 border border-border p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Performance</p>
              <p className="text-lg font-semibold">Ranking por senha (vendedor/caixa)</p>
            </div>
            <Trophy className="w-5 h-5 text-muted-foreground" />
          </div>

          <div className="mt-4 overflow-auto">
            <table className="w-full text-sm">
              <thead className="text-muted-foreground">
                <tr className="border-b border-border">
                  <th className="text-left py-2 pr-2">#</th>
                  <th className="text-left py-2 pr-2">Responsável</th>
                  <th className="text-left py-2 pr-2">Tipo</th>
                  <th className="text-right py-2 pl-2">Vendas</th>
                  <th className="text-right py-2 pl-2">R$</th>
                </tr>
              </thead>
              <tbody>
                {dashboard.ranking.map((r, idx) => {
                  const name =
                    users?.find((u) => u.id === r.operatorId)?.nome ||
                    (r.operatorType === "caixa" ? "Caixa" : r.operatorId);

                  return (
                    <tr key={r.operatorId} className="border-b border-border/60">
                      <td className="py-2 pr-2 font-semibold">{idx + 1}</td>
                      <td className="py-2 pr-2">{name}</td>
                      <td className="py-2 pr-2">
                        <span className="inline-flex items-center rounded-md bg-secondary px-2 py-0.5 text-[0.7rem]">
                          {r.operatorType.toUpperCase()}
                        </span>
                      </td>
                      <td className="py-2 pl-2 text-right">{r.transactions}</td>
                      <td className="py-2 pl-2 text-right font-semibold">{formatCurrencyBRL(r.revenue)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="mt-3 text-xs text-muted-foreground">
            * Esse ranking depende da confirmação por senha ao finalizar a venda.
          </div>
        </Card>
      </div>

      {/* Menus */}
      {filterMenuIsOpen ? (
        <SalesQueryParamsMenu
          user={user}
          queryParams={generalQueryParams}
          updateQueryParams={updateGeneralQueryParams}
          closeMenu={() => setFilterMenuIsOpen(false)}
        />
      ) : null}
      {comparisonMenuIsOpen ? <StatsPeriodComparisonMenu closeMenu={() => setComparisonMenuIsOpen(false)} /> : null}
    </div>
  );
}

/* ----------------------------- UI helpers ----------------------------- */

function KpiCard({ title, value, hint, icon }: { title: string; value: string; hint?: string; icon?: React.ReactNode }) {
  return (
    <Card className="bg-background/50 border border-border p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm text-muted-foreground">{title}</p>
          <p className="mt-1 text-2xl font-semibold">{value}</p>
          {hint ? <p className="mt-1 text-xs text-muted-foreground">{hint}</p> : null}
        </div>
        <div className="rounded-lg bg-secondary p-2 text-muted-foreground">{icon}</div>
      </div>
    </Card>
  );
}

function MiniStat({ title, value, sub, icon }: { title: string; value: string; sub?: string; icon?: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border bg-secondary/30 p-4">
      <div className="flex items-center gap-2 text-muted-foreground">
        {icon}
        <p className="text-sm">{title}</p>
      </div>
      <p className="mt-2 text-lg font-semibold">{value}</p>
      {sub ? <p className="mt-1 text-xs text-muted-foreground">{sub}</p> : null}
    </div>
  );
}

function ProgressRow({ label, value, pct }: { label: string; value: string; pct: number }) {
  const safePct = Number.isFinite(pct) ? Math.max(0, Math.min(100, pct)) : 0;

  return (
    <div>
      <div className="flex items-center justify-between text-sm">
        <p className="text-muted-foreground">{label}</p>
        <p className="font-medium">{value}</p>
      </div>
      <div className="mt-2 h-2 w-full rounded-full bg-secondary">
        <div className="h-2 rounded-full bg-primary" style={{ width: `${safePct}%` }} />
      </div>
    </div>
  );
}

/* ----------------------------- Data builder ---------------------------- */

function buildDashboard(sales: CapturedSale[]) {
  const totalRevenue = sum(sales.map((s) => s.total));
  const totalTransactions = sales.length;
  const avgTicket = totalTransactions > 0 ? totalRevenue / totalTransactions : 0;

  const cashbackGenerated = sum(sales.map((s) => s.cashbackGenerated));
  const cashbackRedeemed = sum(sales.map((s) => s.cashbackRedeemed));

  const tabletSales = sales.filter((s) => s.source === "tablet");
  const caixaSales = sales.filter((s) => s.source === "caixa");

  const bySource = {
    tablet: {
      count: tabletSales.length,
      pct: totalTransactions > 0 ? (tabletSales.length / totalTransactions) * 100 : 0,
    },
    caixa: {
      count: caixaSales.length,
      pct: totalTransactions > 0 ? (caixaSales.length / totalTransactions) * 100 : 0,
    },
  };

  const newClientsSales = sales.filter((s) => s.clientType === "novo");
  const returningSales = sales.filter((s) => s.clientType === "recorrente");

  const newRevenue = sum(newClientsSales.map((s) => s.total));
  const returningRevenue = sum(returningSales.map((s) => s.total));

  const clients = {
    new: {
      count: newClientsSales.length, // aqui é “compras de novos”, e quando ligar no backend vira “cadastros”
      revenue: newRevenue,
      pctRevenue: totalRevenue > 0 ? (newRevenue / totalRevenue) * 100 : 0,
    },
    returning: {
      count: returningSales.length,
      revenue: returningRevenue,
      pctRevenue: totalRevenue > 0 ? (returningRevenue / totalRevenue) * 100 : 0,
    },
  };

  // Ranking por operador (senha)
  const map = new Map<string, { operatorId: string; operatorType: OperatorType; transactions: number; revenue: number }>();

  for (const s of sales) {
    const key = `${s.operatorType}:${s.operatorId}`;
    const prev = map.get(key);
    if (!prev) {
      map.set(key, { operatorId: s.operatorId, operatorType: s.operatorType, transactions: 1, revenue: s.total });
    } else {
      map.set(key, { ...prev, transactions: prev.transactions + 1, revenue: prev.revenue + s.total });
    }
  }

  const ranking = Array.from(map.values()).sort((a, b) => b.revenue - a.revenue).slice(0, 8);

  return {
    totalRevenue,
    totalTransactions,
    avgTicket,
    cashbackGenerated,
    cashbackRedeemed,
    bySource,
    clients,
    ranking,
  };
}

function sum(nums: number[]) {
  return nums.reduce((acc, n) => acc + (Number.isFinite(n) ? n : 0), 0);
}

function formatCurrencyBRL(value: number) {
  try {
    return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  } catch {
    return `R$ ${value.toFixed(2)}`;
  }
}

/* -------------------- Filter tags (mantive o seu) -------------------- */

type DashboardPageFiltersShowcaseProps = {
  defaultQueryParams: Partial<TSaleStatsGeneralQueryParams>;
  queryParams: TSaleStatsGeneralQueryParams;
  updateQueryParams: (params: Partial<TSaleStatsGeneralQueryParams>) => void;
};

function DashboardPageFiltersShowcase({ defaultQueryParams, queryParams, updateQueryParams }: DashboardPageFiltersShowcaseProps) {
  const { data: users } = useUsers({ initialFilters: {} });

  function FilterTag({ label, value, onRemove }: { label: string; value: string; onRemove?: () => void }) {
    return (
      <div className="flex items-center gap-1 bg-secondary text-[0.65rem] rounded-lg px-2 py-1">
        <p className="text-primary/80">
          {label}: <strong>{value}</strong>
        </p>
        {onRemove && (
          <button type="button" onClick={onRemove} className="bg-transparent text-primary hover:bg-primary/20 rounded-lg p-1">
            <X size={12} />
          </button>
        )}
      </div>
    );
  }

  const enabledRemovals = {
    total: defaultQueryParams.total !== queryParams.total,
    saleNatures: defaultQueryParams.saleNatures !== queryParams.saleNatures,
    clientRFMTitles: defaultQueryParams.clientRFMTitles !== queryParams.clientRFMTitles,
    productGroups: defaultQueryParams.productGroups !== queryParams.productGroups,
    excludedSalesIds: defaultQueryParams.excludedSalesIds !== queryParams.excludedSalesIds,
    sellers: defaultQueryParams.sellers !== queryParams.sellers,
  };

  return (
    <div className="flex items-center justify-center lg:justify-end flex-wrap gap-2">
      {queryParams.period.after && queryParams.period.before ? (
        <FilterTag label="PERÍODO" value={`${formatDateAsLocale(queryParams.period.after)} a ${formatDateAsLocale(queryParams.period.before)}`} />
      ) : null}

      {queryParams.total.min || queryParams.total.max ? (
        <FilterTag
          label="VALOR"
          value={`${queryParams.total.min ? `MIN: R$ ${queryParams.total.min}` : "N/A"} - ${queryParams.total.max ? `MAX: R$ ${queryParams.total.max}` : "N/A"}`}
          onRemove={enabledRemovals.total ? () => updateQueryParams({ total: defaultQueryParams.total || { min: null, max: null } }) : undefined}
        />
      ) : null}

      {queryParams.saleNatures.length > 0 ? (
        <FilterTag
          label="NATUREZA DA VENDA"
          value={queryParams.saleNatures.map((nature) => nature).join(", ")}
          onRemove={enabledRemovals.saleNatures ? () => updateQueryParams({ saleNatures: defaultQueryParams.saleNatures || [] }) : undefined}
        />
      ) : null}

      {queryParams.clientRFMTitles.length > 0 ? (
        <FilterTag
          label="CATEGORIA DE CLIENTES"
          value={queryParams.clientRFMTitles.map((title) => title).join(", ")}
          onRemove={enabledRemovals.clientRFMTitles ? () => updateQueryParams({ clientRFMTitles: defaultQueryParams.clientRFMTitles || [] }) : undefined}
        />
      ) : null}

      {queryParams.productGroups.length > 0 ? (
        <FilterTag
          label="GRUPO DE PRODUTOS"
          value={queryParams.productGroups.map((group) => group).join(", ")}
          onRemove={enabledRemovals.productGroups ? () => updateQueryParams({ productGroups: defaultQueryParams.productGroups || [] }) : undefined}
        />
      ) : null}

      {queryParams.excludedSalesIds.length > 0 ? (
        <FilterTag
          label="VENDAS EXCLUÍDAS"
          value={queryParams.excludedSalesIds.map((id) => id).join(", ")}
          onRemove={enabledRemovals.excludedSalesIds ? () => updateQueryParams({ excludedSalesIds: defaultQueryParams.excludedSalesIds || [] }) : undefined}
        />
      ) : null}

      {queryParams.sellers.length > 0 ? (
        <FilterTag
          label="VENDEDORES"
          value={queryParams.sellers.map((seller) => users?.find((u) => u.id === seller)?.nome || seller).join(", ")}
          onRemove={enabledRemovals.sellers ? () => updateQueryParams({ sellers: defaultQueryParams.sellers || [] }) : undefined}
        />
      ) : null}
    </div>
  );
}
