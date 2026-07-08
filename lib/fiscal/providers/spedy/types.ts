export type TSpedyEnvironmentType = "production" | "development" | "simulation";
export type TSpedyInvoiceStatus =
	| "created"
	| "enqueued"
	| "received"
	| "authorized"
	| "inContingent"
	| "rejected"
	| "canceled"
	| "denied"
	| "removed"
	| "disabled";

export type TSpedyProcessingDetail = {
	status?: "processing" | "success" | "failed" | null;
	message?: string | null;
	code?: string | null;
	on?: string | null;
};

export type TSpedyInvoiceResponse = {
	id: string;
	integrationId?: string | null;
	status?: TSpedyInvoiceStatus | null;
	environmentType?: TSpedyEnvironmentType | null;
	issuedOn?: string | null;
	effectiveDate?: string | null;
	authorization?: {
		date?: string | null;
		protocol?: string | null;
		digestValue?: string | null;
	} | null;
	amount?: number | null;
	number?: number | null;
	processingDetail?: TSpedyProcessingDetail | null;
	accessKey?: string | null;
	series?: string | null;
};

export type TSpedyCompanyResponse = {
	id?: string | null;
	name?: string | null;
	legalName?: string | null;
	federalTaxNumber?: string | null;
	apiCredentials?: {
		apiKey?: string | null;
	} | null;
};

export type TSpedyCertificateResponse = {
	id?: string | null;
	expirationAt?: string | null;
	subject?: string | null;
	issuer?: string | null;
	isActive?: boolean | null;
};

export type TSpedyDisablementResponse = {
	identifier?: string | null;
	date?: string | null;
	initialNumber?: number | null;
	finalNumber?: number | null;
	series?: string | null;
	reason?: string | null;
	protocolNumber?: string | null;
	status?: string | null;
	environment?: TSpedyEnvironmentType | null;
	messageCode?: string | null;
	messageText?: string | null;
};

export type TSpedyCreateInvoicePayload = Record<string, unknown>;
