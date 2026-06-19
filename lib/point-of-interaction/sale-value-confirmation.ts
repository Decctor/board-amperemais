export function saleValuesMatch(confirmedValue: number, saleValue: number) {
	return Math.round(confirmedValue * 100) === Math.round(saleValue * 100);
}

type TPoiSaleForValueConfirmation = {
	valor: number;
	cashback: { aplicar: boolean; valor: number };
	prizeRedemption?: { prizeValue: number; prizeSaleValue: number } | null;
};

export function poiSaleRequiresValueConfirmation(enabled: boolean, sale: TPoiSaleForValueConfirmation) {
	return enabled && !sale.prizeRedemption;
}

export function getPoiSaleValueForConfirmation(sale: TPoiSaleForValueConfirmation) {
	const grossValue = sale.prizeRedemption?.prizeSaleValue ?? sale.valor;
	const discountValue = sale.prizeRedemption?.prizeValue ?? (sale.cashback.aplicar ? sale.cashback.valor : 0);
	return Math.max(0, grossValue - discountValue);
}
