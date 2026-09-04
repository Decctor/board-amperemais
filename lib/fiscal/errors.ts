import createHttpError from "http-errors";

/**
 * Validation/readiness failures are safe and actionable for fiscal operators.
 * Making them exposed HTTP 400 errors keeps their message intact both in API
 * responses and when fiscal documents persist the failure through getErrorMessage.
 */
export class FiscalReadinessError extends createHttpError.BadRequest {
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
