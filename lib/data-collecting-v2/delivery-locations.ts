import type { TCanonicalClient } from "@/lib/data-connectors";
import { normalizeLocation } from "@/lib/geo/brazilian-locations";
import { clientLocations } from "@/services/drizzle/schema";
import { and, eq } from "drizzle-orm";
import { createHash } from "node:crypto";
import type { TDataCollectingV2Executor } from "./types";

type TCanonicalLocation = NonNullable<TCanonicalClient["location"]>;

type TDeliveryLocationValues = {
	localizacaoCep: string | null;
	localizacaoEstado: string | null;
	localizacaoCidade: string | null;
	localizacaoBairro: string | null;
	localizacaoLogradouro: string | null;
	localizacaoNumero: string | null;
	localizacaoComplemento: string | null;
	localizacaoLatitude: string | null;
	localizacaoLongitude: string | null;
};

function trimToNull(value: string | null | undefined): string | null {
	const trimmed = value?.trim();
	return trimmed ? trimmed : null;
}

function normalizeComparable(value: string | null): string {
	return (value ?? "")
		.normalize("NFD")
		.replace(/[\u0300-\u036f]/g, "")
		.replace(/\s+/g, " ")
		.trim()
		.toUpperCase();
}

export function normalizeCanonicalDeliveryLocation(location: TCanonicalLocation): TDeliveryLocationValues {
	const normalizedCityAndState = normalizeLocation({ estado: location.state, cidade: location.city });
	return {
		localizacaoCep: trimToNull(location.cep),
		localizacaoEstado: normalizedCityAndState.estado,
		localizacaoCidade: normalizedCityAndState.cidade,
		localizacaoBairro: trimToNull(location.neighborhood),
		localizacaoLogradouro: trimToNull(location.street),
		localizacaoNumero: trimToNull(location.number),
		localizacaoComplemento: trimToNull(location.complement),
		localizacaoLatitude: trimToNull(location.latitude),
		localizacaoLongitude: trimToNull(location.longitude),
	};
}

/**
 * Identidade postal de um endereço. Coordenadas ficam fora de propósito: o mesmo endereço pode
 * chegar primeiro sem geocodificação e depois com latitude/longitude, sem virar duas opções para
 * o cliente. Complemento participa da chave para não unir apartamentos ou salas diferentes.
 */
export function getDeliveryLocationFingerprint(location: TDeliveryLocationValues): string {
	return JSON.stringify([
		(location.localizacaoCep ?? "").replace(/\D/g, ""),
		normalizeComparable(location.localizacaoEstado),
		normalizeComparable(location.localizacaoCidade),
		normalizeComparable(location.localizacaoBairro),
		normalizeComparable(location.localizacaoLogradouro),
		normalizeComparable(location.localizacaoNumero),
		normalizeComparable(location.localizacaoComplemento),
	]);
}

function hasDeliveryLocation(location: TDeliveryLocationValues): boolean {
	return Object.values(location).some(Boolean);
}

export async function resolveDeliveryLocationId({
	tx,
	organizationId,
	clientId,
	location,
}: {
	tx: TDataCollectingV2Executor;
	organizationId: string;
	clientId: string | null;
	location: TCanonicalLocation | null | undefined;
}): Promise<string | null> {
	if (!clientId || !location) return null;

	const values = normalizeCanonicalDeliveryLocation(location);
	if (!hasDeliveryLocation(values)) return null;

	const fingerprint = getDeliveryLocationFingerprint(values);
	const existingLocations = await tx.query.clientLocations.findMany({
		where: and(eq(clientLocations.organizacaoId, organizationId), eq(clientLocations.clienteId, clientId)),
		columns: {
			id: true,
			localizacaoCep: true,
			localizacaoEstado: true,
			localizacaoCidade: true,
			localizacaoBairro: true,
			localizacaoLogradouro: true,
			localizacaoNumero: true,
			localizacaoComplemento: true,
			localizacaoLatitude: true,
			localizacaoLongitude: true,
		},
	});
	const existing = existingLocations.find((candidate) => getDeliveryLocationFingerprint(candidate) === fingerprint);
	if (existing) return existing.id;

	// O ID determinístico fecha a corrida entre dois imports concorrentes do mesmo endereço.
	const id = `delivery-${createHash("sha256").update(`${organizationId}|${clientId}|${fingerprint}`).digest("hex")}`;
	await tx
		.insert(clientLocations)
		.values({
			id,
			organizacaoId: organizationId,
			clienteId: clientId,
			titulo: "ENDEREÇO DE ENTREGA",
			...values,
		})
		.onConflictDoNothing({ target: clientLocations.id });

	return id;
}
