import assert from "node:assert/strict";
import test from "node:test";
import { canAccessDashboardCapability, type TCapabilityContext } from "./capabilities";

function createContext({
	cashSessionsEnabled,
	canViewSales,
	erpEnabled = true,
}: {
	cashSessionsEnabled: boolean;
	canViewSales: boolean;
	erpEnabled?: boolean;
}): TCapabilityContext {
	return {
		organization: {
			configuracao: {
				recursos: { erp: { acesso: erpEnabled } },
				preferencias: { sessoesVenda: { habilitado: cashSessionsEnabled } },
			},
		},
		permissions: {
			vendas: { visualizar: canViewSales },
		},
	} as TCapabilityContext;
}

test("keeps cash sessions hidden without both the organization setting and sales access", () => {
	assert.equal(canAccessDashboardCapability("cashSessions", createContext({ cashSessionsEnabled: false, canViewSales: true })), false);
	assert.equal(canAccessDashboardCapability("cashSessions", createContext({ cashSessionsEnabled: true, canViewSales: false })), false);
	assert.equal(canAccessDashboardCapability("cashSessions", createContext({ cashSessionsEnabled: true, canViewSales: true })), true);
});

test("shows new sale only for sales members in ERP organizations", () => {
	assert.equal(canAccessDashboardCapability("newSale", createContext({ cashSessionsEnabled: false, canViewSales: true })), true);
	assert.equal(
		canAccessDashboardCapability("newSale", createContext({ cashSessionsEnabled: false, canViewSales: true, erpEnabled: false })),
		false,
	);
	assert.equal(canAccessDashboardCapability("newSale", createContext({ cashSessionsEnabled: false, canViewSales: false })), false);
});
