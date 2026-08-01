/**
 * Canonical dashboard route builders.
 *
 * Keep dashboard URLs in one place so route moves do not turn into a repository-wide string
 * replacement exercise. These helpers deliberately return paths only, making them safe for both
 * server and client components.
 */
export const appRoutes = {
	dashboard: () => "/dashboard",
	sales: {
		root: () => "/dashboard/sales",
		orders: () => "/dashboard/sales/orders",
		new: () => "/dashboard/sales/new",
		import: () => "/dashboard/sales/import",
		details: (saleId: string) => `/dashboard/sales/${saleId}`,
		edit: (saleId: string) => `/dashboard/sales/${saleId}/edit`,
		checkout: (saleId: string) => `/dashboard/sales/${saleId}/checkout`,
		cashSessions: () => "/dashboard/sales/cash-sessions",
		serviceAccounts: () => "/dashboard/sales/service-accounts",
		serviceAccount: (accountId: string) => `/dashboard/sales/service-accounts/${accountId}`,
		pointOfInteraction: () => "/dashboard/sales/point-of-interaction",
	},
	operations: {
		preparation: () => "/dashboard/operations/preparation",
	},
	approvals: () => "/dashboard/approvals",
	purchases: () => "/dashboard/purchases",
	production: () => "/dashboard/production",
	inventory: {
		root: () => "/dashboard/inventory",
		movements: () => "/dashboard/inventory/movements",
		lots: () => "/dashboard/inventory/lots",
		lot: (lotId: string) => `/dashboard/inventory/lots/${lotId}`,
		lotLabelsPreview: () => "/dashboard/inventory/lots/labels/preview",
	},
	finance: () => "/dashboard/finance",
	fiscal: () => "/dashboard/fiscal",
	catalog: {
		products: () => "/dashboard/catalog/products",
		product: (productId: string) => `/dashboard/catalog/products/${productId}`,
		store: () => "/dashboard/catalog/store",
	},
	customers: {
		root: () => "/dashboard/customers",
		details: (customerId: string) => `/dashboard/customers/${customerId}`,
		import: () => "/dashboard/customers/import",
		portfolios: () => "/dashboard/customers/portfolios",
		segments: () => "/dashboard/customers/segments",
	},
	growth: {
		campaigns: () => "/dashboard/growth/campaigns",
		newCampaign: () => "/dashboard/growth/campaigns/new",
		campaign: (campaignId: string) => `/dashboard/growth/campaigns/${campaignId}`,
		audiences: () => "/dashboard/growth/audiences",
		cashback: () => "/dashboard/growth/cashback",
		coupons: () => "/dashboard/growth/coupons",
		coupon: (couponId: string) => `/dashboard/growth/coupons/${couponId}`,
		newCoupon: () => "/dashboard/growth/coupons/new",
	},
	management: {
		goals: () => "/dashboard/management/goals",
		sellers: () => "/dashboard/management/sellers",
		seller: (sellerId: string) => `/dashboard/management/sellers/${sellerId}`,
		partners: () => "/dashboard/management/partners",
	},
	channels: {
		whatsapp: () => "/dashboard/channels/whatsapp",
		paidMedia: () => "/dashboard/channels/paid-media",
	},
	integrations: () => "/dashboard/integrations",
	settings: () => "/dashboard/settings",
} as const;
