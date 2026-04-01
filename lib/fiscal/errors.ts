export class FiscalReadinessError extends Error {
	constructor(message: string) {
		super(message);
		this.name = "FiscalReadinessError";
	}
}

export class FiscalIntegrationError extends Error {
	constructor(message: string) {
		super(message);
		this.name = "FiscalIntegrationError";
	}
}
