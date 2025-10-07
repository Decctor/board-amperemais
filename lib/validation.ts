export function isEmpty(value: any) {
	return value == null || (typeof value === "string" && value.trim().length === 0);
}

export function isValidNumber(value: unknown) {
	return typeof value === "number" && !Number.isNaN(value) && value !== null && value !== undefined;
}
