import assert from "node:assert/strict";
import test from "node:test";
import { appRoutes } from "./routes";

test("builds canonical sale routes", () => {
	assert.equal(appRoutes.sales.root(), "/dashboard/sales");
	assert.equal(appRoutes.sales.details("sale-1"), "/dashboard/sales/sale-1");
	assert.equal(appRoutes.sales.edit("sale-1"), "/dashboard/sales/edit/sale-1");
	assert.equal(appRoutes.sales.checkout("sale-1"), "/dashboard/sales/checkout/sale-1");
});

test("keeps provider-neutral growth and channel routes", () => {
	assert.equal(appRoutes.channels.paidMedia(), "/dashboard/channels/paid-media");
	assert.equal(appRoutes.growth.campaign("campaign-1"), "/dashboard/growth/campaigns/campaign-1");
	assert.equal(appRoutes.growth.coupon("coupon-1"), "/dashboard/growth/coupons/coupon-1");
});

test("builds nested entity routes without legacy segments", () => {
	const paths = [
		appRoutes.catalog.product("product-1"),
		appRoutes.customers.details("customer-1"),
		appRoutes.management.seller("seller-1"),
		appRoutes.inventory.lot("lot-1"),
		appRoutes.sales.serviceAccount("account-1"),
	];

	assert.ok(paths.every((path) => !/(commercial|operational|team|chats)/.test(path)));
});
