export function resolvePaymentObservation({ status, errors }: { status: string; errors?: Array<{ code?: number }> }) {
 if (errors?.some((error) => error.code === 131042)) return "PENDENTE" as const;
 if (status === "delivered" || status === "read") return "VERIFICADO" as const;
 return null;
}
