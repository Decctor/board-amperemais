import type { TWhatsappConnectionPhoneMetadados } from "@/services/drizzle/schema/whatsapp-connections";

const META_SYNC_REQUEST_WINDOW_HOURS = 24;

type TWhatsappPhoneSyncType = "contacts" | "messageHistory";
const SYNC_TYPE_METADATA_KEY: Record<TWhatsappPhoneSyncType, "contacts" | "historicoMensagens"> = {
	contacts: "contacts",
	messageHistory: "historicoMensagens",
};

export function getWhatsappSyncRequestDeadlineAt(onboardingAt: Date | string | null | undefined) {
	const deadlineReference = onboardingAt ? new Date(onboardingAt) : new Date();
	return new Date(deadlineReference.getTime() + META_SYNC_REQUEST_WINDOW_HOURS * 60 * 60 * 1000);
}

export function buildWhatsappPhoneSyncMetadataPatch({
	currentMetadata,
	syncType,
	requestedAt,
	requestId,
	onboardingAt,
}: {
	currentMetadata: TWhatsappConnectionPhoneMetadados | null | undefined;
	syncType: TWhatsappPhoneSyncType;
	requestedAt?: Date;
	requestId?: string | null;
	onboardingAt: Date | string | null | undefined;
}): TWhatsappConnectionPhoneMetadados {
	const dataLimiteRequisicao = getWhatsappSyncRequestDeadlineAt(onboardingAt).toISOString();
	const currentSmbAppSync = currentMetadata?.sincronizacaoSmbApp ?? {};
	const nextSmbAppSync: NonNullable<TWhatsappConnectionPhoneMetadados["sincronizacaoSmbApp"]> = {
		...currentSmbAppSync,
		dataLimiteRequisicao,
	};

	if (requestedAt) {
		const metadataKey = SYNC_TYPE_METADATA_KEY[syncType];
		nextSmbAppSync[metadataKey] = {
			...(currentSmbAppSync[metadataKey] ?? {}),
			dataRequisicao: requestedAt.toISOString(),
			requestId: requestId ?? null,
		};
	}

	return {
		...(currentMetadata ?? {}),
		sincronizacaoSmbApp: nextSmbAppSync,
	};
}
